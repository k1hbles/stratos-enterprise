import type { AgentTool } from "@/lib/ai/agent/types";
import { getAccessToken } from "./mcp-client";

export const gmailReadTool: AgentTool = {
  name: "gmail_read",
  description: "Read recent emails from Gmail inbox.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Gmail search query (e.g. \"from:user@example.com is:unread\").",
      },
      max_results: {
        type: "number",
        description: "Maximum emails to return (default 5).",
      },
    },
    required: [],
  },
  async execute(args) {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, data: { error: "Google auth not configured" } };
    }

    try {
      const query = typeof args.query === "string" ? args.query : "";
      const maxResults = Number(args.max_results) || 5;

      const params = new URLSearchParams({
        maxResults: String(maxResults),
        ...(query ? { q: query } : {}),
      });

      const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!listRes.ok) {
        return { success: false, data: { error: `Gmail API: ${listRes.status}` } };
      }

      const listBody = await listRes.json();
      const messageIds = (listBody.messages ?? []).slice(0, maxResults);

      // Fetch each message's headers
      const emails = await Promise.all(
        messageIds.map(async (m: { id: string }) => {
          const msgRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!msgRes.ok) return null;
          const msg = await msgRes.json();
          const headers = msg.payload?.headers ?? [];
          return {
            id: msg.id,
            subject: headers.find((h: { name: string }) => h.name === "Subject")?.value ?? "",
            from: headers.find((h: { name: string }) => h.name === "From")?.value ?? "",
            date: headers.find((h: { name: string }) => h.name === "Date")?.value ?? "",
            snippet: msg.snippet ?? "",
          };
        })
      );

      return {
        success: true,
        data: { emails: emails.filter(Boolean), count: emails.filter(Boolean).length },
      };
    } catch (err) {
      return {
        success: false,
        data: { error: err instanceof Error ? err.message : "Gmail read failed" },
      };
    }
  },
};

export const gmailDraftTool: AgentTool = {
  name: "gmail_draft",
  description: "Create a draft email in Gmail.",
  input_schema: {
    type: "object",
    properties: {
      to: { type: "string", description: "Recipient email address." },
      subject: { type: "string", description: "Email subject." },
      body: { type: "string", description: "Email body (plain text)." },
    },
    required: ["to", "subject", "body"],
  },
  isWriteAction: true,
  async execute(args) {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, data: { error: "Google auth not configured" } };
    }

    try {
      const rawMessage = [
        `To: ${args.to}`,
        `Subject: ${args.subject}`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        String(args.body),
      ].join("\r\n");

      const encoded = Buffer.from(rawMessage)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const res = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: { raw: encoded } }),
        }
      );

      if (!res.ok) {
        return { success: false, data: { error: `Gmail API: ${res.status}` } };
      }

      const body = await res.json();
      return {
        success: true,
        data: { draft_id: body.id, message: "Draft created successfully" },
      };
    } catch (err) {
      return {
        success: false,
        data: { error: err instanceof Error ? err.message : "Gmail draft failed" },
      };
    }
  },
};
