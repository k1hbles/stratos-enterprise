import { getDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";
import { runCouncilSession } from "@/lib/ai/council/orchestrator";
import { publishCouncilEvent } from "@/lib/events/emitter";

export async function POST(req: Request) {
  try {
    const userId = (await getSessionUserId()) ?? "anonymous";
    const { goal, mode, conversationId } = await req.json();

    if (!goal) {
      return Response.json(
        { success: false, error: "Missing goal" },
        { status: 400 }
      );
    }

    const db = getDb();
    const sessionId = crypto.randomUUID();

    // Create council session
    db.prepare(
      "INSERT INTO council_sessions (id, user_id, goal, mode, stage, conversation_id) VALUES (?, ?, ?, ?, 'pending', ?)"
    ).run(sessionId, userId, goal, mode ?? "council", conversationId ?? null);

    // Detached execution — do not await, let SSE stream receive events
    setImmediate(async () => {
      try {
        await runCouncilSession({
          id: sessionId,
          userId,
          goal,
          mode: mode ?? "council",
          conversationId,
        });
      } catch (err) {
        console.error(`[Council] Session ${sessionId} failed:`, err);
        const db2 = getDb();
        db2.prepare("UPDATE council_sessions SET stage = 'failed' WHERE id = ?").run(sessionId);
        publishCouncilEvent(sessionId, {
          type: "session_failed",
          sessionId,
          timestamp: Date.now(),
          data: { error: err instanceof Error ? err.message : "Council session failed" },
        });
      }
    });

    return Response.json({ success: true, sessionId });
  } catch (err) {
    console.error("Council start error:", err);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
