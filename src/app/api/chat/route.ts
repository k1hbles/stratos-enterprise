import { getDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";
import { runOpenClaw } from "@/lib/ai/openclaw/engine";
import type { LLMMessage } from "@/lib/ai/call";
import type { SSEEvent } from "@/lib/ai/openclaw/types";

type ChatMode = "auto" | "openclaw" | "council" | "fullstack";

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const { conversationId, message, fileIds, mode: rawMode } = await req.json();
    if (!conversationId || !message) {
      return new Response("Missing conversationId or message", { status: 400 });
    }

    const mode: ChatMode = (["auto", "openclaw", "council", "fullstack"].includes(rawMode))
      ? rawMode as ChatMode
      : "auto";

    const db = getDb();

    // Verify conversation belongs to user
    const conversation = db
      .prepare("SELECT id FROM conversations WHERE id = ? AND user_id = ?")
      .get(conversationId, userId) as { id: string } | undefined;

    if (!conversation) {
      return new Response("Conversation not found", { status: 404 });
    }

    // Enrich message with file metadata for LLM
    let enrichedMessage = message;
    if (fileIds?.length > 0) {
      const placeholders = fileIds.map(() => "?").join(",");
      const files = db
        .prepare(
          `SELECT id, file_name, file_type, file_size FROM job_files WHERE id IN (${placeholders})`
        )
        .all(...fileIds) as { id: string; file_name: string; file_type: string; file_size: number }[];
      if (files?.length) {
        const fileList = files
          .map((f) => `- ${f.file_name} (ID: ${f.id}, ${f.file_type}, ${(f.file_size / 1024).toFixed(0)} KB)`)
          .join("\n");
        enrichedMessage += `\n\n[Attached Files]\n${fileList}`;
      }
    }

    // Save user message
    const msgId = crypto.randomUUID();
    db.prepare(
      "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'user', ?)"
    ).run(msgId, conversationId, message);

    // Fetch conversation history
    const history = db
      .prepare("SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
      .all(conversationId) as { role: string; content: string }[];

    const messages: LLMMessage[] = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Replace last user message with enriched version
    if (messages.length > 0 && enrichedMessage !== message) {
      messages[messages.length - 1] = { role: "user", content: enrichedMessage };
    }

    // Auto-title on first message
    if (messages.length === 1) {
      const title = message.slice(0, 60) + (message.length > 60 ? "..." : "");
      db.prepare("UPDATE conversations SET title = ? WHERE id = ?").run(title, conversationId);
    }

    const hasFiles = (fileIds?.length ?? 0) > 0;
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const emit = (event: SSEEvent) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            );
          };

          const result = await runOpenClaw(
            userId,
            conversationId,
            messages,
            mode,
            hasFiles,
            emit
          );

          // Save assistant message
          const assistantMsgId = crypto.randomUUID();
          db.prepare(
            "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'assistant', ?)"
          ).run(assistantMsgId, conversationId, result.fullResponse);

          // Update conversation timestamp
          db.prepare(
            "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?"
          ).run(conversationId);

          // Emit done (with first file if any for backward compat)
          emit({ type: "done", file: result.files[0] });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          const errorMessage = err instanceof Error ? err.message : "Stream error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message: errorMessage })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Chat route error:", err);
    return new Response("Internal server error", { status: 500 });
  }
}
