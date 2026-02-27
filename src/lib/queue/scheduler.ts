/**
 * Cron heartbeat scheduler.
 * Evaluates due missions and executes them directly.
 */

import { CronExpressionParser } from "cron-parser";
import { getDb } from "@/lib/db";
import type { Mission } from "@/types/missions";
import { executeTask } from "@/lib/tasks";

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
      `[Scheduler] Invalid cron for mission ${mission.id}: ${mission.schedule_cron}`,
      err
    );
    return false;
  }
}

/** Check all active missions and execute due ones directly */
export async function checkAndExecuteMissions(): Promise<{
  checked: number;
  executed: number;
}> {
  const db = getDb();
  const missions = db
    .prepare(
      "SELECT * FROM missions WHERE active = 1 AND schedule_cron IS NOT NULL"
    )
    .all() as Mission[];

  if (!missions.length) {
    return { checked: 0, executed: 0 };
  }

  const dueMissions = missions.filter(isMissionDue);
  let executed = 0;

  for (const mission of dueMissions) {
    const result = await executeTask(mission.id);
    if (result.success) {
      executed++;
    }
  }

  return { checked: missions.length, executed };
}
