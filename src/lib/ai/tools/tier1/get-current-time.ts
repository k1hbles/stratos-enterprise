import type { AgentTool } from "@/lib/ai/agent/types";

export const getCurrentTimeTool: AgentTool = {
  name: "get_current_time",
  description:
    "Returns the current date and time in ISO 8601 format. Use this to know the current date for time-sensitive analysis.",
  input_schema: {
    type: "object",
    properties: {
      timezone: {
        type: "string",
        description:
          'Optional IANA timezone (e.g. "America/New_York"). Defaults to UTC.',
      },
    },
    required: [],
  },
  async execute(args) {
    const tz =
      typeof args.timezone === "string" ? args.timezone : "UTC";
    const now = new Date();
    let formatted: string;
    try {
      formatted = now.toLocaleString("en-US", {
        timeZone: tz,
        dateStyle: "full",
        timeStyle: "long",
      });
    } catch {
      formatted = now.toISOString();
    }
    return {
      success: true,
      data: { iso: now.toISOString(), formatted, timezone: tz },
    };
  },
};
