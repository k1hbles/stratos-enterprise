import type { DirectorConfig, DirectorResult } from "./types";
import type { AgentContext, ToolResult } from "@/lib/ai/agent/types";
import type { JobWithDetails } from "@/types/jobs";
import { callLLM } from "@/lib/ai/call";
import type { LLMMessage, LLMContentBlock, LLMToolDef } from "@/lib/ai/call";
import { SECONDARY_MODEL } from "@/lib/ai/model-router";
import { getToolsByNames } from "@/lib/ai/tools/registry";
import { logAction } from "@/lib/security/audit";
import { createSanitizationSession } from "@/lib/security/sanitizer";
import { buildDirectorSystemPrompt } from "./build-prompt";

const MAX_ITERATIONS = 12;

export interface DirectorRunOptions {
  userId: string;
  sessionId: string;
  currentState?: string;
  onToolCall?: (toolName: string, args: Record<string, unknown>) => void;
  onToolResult?: (toolName: string, result: ToolResult) => void;
  onText?: (text: string) => void;
}

/**
 * Run a director agent with a specific goal.
 * Directors get a curated set of tools and their own system prompt.
 * Returns a summary of findings and structured result data.
 */
export async function runDirector(
  director: DirectorConfig,
  goal: string,
  context: string,
  options?: DirectorRunOptions,
): Promise<DirectorResult> {
  const startTime = Date.now();
  let totalTokens = 0;
  let toolCallsCount = 0;

  const model = SECONDARY_MODEL;

  // Resolve tools from whitelist
  const tools = getToolsByNames(director.toolWhitelist);
  const llmTools: LLMToolDef[] = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }));

  const rawSystemPrompt = buildDirectorSystemPrompt(
    director,
    context,
    options?.currentState ?? ""
  );

  // Sanitize system prompt to anonymize entities
  const sanitizer = options?.userId
    ? createSanitizationSession(options.userId)
    : null;
  const systemPrompt = sanitizer ? sanitizer.sanitize(rawSystemPrompt) : rawSystemPrompt;

  // Build minimal AgentContext shim for tool execution
  const agentCtx: AgentContext = {
    userId: options?.userId ?? "council",
    stepCounter: 0,
    totalTokensUsed: 0,
    job: {
      id: options?.sessionId ?? `director-${director.slug}`,
      user_id: options?.userId ?? "council",
      title: `Director: ${director.displayName}`,
      description: goal,
      task_type: "research",
      status: "running",
      priority: 1,
      output_format: "auto",
      steps_completed: 0,
      total_steps: null,
      current_step_description: null,
      started_at: new Date().toISOString(),
      completed_at: null,
      error_message: null,
      tokens_used: 0,
      estimated_cost: 0,
      conversation_id: null,
      trigger_run_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      files: [],
      results: [],
      steps: [],
    } as JobWithDetails,
  };

  const messages: LLMMessage[] = [
    { role: "user", content: goal },
  ];

  let summaryText = "";

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await callLLM({
      model,
      systemPrompt,
      messages,
      ...(llmTools.length > 0 ? { tools: llmTools } : {}),
    });

    totalTokens += (response.inputTokens ?? 0) + (response.outputTokens ?? 0);

    // Collect text
    if (response.content) {
      summaryText += response.content + "\n";
      options?.onText?.(response.content);
    }

    // Check for tool calls
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
          content: JSON.stringify({ error: `Unknown tool: ${tc.name}` }),
          is_error: true,
        });
        continue;
      }

      toolCallsCount++;
      options?.onToolCall?.(tc.name, tc.input);

      let result: ToolResult;
      const toolStart = Date.now();

      try {
        result = await tool.execute(tc.input, agentCtx);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Tool execution failed";
        result = { success: false, data: { error: errMsg } };
      }

      const durationMs = Date.now() - toolStart;
      options?.onToolResult?.(tc.name, result);

      // Audit log
      logAction({
        userId: options?.userId ?? "council",
        sessionId: options?.sessionId,
        directorSlug: director.slug,
        toolName: tc.name,
        toolArgs: tc.input,
        resultSummary: result.success
          ? "success"
          : String(result.data.error ?? "failed"),
        success: result.success,
        durationMs,
      });

      toolResultBlocks.push({
        type: "tool_result",
        tool_use_id: tc.id,
        content: JSON.stringify(result.data),
        is_error: !result.success,
      });
    }

    // Append assistant response + tool results to conversation
    messages.push({ role: "assistant", content: assistantBlocks });
    messages.push({ role: "user", content: toolResultBlocks });
  }

  // Restore sanitized placeholders back to real values
  const finalSummary = sanitizer
    ? sanitizer.restore(summaryText.trim())
    : summaryText.trim();

  return {
    directorSlug: director.slug,
    summary: finalSummary,
    resultData: { analysis: finalSummary, toolCallsCount },
    tokensUsed: totalTokens,
    durationMs: Date.now() - startTime,
  };
}
