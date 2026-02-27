import { getDb } from "@/lib/db";
import type { DirectorConfig, DirectorResult } from "@/lib/ai/directors/types";
import { callLLM } from "@/lib/ai/call";
import { SECONDARY_MODEL } from "@/lib/ai/model-router";

export interface ReviewResult {
  reviewerSlug: string;
  parsedRankings: { label: string; rank: number }[];
  commentary: string;
}

export interface AggregateRanking {
  label: string;
  directorSlug: string;
  avgRank: number;
}

const LABELS = ["A", "B", "C", "D", "E", "F", "G"];

/**
 * Karpathy-style peer review with anonymization and rankings.
 *
 * 1. Anonymize all director outputs as "Response A", "Response B", etc.
 * 2. Each participating director (excluding chairman/secretary) reviews ALL outputs.
 * 3. Parse rankings from each review.
 * 4. Compute aggregate ranking (average rank per response, lower = better).
 */
export async function runPeerReview(
  sessionId: string,
  goal: string,
  results: DirectorResult[],
  directors: DirectorConfig[],
  onExchange?: (reviewerSlug: string, rankings: string[], commentary: string) => void
): Promise<{ reviews: ReviewResult[]; rankings: AggregateRanking[] }> {
  const db = getDb();

  // Step 1: Build anonymized outputs
  const anonymized = results.map((r, i) => ({
    label: `Response ${LABELS[i]}`,
    directorSlug: r.directorSlug,
    output: r.summary,
  }));

  const anonymizedBlock = anonymized
    .map((a) => `### ${a.label}\n${a.output.slice(0, 3000)}`)
    .join("\n\n---\n\n");

  // Step 2: Each participating director reviews all anonymized outputs
  const participantSlugs = results.map((r) => r.directorSlug);
  const reviewers = directors.filter(
    (d) =>
      d.slug !== "chairman" &&
      d.slug !== "secretary" &&
      participantSlugs.includes(d.slug)
  );

  const reviews: ReviewResult[] = [];

  await Promise.all(
    reviewers.map(async (reviewer) => {
      const response = await callLLM({
        model: SECONDARY_MODEL,
        systemPrompt: `${reviewer.systemPrompt}\n\nYou are conducting a blind peer review of multiple anonymized responses to a business question. Evaluate each response from your area of expertise. Consider accuracy, completeness, actionability, and data quality.\n\nAfter your commentary, you MUST end with an explicit ranking in this exact format:\n\nFINAL RANKING:\n1. Response X\n2. Response Y\n3. Response Z\n...\n\nRank ALL responses from best to worst. Do not skip any.`,
        messages: [
          {
            role: "user",
            content: `## Goal\n${goal}\n\n## Anonymized Responses\n${anonymizedBlock}\n\nProvide your review and ranking:`,
          },
        ],
      });

      const text = response.content || "No review provided.";

      // Step 3: Parse rankings
      const parsedRankings = parseRankings(text, anonymized.length);

      const rankedLabels = parsedRankings.map((r) => r.label);
      onExchange?.(reviewer.slug, rankedLabels, text);

      reviews.push({
        reviewerSlug: reviewer.slug,
        parsedRankings,
        commentary: text,
      });

      // Step 4: Store in council_exchanges
      const exchangeId = crypto.randomUUID();
      db.prepare(
        "INSERT INTO council_exchanges (id, session_id, stage, from_director, content, exchange_type) VALUES (?, ?, 'review', ?, ?, 'review')"
      ).run(exchangeId, sessionId, reviewer.slug, text.slice(0, 10000));
    })
  );

  // Step 5: Compute aggregate rankings
  const rankings = computeAggregate(anonymized, reviews);

  return { reviews, rankings };
}

/**
 * Parse "FINAL RANKING:" section from review text.
 * Returns ordered array of { label, rank }. Falls back to equal ranks on failure.
 */
function parseRankings(
  text: string,
  totalResponses: number
): { label: string; rank: number }[] {
  const rankingSection = text.match(/FINAL RANKING:\s*([\s\S]*?)$/i);

  if (rankingSection) {
    const matches = [
      ...rankingSection[1].matchAll(/Response\s+([A-G])/gi),
    ];

    if (matches.length > 0) {
      const seen = new Set<string>();
      const result: { label: string; rank: number }[] = [];

      for (let i = 0; i < matches.length; i++) {
        const letter = matches[i][1].toUpperCase();
        const label = `Response ${letter}`;
        if (!seen.has(label)) {
          seen.add(label);
          result.push({ label, rank: i + 1 });
        }
      }

      return result;
    }
  }

  // Fallback: assign equal ranks to all
  console.warn(
    "[Reviewer] Could not parse FINAL RANKING from review, assigning equal ranks"
  );
  return Array.from({ length: totalResponses }, (_, i) => ({
    label: `Response ${LABELS[i]}`,
    rank: 1,
  }));
}

/**
 * Compute aggregate rankings: average rank per response across all reviewers.
 * Lower avgRank = better. Sorted ascending.
 */
function computeAggregate(
  anonymized: Array<{ label: string; directorSlug: string }>,
  reviews: ReviewResult[]
): AggregateRanking[] {
  const rankSums = new Map<string, { total: number; count: number; slug: string }>();

  for (const a of anonymized) {
    rankSums.set(a.label, { total: 0, count: 0, slug: a.directorSlug });
  }

  for (const review of reviews) {
    for (const r of review.parsedRankings) {
      const entry = rankSums.get(r.label);
      if (entry) {
        entry.total += r.rank;
        entry.count += 1;
      }
    }
  }

  const rankings: AggregateRanking[] = [];
  for (const [label, data] of rankSums) {
    rankings.push({
      label,
      directorSlug: data.slug,
      avgRank: data.count > 0 ? data.total / data.count : anonymized.length,
    });
  }

  rankings.sort((a, b) => a.avgRank - b.avgRank);

  return rankings;
}
