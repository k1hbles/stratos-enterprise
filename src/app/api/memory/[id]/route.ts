import { getSessionUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const db = getDb();

  const result = db
    .prepare("DELETE FROM memory_core WHERE id = ? AND user_id = ?")
    .run(id, userId);

  if (result.changes === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}
