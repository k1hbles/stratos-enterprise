import { getSessionUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const db = getDb();

  let query = "SELECT * FROM decisions WHERE user_id = ?";
  const queryParams: unknown[] = [userId];

  if (status) {
    query += " AND status = ?";
    queryParams.push(status);
  }

  query += " ORDER BY created_at DESC LIMIT 50";

  const decisions = db.prepare(query).all(...queryParams);
  return Response.json(decisions);
}
