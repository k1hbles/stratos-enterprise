import { getDb } from "@/lib/db";
import { decomposeGoal } from "./decomposer";
import { runPeerReview } from "./reviewer";
import { synthesizeResults } from "./synthesizer";
import { getDirectors } from "@/lib/ai/directors/registry";
import { runDirector } from "@/lib/ai/directors/run-director";
import type { DirectorResult } from "@/lib/ai/directors/types";
import { buildMemoryContext } from "@/lib/memory";
import { buildCurrentState } from "@/lib/ai/directors/build-prompt";
import { publishCouncilEvent } from "@/lib/events/emitter";
import { createSanitizationSession } from "@/lib/security/sanitizer";
import { extractAndStoreCouncilFacts } from "@/lib/memory/extractor";

export interface CouncilSession {
  id: string;
  userId: string;
  goal: string;
  mode: string;
  conversationId?: string;
}

/**
 * Karpathy 3-Stage Council Protocol:
 * Stage 1: Decompose goal → parallel director analysis
 * Stage 2: Anonymized peer review with rankings
 * Stage 3: Ranked synthesis → 7-section report + Chairman resolution
 */
export async function runCouncilSession(
  session: CouncilSession
): Promise<void> {
  const db = getDb();
  try {
    // Create sanitization session for this council run
    const sanitizer = createSanitizationSession(session.userId);

    // Update stage
    updateStage(session.id, "decomposing");
    publishCouncilEvent(session.id, {
      type: "stage_change", sessionId: session.id, timestamp: Date.now(),
      data: { stage: "decomposing" },
    });

    // Fetch memory context once for the whole session
    const memoryContext = await buildMemoryContext(session.userId, session.goal);

    // Build current state once, pass to all directors
    const currentState = buildCurrentState(session.userId);

    // Sanitize goal for decomposer
    const sanitizedGoal = sanitizer.sanitize(session.goal);

    // Stage 1: Chairman decomposes goal into director sub-tasks
    const directors = getDirectors();
    const tasks = await decomposeGoal(session.id, sanitizedGoal, directors);

    // Emit plan_ready after decomposition
    publishCouncilEvent(session.id, {
      type: "plan_ready", sessionId: session.id, timestamp: Date.now(),
      data: { tasks: tasks.map((t) => ({ directorSlug: t.directorSlug, goal: t.goal })) },
    });

    updateStage(session.id, "analyzing");
    publishCouncilEvent(session.id, {
      type: "stage_change", sessionId: session.id, timestamp: Date.now(),
      data: { stage: "analyzing" },
    });

    // Execute director tasks in parallel
    const directorResults: DirectorResult[] = await Promise.all(
      tasks.map(async (task) => {
        const director = directors.find((d) => d.slug === task.directorSlug);
        if (!director) {
          publishCouncilEvent(session.id, {
            type: "task_failed", sessionId: session.id, timestamp: Date.now(),
            data: { directorSlug: task.directorSlug, error: "Director not found" },
          });
          return {
            directorSlug: task.directorSlug,
            summary: "Director not found",
            resultData: {},
            tokensUsed: 0,
            durationMs: 0,
          };
        }

        // Update task status
        db.prepare(
          "UPDATE council_tasks SET status = 'running', started_at = datetime('now') WHERE id = ?"
        ).run(task.id);

        publishCouncilEvent(session.id, {
          type: "task_started", sessionId: session.id, timestamp: Date.now(),
          data: { directorSlug: task.directorSlug, goal: task.goal },
        });

        // Build context with memory
        const contextStr = memoryContext
          ? `Original session goal: ${session.goal}\n\n${memoryContext}`
          : `Original session goal: ${session.goal}`;

        const result = await runDirector(director, task.goal, contextStr, {
          userId: session.userId,
          sessionId: session.id,
          currentState,
          onToolCall: (toolName, args) => {
            publishCouncilEvent(session.id, {
              type: "tool_call", sessionId: session.id, timestamp: Date.now(),
              data: { directorSlug: task.directorSlug, toolName, args },
            });
          },
          onToolResult: (toolName, toolResult) => {
            publishCouncilEvent(session.id, {
              type: "tool_result", sessionId: session.id, timestamp: Date.now(),
              data: { directorSlug: task.directorSlug, toolName, success: toolResult.success },
            });
          },
          onText: (text) => {
            publishCouncilEvent(session.id, {
              type: "director_text", sessionId: session.id, timestamp: Date.now(),
              data: { directorSlug: task.directorSlug, text: text.slice(0, 500) },
            });
          },
        });

        // Store result
        db.prepare(
          `UPDATE council_tasks SET status = 'completed', result_summary = ?, result_data = ?, tokens_used = ?, completed_at = datetime('now') WHERE id = ?`
        ).run(
          result.summary.slice(0, 5000),
          JSON.stringify(result.resultData),
          result.tokensUsed,
          task.id
        );

        // Record exchange
        const exchangeId = crypto.randomUUID();
        db.prepare(
          "INSERT INTO council_exchanges (id, session_id, stage, from_director, content, exchange_type) VALUES (?, ?, 'analysis', ?, ?, 'analysis')"
        ).run(exchangeId, session.id, task.directorSlug, result.summary.slice(0, 10000));

        publishCouncilEvent(session.id, {
          type: "task_completed", sessionId: session.id, timestamp: Date.now(),
          data: {
            directorSlug: task.directorSlug,
            preview: result.summary.slice(0, 200),
            tokensUsed: result.tokensUsed,
          },
        });

        return result;
      })
    );

    // Filter failed directors before peer review
    const successfulResults = directorResults.filter(
      (r) => r.summary !== "Director not found"
    );
    if (successfulResults.length === 0) {
      throw new Error("All directors failed — no analyses to review");
    }

    // Stage 2: Anonymized Peer Review with Rankings
    updateStage(session.id, "reviewing");
    publishCouncilEvent(session.id, {
      type: "stage_change", sessionId: session.id, timestamp: Date.now(),
      data: { stage: "reviewing" },
    });

    const { reviews, rankings } = await runPeerReview(
      session.id,
      session.goal,
      successfulResults,
      directors,
      (reviewerSlug, rankedLabels, commentary) => {
        publishCouncilEvent(session.id, {
          type: "exchange", sessionId: session.id, timestamp: Date.now(),
          data: { reviewerSlug, rankings: rankedLabels, commentary },
        });
      }
    );

    // Emit rankings_ready
    publishCouncilEvent(session.id, {
      type: "rankings_ready", sessionId: session.id, timestamp: Date.now(),
      data: {
        rankings: rankings.map((r) => ({
          directorSlug: r.directorSlug,
          avgRank: r.avgRank,
        })),
      },
    });

    // Stage 3: Ranked Synthesis
    updateStage(session.id, "synthesizing");
    publishCouncilEvent(session.id, {
      type: "stage_change", sessionId: session.id, timestamp: Date.now(),
      data: { stage: "synthesizing" },
    });

    const rawSynthesis = await synthesizeResults(
      session.id,
      sanitizedGoal,
      successfulResults,
      reviews,
      rankings
    );

    // Restore sanitized placeholders in the final synthesis
    const synthesis = sanitizer.restore(rawSynthesis);

    // Store final document
    const docId = crypto.randomUUID();
    db.prepare(
      "INSERT INTO council_documents (id, session_id, title, content_markdown, document_type) VALUES (?, ?, ?, ?, 'synthesis')"
    ).run(docId, session.id, `Council Analysis: ${session.goal.slice(0, 100)}`, synthesis);

    // Update session as complete
    db.prepare(
      "UPDATE council_sessions SET stage = 'completed', chairman_summary = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(synthesis.slice(0, 5000), session.id);

    publishCouncilEvent(session.id, {
      type: "session_complete", sessionId: session.id, timestamp: Date.now(),
      data: { summary: synthesis },
    });

    // Fire-and-forget: extract facts from council session into semantic memory
    extractAndStoreCouncilFacts(session.userId, session.id).catch((err) =>
      console.error("[Council] Fact extraction failed:", err)
    );
  } catch (err) {
    console.error(`[Council] Session ${session.id} failed:`, err);
    db.prepare(
      "UPDATE council_sessions SET stage = 'failed', updated_at = datetime('now') WHERE id = ?"
    ).run(session.id);

    publishCouncilEvent(session.id, {
      type: "session_failed", sessionId: session.id, timestamp: Date.now(),
      data: { error: err instanceof Error ? err.message : "Unknown error" },
    });
  }
}

function updateStage(sessionId: string, stage: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE council_sessions SET stage = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(stage, sessionId);
}
