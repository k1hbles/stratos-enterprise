import { getDb } from "@/lib/db";

export interface SemanticMemory {
  id: string;
  user_id: string;
  content: string;
  metadata: Record<string, unknown>;
  source_type: string;
  source_id: string;
  created_at: string;
  similarity?: number;
}

// Circuit breaker — skip embedding after repeated failures to avoid blocking responses
let _embeddingFailures = 0;
let _embeddingLastFailure = 0;
const EMBEDDING_BACKOFF_MS = 60_000; // 1 minute cooldown after 3 failures
const EMBEDDING_TIMEOUT_MS = 2_000;

/** Generate an embedding using Gemini text-embedding-004 (free tier) */
async function getEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY ??
                 process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return null;

  // Circuit breaker: skip if too many recent failures
  if (_embeddingFailures >= 3 && Date.now() - _embeddingLastFailure < EMBEDDING_BACKOFF_MS) {
    return null;
  }

  try {
    // 2s timeout so a failing embedding never blocks the response pipeline
    const response = await Promise.race([
      fetch(
        `https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/text-embedding-004',
            content: { parts: [{ text: text.slice(0, 8000) }] },
          }),
        }
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), EMBEDDING_TIMEOUT_MS)
      ),
    ]) as Response;

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json();
    _embeddingFailures = 0; // reset on success
    return data.embedding?.values ?? null;
  } catch (err) {
    _embeddingFailures++;
    _embeddingLastFailure = Date.now();
    console.warn('[Embedding] Gemini embedding failed:', (err as Error).message ?? err);
    return null;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0,
    magA = 0,
    magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/** Store a semantic memory with vector embedding */
export async function storeSemanticMemory(
  userId: string,
  content: string,
  metadata: Record<string, unknown> = {},
  sourceType?: string,
  sourceId?: string
): Promise<SemanticMemory | null> {
  const embedding = await getEmbedding(content);
  if (!embedding) return null;

  const db = getDb();
  const id = crypto.randomUUID();

  try {
    const data = db
      .prepare(
        `INSERT INTO memory_semantic (id, user_id, content, embedding, metadata, source_type, source_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         RETURNING id, user_id, content, metadata, source_type, source_id, created_at`
      )
      .get(
        id,
        userId,
        content,
        JSON.stringify(embedding),
        JSON.stringify(metadata),
        sourceType ?? "agent",
        sourceId ?? ""
      ) as (SemanticMemory & { metadata: string }) | undefined;

    if (!data) return null;
    return { ...data, metadata: JSON.parse(data.metadata as string) };
  } catch (err) {
    console.error("[Memory] Failed to store semantic memory:", err);
    return null;
  }
}

/** Search semantic memories using cosine similarity */
export async function searchSemanticMemories(
  userId: string,
  query: string,
  limit = 5,
  threshold = 0.7
): Promise<SemanticMemory[]> {
  const embedding = await getEmbedding(query);
  if (!embedding) return [];

  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM memory_semantic WHERE user_id = ?")
    .all(userId) as (SemanticMemory & { embedding: string; metadata: string })[];

  return rows
    .map((r) => {
      const rowEmbedding = JSON.parse(r.embedding);
      // Skip rows with mismatched embedding dimensions (stale OpenAI 1536d vs new Gemini 768d)
      if (rowEmbedding.length !== embedding.length) return null;
      const similarity = cosineSimilarity(embedding, rowEmbedding);
      return {
        id: r.id,
        user_id: r.user_id,
        content: r.content,
        metadata: JSON.parse(r.metadata as string),
        source_type: r.source_type,
        source_id: r.source_id,
        created_at: r.created_at,
        similarity,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null && r.similarity >= threshold)
    .sort((a, b) => b.similarity! - a.similarity!)
    .slice(0, limit);
}
