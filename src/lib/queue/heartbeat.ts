import { getDb } from "@/lib/db";
import { callLLM } from "@/lib/ai/call";
import { SECONDARY_MODEL } from "@/lib/ai/model-router";
import { getSettings } from "@/lib/settings";

interface HeartbeatResult {
  userId: string;
  pendingConfirmations: number;
  staleDecisions: number;
  summaryGenerated: boolean;
  whatsappQueued: boolean;
}

/**
 * Run heartbeat check for a user.
 *
 * Tier 1 (no LLM): Count pending items.
 * Tier 2 (only if tier 1 finds items): Generate summary, optionally queue WhatsApp.
 */
export async function runHeartbeat(userId: string): Promise<HeartbeatResult> {
  const db = getDb();

  // Tier 1: Check for stale items (no LLM cost)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const pendingConfirmations = (
    db
      .prepare(
        "SELECT COUNT(*) as count FROM pending_confirmations WHERE user_id = ? AND status = 'pending' AND created_at < ?"
      )
      .get(userId, twoHoursAgo) as { count: number }
  ).count;

  const staleDecisions = (
    db
      .prepare(
        "SELECT COUNT(*) as count FROM decisions WHERE user_id = ? AND status = 'pending' AND created_at < ?"
      )
      .get(userId, fortyEightHoursAgo) as { count: number }
  ).count;

  const result: HeartbeatResult = {
    userId,
    pendingConfirmations,
    staleDecisions,
    summaryGenerated: false,
    whatsappQueued: false,
  };

  // Tier 2: Only call LLM if there are pending items
  if (pendingConfirmations === 0 && staleDecisions === 0) {
    return result;
  }

  try {
    const response = await callLLM({
      model: SECONDARY_MODEL,
      systemPrompt: "You are a concise executive assistant. Summarize pending items that need the user's attention. Be brief and actionable.",
      messages: [
        {
          role: "user",
          content: `The user has ${pendingConfirmations} pending tool confirmations (older than 2 hours) and ${staleDecisions} decisions awaiting review (older than 48 hours). Generate a brief nudge summary.`,
        },
      ],
    });

    const summary = response.content || "You have pending items requiring attention.";

    // Store as a decision row for visibility
    const decisionId = crypto.randomUUID();
    db.prepare(
      "INSERT INTO decisions (id, user_id, title, reasoning, decision, status) VALUES (?, ?, ?, ?, ?, 'pending')"
    ).run(
      decisionId,
      userId,
      "Heartbeat: Pending Items Review",
      summary,
      `${pendingConfirmations} confirmations, ${staleDecisions} decisions need attention`
    );

    result.summaryGenerated = true;

    // Check if WhatsApp is enabled
    const settings = getSettings(userId);
    if (settings.whatsappEnabled && settings.whatsappNumber) {
      const queueId = crypto.randomUUID();
      db.prepare(
        "INSERT INTO whatsapp_queue (id, user_id, recipient_phone, message_body) VALUES (?, ?, ?, ?)"
      ).run(queueId, userId, settings.whatsappNumber, summary.slice(0, 1000));
      result.whatsappQueued = true;
    }
  } catch (err) {
    console.error("[Heartbeat] Tier 2 failed:", err);
  }

  return result;
}
