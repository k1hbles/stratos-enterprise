import { getDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";
import { runOpenClaw } from "@/lib/ai/openclaw/engine";
import type { LLMMessage, LLMContentBlock } from "@/lib/ai/call";
import type { SSEEvent } from "@/lib/ai/openclaw/types";
import { sanitizeAttr, sanitizeContent, toolNameToIcon, toolCallLabel } from "@/lib/ai/openclaw/stream-helpers";
import { generateTitle } from "@/app/api/conversations/[id]/title/route";

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

    const { conversationId, message, fileIds, mode: rawMode, attachments } = await req.json();
    type AttachmentInput = { data: string; mediaType: string; name: string };
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

    // Merge base64 image attachments into the last user message as multimodal content
    if (Array.isArray(attachments) && attachments.length > 0 && messages.length > 0) {
      const imageBlocks: LLMContentBlock[] = (attachments as AttachmentInput[])
        .filter((a) => a.mediaType?.startsWith("image/"))
        .map((a) => ({ type: "image" as const, mediaType: a.mediaType, data: a.data }));
      if (imageBlocks.length > 0) {
        const lastMsg = messages[messages.length - 1];
        const textContent = typeof lastMsg.content === "string" ? lastMsg.content : enrichedMessage;
        const textBlock: LLMContentBlock = { type: "text" as const, text: textContent };
        messages[messages.length - 1] = { role: "user", content: [...imageBlocks, textBlock] };
      }
    }

    // Title will be generated after first response completes (see below)

    const hasFiles = (fileIds?.length ?? 0) > 0;
    const encoder = new TextEncoder();
    const assistantMsgId = crypto.randomUUID();

    /**
     * Replace base64 data URLs in <image_result> tags with persistent file URLs.
     * During streaming, images are emitted as base64 for instant display.
     * Before saving to metadata, we swap them for /api/files/output URLs to
     * avoid storing ~1-2MB of base64 per image in the JSON column.
     */
    const rewriteImageUrls = (raw: string): string => {
      return raw.replace(
        /<image_result\s+src="data:image\/[^"]*"\s+(prompt="[^"]*"\s+)?id="([^"]+)">/g,
        (_match, promptAttr, id: string) => {
          try {
            const row = db
              .prepare("SELECT storage_path FROM job_results WHERE id = ?")
              .get(id) as { storage_path: string } | undefined;
            if (row?.storage_path) {
              const fileUrl = `/api/files/output?path=${encodeURIComponent(row.storage_path)}`;
              return `<image_result src="${fileUrl}" ${promptAttr ?? ""}id="${id}">`;
            }
          } catch {}
          return _match; // keep original if lookup fails
        }
      );
    };

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

      // Server-side rawAccum mirrors the client-side XML accumulation
      let rawAccum = "";
      let imageTagBuffer = "";
      let isImageTool = false;
      const collectedSources: { url: string; title: string; domain: string; page_age: null; fetched: boolean }[] = [];
      let collectedFile: { name: string; url: string; size: number } | undefined;

      db.prepare(
        "INSERT INTO messages (id, conversation_id, role, content, status) VALUES (?, ?, 'assistant', '', 'streaming')"
      ).run(assistantMsgId, conversationId);

      try {
        const emit = (event: SSEEvent) => {
          send(event);

          // Build rawAccum from all event types (mirrors client-side logic)
          if (event.type === "text") {
            streamedContent += event.text;
            rawAccum += event.text;
            const now = Date.now();
            if (now - lastPersistTime >= PERSIST_INTERVAL_MS) {
              db.prepare("UPDATE messages SET content = ? WHERE id = ?")
                .run(streamedContent, assistantMsgId);
              lastPersistTime = now;
            }
          } else if (event.type === "tool_call" && event.toolName) {
            isImageTool = event.toolName === "generate_image";
            imageTagBuffer = "";
            const iconName = toolNameToIcon(event.toolName);
            const lbl = toolCallLabel(event.toolName, event.args ?? {});
            rawAccum += `<tool name="${iconName}" label="${sanitizeAttr(lbl)}">`;
          } else if (event.type === "tool_progress" && event.message) {
            // Skip todos metadata
            if (event.message.startsWith('{"__type":"todos_update"')) return;
            const isImageTag = /^<\/?image_(generating|result)[\s>]/.test(event.message);
            if (isImageTool && isImageTag) {
              imageTagBuffer += `${event.message}\n`;
            } else {
              rawAccum += `${isImageTag ? event.message : sanitizeContent(event.message)}\n`;
            }
          } else if (event.type === "tool_result") {
            rawAccum += "</tool>";
            if (imageTagBuffer) {
              rawAccum += imageTagBuffer;
              imageTagBuffer = "";
            }
            isImageTool = false;
            // Collect expandData for sources
            const expandData = event.expandData;
            if (expandData?.type === "search_results") {
              for (const r of expandData.results) {
                if (collectedSources.some((s) => s.url === r.url)) continue;
                let domain = "";
                try { domain = new URL(r.url).hostname.replace("www.", ""); } catch { /* ignore */ }
                collectedSources.push({ url: r.url, title: r.title, domain, page_age: null, fetched: false });
              }
            } else if (expandData?.type === "fetch_result") {
              const existing = collectedSources.find((s) => s.url === expandData.url);
              if (existing) {
                existing.fetched = true;
              } else {
                let domain = "";
                try { domain = new URL(expandData.url).hostname.replace("www.", ""); } catch { /* ignore */ }
                collectedSources.push({ url: expandData.url, title: expandData.title ?? "", domain, page_age: null, fetched: true });
              }
            }
          } else if (event.type === "file_ready") {
            collectedFile = { name: event.file.name, url: event.file.url, size: event.file.size ?? 0 };
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

        // Capture file from result if not already captured via file_ready
        if (!collectedFile && result.files[0]) {
          const f = result.files[0];
          collectedFile = { name: f.name, url: f.url, size: f.size ?? 0 };
        }

        // Build metadata JSON — rewrite base64 image URLs to persistent file URLs
        const cleanedRaw = rewriteImageUrls(rawAccum);
        const metadata: Record<string, unknown> = { raw: cleanedRaw };
        if (collectedSources.length > 0) metadata.sources = collectedSources;
        if (collectedFile) metadata.file = collectedFile;
        const metadataJson = JSON.stringify(metadata);

        db.prepare(
          "UPDATE messages SET content = ?, metadata = ?, status = 'complete' WHERE id = ?"
        ).run(result.fullResponse, metadataJson, assistantMsgId);

        db.prepare(
          "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?"
        ).run(conversationId);

        // Generate title after first turn only — fire and await before [DONE]
        if (messages.length === 1) {
          try {
            const title = await generateTitle(message, result.fullResponse);
            if (title) {
              db.prepare("UPDATE conversations SET title = ? WHERE id = ?")
                .run(title, conversationId);
              send({ type: "title_update", title });
            }
          } catch (err) {
            console.error("[title_gen] Failed:", err);
          }
        }

        send({ type: "done", file: result.files[0] });
        writer.write(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        console.error("Stream error:", err);
        try {
          // Persist what we have even on error — rewrite any completed images
          const cleanedRaw = rewriteImageUrls(rawAccum);
          const metadata: Record<string, unknown> = { raw: cleanedRaw };
          if (collectedSources.length > 0) metadata.sources = collectedSources;
          if (collectedFile) metadata.file = collectedFile;
          db.prepare("UPDATE messages SET content = ?, metadata = ?, status = 'interrupted' WHERE id = ?")
            .run(streamedContent, JSON.stringify(metadata), assistantMsgId);
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
