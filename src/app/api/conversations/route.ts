import { getSessionUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const db = getDb();
  const conversations = db
    .prepare(
      `SELECT c.id, c.title, c.preview, c.created_at, c.updated_at,
              (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as messageCount
       FROM conversations c
       WHERE c.user_id = ?
       ORDER BY c.updated_at DESC
       LIMIT 50`
    )
    .all(userId);

  return Response.json(conversations);
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const db = getDb();
  const id = crypto.randomUUID();
  const row = db
    .prepare(
      "INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?) RETURNING id, title"
    )
    .get(id, userId, body.title ?? "New Chat") as { id: string; title: string };

  return Response.json(row);
}
