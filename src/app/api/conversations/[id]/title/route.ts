import { getSessionUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { callLLM } from "@/lib/ai/call";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const { userMessage, assistantResponse } = await req.json().catch(() => ({}));

  if (!userMessage || typeof userMessage !== "string") {
    return Response.json({ error: "userMessage required" }, { status: 400 });
  }

  const db = getDb();
  const conv = db
    .prepare("SELECT id FROM conversations WHERE id = ? AND user_id = ?")
    .get(id, userId);
  if (!conv) return Response.json({ error: "Not found" }, { status: 404 });

  try {
    const title = await generateTitle(userMessage, assistantResponse ?? "");
    if (!title) return Response.json({ error: "Empty title" }, { status: 500 });

    db.prepare(
      "UPDATE conversations SET title = ? WHERE id = ? AND user_id = ?"
    ).run(title, id, userId);

    return Response.json({ title });
  } catch {
    return Response.json({ error: "Title generation failed" }, { status: 500 });
  }
}

export async function generateTitle(
  userMessage: string,
  assistantResponse: string
): Promise<string> {
  const response = await callLLM({
    model: "google/gemini-flash-1.5",
    maxTokens: 20,
    messages: [
      {
        role: "user",
        content: `Summarize this conversation in 4-5 words maximum. Be direct and specific. No punctuation. No quotes. Examples: "FMCG revenue analysis", "Ferrari image generation", "Q3 financial spreadsheet"\n\nUser: ${userMessage.slice(0, 200)}\nAssistant: ${assistantResponse.slice(0, 200)}`,
      },
    ],
  });

  return response.content
    .trim()
    .replace(/^["']|["']$/g, "")
    .slice(0, 60);
}
