import type { AgentTool } from "@/lib/ai/agent/types";
import { getDb } from "@/lib/db";

export const whatsappSendTool: AgentTool = {
  name: "whatsapp_send",
  description:
    "Queue a WhatsApp message for sending. Messages are queued and sent asynchronously.",
  input_schema: {
    type: "object",
    properties: {
      recipient_phone: {
        type: "string",
        description:
          "Recipient phone number in E.164 format (e.g. \"+1234567890\").",
      },
      message: {
        type: "string",
        description: "The message text to send.",
      },
    },
    required: ["recipient_phone", "message"],
  },
  isWriteAction: true,
  async execute(args, ctx) {
    const enabled = process.env.WHATSAPP_ENABLED === "true";
    if (!enabled) {
      return {
        success: false,
        data: { error: "WhatsApp integration is not enabled" },
      };
    }

    const phone = String(args.recipient_phone);
    const message = String(args.message);

    // Validate phone format
    if (!/^\+\d{10,15}$/.test(phone)) {
      return {
        success: false,
        data: { error: "Invalid phone number format. Use E.164 (e.g. +1234567890)" },
      };
    }

    try {
      const db = getDb();
      const id = crypto.randomUUID();

      const data = db
        .prepare(
          "INSERT INTO whatsapp_queue (id, user_id, recipient_phone, message_body, status) VALUES (?, ?, ?, ?, 'queued') RETURNING id"
        )
        .get(id, ctx.userId, phone, message) as { id: string } | undefined;

      if (!data) {
        return {
          success: false,
          data: { error: "Failed to queue message" },
        };
      }

      return {
        success: true,
        data: {
          queued: true,
          queue_id: data.id,
          recipient: phone,
          message: "Message queued for sending",
        },
      };
    } catch (err) {
      return {
        success: false,
        data: {
          error:
            err instanceof Error ? err.message : "Failed to queue message",
        },
      };
    }
  },
};
