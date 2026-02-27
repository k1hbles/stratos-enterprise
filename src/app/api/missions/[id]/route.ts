import { getSessionUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const db = getDb();

    // Verify ownership
    const existing = db
      .prepare("SELECT id FROM missions WHERE id = ? AND user_id = ?")
      .get(id, userId);
    if (!existing) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.title !== undefined) { updates.push("title = ?"); values.push(body.title); }
    if (body.description !== undefined) { updates.push("description = ?"); values.push(body.description); }
    if (body.skill !== undefined) { updates.push("skill = ?"); values.push(body.skill); }
    if (body.scheduleCron !== undefined) { updates.push("schedule_cron = ?"); values.push(body.scheduleCron); }
    if (body.scheduleTimezone !== undefined) { updates.push("schedule_timezone = ?"); values.push(body.scheduleTimezone); }
    if (body.active !== undefined) { updates.push("active = ?"); values.push(body.active ? 1 : 0); }
    if (body.parameters !== undefined) { updates.push("parameters = ?"); values.push(JSON.stringify(body.parameters)); }

    if (updates.length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.push("updated_at = datetime('now')");
    values.push(id, userId);

    db.prepare(
      `UPDATE missions SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`
    ).run(...values);

    const updated = db.prepare("SELECT * FROM missions WHERE id = ?").get(id);
    return Response.json(updated);
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
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
    .prepare("DELETE FROM missions WHERE id = ? AND user_id = ?")
    .run(id, userId);

  if (result.changes === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}
