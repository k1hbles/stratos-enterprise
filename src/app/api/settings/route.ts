import { getSessionUserId } from "@/lib/auth/session";
import { getSettings, updateSettings } from "@/lib/settings";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const settings = getSettings(userId);

  // Mask whatsapp number for privacy
  const masked = {
    ...settings,
    whatsappNumber: settings.whatsappNumber
      ? settings.whatsappNumber.slice(0, 4) + "****" + settings.whatsappNumber.slice(-2)
      : null,
  };

  return Response.json(masked);
}

export async function PATCH(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  try {
    const body = await req.json();

    // Validate defaultAutonomy if provided
    if (body.defaultAutonomy && !["confirm", "auto", "supervised"].includes(body.defaultAutonomy)) {
      return Response.json({ error: "Invalid defaultAutonomy value" }, { status: 400 });
    }

    const updated = updateSettings(userId, {
      defaultAutonomy: body.defaultAutonomy,
      modeOverrides: body.modeOverrides,
      whatsappEnabled: body.whatsappEnabled,
      whatsappNumber: body.whatsappNumber,
      timezone: body.timezone,
    });

    return Response.json(updated);
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
