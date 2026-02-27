import { getSessionUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const db = getDb();
  const missions = db
    .prepare(
      "SELECT * FROM missions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
    )
    .all(userId);

  return Response.json(missions);
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  try {
    const body = await req.json();

    if (!body.title) {
      return Response.json({ error: "Title is required" }, { status: 400 });
    }

    const db = getDb();
    const id = crypto.randomUUID();

    db.prepare(
      `INSERT INTO missions (id, user_id, title, description, skill, schedule_cron, schedule_timezone, parameters, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      userId,
      body.title,
      body.description ?? null,
      body.skill ?? "research",
      body.scheduleCron ?? null,
      body.scheduleTimezone ?? "Asia/Jakarta",
      JSON.stringify(body.parameters ?? {}),
      body.active !== false ? 1 : 0
    );

    const mission = db.prepare("SELECT * FROM missions WHERE id = ?").get(id);
    return Response.json(mission, { status: 201 });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
