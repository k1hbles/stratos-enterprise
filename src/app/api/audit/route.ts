import { getSessionUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
  const before = searchParams.get("before");

  const db = getDb();

  let query = "SELECT * FROM audit_log WHERE user_id = ?";
  const queryParams: unknown[] = [userId];

  if (before) {
    query += " AND created_at < ?";
    queryParams.push(before);
  }

  query += " ORDER BY created_at DESC LIMIT ?";
  queryParams.push(limit);

  const entries = db.prepare(query).all(...queryParams);
  return Response.json(entries);
}
