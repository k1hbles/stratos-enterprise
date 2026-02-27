import type { AgentTool } from "@/lib/ai/agent/types";
import { getAccessToken } from "./mcp-client";

export const gsheetsReadTool: AgentTool = {
  name: "gsheets_read",
  description:
    "Read data from a Google Sheets spreadsheet. Returns cell values as a 2D array.",
  input_schema: {
    type: "object",
    properties: {
      spreadsheet_id: {
        type: "string",
        description: "The Google Sheets spreadsheet ID.",
      },
      range: {
        type: "string",
        description: "The A1 notation range to read (e.g. \"Sheet1!A1:D10\").",
      },
    },
    required: ["spreadsheet_id"],
  },
  async execute(args) {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, data: { error: "Google auth not configured" } };
    }

    try {
      const spreadsheetId = String(args.spreadsheet_id);
      const range = typeof args.range === "string" ? args.range : "Sheet1";

      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        return { success: false, data: { error: `Sheets API: ${res.status}` } };
      }

      const body = await res.json();
      return {
        success: true,
        data: {
          range: body.range,
          values: body.values ?? [],
          row_count: body.values?.length ?? 0,
        },
      };
    } catch (err) {
      return {
        success: false,
        data: { error: err instanceof Error ? err.message : "Sheets read failed" },
      };
    }
  },
};

export const gsheetsWriteTool: AgentTool = {
  name: "gsheets_write",
  description: "Write data to a Google Sheets spreadsheet.",
  input_schema: {
    type: "object",
    properties: {
      spreadsheet_id: {
        type: "string",
        description: "The Google Sheets spreadsheet ID.",
      },
      range: {
        type: "string",
        description: "The A1 notation range to write (e.g. \"Sheet1!A1\").",
      },
      values: {
        type: "array",
        description: "2D array of values to write.",
        items: { type: "array", items: { type: "string" } },
      },
    },
    required: ["spreadsheet_id", "range", "values"],
  },
  isWriteAction: true,
  async execute(args) {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, data: { error: "Google auth not configured" } };
    }

    try {
      const spreadsheetId = String(args.spreadsheet_id);
      const range = String(args.range);

      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values: args.values }),
        }
      );

      if (!res.ok) {
        return { success: false, data: { error: `Sheets API: ${res.status}` } };
      }

      const body = await res.json();
      return {
        success: true,
        data: {
          updated_range: body.updatedRange,
          updated_rows: body.updatedRows,
          updated_cells: body.updatedCells,
        },
      };
    } catch (err) {
      return {
        success: false,
        data: { error: err instanceof Error ? err.message : "Sheets write failed" },
      };
    }
  },
};
