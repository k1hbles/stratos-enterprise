import { CronExpressionParser } from "cron-parser";
import { getDb } from "@/lib/db";
import { executeTask } from "@/lib/tasks";
import { runHeartbeat } from "@/lib/queue/heartbeat";
import type { Mission } from "@/types/missions";

/**
 * Check whether a mission is due for execution based on its cron schedule.
 */
function isMissionDue(mission: Mission): boolean {
  if (!mission.schedule_cron) return false;

  try {
    const interval = CronExpressionParser.parse(mission.schedule_cron, {
      currentDate: new Date(),
      tz: mission.schedule_timezone || "UTC",
    });

    const prev = interval.prev().toDate();

    if (!mission.last_run_at) return true;
    return prev > new Date(mission.last_run_at);
  } catch (err) {
    console.error(
      `[CRON] Invalid cron expression for mission ${mission.id}: ${mission.schedule_cron}`,
      err
    );
    return false;
  }
}

/**
 * GET /api/cron/tasks
 *
 * Called every 15 minutes. Evaluates all active missions and executes those that are due.
 */
export async function GET(req: Request): Promise<Response> {
  // Auth: verify CRON_SECRET
  const authHeader = req.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Fetch all active missions with a cron schedule
  const missions = db
    .prepare(
      "SELECT * FROM missions WHERE active = 1 AND schedule_cron IS NOT NULL"
    )
    .all() as Mission[];

  if (!missions?.length) {
    return Response.json({
      executed: 0,
      results: [],
      timestamp: new Date().toISOString(),
    });
  }

  // Evaluate which missions are due
  const dueMissions = missions.filter(isMissionDue);

  console.log(
    `[CRON] ${missions.length} active missions, ${dueMissions.length} due`
  );

  // Execute sequentially to avoid overwhelming resources
  const results: Array<{
    missionId: string;
    title: string;
    success: boolean;
    jobId?: string;
    error?: string;
  }> = [];

  for (const mission of dueMissions) {
    const result = await executeTask(mission.id);
    results.push({
      missionId: mission.id,
      title: mission.title,
      ...result,
    });
  }

  // Run heartbeat for each active user
  const activeUsers = db
    .prepare(
      "SELECT DISTINCT user_id FROM missions WHERE active = 1"
    )
    .all() as Array<{ user_id: string }>;

  const heartbeats = [];
  for (const { user_id } of activeUsers) {
    try {
      const hb = await runHeartbeat(user_id);
      if (hb.summaryGenerated) heartbeats.push(hb);
    } catch (err) {
      console.error(`[CRON] Heartbeat failed for user ${user_id}:`, err);
    }
  }

  return Response.json({
    executed: dueMissions.length,
    results,
    heartbeats: heartbeats.length,
    timestamp: new Date().toISOString(),
  });
}
