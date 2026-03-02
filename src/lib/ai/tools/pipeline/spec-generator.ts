import { callLLM } from "@/lib/ai/call";
import { MODELS } from "@/lib/ai/model-router";
import { PPTX_SPEC_SYSTEM_PROMPT } from "./prompts/pptx-system";
import { DOCX_SPEC_SYSTEM_PROMPT } from "./prompts/docx-system";
import { XLSX_SPEC_SYSTEM_PROMPT } from "./prompts/xlsx-system";
import type { PipelineContext, ContentPlan, AssetManifest } from "./types";
import path from "path";
import fs from "fs";

const SYSTEM_PROMPTS: Record<string, string> = {
  pptx: PPTX_SPEC_SYSTEM_PROMPT,
  docx: DOCX_SPEC_SYSTEM_PROMPT,
  xlsx: XLSX_SPEC_SYSTEM_PROMPT,
};

/**
 * Stage 3: Call LLM to generate executable JavaScript code
 * that builds the output file using pptxgenjs/docx/exceljs.
 */
export async function generateSpec(
  plan: ContentPlan,
  assets: AssetManifest,
  ctx: PipelineContext,
  retryError?: string
): Promise<string> {
  ctx.onProgress(
    retryError ? "Retrying code generation with error feedback..." : "Generating file code..."
  );

  const systemPrompt = SYSTEM_PROMPTS[ctx.type];
  if (!systemPrompt) {
    throw new Error(`No system prompt for file type: ${ctx.type}`);
  }

  const userMessage = buildSpecUserMessage(plan, assets, ctx, retryError);

  const response = await callLLM({
    model: MODELS.AGENTIC,
    maxTokens: 16384,
    systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  let code = response.content.trim();

  // Strip markdown fences if present
  if (code.startsWith("```")) {
    code = code.replace(/^```(?:javascript|js|typescript|ts)?\n?/, "");
    code = code.replace(/\n?```\s*$/, "");
  }

  if (!code || code.length < 100) {
    throw new Error("Spec generator returned insufficient code");
  }

  ctx.onProgress(`Code generated: ${code.length} characters`);
  return code;
}

function buildSpecUserMessage(
  plan: ContentPlan,
  assets: AssetManifest,
  ctx: PipelineContext,
  retryError?: string
): string {
  const parts: string[] = [];

  // Content plan
  parts.push("=== CONTENT PLAN ===");
  parts.push(JSON.stringify(plan, null, 2));

  // Asset manifest
  parts.push("\n=== AVAILABLE ASSETS ===");
  parts.push(buildAssetList(assets));

  // Theme
  parts.push("\n=== THEME COLORS ===");
  parts.push(`Background: ${plan.theme.background}`);
  parts.push(`Surface: ${plan.theme.surface}`);
  parts.push(`Border: ${plan.theme.border}`);
  parts.push(`Text: ${plan.theme.text}`);
  parts.push(`Muted: ${plan.theme.muted}`);
  parts.push(`Accent: ${plan.theme.accent}`);
  parts.push(`Accent 2: ${plan.theme.accent2}`);

  // Language
  parts.push(`\nLanguage: ${ctx.language} (use this language for ALL text content)`);

  // Retry context
  if (retryError) {
    parts.push("\n=== PREVIOUS ATTEMPT FAILED ===");
    parts.push("The previous code produced an error. Fix the issue and generate corrected code:");
    parts.push(retryError);
  }

  parts.push(`\nGenerate the COMPLETE runnable JavaScript code. Output file: output.${ctx.type}`);

  return parts.join("\n");
}

function buildAssetList(assets: AssetManifest): string {
  const lines: string[] = [];

  if (assets.images.size === 0 && assets.charts.size === 0) {
    lines.push("No assets available. Use shape placeholders for visual elements.");
    return lines.join("\n");
  }

  for (const [index, filePath] of assets.images) {
    const fileName = path.basename(filePath);
    const size = fs.statSync(filePath).size;
    lines.push(`Image: ./${fileName} (index ${index}, ${(size / 1024).toFixed(0)}KB)`);
  }

  for (const [index, filePath] of assets.charts) {
    const fileName = path.basename(filePath);
    const size = fs.statSync(filePath).size;
    lines.push(`Chart: ./${fileName} (index ${index}, ${(size / 1024).toFixed(0)}KB)`);
  }

  return lines.join("\n");
}
