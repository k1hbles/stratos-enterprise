import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { NUCLEAR_MODELS } from '@/lib/ai/model-router';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Normalized types ────────────────────────────────────────────────────────

export type LLMContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; mediaType: string; data: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

export interface LLMMessage {
  role: "user" | "assistant";
  content: string | LLMContentBlock[];
}

export interface LLMToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface LLMToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  toolCalls: LLMToolCall[];
  stopReason: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface LLMCallOptions {
  model: string;
  messages: LLMMessage[];
  systemPrompt?: string;
  tools?: LLMToolDef[];
  maxTokens?: number;
  onToken?: (token: string) => void | Promise<void>;
}

// ── Clients ─────────────────────────────────────────────────────────────────

const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
});

const openRouterClient = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    'X-Title': 'Stratos Intelligence',
  },
});

// ── Cost tracking ───────────────────────────────────────────────────────────

const COSTS: Record<string, [number, number]> = {
  'minimax/minimax-m2.5': [0.30, 1.20],
  'moonshotai/kimi-k2-thinking': [0.50, 3.00],
  'moonshotai/kimi-k2.5': [0.50, 2.80],
  'z-ai/glm-5': [0.80, 2.56],
  'claude-sonnet-4-6': [3.00, 15.00],
  'claude-opus-4-6': [5.00, 25.00],
};

function logCost(model: string, inputTokens?: number, outputTokens?: number) {
  const rates = COSTS[model];
  if (!rates || !inputTokens || !outputTokens) return;
  const cost = (inputTokens / 1_000_000) * rates[0] + (outputTokens / 1_000_000) * rates[1];
  console.log(`[Cost] ${model} | in:${inputTokens} out:${outputTokens} | $${cost.toFixed(6)}`);
}

// ── Main dispatch ───────────────────────────────────────────────────────────

const FALLBACK_MODEL = 'minimax/minimax-m2.5';

