import { getDb } from "@/lib/db";
import { callLLM } from "@/lib/ai/call";
import { SECONDARY_MODEL } from "@/lib/ai/model-router";

export interface BufferMemory {
  id: string;
  user_id: string;
  conversation_id: string;
  summary: string;
  created_at: string;
}

/** Summarize a conversation and store it in memory_buffer */
export async function summarizeConversation(
  userId: string,
  conversationId: string
): Promise<BufferMemory | null> {
  const db = getDb();

  const messages = db
    .prepare(
      "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 50"
    )
    .all(conversationId) as { role: string; content: string }[];

  if (!messages.length) return null;

  const transcript = messages
    .map(
      (m) =>
        `${m.role === "user" ? "User" : "Assistant"}: ${m.content.slice(0, 500)}`
    )
    .join("\n\n");

  const response = await callLLM({
    model: SECONDARY_MODEL,
    systemPrompt:
      "Summarize this conversation in 2-3 sentences. Focus on what was discussed, decisions made, and any action items. Be concise.",
    messages: [{ role: "user", content: transcript }],
  });

  const summary = response.content || "Conversation summary unavailable.";

  const id = crypto.randomUUID();
  try {
    const data = db
      .prepare(
        "INSERT INTO memory_buffer (id, user_id, conversation_id, summary) VALUES (?, ?, ?, ?) RETURNING *"
      )
      .get(id, userId, conversationId, summary) as BufferMemory | undefined;

    // Cleanup: keep only last 5 summaries per user
    db.prepare(
      `DELETE FROM memory_buffer WHERE user_id = ? AND id NOT IN (
        SELECT id FROM memory_buffer WHERE user_id = ? ORDER BY created_at DESC LIMIT 5
      )`
    ).run(userId, userId);

    return data ?? null;
  } catch (err) {
    console.error("[Memory] Failed to store buffer memory:", err);
    return null;
  }
}

/** Get recent conversation summaries */
export function getRecentBufferMemories(
  userId: string,
  limit = 10
): BufferMemory[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM memory_buffer WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
    )
    .all(userId, limit) as BufferMemory[];
}
