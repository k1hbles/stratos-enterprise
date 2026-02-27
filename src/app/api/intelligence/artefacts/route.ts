import { getDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";

interface Artefact {
  id: string;
  type: string;
  title: string;
  director?: string;
  sessionGoal?: string;
  sessionId?: string;
  content?: string;
  created_at: string;
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const artefacts: Artefact[] = [];

  // 1. Documents from council_documents
  const docs = db
    .prepare(
      `SELECT cd.id, cd.title, cd.content_markdown, cd.created_at,
              cs.goal as session_goal, cs.id as session_id
       FROM council_documents cd
       JOIN council_sessions cs ON cd.session_id = cs.id
       WHERE cs.user_id = ?
       ORDER BY cd.created_at DESC`
    )
    .all(userId) as Array<{
    id: string;
    title: string;
    content_markdown: string;
    created_at: string;
    session_goal: string;
    session_id: string;
  }>;

  for (const doc of docs) {
    artefacts.push({
      id: doc.id,
      type: "document",
      title: doc.title || "Untitled Document",
      sessionGoal: doc.session_goal,
      sessionId: doc.session_id,
      content: doc.content_markdown,
      created_at: doc.created_at,
    });
  }

  // 2. Tool outputs from audit_log
  const toolOutputs = db
    .prepare(
      `SELECT al.id, al.tool_name, al.director_slug, al.result_summary, al.tool_args, al.created_at,
              cs.goal as session_goal, cs.id as session_id
       FROM audit_log al
       LEFT JOIN council_sessions cs ON al.session_id = cs.id
       WHERE al.user_id = ?
         AND al.tool_name IN ('create_chart', 'web_search', 'web_fetch', 'parse_file', 'read_uploaded_file')
       ORDER BY al.created_at DESC
       LIMIT 200`
    )
    .all(userId) as Array<{
    id: string;
    tool_name: string;
    director_slug: string;
    result_summary: string;
    tool_args: string;
    created_at: string;
    session_goal: string;
    session_id: string;
  }>;

  for (const row of toolOutputs) {
    let type: string;
    let title: string;

    switch (row.tool_name) {
      case "create_chart":
        type = "python_output";
        title = "Python Computation";
        break;
      case "web_search":
      case "web_fetch":
        type = "web_research";
        title =
          row.tool_name === "web_search" ? "Web Search" : "Web Page Fetch";
        break;
      case "parse_file":
      case "read_uploaded_file":
        type = "file_analysis";
        title = "File Analysis";
        break;
      default:
        type = "python_output";
        title = row.tool_name;
    }

    artefacts.push({
      id: row.id,
      type,
      title,
      director: row.director_slug,
      sessionGoal: row.session_goal,
      sessionId: row.session_id,
      content: row.result_summary,
      created_at: row.created_at,
    });
  }

  // 3. Memory facts from memory_semantic
  const facts = db
    .prepare(
      `SELECT ms.id, ms.content, ms.source_type, ms.source_id, ms.created_at
       FROM memory_semantic ms
       WHERE ms.user_id = ?
         AND ms.source_type LIKE 'council%'
       ORDER BY ms.created_at DESC
       LIMIT 200`
    )
    .all(userId) as Array<{
    id: string;
    content: string;
    source_type: string;
    source_id: string;
    created_at: string;
  }>;

  for (const fact of facts) {
    artefacts.push({
      id: fact.id,
      type: "memory_fact",
      title: "Memory Fact",
      sessionId: fact.source_id,
      content: fact.content,
      created_at: fact.created_at,
    });
  }

  // Sort all artefacts by created_at DESC
  artefacts.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return Response.json(artefacts);
}
