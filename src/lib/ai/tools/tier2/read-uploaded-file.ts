import type { AgentTool, AgentContext } from "@/lib/ai/agent/types";
import { getDb } from "@/lib/db";
import { downloadFile } from "@/lib/storage";
import Papa from "papaparse";
import * as XLSX from "xlsx";

async function parseCSV(
  buffer: Buffer
): Promise<{ text: string; rows: number; cols: number; columns: string[] }> {
  const csvText = buffer.toString("utf-8");
  const result = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const columns = result.meta.fields ?? [];
  const rows = result.data as Record<string, unknown>[];

  const preview = rows
    .slice(0, 50)
    .map((r) => columns.map((c) => `${c}: ${r[c] ?? ""}`).join(" | "))
    .join("\n");

  const text = `CSV with ${rows.length} rows and ${columns.length} columns.\nColumns: ${columns.join(", ")}\n\nFirst ${Math.min(50, rows.length)} rows:\n${preview}`;

  return { text, rows: rows.length, cols: columns.length, columns };
}

async function parseXLSX(
  buffer: Buffer
): Promise<{ text: string; rows: number; cols: number; columns: string[] }> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  const preview = data
    .slice(0, 50)
    .map((r) => columns.map((c) => `${c}: ${r[c] ?? ""}`).join(" | "))
    .join("\n");

  const text = `Excel sheet "${sheetName}" with ${data.length} rows and ${columns.length} columns.\nColumns: ${columns.join(", ")}\n\nFirst ${Math.min(50, data.length)} rows:\n${preview}`;

  return { text, rows: data.length, cols: columns.length, columns };
}

async function parsePDF(
  buffer: Buffer
): Promise<{ text: string; rows: number; cols: number; columns: string[] }> {
  const pdfModule = await import("pdf-parse");
  const pdfParse = (pdfModule as any).default ?? pdfModule;
  const result = await pdfParse(buffer);
  const text = result.text.slice(0, 20_000);
  const wordCount = text.split(/\s+/).length;

  return {
    text: `PDF document (${result.numpages} pages, ~${wordCount} words):\n\n${text}`,
    rows: result.numpages,
    cols: 0,
    columns: [],
  };
}

async function parsePlainText(
  buffer: Buffer,
  fileName: string
): Promise<{ text: string; rows: number; cols: number; columns: string[] }> {
  const text = buffer.toString("utf-8").slice(0, 20_000);
  const lines = text.split("\n").length;

  return {
    text: `File "${fileName}" (${lines} lines):\n\n${text}`,
    rows: lines,
    cols: 0,
    columns: [],
  };
}

export const readUploadedFileTool: AgentTool = {
  name: "parse_file",
  description:
    "Parse an uploaded file (CSV, Excel, PDF, or text). Returns the file's content, column names, and row count. Use this to understand the data before analysis.",
  input_schema: {
    type: "object",
    properties: {
      file_id: {
        type: "string",
        description: "The UUID of the uploaded file from the job's file list.",
      },
    },
    required: ["file_id"],
  },
  async execute(args: Record<string, unknown>, ctx: AgentContext) {
    const fileId = String(args.file_id);

    // Find the file in the job's file list
    const file = ctx.job.files.find((f) => f.id === fileId);
    if (!file) {
      return {
        success: false,
        data: { error: `File with ID ${fileId} not found in this job` },
      };
    }

    try {
      // Download from local storage
      const buffer = downloadFile(file.storage_path);
      const ext = file.file_name.split(".").pop()?.toLowerCase() ?? "";

      let parsed: {
        text: string;
        rows: number;
        cols: number;
        columns: string[];
      };

      if (ext === "csv" || file.file_type === "text/csv") {
        parsed = await parseCSV(buffer);
      } else if (
        ext === "xlsx" ||
        ext === "xls" ||
        file.file_type.includes("spreadsheet")
      ) {
        parsed = await parseXLSX(buffer);
      } else if (ext === "pdf" || file.file_type === "application/pdf") {
        parsed = await parsePDF(buffer);
      } else {
        parsed = await parsePlainText(buffer, file.file_name);
      }

      // Store parsed content back on the file record
      const db = getDb();
      db.prepare("UPDATE job_files SET parsed_content = ? WHERE id = ?").run(
        parsed.text,
        fileId
      );

      return {
        success: true,
        data: {
          filename: file.file_name,
          row_count: parsed.rows,
          column_count: parsed.cols,
          columns: parsed.columns,
          content_preview: parsed.text.slice(0, 2000),
        },
      };
    } catch (err) {
      return {
        success: false,
        data: {
          error:
            err instanceof Error
              ? err.message
              : "Failed to parse file",
          filename: file.file_name,
        },
      };
    }
  },
};
