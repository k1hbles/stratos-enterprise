import { getDb } from "./db";
import { runCouncilSession } from "@/lib/ai/council/orchestrator";

/** Skills that should be routed to the council instead of the job pipeline */
const COUNCIL_SKILLS = new Set([
  "executive",
  "swot",
  "competitive",
  "market_entry",
  "risk",
]);

interface TaskResult {
  success: boolean;
  jobId?: string;
  sessionId?: string;
  error?: string;
}

export async function executeTask(missionId: string): Promise<TaskResult> {
  const db = getDb();

  try {
    const mission = db
      .prepare("SELECT * FROM missions WHERE id = ?")
      .get(missionId) as Record<string, unknown> | undefined;

    if (!mission) {
      return { success: false, error: "Mission not found" };
    }

    const skill = (mission.skill as string) ?? "research";

    // Update last_run_at
    db.prepare(
      "UPDATE missions SET last_run_at = datetime('now'), run_count = COALESCE(run_count, 0) + 1 WHERE id = ?"
    ).run(missionId);

    // Route council skills to the council pipeline
    if (COUNCIL_SKILLS.has(skill)) {
      const sessionId = crypto.randomUUID();
      db.prepare(
        "INSERT INTO council_sessions (id, user_id, goal, mode, stage) VALUES (?, ?, ?, 'council', 'pending')"
      ).run(
        sessionId,
        mission.user_id,
        `${mission.title}: ${(mission.description as string) ?? ""}`
      );

      // Fire-and-forget council session
      runCouncilSession({
        id: sessionId,
        userId: mission.user_id as string,
        goal: `${mission.title}: ${(mission.description as string) ?? ""}`,
        mode: "council",
      }).catch((err) =>
        console.error(`[Tasks] Council session ${sessionId} failed:`, err)
      );

      return { success: true, sessionId };
    }

    // Standard job pipeline for non-council skills
    const jobId = crypto.randomUUID();
    db.prepare(
      "INSERT INTO jobs (id, user_id, title, description, task_type, status, trigger_run_id) VALUES (?, ?, ?, ?, ?, 'queued', ?)"
    ).run(
      jobId,
      mission.user_id,
      mission.title,
      mission.description ?? "",
      skill,
      missionId
    );

    db.prepare(
      "UPDATE missions SET last_run_job_id = ? WHERE id = ?"
    ).run(jobId, missionId);

    // Trigger the agent execution pipeline
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.VERCEL_URL ??
        "http://localhost:3000";
      const url = baseUrl.startsWith("http")
        ? baseUrl
        : `https://${baseUrl}`;

      await fetch(`${url}/api/jobs/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
    } catch (triggerErr) {
      console.error("[Tasks] Failed to trigger job run:", triggerErr);
    }

    return { success: true, jobId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
