import { getSessionUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const db = getDb();

  // Join council_sessions to verify ownership
  const doc = db
    .prepare(
      `SELECT d.id, d.session_id, d.title, d.content_markdown, d.document_type, d.created_at
       FROM council_documents d
       JOIN council_sessions s ON s.id = d.session_id
       WHERE d.id = ? AND s.user_id = ?`
    )
    .get(id, userId);

  if (!doc) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(doc);
}
