import { getSessionUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const db = getDb();

  const insights = db
    .prepare(
      `SELECT id, content, metadata, source_type, source_id, created_at
       FROM memory_semantic
       WHERE user_id = ? AND source_type IN ('council_session', 'council_task', 'council_document')
       ORDER BY created_at DESC
       LIMIT 50`
    )
    .all(userId) as Array<{
    id: string;
    content: string;
    metadata: string;
    source_type: string;
    source_id: string;
    created_at: string;
  }>;

  return Response.json(
    insights.map((i) => ({
      ...i,
      metadata: JSON.parse(i.metadata || "{}"),
    }))
  );
}
