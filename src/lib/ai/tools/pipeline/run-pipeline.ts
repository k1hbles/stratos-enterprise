import fs from "fs";
import os from "os";
import path from "path";
import { planContent } from "./content-planner";
import { researchTopic } from "./research-stage";
import { sourceAssets } from "./asset-sourcer";
import { generateSpec } from "./spec-generator";
import { executeGeneratedCode, CodeSafetyError } from "./code-executor";
import { validateOutput } from "./qa-checker";
import { generatePreviewHtml } from "./preview-generator";
import type { PipelineContext, AssetManifest } from "./types";

export interface PipelineResult {
  buffer: Buffer;
  fileType: "pptx" | "docx" | "xlsx";
  summary?: string;
  previewHtml?: string;
}

// ── Timeouts ─────────────────────────────────────────────────────────────────

const PIPELINE_TIMEOUT_MS = 5 * 60 * 1000;  // 5 minutes standard
const ASSET_TIMEOUT_MS = 60 * 1000;          // 60s for asset sourcing

/**
 * Main orchestrator: chains stages 1-6 with SSE progress, retry logic,
 * and hard timeout with graceful degradation.
 *
 * Stage 1: Research (web search — 30s cap, skipped if no Tavily key)
 * Stage 2: Content Planning (LLM -> structured JSON plan + research)
 * Stage 3: Asset Sourcing (images + charts — skipped on timeout)
 * Stage 4: Spec Generation (LLM -> executable JS code)
 * Stage 5: Code Execution (execFileSync in temp dir)
 * Stage 6: QA Validation (ZIP header, file size, structure)
 *
 * If total time exceeds the limit, asset sourcing is skipped and
 * text-only output is delivered rather than failing entirely.
 */
