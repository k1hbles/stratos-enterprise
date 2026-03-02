import { getDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";
import { runOpenClaw } from "@/lib/ai/openclaw/engine";
import type { LLMMessage } from "@/lib/ai/call";
import type { SSEEvent } from "@/lib/ai/openclaw/types";

type ChatMode = "auto" | "openclaw" | "council" | "fullstack";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

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

    const conversation = db
      .prepare("SELECT id FROM conversations WHERE id = ? AND user_id = ?")
      .get(conversationId, userId) as { id: string } | undefined;

    if (!conversation) {
      return new Response("Conversation not found", { status: 404 });
    }

    // Enrich message with file metadata
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

    if (messages.length > 0 && enrichedMessage !== message) {
      messages[messages.length - 1] = { role: "user", content: enrichedMessage };
    }

    if (messages.length === 1) {
      const title = message.slice(0, 60) + (message.length > 60 ? "..." : "");
      db.prepare("UPDATE conversations SET title = ? WHERE id = ?").run(title, conversationId);
    }

    const hasFiles = (fileIds?.length ?? 0) > 0;
    const encoder = new TextEncoder();
    const assistantMsgId = crypto.randomUUID();

    // Use a TransformStream so we can pipe events as they arrive
    // without waiting for runOpenClaw to fully resolve.
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    const send = (event: SSEEvent) => {
      writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    };

    // Run the agent loop in the background — don't await here.
    // This is the key fix: the Response is returned immediately with the
    // readable stream, and events are pushed as they happen.
    (async () => {
      let streamedContent = "";
      let lastPersistTime = Date.now();
      const PERSIST_INTERVAL_MS = 2000;

      db.prepare(
        "INSERT INTO messages (id, conversation_id, role, content, status) VALUES (?, ?, 'assistant', '', 'streaming')"
      ).run(assistantMsgId, conversationId);

      try {
        const emit = (event: SSEEvent) => {
          send(event);

          if (event.type === "text") {
            streamedContent += event.text;
            const now = Date.now();
            if (now - lastPersistTime >= PERSIST_INTERVAL_MS) {
              db.prepare("UPDATE messages SET content = ? WHERE id = ?")
                .run(streamedContent, assistantMsgId);
              lastPersistTime = now;
            }
          }
        };

        // Emit tool_call events immediately as they start so the UI
        // shows a live spinner rather than waiting for completion.
        const result = await runOpenClaw(
          userId,
          conversationId,
          messages,
          mode,
          hasFiles,
          emit
        );

        db.prepare(
          "UPDATE messages SET content = ?, status = 'complete' WHERE id = ?"
        ).run(result.fullResponse, assistantMsgId);

        db.prepare(
          "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?"
        ).run(conversationId);

        send({ type: "done", file: result.files[0] });
        writer.write(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        console.error("Stream error:", err);
        try {
          db.prepare("UPDATE messages SET content = ?, status = 'interrupted' WHERE id = ?")
            .run(streamedContent, assistantMsgId);
        } catch {}
        const errorMessage = err instanceof Error ? err.message : "Stream error";
        send({ type: "error", message: errorMessage });
        send({ type: "done" });
        writer.write(encoder.encode("data: [DONE]\n\n"));
      } finally {
        writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx/proxy buffering — critical for SSE
        ...CORS_HEADERS,
      },
    });
  } catch (err) {
    console.error("Chat route error:", err);
    return new Response("Internal server error", { status: 500 });
  }
}
