import { getDb } from "@/lib/db";

export interface CoreMemory {
  id: string;
  user_id: string;
  key: string;
  value: string;
  category: string;
  source: string;
  created_at: string;
  updated_at: string;
}

/** Upsert a key-value memory for a user */
export function upsertCoreMemory(
  userId: string,
  key: string,
  value: string,
  category = "general",
  source = "agent"
): CoreMemory | null {
  const db = getDb();
  const id = crypto.randomUUID();
  try {
    const data = db
      .prepare(
        `INSERT INTO memory_core (id, user_id, key, value, category, source, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id, key) DO UPDATE SET
           value = excluded.value,
           category = excluded.category,
           source = excluded.source,
           updated_at = datetime('now')
         RETURNING *`
      )
      .get(id, userId, key, value, category, source) as CoreMemory | undefined;
    return data ?? null;
  } catch (err) {
    console.error("[Memory] Failed to upsert core memory:", err);
    return null;
  }
}

/** Get a specific core memory by key */
export function getCoreMemory(
  userId: string,
  key: string
): CoreMemory | null {
  const db = getDb();
  const data = db
    .prepare("SELECT * FROM memory_core WHERE user_id = ? AND key = ?")
    .get(userId, key) as CoreMemory | undefined;
  return data ?? null;
}

/** List core memories for a user, optionally filtered by category */
export function listCoreMemories(
  userId: string,
  category?: string,
  limit = 50
): CoreMemory[] {
  const db = getDb();
  if (category) {
    return db
      .prepare(
        "SELECT * FROM memory_core WHERE user_id = ? AND category = ? ORDER BY updated_at DESC LIMIT ?"
      )
      .all(userId, category, limit) as CoreMemory[];
  }
  return db
    .prepare(
      "SELECT * FROM memory_core WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?"
    )
    .all(userId, limit) as CoreMemory[];
}

/** Delete a core memory */
export function deleteCoreMemory(userId: string, key: string): boolean {
  const db = getDb();
  const result = db
    .prepare("DELETE FROM memory_core WHERE user_id = ? AND key = ?")
    .run(userId, key);
  return result.changes > 0;
}
