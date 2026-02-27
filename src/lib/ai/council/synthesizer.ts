import { getDb } from "@/lib/db";
import type { DirectorResult } from "@/lib/ai/directors/types";
import type { ReviewResult, AggregateRanking } from "./reviewer";
import { callLLM } from "@/lib/ai/call";
import { SECONDARY_MODEL } from "@/lib/ai/model-router";

/**
 * Stage 3: Secretary synthesizes director analyses (ordered by ranking) into a
 * 7-section report. Chairman adds a resolution section with conflict resolution
 * and a single priority action.
 */
export async function synthesizeResults(
  sessionId: string,
  goal: string,
  results: DirectorResult[],
  reviews: ReviewResult[],
  rankings: AggregateRanking[]
): Promise<string> {
  const db = getDb();

  // Present director analyses in aggregate ranking order (best first)
  const rankedResults = rankings
    .map((ranking) => {
      const result = results.find(
        (r) => r.directorSlug === ranking.directorSlug
      );
      return result
        ? {
            slug: result.directorSlug,
            avgRank: ranking.avgRank,
            summary: result.summary,
          }
        : null;
    })
    .filter(Boolean) as Array<{
    slug: string;
    avgRank: number;
    summary: string;
  }>;

  const analysesSection = rankedResults
    .map(
      (r, i) =>
        `### ${i + 1}. ${r.slug.toUpperCase()} (avg rank: ${r.avgRank.toFixed(1)})\n${r.summary.slice(0, 3000)}`
    )
    .join("\n\n");

  const reviewsSection = reviews
    .map(
      (r) =>
        `**${r.reviewerSlug.toUpperCase()} rankings**: ${r.parsedRankings.map((p) => `${p.label}=#${p.rank}`).join(", ")}\n${r.commentary.slice(0, 800)}`
    )
    .join("\n\n");

  // Secretary synthesis with enforced 7-section format
  const secretaryResponse = await callLLM({
    model: SECONDARY_MODEL,
    systemPrompt: `You are the Board Secretary. Synthesize the following director analyses and peer reviews into a comprehensive board report.

The analyses are ordered by peer-review ranking (best first). Give more weight to higher-ranked analyses but consider all perspectives.

You MUST use exactly this 7-section structure:

## 1. Executive Summary
A 3-5 sentence overview of the key findings and recommendation.

## 2. Key Findings
The most important facts and insights discovered, as bullet points.

## 3. Points of Agreement
Areas where directors reached consensus.

## 4. Points of Disagreement
Areas where directors diverged, with each position summarized fairly.

## 5. Recommended Actions
Prioritized list of specific, actionable next steps.

## 6. Decisions Required
Items that need explicit leadership decisions, framed as clear questions.

## 7. Risk Flags
Potential risks, concerns, or unknowns that should be monitored.

Use markdown formatting. Be thorough but concise — a CEO should be able to read this in 10 minutes.`,
    messages: [
      {
        role: "user",
        content: `## Goal\n${goal}\n\n## Director Analyses (ranked by peer review)\n${analysesSection}\n\n## Peer Reviews\n${reviewsSection}\n\nSynthesize into the 7-section board report:`,
      },
    ],
  });

  const synthesis = secretaryResponse.content || "Synthesis failed.";

  // Record secretary synthesis
  const synthExchangeId = crypto.randomUUID();
  db.prepare(
    "INSERT INTO council_exchanges (id, session_id, stage, from_director, content, exchange_type) VALUES (?, ?, 'synthesis', 'secretary', ?, 'synthesis')"
  ).run(synthExchangeId, sessionId, synthesis.slice(0, 10000));

  // Chairman's Resolution — always adds a section
  const chairmanResponse = await callLLM({
    model: SECONDARY_MODEL,
    systemPrompt: `You are the Chairman. Review the Board Secretary's synthesis below.

You MUST add a "## Chairman's Resolution" section that:
1. Resolves each point of disagreement from Section 4 with your reasoning.
2. Identifies the single most important action for the next 30 days.
3. Notes any risks you want escalated.

Be decisive. Where directors disagree, pick a direction and explain why.`,
    messages: [
      {
        role: "user",
        content: `## Original Goal\n${goal}\n\n## Board Report\n${synthesis}`,
      },
    ],
  });

  const chairmanResolution = chairmanResponse.content || "";

  // Record chairman resolution
  const resolutionId = crypto.randomUUID();
  db.prepare(
    "INSERT INTO council_exchanges (id, session_id, stage, from_director, content, exchange_type) VALUES (?, ?, 'synthesis', 'chairman', ?, 'resolution')"
  ).run(resolutionId, sessionId, chairmanResolution.slice(0, 5000));

  // Combine: 7-section report + Chairman's Resolution
  const finalReport = `${synthesis}\n\n---\n\n${chairmanResolution}`;

  return finalReport;
}
