import type { AgentTool } from "@/lib/ai/agent/types";
import { getDb } from "@/lib/db";

/** Allowed tables for read-only querying */
const ALLOWED_TABLES = [
  "jobs",
  "job_steps",
  "job_results",
  "conversations",
  "missions",
  "council_sessions",
  "council_tasks",
  "memory_core",
  "audit_log",
  "decisions",
];

/** Allowed column name pattern (alphanumeric + underscore only) */
const SAFE_COL = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export const queryDataTool: AgentTool = {
  name: "query_data",
  description:
    "Query internal database tables (read-only). Can retrieve jobs, conversations, missions, and other internal data for the current user.",
  input_schema: {
    type: "object",
    properties: {
      table: {
        type: "string",
        enum: ALLOWED_TABLES,
        description: "The table to query.",
      },
      filters: {
        type: "object",
        description:
          "Key-value filters to apply (e.g. {\"status\": \"completed\"}).",
      },
      select: {
        type: "string",
        description:
          "Comma-separated column names to select (default: all).",
      },
      limit: {
        type: "number",
        description: "Maximum rows to return (default 20).",
      },
      order_by: {
        type: "string",
        description: "Column to order by (default: created_at desc).",
      },
    },
    required: ["table"],
  },
  async execute(args, ctx) {
    const table = String(args.table);

    if (!ALLOWED_TABLES.includes(table)) {
      return {
        success: false,
        data: { error: `Table "${table}" is not accessible` },
      };
    }

    try {
      const db = getDb();
      const limit = Number(args.limit) || 20;
      const orderBy =
        typeof args.order_by === "string" && SAFE_COL.test(args.order_by)
          ? args.order_by
          : "created_at";

      // Validate select columns
      let selectCols = "*";
      if (typeof args.select === "string") {
        const cols = args.select.split(",").map((c: string) => c.trim());
        if (cols.every((c: string) => SAFE_COL.test(c))) {
          selectCols = cols.join(", ");
        }
      }

      const conditions: string[] = ["user_id = ?"];
      const params: unknown[] = [ctx.userId];

      // Apply filters
      if (args.filters && typeof args.filters === "object") {
        const filters = args.filters as Record<string, unknown>;
        for (const [key, value] of Object.entries(filters)) {
          if (key !== "user_id" && SAFE_COL.test(key)) {
            conditions.push(`${key} = ?`);
            params.push(value);
          }
        }
      }

      const where = conditions.join(" AND ");
      params.push(limit);

      const data = db
        .prepare(
          `SELECT ${selectCols} FROM ${table} WHERE ${where} ORDER BY ${orderBy} DESC LIMIT ?`
        )
        .all(...params) as Record<string, unknown>[];

      return {
        success: true,
        data: {
          table,
          rows: data,
          count: data.length,
        },
      };
    } catch (err) {
      return {
        success: false,
        data: {
          error:
            err instanceof Error ? err.message : "Query failed",
        },
      };
    }
  },
};
