import type { AgentTool } from "@/lib/ai/agent/types";
import { getAccessToken } from "./mcp-client";

export const gcalListTool: AgentTool = {
  name: "gcal_list",
  description: "List upcoming events from Google Calendar.",
  input_schema: {
    type: "object",
    properties: {
      calendar_id: {
        type: "string",
        description: "Calendar ID (default \"primary\").",
      },
      max_results: {
        type: "number",
        description: "Maximum events to return (default 10).",
      },
      time_min: {
        type: "string",
        description: "Start time in ISO 8601 (default now).",
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
      const calendarId = typeof args.calendar_id === "string" ? args.calendar_id : "primary";
      const maxResults = Number(args.max_results) || 10;
      const timeMin = typeof args.time_min === "string" ? args.time_min : new Date().toISOString();

      const params = new URLSearchParams({
        maxResults: String(maxResults),
        timeMin,
        singleEvents: "true",
        orderBy: "startTime",
      });

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        return { success: false, data: { error: `Calendar API: ${res.status}` } };
      }

      const body = await res.json();
      const events = (body.items ?? []).map(
        (e: {
          id: string;
          summary?: string;
          start?: { dateTime?: string; date?: string };
          end?: { dateTime?: string; date?: string };
          location?: string;
        }) => ({
          id: e.id,
          summary: e.summary ?? "No title",
          start: e.start?.dateTime ?? e.start?.date ?? "",
          end: e.end?.dateTime ?? e.end?.date ?? "",
          location: e.location ?? "",
        })
      );

      return {
        success: true,
        data: { events, count: events.length },
      };
    } catch (err) {
      return {
        success: false,
        data: { error: err instanceof Error ? err.message : "Calendar list failed" },
      };
    }
  },
};

export const gcalCreateTool: AgentTool = {
  name: "gcal_create",
  description: "Create a new event in Google Calendar.",
  input_schema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "Event title." },
      start: { type: "string", description: "Start time in ISO 8601." },
      end: { type: "string", description: "End time in ISO 8601." },
      description: { type: "string", description: "Event description." },
      location: { type: "string", description: "Event location." },
      calendar_id: { type: "string", description: "Calendar ID (default \"primary\")." },
    },
    required: ["summary", "start", "end"],
  },
  isWriteAction: true,
  async execute(args) {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, data: { error: "Google auth not configured" } };
    }

    try {
      const calendarId = typeof args.calendar_id === "string" ? args.calendar_id : "primary";

      const event = {
        summary: String(args.summary),
        start: { dateTime: String(args.start) },
        end: { dateTime: String(args.end) },
        ...(args.description ? { description: String(args.description) } : {}),
        ...(args.location ? { location: String(args.location) } : {}),
      };

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );

      if (!res.ok) {
        return { success: false, data: { error: `Calendar API: ${res.status}` } };
      }

      const body = await res.json();
      return {
        success: true,
        data: {
          event_id: body.id,
          html_link: body.htmlLink,
          message: "Event created successfully",
        },
      };
    } catch (err) {
      return {
        success: false,
        data: { error: err instanceof Error ? err.message : "Calendar create failed" },
      };
    }
  },
};
