import { getSessionUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { callLLM } from "@/lib/ai/call";
import { MODELS } from "@/lib/ai/model-router";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const { userMessage } = await req.json().catch(() => ({}));

  if (!userMessage || typeof userMessage !== "string") {
    return Response.json({ error: "userMessage required" }, { status: 400 });
  }

  // Verify conversation belongs to user
  const db = getDb();
  const conv = db
    .prepare("SELECT id FROM conversations WHERE id = ? AND user_id = ?")
    .get(id, userId);
  if (!conv) return Response.json({ error: "Not found" }, { status: 404 });

  try {
    const response = await callLLM({
      model: MODELS.DEFAULT,
      maxTokens: 20,
      systemPrompt:
        "Generate a conversation title. Output ONLY the title — 3 to 4 words maximum. No punctuation, no quotes, no explanation.",
      messages: [
        {
          role: "user",
          content: `First message: "${userMessage.slice(0, 300)}"`,
        },
      ],
    });

    const title = response.content
      .trim()
      .replace(/^["']|["']$/g, "")
      .slice(0, 60);

    if (!title) {
      return Response.json({ error: "Empty title" }, { status: 500 });
    }

    db.prepare(
      "UPDATE conversations SET title = ? WHERE id = ? AND user_id = ?"
    ).run(title, id, userId);

    return Response.json({ title });
  } catch {
    return Response.json({ error: "Title generation failed" }, { status: 500 });
  }
}
