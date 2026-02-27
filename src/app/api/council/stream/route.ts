import { getDb } from "@/lib/db";
import { subscribeToCouncil } from "@/lib/events/emitter";
import type { CouncilEvent } from "@/lib/events/emitter";
import { NextRequest } from "next/server";

/**
 * SSE endpoint for streaming council session progress.
 * Subscribes to EventEmitter for real-time events instead of DB polling.
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return new Response("Missing sessionId", { status: 400 });
  }

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    start(controller) {
      let closed = false;

      const close = () => {
        if (closed) return;
        closed = true;
        unsubscribe();
        clearTimeout(timeout);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      // Check if session already completed (late subscriber)
      try {
        const db = getDb();
        const session = db
          .prepare("SELECT stage, chairman_summary FROM council_sessions WHERE id = ?")
          .get(sessionId) as { stage: string; chairman_summary: string | null } | undefined;

        if (!session) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", data: { error: "Session not found" } })}\n\n`)
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        if (session.stage === "completed" || session.stage === "failed") {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: session.stage === "completed" ? "session_complete" : "session_failed",
              sessionId,
              timestamp: Date.now(),
              data: session.stage === "completed"
                ? { summary: session.chairman_summary ?? "" }
                : { error: "Session previously failed" },
            })}\n\n`)
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        // Send current stage so client knows where we are
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: "stage_change",
            sessionId,
            timestamp: Date.now(),
            data: { stage: session.stage },
          })}\n\n`)
        );
      } catch (err) {
        console.error("[Council SSE] DB check error:", err);
      }

      // Subscribe to real-time events
      const unsubscribe = subscribeToCouncil(sessionId, (event: unknown) => {
        if (closed) return;

        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );

          const evt = event as CouncilEvent;
          if (evt.type === "session_complete" || evt.type === "session_failed") {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            close();
          }
        } catch (err) {
          console.error("[Council SSE] Write error:", err);
          close();
        }
      });

      // 5-minute timeout safety net (council with tools takes longer)
      const timeout = setTimeout(() => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: "error",
              sessionId,
              timestamp: Date.now(),
              data: { error: "Stream timed out" },
            })}\n\n`)
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch {
          // ignore
        }
        close();
      }, 5 * 60 * 1000);

      // Cleanup on client disconnect
      req.signal.addEventListener("abort", () => {
        close();
      });
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
