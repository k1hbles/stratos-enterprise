import type { LLMToolDef } from "@/lib/ai/call";

export interface ClawContext {
  memoryContext: string;
  tools: LLMToolDef[];
  model: string;
  systemPrompt: string;
}

export interface ClawFile {
  name: string;
  size: number;
  url: string;
  mimeType: string;
}

export type SSEEmitter = (event: SSEEvent) => void;

// ── Expand data for tool_result events ──────────────────────────────────────

export interface SearchExpandData {
  type: "search_results";
  results: Array<{ title: string; url: string; snippet: string }>;
}

export interface FileExpandData {
  type: "file_output";
  fileType: "pdf" | "xlsx" | "pptx" | "docx";
  fileName: string;
  downloadUrl: string;
  previewHtml?: string;
}

export interface FetchExpandData {
  type: "fetch_result";
  url: string;
  title: string;
}

export type ExpandData = SearchExpandData | FileExpandData | FetchExpandData;

// ── SSE event types ─────────────────────────────────────────────────────────

export type SSEEvent =
  | { type: "thinking"; status: "start" | "stop" }
  | { type: "text"; text: string }
  | { type: "tool_call"; toolName: string; toolId: string; args?: Record<string, unknown> }
  | { type: "tool_progress"; toolId: string; toolName: string; message: string }
  | { type: "tool_result"; toolId: string; toolName: string; summary: string; expandData?: ExpandData }
  | { type: "file_ready"; file: ClawFile }
  | { type: "done"; file?: ClawFile }
  | { type: "title_update"; title: string }
  | { type: "error"; message: string };
