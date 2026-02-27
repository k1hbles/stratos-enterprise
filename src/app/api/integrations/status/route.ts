import { getDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";

const INTEGRATION_SLUGS = [
  "gmail",
  "google-sheets",
  "whatsapp",
  "google-calendar",
  "google-drive",
  "slack",
] as const;

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Check WhatsApp connection from settings table
  let whatsappConnected = false;
  try {
    const row = db
      .prepare(
        "SELECT value FROM settings WHERE user_id = ? AND key = 'whatsapp_connected'"
      )
      .get(userId) as { value: string } | undefined;
    whatsappConnected = row?.value === "true";
  } catch {
    // settings table or column might not exist yet
  }

  const integrations = INTEGRATION_SLUGS.map((slug) => ({
    slug,
    connected: slug === "whatsapp" ? whatsappConnected : false,
  }));

  return Response.json({ integrations });
}
