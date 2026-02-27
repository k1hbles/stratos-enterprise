import { getDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;
  const db = getDb();

  // Verify session ownership
  const session = db
    .prepare("SELECT id FROM council_sessions WHERE id = ? AND user_id = ?")
    .get(sessionId, userId) as { id: string } | undefined;

  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  // Get tool calls grouped by director_slug, tool_name
  const toolRows = db
    .prepare(
      `SELECT director_slug, tool_name, COUNT(*) as count
       FROM audit_log
       WHERE session_id = ?
       GROUP BY director_slug, tool_name
       ORDER BY director_slug, count DESC`
    )
    .all(sessionId) as Array<{
    director_slug: string;
    tool_name: string;
    count: number;
  }>;

  // Build toolCallsByDirector
  const toolCallsByDirector: Record<string, { tool: string; count: number }[]> =
    {};
  let totalToolCalls = 0;
  for (const row of toolRows) {
    const slug = row.director_slug ?? "unknown";
    if (!toolCallsByDirector[slug]) {
      toolCallsByDirector[slug] = [];
    }
    toolCallsByDirector[slug].push({ tool: row.tool_name, count: row.count });
    totalToolCalls += row.count;
  }

  // Get memory facts count
  const factsRow = db
    .prepare(
      `SELECT COUNT(*) as count
       FROM memory_semantic
       WHERE source_type = 'council_session' AND source_id = ?`
    )
    .get(sessionId) as { count: number };

  return Response.json({
    toolCallsByDirector,
    totalToolCalls,
    factsCount: factsRow.count,
  });
}
