import { getSessionUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ user: null }, { status: 401 });
  }

  const db = getDb();
  const user = db
    .prepare("SELECT id, email FROM users WHERE id = ?")
    .get(userId) as { id: string; email: string } | undefined;

  if (!user) {
    return Response.json({ user: null }, { status: 401 });
  }

  return Response.json({ user: { userId: user.id, email: user.email } });
}
