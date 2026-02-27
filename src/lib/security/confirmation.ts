import { getDb } from "@/lib/db";

export interface PendingConfirmation {
  id: string;
  userId: string;
  sessionId?: string;
  jobId?: string;
  directorSlug?: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  description: string;
  status: "pending" | "approved" | "denied";
  createdAt: string;
}

/** Create a pending confirmation for a write action */
export function createConfirmation(params: {
  userId: string;
  sessionId?: string;
  jobId?: string;
  directorSlug?: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  description: string;
}): string | null {
  const db = getDb();
  const id = crypto.randomUUID();
  try {
    db.prepare(
      `INSERT INTO pending_confirmations (id, user_id, session_id, job_id, director_slug, tool_name, tool_args, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
    ).run(
      id,
      params.userId,
      params.sessionId ?? null,
      params.jobId ?? null,
      params.directorSlug ?? null,
      params.toolName,
      JSON.stringify(params.toolArgs),
      params.description
    );
    return id;
  } catch (err) {
    console.error("[Confirmation] Failed to create:", err);
    return null;
  }
}

/** Resolve a confirmation (approve/deny) */
export function resolveConfirmation(
  confirmationId: string,
  userId: string,
  approved: boolean
): boolean {
  const db = getDb();
  const result = db
    .prepare(
      `UPDATE pending_confirmations
       SET status = ?, resolved_at = datetime('now')
       WHERE id = ? AND user_id = ? AND status = 'pending'`
    )
    .run(approved ? "approved" : "denied", confirmationId, userId);
  return result.changes > 0;
}

/** Get pending confirmations for a user */
export function getPendingConfirmations(
  userId: string
): PendingConfirmation[] {
  const db = getDb();
  const data = db
    .prepare(
      "SELECT * FROM pending_confirmations WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC"
    )
    .all(userId) as Array<{
    id: string;
    user_id: string;
    session_id: string | null;
    job_id: string | null;
    director_slug: string | null;
    tool_name: string;
    tool_args: string;
    description: string;
    status: string;
    created_at: string;
  }>;

  return data.map((d) => ({
    id: d.id,
    userId: d.user_id,
    sessionId: d.session_id ?? undefined,
    jobId: d.job_id ?? undefined,
    directorSlug: d.director_slug ?? undefined,
    toolName: d.tool_name,
    toolArgs: JSON.parse(d.tool_args),
    description: d.description,
    status: d.status as "pending" | "approved" | "denied",
    createdAt: d.created_at,
  }));
}
