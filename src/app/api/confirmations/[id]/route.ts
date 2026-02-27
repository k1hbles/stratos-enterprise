import { getSessionUserId } from "@/lib/auth/session";
import { resolveConfirmation } from "@/lib/security/confirmation";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = (await getSessionUserId()) ?? "anonymous";
    const { id } = await params;
    const { approved } = await req.json();

    if (typeof approved !== "boolean") {
      return Response.json(
        { success: false, error: "Missing 'approved' boolean" },
        { status: 400 }
      );
    }

    const success = resolveConfirmation(id, userId, approved);

    if (!success) {
      return Response.json(
        { success: false, error: "Confirmation not found or already resolved" },
        { status: 404 }
      );
    }

    return Response.json({ success: true, status: approved ? "approved" : "denied" });
  } catch (err) {
    console.error("Confirmation resolve error:", err);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
