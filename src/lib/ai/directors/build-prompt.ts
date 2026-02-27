import { getDb } from "@/lib/db";
import type { DirectorConfig } from "./types";

/**
 * Build the current state string: date/time, pending confirmations, active missions.
 * Fails gracefully — returns just the date if DB queries error.
 */
export function buildCurrentState(userId: string): string {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  const lines: string[] = [`Current date/time (WIB): ${dateStr}`];

  try {
    const db = getDb();

    const pendingRow = db
      .prepare(
        "SELECT COUNT(*) as cnt FROM pending_confirmations WHERE user_id = ? AND status = 'pending'"
      )
      .get(userId) as { cnt: number } | undefined;

    if (pendingRow && pendingRow.cnt > 0) {
      lines.push(`Pending confirmations: ${pendingRow.cnt}`);
    }

    const missionRows = db
      .prepare(
        "SELECT title FROM missions WHERE user_id = ? AND active = 1 LIMIT 3"
      )
      .all(userId) as Array<{ title: string }>;

    if (missionRows.length > 0) {
      lines.push(
        `Active missions: ${missionRows.map((m) => m.title).join(", ")}`
      );
    }
  } catch {
    // Silently continue with just the date
  }

  return lines.join("\n");
}

/**
 * Build a structured system prompt for a director.
 * Sections: Identity → Company & Memory → Current State → Rules
 */
export function buildDirectorSystemPrompt(
  director: DirectorConfig,
  memoryContext: string,
  currentState: string
): string {
  const sections: string[] = [];

  // Section 1: Identity
  sections.push(`# Identity
You are **${director.displayName}** — ${director.roleDescription}

${director.systemPrompt}`);

  // Section 2: Company & Memory
  if (memoryContext) {
    sections.push(`# Company & Memory
${memoryContext}`);
  }

  // Section 3: Current State
  sections.push(`# Current State
${currentState}`);

  // Section 4: Rules
  sections.push(`# Rules
- Use your tools when available to gather data before forming conclusions.
- Cite specific sources, data points, or facts to support your analysis.
- Be specific and actionable — avoid vague generalities.
- Structure your response with clear markdown sections.
- When you are done with your analysis, end your final response with: DIRECTOR COMPLETE`);

  return sections.join("\n\n---\n\n");
}
