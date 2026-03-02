import { callLLM } from "@/lib/ai/call";
import { MODELS } from "@/lib/ai/model-router";
import { getContentPlanPrompt } from "./prompts/content-plan-system";
import type { PipelineContext, ContentPlan } from "./types";

/**
 * Stage 1: Call LLM to generate a structured content plan.
 * Returns a ContentPlan JSON object describing what to build.
 */
export async function planContent(ctx: PipelineContext): Promise<ContentPlan> {
  ctx.onProgress("Planning content structure...");

  const systemPrompt = getContentPlanPrompt(ctx.type);

  const userMessage = buildUserMessage(ctx);

  const response = await callLLM({
    model: MODELS.NUCLEAR_SONNET,
    maxTokens: 8000,
    systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content.trim();

  // Parse JSON from response (handle possible markdown fences)
  let json = text;
  if (json.startsWith("```")) {
    json = json.replace(/^```(?:json)?\n?/, "").replace(/\n?```\s*$/, "");
  }

  let plan: ContentPlan;
  try {
    plan = JSON.parse(json);
  } catch {
    // Attempt JSON repair for truncated responses
    const repaired = tryRepairTruncatedJson(json);
    if (repaired) {
      plan = repaired;
    } else {
      throw new Error(
        `Content planner returned invalid JSON.\nFirst 500 chars: ${text.slice(0, 500)}`
      );
    }
  }

  // Validate basic structure
  if (!plan.title || !plan.theme) {
    throw new Error("Content plan missing required fields: title, theme");
  }

  if (ctx.type === "pptx" && (!plan.slides || plan.slides.length === 0)) {
    throw new Error("PPTX content plan missing slides array");
  }
  if (ctx.type === "docx" && (!plan.sections || plan.sections.length === 0)) {
    throw new Error("DOCX content plan missing sections array");
  }
  if (ctx.type === "xlsx" && (!plan.sheets || plan.sheets.length === 0)) {
    throw new Error("XLSX content plan missing sheets array");
  }

  ctx.onProgress(`Content plan ready: ${describeplan(plan, ctx.type)}`);
  return plan;
}

function buildUserMessage(ctx: PipelineContext): string {
  const parts: string[] = [
    `File type: ${ctx.type.toUpperCase()}`,
    `Title: ${ctx.title}`,
    `Description: ${ctx.description}`,
    `Language: ${ctx.language}`,
  ];

  if (ctx.type === "pptx") {
    parts.push(`Style: ${ctx.style}`);
    const slideCount = Math.min(ctx.slideCount ?? 10, 20);
    parts.push(`Slide count: ${slideCount}`);
  }

  return parts.join("\n");
}

/**
 * Attempt to repair truncated JSON by finding the last complete object
 * in an array and closing the structure.
 */
function tryRepairTruncatedJson(raw: string): ContentPlan | null {
  // Only attempt repair if JSON looks truncated (doesn't end with })
  const trimmed = raw.trimEnd();
  if (trimmed.endsWith("}")) return null;

  // Find the last complete object boundary: "},\n" or "}\n" inside an array
  const lastCompleteObj = trimmed.lastIndexOf("}");
  if (lastCompleteObj === -1) return null;

  // Walk back to find if we're inside an array value
  let candidate = trimmed.slice(0, lastCompleteObj + 1);

  // Close any open arrays and the root object
  // Count unmatched brackets
  let openBraces = 0;
  let openBrackets = 0;
  for (const ch of candidate) {
    if (ch === "{") openBraces++;
    else if (ch === "}") openBraces--;
    else if (ch === "[") openBrackets++;
    else if (ch === "]") openBrackets--;
  }

  // Remove any trailing comma before closing
  candidate = candidate.replace(/,\s*$/, "");
  candidate += "]".repeat(openBrackets) + "}".repeat(openBraces);

  try {
    const plan = JSON.parse(candidate) as ContentPlan;
    const slideCount = plan.slides?.length ?? plan.sections?.length ?? plan.sheets?.length ?? 0;
    console.warn(`[Pipeline] JSON was truncated, repaired to ${slideCount} slides`);
    return plan;
  } catch {
    return null;
  }
}

function describeplan(plan: ContentPlan, type: string): string {
  if (type === "pptx" && plan.slides) {
    return `${plan.slides.length} slides planned`;
  }
  if (type === "docx" && plan.sections) {
    return `${plan.sections.length} sections planned`;
  }
  if (type === "xlsx" && plan.sheets) {
    return `${plan.sheets.length} sheets planned`;
  }
  return "plan complete";
}
