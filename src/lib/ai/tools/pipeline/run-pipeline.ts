import fs from "fs";
import os from "os";
import path from "path";
import { planContent } from "./content-planner";
import { sourceAssets } from "./asset-sourcer";
import { generateSpec } from "./spec-generator";
import { executeGeneratedCode, CodeSafetyError } from "./code-executor";
import { validateOutput } from "./qa-checker";
import type { PipelineContext } from "./types";

export interface PipelineResult {
  buffer: Buffer;
  fileType: "pptx" | "docx" | "xlsx";
}

/**
 * Main orchestrator: chains stages 1-5 with SSE progress and retry logic.
 *
 * Stage 1: Content Planning (LLM -> structured JSON plan)
 * Stage 2: Asset Sourcing (parallel: Brave image search + chart PNGs)
 * Stage 3: Spec Generation (LLM -> executable JS code)
 * Stage 4: Code Execution (execFileSync in temp dir)
 * Stage 5: QA Validation (ZIP header, file size, structure)
 */
export async function runNativePipeline(ctx: PipelineContext): Promise<PipelineResult> {
  const tag = `[Pipeline:${ctx.type}]`;
  // Create temp working directory
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `pipeline-${ctx.type}-`));
  console.log(`${tag} Starting pipeline for "${ctx.title}" in ${tempDir}`);

  try {
    // ── Stage 1: Content Planning ──
    ctx.onProgress("Stage 1/5: Planning content...");
    let plan;
    try {
      plan = await planContent(ctx);
      console.log(`${tag} Stage 1 OK: plan has ${ctx.type === "pptx" ? plan.slides?.length + " slides" : ctx.type === "docx" ? plan.sections?.length + " sections" : plan.sheets?.length + " sheets"}`);
    } catch (err) {
      console.error(`${tag} Stage 1 FAILED (content planning):`, err instanceof Error ? err.message : err);
      throw err;
    }

    // ── Stage 2: Asset Sourcing ──
    ctx.onProgress("Stage 2/5: Sourcing assets...");
    let assets;
    try {
      assets = await sourceAssets(plan, tempDir, ctx);
      console.log(`${tag} Stage 2 OK: ${assets.images.size} images, ${assets.charts.size} charts`);
    } catch (err) {
      console.error(`${tag} Stage 2 FAILED (asset sourcing):`, err instanceof Error ? err.message : err);
      throw err;
    }

    // ── Stage 3+4+5: Generate, Execute, Validate (with retry) ──
    let lastError: string | undefined;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        // Stage 3: Spec Generation
        ctx.onProgress(
          attempt === 0
            ? "Stage 3/5: Generating code..."
            : "Stage 3/5: Retrying code generation..."
        );
        const code = await generateSpec(plan, assets, ctx, lastError);
        console.log(`${tag} Stage 3 OK (attempt ${attempt + 1}): ${code.length} chars of code generated`);

        // Stage 4: Code Execution
        ctx.onProgress("Stage 4/5: Executing generated code...");
        const { buffer } = executeGeneratedCode(code, tempDir, ctx.type);
        console.log(`${tag} Stage 4 OK: output.${ctx.type} is ${buffer.length} bytes`);

        // Stage 5: QA Validation
        ctx.onProgress("Stage 5/5: Validating output...");
        const qa = validateOutput(buffer, ctx.type);

        if (!qa.valid) {
          lastError = `QA validation failed: ${qa.issues.join("; ")}`;
          console.warn(`${tag} Stage 5 FAILED (attempt ${attempt + 1}): ${lastError}`);
          if (attempt === 0) {
            ctx.onProgress("Validation failed, retrying...");
            continue;
          }
          throw new Error(lastError);
        }

        console.log(`${tag} Stage 5 OK: validation passed`);
        ctx.onProgress("File generated successfully!");
        return { buffer, fileType: ctx.type };
      } catch (err) {
        if (err instanceof CodeSafetyError) {
          lastError = `SAFETY SCAN FAILED: ${err.message}\n` +
            `You triggered a safety rule. Fix: never use process.env for file output.\n` +
            `The ONLY correct pattern is: require('path').join(__PIPELINE_OUTPUT_DIR__, 'output.${ctx.type}')`;
        } else {
          lastError = err instanceof Error ? err.message : String(err);
        }
        console.error(`${tag} Attempt ${attempt + 1} FULL error:`, err);
        // Log dir contents to help diagnose stage 4 issues
        try {
          const dirContents = fs.readdirSync(tempDir).join(", ");
          console.error(`${tag} Dir contents after attempt ${attempt + 1}: ${dirContents}`);
        } catch {}
        if (attempt === 0) {
          continue;
        }
        throw err;
      }
    }

    // Should not reach here, but just in case
    throw new Error(`Pipeline failed after 2 attempts: ${lastError}`);
  } finally {
    // Cleanup temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}
