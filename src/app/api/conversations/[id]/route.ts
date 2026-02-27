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

  const conversation = db
    .prepare("SELECT * FROM conversations WHERE id = ? AND user_id = ?")
    .get(id, userId);

  if (!conversation) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const messages = db
    .prepare(
      "SELECT id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
    )
    .all(id);

  return Response.json({ ...conversation, messages });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const { title } = await req.json();
  if (typeof title !== "string") {
    return Response.json({ error: "title required" }, { status: 400 });
  }

  const db = getDb();
  const result = db
    .prepare("UPDATE conversations SET title = ? WHERE id = ? AND user_id = ?")
    .run(title, id, userId);

  if (result.changes === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const db = getDb();

  const result = db
    .prepare("DELETE FROM conversations WHERE id = ? AND user_id = ?")
    .run(id, userId);

  if (result.changes === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}
