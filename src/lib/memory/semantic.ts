import { getDb } from "@/lib/db";
import { GoogleGenAI } from '@google/genai';

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

/** Generate an embedding using Gemini text-embedding-004 (free tier) */
async function getEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY ??
                 process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.warn('[Embedding] No Gemini API key, memory disabled');
    return null;
  }
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: text.slice(0, 8000),
    });
    return response.embeddings?.[0]?.values ?? null;
  } catch (err) {
    console.warn('[Embedding] Gemini embedding failed:', err);
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
