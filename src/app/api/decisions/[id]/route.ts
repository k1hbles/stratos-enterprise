import { getSessionUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const body = await req.json();

  if (!body.status || !["pending", "approved", "rejected", "deferred"].includes(body.status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const db = getDb();

  const result = db
    .prepare(
      "UPDATE decisions SET status = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?"
    )
    .run(body.status, id, userId);

  if (result.changes === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const updated = db
    .prepare("SELECT * FROM decisions WHERE id = ?")
    .get(id);

  return Response.json(updated);
}
