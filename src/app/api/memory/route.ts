import { getSessionUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const db = getDb();

  let query = "SELECT id, key, value, category, source, created_at, updated_at FROM memory_core WHERE user_id = ?";
  const queryParams: unknown[] = [userId];

  if (category) {
    query += " AND category = ?";
    queryParams.push(category);
  }

  query += " ORDER BY updated_at DESC LIMIT 100";

  const memories = db.prepare(query).all(...queryParams);
  return Response.json(memories);
}
