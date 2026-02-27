import type { AgentContext, AgentTool, ToolResult, OutputFile } from "./types";
import { getDb } from "@/lib/db";
import { callLLM } from "@/lib/ai/call";
import type { LLMMessage, LLMContentBlock, LLMToolDef } from "@/lib/ai/call";
import { SECONDARY_MODEL } from "@/lib/ai/model-router";
import { logAction } from "@/lib/security/audit";

const MAX_ITERATIONS = 15;

function insertJobStep(
  ctx: AgentContext,
  toolName: string,
  toolInput: Record<string, unknown>
): string {
  ctx.stepCounter++;
  const db = getDb();
  const id = crypto.randomUUID();
  const description = buildStepDescription(toolName, toolInput);

  db.prepare(
    `INSERT INTO job_steps (id, job_id, step_number, tool_name, description, status, reasoning, result_data)
     VALUES (?, ?, ?, ?, ?, 'running', ?, NULL)`
  ).run(
    id,
    ctx.job.id,
    ctx.stepCounter,
    toolName,
    description,
    toolName === "think" ? String(toolInput.reasoning ?? "") : null
  );

  // Update job progress
  db.prepare(
    "UPDATE jobs SET steps_completed = ?, current_step_description = ? WHERE id = ?"
  ).run(ctx.stepCounter, description, ctx.job.id);

  return id;
}

function buildStepDescription(
  toolName: string,
  input: Record<string, unknown>
): string {
  switch (toolName) {
    case "web_search":
      return `Searching: "${input.query}"`;
    case "web_fetch":
      return `Reading: ${input.url}`;
    case "parse_file":
      return `Parsing file ${input.file_id}`;
    case "create_chart":
      return "Generating chart with Python";
    case "generate_document":
    case "generate_pdf":
    case "generate_spreadsheet":
      return `Generating ${input.format ?? "document"}: ${input.title}`;
    case "think":
      return "Analyzing and planning...";
    case "get_current_time":
      return "Getting current time";
    default:
      return `Running ${toolName}`;
  }
}

function updateJobStep(
  ctx: AgentContext,
  stepId: string,
  result: ToolResult,
  durationMs: number
): void {
  const db = getDb();
  db.prepare(
    "UPDATE job_steps SET status = ?, result_data = ?, duration_ms = ? WHERE id = ?"
  ).run(
    result.success ? "completed" : "failed",
    JSON.stringify(result.data),
    durationMs,
    stepId
  );
}

function insertJobResult(ctx: AgentContext, file: OutputFile): void {
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO job_results (id, job_id, result_type, file_name, storage_path, file_size, content_markdown) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    ctx.job.id,
    file.resultType,
    file.fileName,
    file.storagePath,
    file.fileSize,
    file.contentMarkdown ?? null
  );
}

export async function executeAgentLoop(
  ctx: AgentContext,
  systemPrompt: string,
  goal: string,
  tools: AgentTool[]
): Promise<string> {
  const llmTools: LLMToolDef[] = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }));

  const messages: LLMMessage[] = [
    { role: "user", content: goal },
  ];

  let summaryText = "";

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    let response;
    try {
      response = await callLLM({
        model: SECONDARY_MODEL,
        systemPrompt,
        messages,
        tools: llmTools,
      });
    } catch (err) {
      console.error(
        `[Agent] LLM API error at iteration ${iteration}:`,
        err
      );
      throw err;
    }

    // Track token usage
    ctx.totalTokensUsed +=
      (response.inputTokens ?? 0) + (response.outputTokens ?? 0);

    // Collect text for summary
    if (response.content) {
      summaryText += response.content + "\n";
    }

    // Check if LLM wants to use tools
    if (response.toolCalls.length === 0) {
      break;
    }

    // Build assistant content blocks for conversation history
    const assistantBlocks: LLMContentBlock[] = [];
    if (response.content) {
      assistantBlocks.push({ type: "text", text: response.content });
    }
    for (const tc of response.toolCalls) {
      assistantBlocks.push({
        type: "tool_use",
        id: tc.id,
        name: tc.name,
        input: tc.input,
      });
    }

    // Execute each tool call
    const toolResultBlocks: LLMContentBlock[] = [];

    for (const tc of response.toolCalls) {
      const tool = tools.find((t) => t.name === tc.name);
      if (!tool) {
        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: tc.id,
          content: JSON.stringify({
            error: `Unknown tool: ${tc.name}`,
          }),
          is_error: true,
        });
        continue;
      }

      let stepId: string;
      let result: ToolResult;
      const startTime = Date.now();

      try {
        stepId = insertJobStep(ctx, tc.name, tc.input);
      } catch (err) {
        console.error("[Agent] Failed to insert step:", err);
        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: tc.id,
          content: JSON.stringify({ error: "Internal error recording step" }),
          is_error: true,
        });
        continue;
      }

      try {
        result = await tool.execute(tc.input, ctx);
      } catch (err) {
        const errMsg =
          err instanceof Error ? err.message : "Tool execution failed";
        result = { success: false, data: { error: errMsg } };
      }

      const durationMs = Date.now() - startTime;

      try {
        updateJobStep(ctx, stepId, result, durationMs);
      } catch (err) {
        console.error("[Agent] Failed to update step:", err);
      }

      // Audit log
      logAction({
        userId: ctx.userId,
        jobId: ctx.job.id,
        toolName: tc.name,
        toolArgs: tc.input,
        resultSummary: result.success
          ? "success"
          : String(result.data.error ?? "failed"),
        success: result.success,
        durationMs,
      });

      // Store any output files as job results
      if (result.output_files) {
        for (const file of result.output_files) {
          try {
            insertJobResult(ctx, file);
          } catch (err) {
            console.error("[Agent] Failed to insert result:", err);
          }
        }
      }

      toolResultBlocks.push({
        type: "tool_result",
        tool_use_id: tc.id,
        content: JSON.stringify(result.data),
        is_error: !result.success,
      });
    }

    // Append assistant response and tool results to conversation
    messages.push({ role: "assistant", content: assistantBlocks });
    messages.push({ role: "user", content: toolResultBlocks });
  }

  // Update final token count
  const db = getDb();
  db.prepare("UPDATE jobs SET tokens_used = ? WHERE id = ?").run(
    ctx.totalTokensUsed,
    ctx.job.id
  );

  return summaryText.trim();
}
