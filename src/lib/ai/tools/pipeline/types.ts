import type { ChartSpec } from "../renderers/chart-gen";

// ── Pipeline context (input) ─────────────────────────────────────────────────

export interface PipelineContext {
  type: "pptx" | "docx" | "xlsx";
  title: string;
  description: string;
  language: string;
  style: string;
  slideCount?: number;   // PPTX only
  format?: string;       // DOCX: "docx" | "pdf"
  onProgress: (message: string) => void;
}

// ── Content plan (Stage 1 output) ────────────────────────────────────────────

export interface SlidePlan {
  index: number;
  type:
    | "cover"
    | "section-divider"
    | "two-column"
    | "stat-callout"
    | "image-right"
    | "image-left"
    | "grid-cards"
    | "timeline"
    | "table"
    | "chart"
    | "closing";
  title: string;
  bullets?: string[];
  data?: Record<string, unknown>;
  imageQuery?: string;
  chartSpec?: ChartSpec;
  layoutNotes: string;
}

export interface DocumentSection {
  index: number;
  type: "heading" | "paragraph" | "bullets" | "table" | "chart" | "image";
  title?: string;
  content?: string;
  bullets?: string[];
  tableHeaders?: string[];
  tableRows?: (string | number)[][];
  chartSpec?: ChartSpec;
  imageQuery?: string;
}

export interface SpreadsheetSheet {
  name: string;
  description: string;
  columns: { header: string; type: "string" | "number" | "currency" | "percent" }[];
  rowCount: number;
  chartSpec?: ChartSpec;
  hasTotals?: boolean;
}

export interface ContentPlan {
  title: string;
  theme: {
    background: string;  // hex no hash, e.g. "0D0F14"
    surface: string;
    border: string;
    text: string;
    muted: string;
    accent: string;
    accent2: string;
  };
  slides?: SlidePlan[];
  sections?: DocumentSection[];
  sheets?: SpreadsheetSheet[];
}

// ── Asset manifest (Stage 2 output) ──────────────────────────────────────────

export interface AssetManifest {
  images: Map<number, string>;  // index -> local file path
  charts: Map<number, string>;  // index -> local file path
  tempDir: string;
}

// ── QA result ────────────────────────────────────────────────────────────────

export interface QAResult {
  valid: boolean;
  issues: string[];
}
