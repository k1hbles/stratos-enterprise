import { getDb } from "@/lib/db";
import { callLLM } from "@/lib/ai/call";
import { SECONDARY_MODEL } from "@/lib/ai/model-router";
import { storeSemanticMemory, searchSemanticMemories } from "@/lib/memory/semantic";

/**
 * Extract discrete facts from a text block using LLM.
 * Returns an array of short factual statements, max 20.
 */
export async function extractFactsFromText(text: string): Promise<string[]> {
  if (!text || text.trim().length < 50) return [];

  try {
    const response = await callLLM({
      model: SECONDARY_MODEL,
      systemPrompt: `Extract discrete, factual statements from the text. Return a JSON array of strings. Each fact should be self-contained and concise (one sentence). Maximum 20 facts. Focus on: decisions made, numbers/metrics, names, strategies, risks, and action items. Return ONLY the JSON array, no other text.`,
      messages: [{ role: "user", content: text.slice(0, 8000) }],
    });

    const raw = response.content || "[]";

    // Handle malformed JSON gracefully
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((f): f is string => typeof f === "string" && f.length > 10)
          .slice(0, 20);
      }
    } catch {
      // Try to extract array from response if wrapped in markdown
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed)) {
            return parsed
              .filter((f): f is string => typeof f === "string" && f.length > 10)
              .slice(0, 20);
          }
        } catch {
          // Give up on parsing
        }
      }
    }
  } catch (err) {
    console.error("[Extractor] Failed to extract facts:", err);
  }

  return [];
}

/**
 * Extract facts from a completed council session and store as semantic memories.
 * Reads council_tasks.result_summary and council_documents.content_markdown.
 * Deduplicates against existing memories with similarity >= 0.95.
 */
export async function extractAndStoreCouncilFacts(
  userId: string,
  sessionId: string
): Promise<number> {
  const db = getDb();
  let storedCount = 0;

  // Gather text from completed tasks
  const tasks = db
    .prepare(
      "SELECT result_summary FROM council_tasks WHERE session_id = ? AND status = 'completed' AND result_summary IS NOT NULL"
    )
    .all(sessionId) as Array<{ result_summary: string }>;

  // Gather text from council documents
  const docs = db
    .prepare(
      "SELECT content_markdown FROM council_documents WHERE session_id = ? AND content_markdown IS NOT NULL"
    )
    .all(sessionId) as Array<{ content_markdown: string }>;

  const allText = [
    ...tasks.map((t) => t.result_summary),
    ...docs.map((d) => d.content_markdown),
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!allText.trim()) return 0;

  const facts = await extractFactsFromText(allText);

  for (const fact of facts) {
    // Dedup: check for very similar existing memories
    const existing = await searchSemanticMemories(userId, fact, 1, 0.95);
    if (existing.length > 0) continue;

    await storeSemanticMemory(
      userId,
      fact,
      { sessionId, extractedAt: new Date().toISOString() },
      "council_session",
      sessionId
    );
    storedCount++;
  }

  return storedCount;
}

/**
 * Extract facts from chat conversation messages and store as semantic memories.
 */
export async function extractAndStoreChatFacts(
  userId: string,
  conversationId: string
): Promise<number> {
  const db = getDb();
  let storedCount = 0;

  const messages = db
    .prepare(
      "SELECT content FROM messages WHERE conversation_id = ? AND role = 'assistant' ORDER BY created_at DESC LIMIT 10"
    )
    .all(conversationId) as Array<{ content: string }>;

  const allText = messages
    .map((m) => m.content)
    .filter(Boolean)
    .join("\n\n");

  if (!allText.trim() || allText.length < 100) return 0;

  const facts = await extractFactsFromText(allText);

  for (const fact of facts) {
    const existing = await searchSemanticMemories(userId, fact, 1, 0.95);
    if (existing.length > 0) continue;

    await storeSemanticMemory(
      userId,
      fact,
      { conversationId, extractedAt: new Date().toISOString() },
      "chat",
      conversationId
    );
    storedCount++;
  }

  return storedCount;
}
