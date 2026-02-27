import type { LLMMessage } from "@/lib/ai/call";
import { summarizeConversation } from "@/lib/memory/buffer";
import { extractAndStoreChatFacts } from "@/lib/memory/extractor";
import { runClawInit } from "./init";
import { runClawLoop } from "./loop";
import type { ClawFile, SSEEmitter } from "./types";

type ChatMode = "auto" | "openclaw" | "council" | "fullstack";

export async function runOpenClaw(
  userId: string,
  conversationId: string,
  messages: LLMMessage[],
  mode: ChatMode,
  hasFiles: boolean,
  emit: SSEEmitter
): Promise<{ fullResponse: string; files: ClawFile[] }> {
  // Phase 0: Init — memory, tools, model, system prompt
  const ctx = await runClawInit(userId, messages, mode, hasFiles, emit);

  // Log routing decision
  const lastMsg = messages[messages.length - 1];
  const lastText = typeof lastMsg?.content === "string" ? lastMsg.content : "";
  console.log(`[Router] "${lastText.slice(0, 60)}..." → ${ctx.model}`);

  // Phase 1-2: Agentic tool loop
  const result = await runClawLoop(
    ctx.model,
    ctx.systemPrompt,
    messages,
    ctx.tools,
    emit
  );

  // Phase 3-4: Fire-and-forget memory extraction (ALWAYS, not just 4+ messages)
  Promise.all([
    summarizeConversation(userId, conversationId),
    extractAndStoreChatFacts(userId, conversationId),
  ]).catch((err) =>
    console.error("[OpenClaw] Post-stream processing failed:", err)
  );

  return result;
}
