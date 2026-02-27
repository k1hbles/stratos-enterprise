import { EventEmitter } from "events";

const emitter = new EventEmitter();
emitter.setMaxListeners(50);

export interface CouncilEvent {
  type: "stage_change" | "task_started" | "task_completed" | "task_failed"
    | "tool_call" | "tool_result" | "director_text"
    | "session_complete" | "session_failed"
    | "plan_ready" | "exchange" | "rankings_ready";
  sessionId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export function publishCouncilEvent(
  sessionId: string,
  event: unknown
): void {
  emitter.emit(`council:${sessionId}`, event);
}

export function subscribeToCouncil(
  sessionId: string,
  handler: (event: unknown) => void
): () => void {
  emitter.on(`council:${sessionId}`, handler);
  return () => emitter.off(`council:${sessionId}`, handler);
}
