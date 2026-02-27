/**
 * Mission queue stub — Redis/BullMQ removed in favor of direct execution.
 * Missions are executed directly via executeTask() in the cron handler.
 */

/** Enqueue a mission for execution — always returns false (no queue) */
export async function enqueueMission(
  _missionId: string,
  _userId: string
): Promise<boolean> {
  return false;
}

/** Start the mission worker — no-op */
export async function startMissionWorker(): Promise<void> {
  // No-op: missions are executed directly
}
