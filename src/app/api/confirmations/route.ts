import { getSessionUserId } from "@/lib/auth/session";
import { getPendingConfirmations } from "@/lib/security/confirmation";

export async function GET() {
  try {
    const userId = (await getSessionUserId()) ?? "anonymous";
    const confirmations = getPendingConfirmations(userId);
    return Response.json({ success: true, confirmations });
  } catch (err) {
    console.error("Confirmations route error:", err);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
