/**
 * WhatsApp client manager (send-only).
 * Uses the whatsapp_queue table as an outbox pattern.
 * A separate worker process handles actual sending via Baileys.
 */

import { getDb } from "@/lib/db";

interface QueuedMessage {
  id: string;
  recipient_phone: string;
  message_body: string;
}

/** Process queued WhatsApp messages */
export async function processWhatsAppQueue(): Promise<number> {
  const enabled = process.env.WHATSAPP_ENABLED === "true";
  if (!enabled) return 0;

  const db = getDb();

  // Fetch pending messages
  const messages = db
    .prepare(
      "SELECT id, recipient_phone, message_body FROM whatsapp_queue WHERE status = 'queued' ORDER BY created_at ASC LIMIT 10"
    )
    .all() as QueuedMessage[];

  if (!messages.length) return 0;

  let sent = 0;

  for (const msg of messages) {
    try {
      // Placeholder: In production, use Baileys to send
      console.log(
        `[WhatsApp] Would send to ${msg.recipient_phone}: ${msg.message_body.slice(0, 50)}...`
      );

      db.prepare(
        "UPDATE whatsapp_queue SET status = 'sent', sent_at = datetime('now') WHERE id = ?"
      ).run(msg.id);

      sent++;
    } catch (err) {
      console.error(`[WhatsApp] Failed to send ${msg.id}:`, err);
      db.prepare(
        "UPDATE whatsapp_queue SET status = 'failed' WHERE id = ?"
      ).run(msg.id);
    }
  }

  return sent;
}