export async function runNativePipeline(ctx: PipelineContext): Promise<PipelineResult> {
  const tag = `[Pipeline:${ctx.type}]`;
  const pipelineStart = Date.now();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `pipeline-${ctx.type}-`));
  console.log(`${tag} Starting pipeline for "${ctx.title}" in ${tempDir}`);

  const elapsed = () => Date.now() - pipelineStart;
  const remaining = () => PIPELINE_TIMEOUT_MS - elapsed();

  try {
    // ── Stage 1: Research ──
    let research;
    if (process.env.TAVILY_API_KEY) {
      ctx.onProgress("<<PHASE:search:Researching current data>>");
      try {
        research = await researchTopic(ctx.title, ctx.description, ctx.onProgress);
        if (research) {
          console.log(`${tag} Stage 1 OK in ${elapsed()}ms: ${research.findings.length} research findings`);
        } else {
          console.log(`${tag} Stage 1 SKIPPED: no research available`);
        }
      } catch (err) {
        console.warn(`${tag} Stage 1 FAILED (research) at ${elapsed()}ms, continuing without:`, err instanceof Error ? err.message : err);
        research = null;
      }
    } else {
      console.log(`${tag} Stage 1 SKIPPED: no TAVILY_API_KEY`);
      research = null;
    }

    // Text narration after research
    if (research) {
      const srcCount = research.findings.reduce((n, f) => n + f.sources.length, 0);
      ctx.onProgress(`<<TEXT:Found ${research.findings.length} research findings from ${srcCount} sources. Now planning content structure.>>`);
    }

    // ── Stage 2: Content Planning ──
    ctx.onProgress("<<PHASE:plan:Planning content structure>>");
    let plan;
    try {
      plan = await planContent(ctx, research);
      console.log(`${tag} Stage 2 OK in ${elapsed()}ms: plan has ${ctx.type === "pptx" ? plan.slides?.length + " slides" : ctx.type === "docx" ? plan.sections?.length + " sections" : plan.sheets?.length + " sheets"}`);
    } catch (err) {
      console.error(`${tag} Stage 2 FAILED (content planning) at ${elapsed()}ms:`, err instanceof Error ? err.message : err);
      throw err;
    }

    // Compute item count for narration + summary
    const itemCount = ctx.type === "pptx"
      ? `${plan.slides?.length ?? 0} slides`
      : ctx.type === "docx"
        ? `${plan.sections?.length ?? 0} sections`
        : `${plan.sheets?.length ?? 0} sheets`;

    // Text narration after planning
    ctx.onProgress(`<<TEXT:Content plan ready with ${itemCount}. Sourcing visual assets next.>>`);

    // ── Stage 3: Asset Sourcing (with timeout + skip on pipeline pressure) ──
    let assets: AssetManifest;
    const timeLeft = remaining();
    if (timeLeft < 90_000) {
      // Less than 90s left — skip assets to ensure we can still generate
      console.warn(`${tag} Stage 3 SKIPPED: only ${(timeLeft / 1000).toFixed(0)}s left, delivering text-only`);
      ctx.onProgress("<<PHASE:generate:Sourcing images and charts>>");
      ctx.onProgress("Skipped (time constraint)");
      assets = { images: new Map(), charts: new Map(), tempDir };
    } else {
      ctx.onProgress("<<PHASE:generate:Sourcing images and charts>>");
      try {
        assets = await withTimeout(
          sourceAssets(plan, tempDir, ctx),
          Math.min(ASSET_TIMEOUT_MS, timeLeft - 60_000), // leave 60s for gen+exec+qa
          "asset sourcing"
        );
        console.log(`${tag} Stage 3 OK in ${elapsed()}ms: ${assets.images.size} images, ${assets.charts.size} charts`);
      } catch (err) {
        // Asset timeout — degrade to text-only rather than failing
        console.warn(`${tag} Stage 3 TIMED OUT at ${elapsed()}ms, continuing without assets:`, err instanceof Error ? err.message : err);
        ctx.onProgress("Assets timed out, continuing without images");
        assets = { images: new Map(), charts: new Map(), tempDir };
      }
    }

    // Text narration after asset sourcing
    if (assets.images.size > 0 || assets.charts.size > 0) {
      ctx.onProgress(`<<TEXT:Collected ${assets.images.size} images and ${assets.charts.size} charts. Generating the file now.>>`);
    } else {
      ctx.onProgress(`<<TEXT:Building the file now.>>`);
    }

    // ── Stage 4+5+6: Generate, Execute, Validate (with stage-isolated retry) ──
    let code: string | null = null;
    let lastError: string | undefined;

    for (let attempt = 0; attempt < 3; attempt++) {
      // Check pipeline budget before attempting
      if (remaining() < 10_000) {
        throw new Error(`Pipeline timeout: ${(elapsed() / 1000).toFixed(0)}s elapsed, aborting`);
      }

      try {
        // Stage 4: Only regenerate if we don't have cached code
        if (!code) {
          ctx.onProgress(
            attempt === 0
              ? "<<PHASE:generate:Generating file code>>"
              : "<<PHASE:generate:Retrying code generation>>"
          );
          code = await generateSpec(plan, assets, ctx, lastError);
          console.log(`${tag} Stage 4 OK (attempt ${attempt + 1}) in ${elapsed()}ms: ${code.length} chars`);
        } else {
          ctx.onProgress("<<PHASE:generate:Retrying execution>>");
          console.log(`${tag} Stage 5 RETRY (attempt ${attempt + 1}) in ${elapsed()}ms: reusing cached code`);
        }

        // Stage 5: Code Execution
        ctx.onProgress("<<PHASE:generate:Building and validating>>");
        ctx.onProgress("Building file...");
        const { buffer } = executeGeneratedCode(code, tempDir, ctx.type);
        console.log(`${tag} Stage 5 OK in ${elapsed()}ms: output.${ctx.type} is ${buffer.length} bytes`);

        // Stage 6: QA Validation
        ctx.onProgress("Validating output...");
        const qa = validateOutput(buffer, ctx.type);

        if (!qa.valid) {
          lastError = `QA validation failed: ${qa.issues.join("; ")}`;
          code = null;  // QA failure = bad code, force regeneration
          console.warn(`${tag} Stage 6 FAILED (attempt ${attempt + 1}) at ${elapsed()}ms: ${lastError}`);
          if (attempt < 2) {
            ctx.onProgress("Validation failed, retrying...");
            continue;
          }
          throw new Error(lastError);
        }

        console.log(`${tag} Pipeline complete in ${elapsed()}ms — validation passed`);
        ctx.onProgress("File generated successfully!");

        // Build summary for LLM conclusion
        const summaryParts: string[] = [];
        if (research) summaryParts.push(`${research.findings.length} research topics analyzed`);
        summaryParts.push(itemCount);
        if (assets.images.size > 0) summaryParts.push(`${assets.images.size} images`);
        if (assets.charts.size > 0) summaryParts.push(`${assets.charts.size} charts`);

        // Generate preview HTML (non-blocking — don't fail pipeline if this errors)
        let previewHtml: string | undefined;
        try {
          previewHtml = generatePreviewHtml(plan, assets, ctx.type);
        } catch (previewErr) {
          console.warn(`${tag} Preview generation failed:`, previewErr instanceof Error ? previewErr.message : previewErr);
        }

        return { buffer, fileType: ctx.type, summary: summaryParts.join(", "), previewHtml };
      } catch (err) {
        if (err instanceof CodeSafetyError) {
          code = null;  // Safety error = bad code, force regeneration
          lastError = `SAFETY SCAN FAILED: ${err.message}\n` +
            `You triggered a safety rule. Fix: never use process.env for file output.\n` +
            `The ONLY correct pattern is: require('path').join(__PIPELINE_OUTPUT_DIR__, 'output.${ctx.type}')`;
        } else {
          lastError = err instanceof Error ? err.message : String(err);
          // Code-related errors → force regeneration. Transient errors → keep cached code.
          const isCodeError = /shape parameter|ShapeType|addShape|Cannot find module|SyntaxError|ReferenceError|TypeError|is not a function|Unexpected token/i.test(lastError);
          if (isCodeError) code = null;
          // Add shape-specific guidance for pptx shape errors
          if (ctx.type === "pptx" && /shape parameter|ShapeType|addShape/i.test(lastError)) {
            lastError += `\n\nSHAPE TYPE FIX: Use exact camelCase names from pres.ShapeType:\n` +
              `  pres.ShapeType.rect       (for rectangles)\n` +
              `  pres.ShapeType.roundRect  (for rounded rectangles)\n` +
              `  pres.ShapeType.ellipse    (for circles/ovals)\n` +
              `  pres.ShapeType.line       (for lines)\n` +
              `NEVER use uppercase like RECT, RECTANGLE, ROUND_RECT.`;
          }
        }
        console.error(`${tag} Attempt ${attempt + 1} FULL error at ${elapsed()}ms:`, err);
        try {
          const dirContents = fs.readdirSync(tempDir).join(", ");
          console.error(`${tag} Dir contents after attempt ${attempt + 1}: ${dirContents}`);
        } catch {}
        if (attempt < 2) {
          continue;
        }
        throw err;
      }
    }

    throw new Error(`Pipeline failed after 3 attempts: ${lastError}`);
  } finally {
    console.log(`${tag} Total pipeline time: ${elapsed()}ms`);
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${label} (${ms}ms)`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}
