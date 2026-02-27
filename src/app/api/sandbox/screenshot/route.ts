import { desktopManager } from "@/lib/sandbox";

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const sandboxId = searchParams.get("sandboxId");

  if (!sandboxId) {
    return new Response("Missing sandboxId parameter", { status: 400 });
  }

  const info = desktopManager.getSandboxInfo(sandboxId);
  if (!info.exists) {
    return new Response("Sandbox not found", { status: 404 });
  }

  try {
    const imageBytes = await desktopManager.screenshot(sandboxId);
    return new Response(Buffer.from(imageBytes), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Screenshot failed";
    return new Response(message, { status: 500 });
  }
}
