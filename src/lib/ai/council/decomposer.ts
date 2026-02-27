import { getDb } from "@/lib/db";
import type { DirectorConfig } from "@/lib/ai/directors/types";
import { callLLM } from "@/lib/ai/call";
import { SECONDARY_MODEL } from "@/lib/ai/model-router";

interface CouncilTask {
  id: string;
  directorSlug: string;
  goal: string;
}

/**
 * Chairman decomposes a high-level goal into director-specific sub-tasks.
 */
export async function decomposeGoal(
  sessionId: string,
  goal: string,
  directors: DirectorConfig[]
): Promise<CouncilTask[]> {
  const directorList = directors
    .filter((d) => d.slug !== "secretary" && d.slug !== "chairman")
    .map((d) => `- **${d.slug}** (${d.displayName}): ${d.roleDescription}`)
    .join("\n");

  const response = await callLLM({
    model: SECONDARY_MODEL,
    systemPrompt: `You are the Chairman of the Board. Decompose the given goal into specific sub-tasks for each relevant director. Not all directors need tasks — only assign tasks to directors whose expertise is relevant.

Available directors:
${directorList}

Respond with a JSON array of tasks. Each task has:
- "director_slug": the director's slug
- "goal": a specific, actionable goal for that director

Example:
[
  {"director_slug": "cfo", "goal": "Analyze the financial viability and projected ROI of expanding into the European market"},
  {"director_slug": "cmo", "goal": "Research the competitive landscape and customer segments in the European market"}
]

Respond ONLY with the JSON array, no other text.`,
    messages: [{ role: "user", content: goal }],
  });

  const text = response.content || "[]";

  let parsedTasks: Array<{ director_slug: string; goal: string }>;
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    parsedTasks = JSON.parse(jsonMatch?.[0] ?? "[]");
  } catch {
    console.error("[Council] Failed to parse decomposition:", text);
    // Fallback: assign the full goal to CFO, CMO, CSO
    parsedTasks = [
      { director_slug: "cfo", goal },
      { director_slug: "cmo", goal },
      { director_slug: "cso", goal },
    ];
  }

  const db = getDb();

  // Record chairman's decomposition
  const exchangeId = crypto.randomUUID();
  db.prepare(
    "INSERT INTO council_exchanges (id, session_id, stage, from_director, content, exchange_type) VALUES (?, ?, 'decomposition', 'chairman', ?, 'decomposition')"
  ).run(exchangeId, sessionId, JSON.stringify(parsedTasks));

  // Insert council tasks
  const tasks: CouncilTask[] = [];
  for (const t of parsedTasks) {
    const taskId = crypto.randomUUID();
    db.prepare(
      "INSERT INTO council_tasks (id, session_id, director_slug, goal, status) VALUES (?, ?, ?, ?, 'pending')"
    ).run(taskId, sessionId, t.director_slug, t.goal);

    tasks.push({
      id: taskId,
      directorSlug: t.director_slug,
      goal: t.goal,
    });
  }

  return tasks;
}