export async function callLLM(opts: LLMCallOptions): Promise<LLMResponse> {
  const caller = NUCLEAR_MODELS.has(opts.model) ? callAnthropic : callOpenRouter;
  try {
    return await caller(opts);
  } catch (err) {
    // If the primary model fails and it's not already the fallback, retry
    if (opts.model !== FALLBACK_MODEL && !NUCLEAR_MODELS.has(opts.model)) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[callLLM] ${opts.model} failed (${msg.slice(0, 120)}), falling back to ${FALLBACK_MODEL}`
      );
      return callOpenRouter({ ...opts, model: FALLBACK_MODEL });
    }
    throw err;
  }
}

// ── OpenRouter adapter (OpenAI SDK) ─────────────────────────────────────────

async function callOpenRouter(opts: LLMCallOptions): Promise<LLMResponse> {
  const messages = toOpenAIMessages(opts.messages, opts.systemPrompt);
  const tools = opts.tools && opts.tools.length > 0
    ? opts.tools.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        },
      }))
    : undefined;

  const maxTokens = opts.maxTokens ?? 8192;

  if (opts.onToken) {
    // Streaming path
    const stream = await openRouterClient.chat.completions.create({
      model: opts.model,
      max_tokens: maxTokens,
      messages: messages as any,
      ...(tools ? { tools } : {}),
      stream: true,
    });

    let content = "";
    const toolCallBuffers = new Map<number, { id: string; name: string; args: string }>();
    let finishReason = "stop";
    let promptTokens: number | undefined;
    let completionTokens: number | undefined;

    for await (const chunk of stream) {
      const choice = chunk.choices?.[0];
      if (!choice) continue;

      if (choice.finish_reason) {
        finishReason = choice.finish_reason;
      }

      const delta = choice.delta;
      if (delta?.content) {
        content += delta.content;
        await opts.onToken(delta.content);
      }

      // Tool call deltas
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          if (!toolCallBuffers.has(idx)) {
            toolCallBuffers.set(idx, { id: tc.id ?? "", name: tc.function?.name ?? "", args: "" });
          }
          const buf = toolCallBuffers.get(idx)!;
          if (tc.id) buf.id = tc.id;
          if (tc.function?.name) buf.name = tc.function.name;
          if (tc.function?.arguments) buf.args += tc.function.arguments;
        }
      }

      // Usage (sometimes in the last chunk)
      if (chunk.usage) {
        promptTokens = chunk.usage.prompt_tokens;
        completionTokens = chunk.usage.completion_tokens;
      }
    }

    const toolCalls: LLMToolCall[] = [];
    for (const buf of toolCallBuffers.values()) {
      let input: Record<string, unknown> = {};
      try { input = JSON.parse(buf.args); } catch { input = {}; }
      toolCalls.push({ id: buf.id, name: buf.name, input });
    }

    const stopReason = finishReason === "tool_calls" ? "tool_use" : "end_turn";
    const response: LLMResponse = {
      content,
      toolCalls,
      stopReason,
      provider: "openrouter",
      model: opts.model,
      inputTokens: promptTokens,
      outputTokens: completionTokens,
    };

    logCost(opts.model, response.inputTokens, response.outputTokens);
    return response;
  }

  // Non-streaming path
  const raw = await openRouterClient.chat.completions.create({
    model: opts.model,
    max_tokens: maxTokens,
    messages: messages as any,
    ...(tools ? { tools } : {}),
  });

  const choice = raw.choices?.[0];
  const toolCalls: LLMToolCall[] = (choice?.message?.tool_calls ?? []).map((tc: any) => {
    let input: Record<string, unknown> = {};
    try { input = JSON.parse(tc.function?.arguments ?? "{}"); } catch { input = {}; }
    return { id: tc.id, name: tc.function?.name ?? "", input };
  });

  const stopReason = choice?.finish_reason === "tool_calls" ? "tool_use" : "end_turn";
  const response: LLMResponse = {
    content: choice?.message?.content ?? "",
    toolCalls,
    stopReason,
    provider: "openrouter",
    model: opts.model,
    inputTokens: raw.usage?.prompt_tokens,
    outputTokens: raw.usage?.completion_tokens,
  };

  logCost(opts.model, response.inputTokens, response.outputTokens);
  return response;
}

/** Convert our internal messages to OpenAI chat format */
function toOpenAIMessages(
  messages: LLMMessage[],
  systemPrompt?: string
): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];

  if (systemPrompt) {
    out.push({ role: "system", content: systemPrompt });
  }

  for (const msg of messages) {
    if (typeof msg.content === "string") {
      out.push({ role: msg.role, content: msg.content });
      continue;
    }

    // Content blocks — need to split into OpenAI format
    if (msg.role === "assistant") {
      // Collect text + tool_use blocks
      let text = "";
      const toolCalls: Record<string, unknown>[] = [];
      for (const block of msg.content) {
        if (block.type === "text") text += block.text;
        else if (block.type === "tool_use") {
          toolCalls.push({
            id: block.id,
            type: "function",
            function: {
              name: block.name,
              arguments: JSON.stringify(block.input),
            },
          });
        }
      }
      const assistantMsg: Record<string, unknown> = { role: "assistant" };
      if (text) assistantMsg.content = text;
      if (toolCalls.length > 0) assistantMsg.tool_calls = toolCalls;
      out.push(assistantMsg);
    } else {
      // User message — may contain tool_result blocks
      const toolResults = msg.content.filter((b) => b.type === "tool_result");
      const textBlocks = msg.content.filter((b) => b.type === "text");

      // Emit tool results as separate "tool" role messages
      for (const block of toolResults) {
        if (block.type === "tool_result") {
          out.push({
            role: "tool",
            tool_call_id: block.tool_use_id,
            content: block.content,
          });
        }
      }

      // Build user message content — multimodal if images present
      const imageBlocks = msg.content.filter((b) => b.type === "image");
      if (imageBlocks.length > 0) {
        const contentArr: unknown[] = [];
        for (const block of imageBlocks) {
          if (block.type === "image") {
            contentArr.push({ type: "image_url", image_url: { url: `data:${block.mediaType};base64,${block.data}` } });
          }
        }
        const textContent = textBlocks.map((b) => b.type === "text" ? b.text : "").join("");
        if (textContent) contentArr.push({ type: "text", text: textContent });
        if (contentArr.length > 0) out.push({ role: "user", content: contentArr });
      } else if (textBlocks.length > 0) {
        const text = textBlocks.map((b) => b.type === "text" ? b.text : "").join("");
        if (text) out.push({ role: "user", content: text });
      }
    }
  }

  return out;
}

// ── Anthropic adapter (direct API only, for nuclear models) ─────────────────

async function callAnthropic(opts: LLMCallOptions): Promise<LLMResponse> {
  const messages = opts.messages.map(toAnthropicMessage);
  const tools = opts.tools?.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }));

  const maxTokens = opts.maxTokens ?? 8192;

  const params: Record<string, unknown> = {
    model: opts.model,
    max_tokens: maxTokens,
    messages,
    ...(opts.systemPrompt ? { system: opts.systemPrompt } : {}),
    ...(tools && tools.length > 0 ? { tools } : {}),
  };

  if (opts.onToken) {
    // Streaming path (supports tools)
    const stream = anthropicClient.messages.stream(params as any);
    let content = "";
    const toolInputBuffers = new Map<number, { id: string; name: string; json: string }>();

    for await (const event of stream) {
      if (event.type === "content_block_start") {
        const block = (event as any).content_block;
        if (block?.type === "tool_use") {
          toolInputBuffers.set((event as any).index, { id: block.id, name: block.name, json: "" });
        }
      } else if (event.type === "content_block_delta") {
        const delta = (event as any).delta;
        if (delta?.type === "text_delta") {
          content += delta.text;
          await opts.onToken(delta.text);
        } else if (delta?.type === "input_json_delta") {
          const buf = toolInputBuffers.get((event as any).index);
          if (buf) buf.json += delta.partial_json;
        }
      }
    }

    const toolCalls: LLMToolCall[] = [];
    for (const buf of toolInputBuffers.values()) {
      let input: Record<string, unknown> = {};
      try { input = JSON.parse(buf.json); } catch { input = {}; }
      toolCalls.push({ id: buf.id, name: buf.name, input });
    }

    const final = await stream.finalMessage();
    const response: LLMResponse = {
      content,
      toolCalls,
      stopReason: final.stop_reason ?? "end_turn",
      provider: "anthropic",
      model: opts.model,
      inputTokens: final.usage?.input_tokens,
      outputTokens: final.usage?.output_tokens,
    };

    logCost(opts.model, response.inputTokens, response.outputTokens);
    return response;
  }

  // Non-streaming path
  const raw = await anthropicClient.messages.create(params as any);
  const response = fromAnthropicResponse(raw as any, opts.model);

  logCost(opts.model, response.inputTokens, response.outputTokens);
  return response;
}

function fromAnthropicResponse(
  res: { content: Array<{ type: string; text?: string; id?: string; name?: string; input?: unknown }>; stop_reason?: string | null; usage?: { input_tokens?: number; output_tokens?: number } },
  model: string
): LLMResponse {
  let content = "";
  const toolCalls: LLMToolCall[] = [];

  for (const block of res.content) {
    if (block.type === "text" && block.text) {
      content += block.text;
    } else if (block.type === "tool_use") {
      toolCalls.push({
        id: block.id!,
        name: block.name!,
        input: block.input as Record<string, unknown>,
      });
    }
  }

  return {
    content,
    toolCalls,
    stopReason: res.stop_reason ?? "end_turn",
    provider: "anthropic",
    model,
    inputTokens: res.usage?.input_tokens,
    outputTokens: res.usage?.output_tokens,
  };
}

function toAnthropicMessage(msg: LLMMessage): { role: string; content: unknown } {
  if (typeof msg.content === "string") {
    return { role: msg.role, content: msg.content };
  }

  // Content blocks — pass through as-is (our format mirrors Anthropic)
  return {
    role: msg.role,
    content: msg.content.map((block) => {
      if (block.type === "text") return { type: "text", text: block.text };
      if (block.type === "image") return { type: "image", source: { type: "base64", media_type: block.mediaType, data: block.data } };
      if (block.type === "tool_use")
        return {
          type: "tool_use",
          id: block.id,
          name: block.name,
          input: block.input,
        };
      if (block.type === "tool_result")
        return {
          type: "tool_result",
          tool_use_id: block.tool_use_id,
          content: block.content,
          is_error: block.is_error,
        };
      return block;
    }),
  };
}
