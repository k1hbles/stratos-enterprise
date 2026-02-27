import { getDb } from "@/lib/db";

export interface AuditEntry {
  userId: string;
  sessionId?: string;
  jobId?: string;
  directorSlug?: string;
  toolName: string;
  toolArgs?: Record<string, unknown>;
  resultSummary?: string;
  success: boolean;
  durationMs?: number;
}

/** Log an action to the audit_log table */
export function logAction(entry: AuditEntry): void {
  try {
    const db = getDb();
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO audit_log (id, user_id, session_id, job_id, director_slug, tool_name, tool_args, result_summary, success, duration_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      entry.userId,
      entry.sessionId ?? null,
      entry.jobId ?? null,
      entry.directorSlug ?? null,
      entry.toolName,
      entry.toolArgs ? JSON.stringify(entry.toolArgs) : null,
      entry.resultSummary ?? null,
      entry.success ? 1 : 0,
      entry.durationMs ?? null
    );
  } catch (err) {
    // Audit logging should never break the main flow
    console.error("[Audit] Failed to log action:", err);
  }
}

/** Query recent audit entries */
export function getAuditLog(userId: string, limit = 50): AuditEntry[] {
  const db = getDb();
  const data = db
    .prepare(
      "SELECT * FROM audit_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
    )
    .all(userId, limit) as Array<{
    user_id: string;
    session_id: string | null;
    job_id: string | null;
    director_slug: string | null;
    tool_name: string;
    tool_args: string | null;
    result_summary: string | null;
    success: number;
    duration_ms: number | null;
  }>;

  return data.map((d) => ({
    userId: d.user_id,
    sessionId: d.session_id ?? undefined,
    jobId: d.job_id ?? undefined,
    directorSlug: d.director_slug ?? undefined,
    toolName: d.tool_name,
    toolArgs: d.tool_args ? JSON.parse(d.tool_args) : undefined,
    resultSummary: d.result_summary ?? undefined,
    success: d.success === 1,
    durationMs: d.duration_ms ?? undefined,
  }));
}
