import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";
import { callLLM } from "@/lib/ai/call";
import type { LLMMessage } from "@/lib/ai/call";
import { CHAT_SYSTEM_PROMPT } from "@/lib/ai/openclaw/init";

const STREAM_FORMAT_RULES = `

STREAM FORMAT — MANDATORY:
When reasoning through a complex problem, wrap your thinking in:
  <think>your reasoning here</think>

When you search, fetch, or take any action, emit a tag BEFORE describing results:
  <tool name="search" label="brief description of query">optional detail</tool>
  <tool name="file" label="File created — report.pdf"></tool>
  <tool name="generate" label="Generating slide outline"></tool>

These tags render as live visual cards in the UI. Always emit the opening tag first,
write any detail inside, then close with </tool> before your prose about results.
Keep think blocks genuine — show actual reasoning, not filler.
`;

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { conversationId, message } = await req.json();
  if (!conversationId || !message)
    return new Response("Missing params", { status: 400 });

  const db = getDb();
  const conv = db
    .prepare("SELECT id FROM conversations WHERE id = ? AND user_id = ?")
    .get(conversationId, userId) as { id: string } | undefined;
  if (!conv) return new Response("Not found", { status: 404 });

  const history = db
    .prepare(
      "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 20"
    )
    .all(conversationId) as { role: string; content: string }[];

  const messages: LLMMessage[] = [
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: message },
  ];

  db.prepare(
    "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'user', ?)"
  ).run(crypto.randomUUID(), conversationId, message);

  if (history.length === 0) {
    db.prepare("UPDATE conversations SET title = ? WHERE id = ?")
      .run(message.slice(0, 60), conversationId);
  }

  const encoder = new TextEncoder();
  const assistantMsgId = crypto.randomUUID();
  let fullContent = "";

  db.prepare(
    "INSERT INTO messages (id, conversation_id, role, content, status) VALUES (?, ?, 'assistant', '', 'streaming')"
  ).run(assistantMsgId, conversationId);

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const send = (data: object) =>
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

  (async () => {
    try {
      await callLLM({
        model: "x-ai/grok-4.1-fast",
        systemPrompt: CHAT_SYSTEM_PROMPT + STREAM_FORMAT_RULES,
        messages,
        tools: [],
        maxTokens: 4096,
        onToken: (token) => {
          fullContent += token;
          send({ delta: token });
        },
      });

      db.prepare("UPDATE messages SET content = ?, status = 'complete' WHERE id = ?")
        .run(fullContent, assistantMsgId);
      db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?")
        .run(conversationId);
      writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Stream error";
      send({ error: msg });
      writer.write(encoder.encode("data: [DONE]\n\n"));
      try {
        db.prepare("UPDATE messages SET status = 'interrupted' WHERE id = ?")
          .run(assistantMsgId);
      } catch { /* ignore */ }
    } finally {
      writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
