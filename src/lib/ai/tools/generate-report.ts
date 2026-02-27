import { uploadFile } from "@/lib/storage";
import { generateChartImage, type ChartSpec } from "./renderers/chart-gen";
import { renderHtmlToPdf } from "./renderers/html-to-pdf";
import { generateSlideVisual } from "./image-gen-gemini";

// ── Types ────────────────────────────────────────────────────────────────────

type SectionLayout =
  | "hero"
  | "metrics"
  | "two-col"
  | "table"
  | "chart"
  | "callout"
  | "timeline"
  | "prose";

type ReportSection = {
  layout: SectionLayout;
  title: string;
  content?: string;
  visual_prompt?: string;
  metrics?: Array<{ value: string; label: string; change?: string }>;
  columns?: Array<{ heading: string; content: string }>;
  table?: { headers: string[]; rows: (string | number)[][] };
  chart?: ChartSpec & { analysis?: string };
  callout_text?: string;
  callout_source?: string;
  timeline_events?: Array<{ date: string; title: string; description?: string }>;
};

export type ReportInput = {
  title: string;
  subtitle?: string;
  author?: string;
  color_scheme?: "dark" | "professional" | "minimal";
  sections: ReportSection[];
  language?: "en" | "id";
};

type FileResult = {
  file: {
    name: string;
    size: number;
    url: string;
    mimeType: string;
  };
  previewHtml?: string;
};

type ProgressCallback = (message: string) => void;

// ── Color Schemes ────────────────────────────────────────────────────────────

type ColorScheme = {
  cover_bg: string;
  accent: string;
  accent_rgb: string;
  header_bg: string;
  card_bg: string;
  text: string;
  muted: string;
  border: string;
  table_header: string;
  table_even: string;
  callout_bg: string;
  callout_border: string;
};

const COLOR_SCHEMES: Record<string, ColorScheme> = {
  dark: {
    cover_bg: "linear-gradient(135deg, #0f0f1a 0%, #0f3460 100%)",
    accent: "#3b82f6",
    accent_rgb: "59, 130, 246",
    header_bg: "#f8fafc",
    card_bg: "#ffffff",
    text: "#1a1a2e",
    muted: "#64748b",
    border: "#e2e8f0",
    table_header: "#1e3a5f",
    table_even: "#f8fafc",
    callout_bg: "#eff6ff",
    callout_border: "#3b82f6",
  },
  professional: {
    cover_bg: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
    accent: "#10b981",
    accent_rgb: "16, 185, 129",
    header_bg: "#f0fdf4",
    card_bg: "#ffffff",
    text: "#1e293b",
    muted: "#6b7280",
    border: "#d1d5db",
    table_header: "#065f46",
    table_even: "#f0fdf4",
    callout_bg: "#ecfdf5",
    callout_border: "#10b981",
  },
  minimal: {
    cover_bg: "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
    accent: "#8b5cf6",
    accent_rgb: "139, 92, 246",
    header_bg: "#faf5ff",
    card_bg: "#ffffff",
    text: "#111827",
    muted: "#6b7280",
    border: "#e5e7eb",
    table_header: "#4c1d95",
    table_even: "#faf5ff",
    callout_bg: "#f5f3ff",
    callout_border: "#8b5cf6",
  },
};

// ── Main ─────────────────────────────────────────────────────────────────────

export async function generateReport(
  input: Record<string, unknown>,
  onProgress?: ProgressCallback
): Promise<FileResult> {
  const title = String(input.title ?? "Report");
  const subtitle = input.subtitle ? String(input.subtitle) : undefined;
  const author = String(input.author ?? "Stratos Intelligence");
  const schemeName = String(input.color_scheme ?? "dark");
  const sections = (input.sections ?? []) as ReportSection[];
  const C = COLOR_SCHEMES[schemeName] ?? COLOR_SCHEMES.dark;

  // Phase 1: Generate hero images
  const heroImages: Map<number, string> = new Map();
  const heroSections = sections
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.layout === "hero" && s.visual_prompt);

  if (heroSections.length > 0) {
    onProgress?.("Generating hero visuals...");
    const results = await Promise.all(
      heroSections.map(async ({ s, i }) => {
        const b64 = await generateSlideVisual(s.visual_prompt!);
        return { i, b64 };
      })
    );
    for (const { i, b64 } of results) {
      if (b64) heroImages.set(i, b64);
    }
  }

  // Phase 2: Generate chart images
  const chartDataUris: Map<number, string> = new Map();
  const chartSections = sections
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.chart);

  if (chartSections.length > 0) {
    onProgress?.("Generating charts...");
    for (const { s, i } of chartSections) {
      try {
        const chartBuffer = await generateChartImage(s.chart!);
        const b64 = chartBuffer.toString("base64");
        chartDataUris.set(i, `data:image/png;base64,${b64}`);
      } catch {
        console.warn(`[report] Chart generation failed for section ${i}`);
      }
    }
  }

  // Phase 3: Build HTML
  onProgress?.("Building report layout...");
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const sectionsHtml = sections
    .map((section, i) => renderSection(section, i, C, heroImages, chartDataUris))
    .join("\n");

  const fullHtml = buildFullHtml(title, subtitle, author, dateStr, sectionsHtml, C);

  // Phase 4: Render PDF
  onProgress?.("Rendering PDF...");
  console.log('[Report] HTML length:', fullHtml.length, 'sections:', sections.length);
  const pdfBuffer = await renderHtmlToPdf(fullHtml);

  const sanitized = title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100);
  const fileName = `${sanitized}.pdf`;
  const storagePath = `outputs/chat/${crypto.randomUUID()}/${fileName}`;

  uploadFile(storagePath, pdfBuffer);

  return {
    file: {
      name: fileName,
      size: pdfBuffer.length,
      url: `/api/files/output?path=${encodeURIComponent(storagePath)}`,
      mimeType: "application/pdf",
    },
    previewHtml: fullHtml,
  };
}

// ── Section Renderers ────────────────────────────────────────────────────────

function renderSection(
  section: ReportSection,
  index: number,
  C: ColorScheme,
  heroImages: Map<number, string>,
  chartDataUris: Map<number, string>
): string {
  switch (section.layout) {
    case "hero":
      return renderHero(section, index, C, heroImages);
    case "metrics":
      return renderMetrics(section, C);
    case "two-col":
      return renderTwoCol(section, C);
    case "table":
      return renderTable(section, C);
    case "chart":
      return renderChart(section, index, C, chartDataUris);
    case "callout":
      return renderCallout(section, C);
    case "timeline":
      return renderTimeline(section, C);
    case "prose":
    default:
      return renderProse(section, C);
  }
}

function renderHero(
  section: ReportSection,
  index: number,
  C: ColorScheme,
  heroImages: Map<number, string>
): string {
  const imgB64 = heroImages.get(index);
  const bgStyle = imgB64
    ? `min-height: 280px;`
    : `background: linear-gradient(135deg, rgba(${C.accent_rgb}, 0.08) 0%, transparent 60%); min-height: 200px;`;

  return `<div class="section hero-section" style="${bgStyle} position: relative; border-radius: 12px; overflow: hidden; padding: 48px 40px; margin-bottom: 36px;">
    ${imgB64 ? `<img src="data:image/png;base64,${imgB64}" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0;" />` : ""}
    ${imgB64 ? '<div style="position: absolute; inset: 0; background: rgba(0,0,0,0.55); z-index: 1;"></div>' : ""}
    <div style="position: relative; z-index: 2;">
      <h2 style="font-size: 28px; font-weight: 700; color: ${imgB64 ? "#fff" : C.text}; margin-bottom: 16px; border: none; padding: 0;">${escapeHtml(section.title)}</h2>
      ${section.content ? `<p style="font-size: 15px; line-height: 1.8; color: ${imgB64 ? "rgba(255,255,255,0.9)" : C.text}; max-width: 680px;">${escapeHtml(section.content)}</p>` : ""}
    </div>
  </div>`;
}

function renderMetrics(section: ReportSection, C: ColorScheme): string {
  const metrics = section.metrics ?? [];
  const cards = metrics
    .map(
      (m) => `<div style="flex: 1; background: ${C.card_bg}; border: 1px solid ${C.border}; border-radius: 10px; padding: 24px; text-align: center; min-width: 140px;">
      <div style="font-size: 32px; font-weight: 700; color: ${C.accent}; font-family: Georgia, serif;">${escapeHtml(m.value)}</div>
      <div style="font-size: 12px; color: ${C.muted}; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.5px;">${escapeHtml(m.label)}</div>
      ${m.change ? `<div style="font-size: 11px; color: ${m.change.startsWith("-") ? "#ef4444" : "#22c55e"}; margin-top: 4px;">${escapeHtml(m.change)}</div>` : ""}
    </div>`
    )
    .join("\n");

  return `<div class="section">
    <h2>${escapeHtml(section.title)}</h2>
    <div style="display: flex; gap: 16px; margin: 16px 0;">${cards}</div>
    ${section.content ? renderContentParagraphs(section.content) : ""}
  </div>`;
}

function renderTwoCol(section: ReportSection, C: ColorScheme): string {
  const columns = section.columns ?? [];
  const cols = columns
    .map(
      (col) => `<div style="flex: 1; background: ${C.card_bg}; border: 1px solid ${C.border}; border-radius: 10px; padding: 24px;">
      <h3 style="font-size: 16px; font-weight: 700; color: ${C.accent}; margin-bottom: 12px;">${escapeHtml(col.heading)}</h3>
      ${renderContentParagraphs(col.content)}
    </div>`
    )
    .join("\n");

  return `<div class="section">
    <h2>${escapeHtml(section.title)}</h2>
    <div style="display: flex; gap: 20px; margin: 16px 0;">${cols}</div>
  </div>`;
}

function renderTable(section: ReportSection, C: ColorScheme): string {
  if (!section.table) return renderProse(section, C);

  const headerCells = section.table.headers
    .map((h) => `<th>${escapeHtml(String(h))}</th>`)
    .join("");
  const bodyRows = section.table.rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => {
            const val =
              typeof cell === "number" ? cell.toLocaleString() : String(cell);
            return `<td>${escapeHtml(val)}</td>`;
          })
          .join("")}</tr>`
    )
    .join("\n");

  return `<div class="section">
    <h2>${escapeHtml(section.title)}</h2>
    ${section.content ? renderContentParagraphs(section.content) : ""}
    <table>
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </div>`;
}

function renderChart(
  section: ReportSection,
  index: number,
  C: ColorScheme,
  chartDataUris: Map<number, string>
): string {
  const chartUri = chartDataUris.get(index);
  const analysis = section.chart?.analysis;

  return `<div class="section">
    <h2>${escapeHtml(section.title)}</h2>
    ${section.content ? renderContentParagraphs(section.content) : ""}
    ${chartUri ? `<div class="chart-container"><img src="${chartUri}" alt="${escapeHtml(section.chart?.title ?? "Chart")}" /></div>` : ""}
    ${analysis ? `<p style="font-style: italic; color: ${C.muted}; margin-top: 12px;">${escapeHtml(analysis)}</p>` : ""}
  </div>`;
}

function renderCallout(section: ReportSection, C: ColorScheme): string {
  const text = section.callout_text ?? section.content ?? "";
  const source = section.callout_source;

  return `<div class="section">
    <div style="background: ${C.callout_bg}; border-left: 4px solid ${C.callout_border}; border-radius: 0 10px 10px 0; padding: 24px 28px; margin: 20px 0;">
      <div style="font-size: 15px; line-height: 1.7; color: ${C.text}; font-style: italic;">${escapeHtml(text)}</div>
      ${source ? `<div style="font-size: 12px; color: ${C.muted}; margin-top: 10px;">— ${escapeHtml(source)}</div>` : ""}
    </div>
  </div>`;
}

function renderTimeline(section: ReportSection, C: ColorScheme): string {
  const events = section.timeline_events ?? [];
  const items = events
    .map(
      (ev) => `<div style="display: flex; gap: 16px; margin-bottom: 20px;">
      <div style="flex-shrink: 0; width: 12px; display: flex; flex-direction: column; align-items: center;">
        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${C.accent}; margin-top: 4px;"></div>
        <div style="width: 2px; flex: 1; background: ${C.border};"></div>
      </div>
      <div style="flex: 1; padding-bottom: 4px;">
        <div style="font-size: 11px; color: ${C.accent}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${escapeHtml(ev.date)}</div>
        <div style="font-size: 15px; font-weight: 700; color: ${C.text}; margin: 4px 0;">${escapeHtml(ev.title)}</div>
        ${ev.description ? `<div style="font-size: 13px; color: ${C.muted}; line-height: 1.6;">${escapeHtml(ev.description)}</div>` : ""}
      </div>
    </div>`
    )
    .join("\n");

  return `<div class="section">
    <h2>${escapeHtml(section.title)}</h2>
    <div style="margin: 16px 0;">${items}</div>
  </div>`;
}

function renderProse(section: ReportSection, C: ColorScheme): string {
  void C;
  return `<div class="section">
    <h2>${escapeHtml(section.title)}</h2>
    ${section.content ? renderContentParagraphs(section.content) : ""}
  </div>`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderContentParagraphs(content: string): string {
  const paragraphs = content
    .split("\n")
    .filter((l) => l.trim())
    .map((line) => {
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return `<li>${escapeHtml(line.replace(/^[-*]\s*/, ""))}</li>`;
      }
      return `<p>${escapeHtml(line)}</p>`;
    });

  let inList = false;
  const wrapped: string[] = [];
  for (const p of paragraphs) {
    if (p.startsWith("<li>")) {
      if (!inList) {
        wrapped.push("<ul>");
        inList = true;
      }
      wrapped.push(p);
    } else {
      if (inList) {
        wrapped.push("</ul>");
        inList = false;
      }
      wrapped.push(p);
    }
  }
  if (inList) wrapped.push("</ul>");

  return wrapped.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildFullHtml(
  title: string,
  subtitle: string | undefined,
  author: string,
  dateStr: string,
  sectionsHtml: string,
  C: ColorScheme
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 13px;
    color: ${C.text};
    line-height: 1.7;
  }

  /* Cover page */
  .cover {
    width: 100%;
    height: 100vh;
    background: ${C.cover_bg};
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 80px;
    page-break-after: always;
    position: relative;
  }
  .cover::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 6px;
    background: ${C.accent};
  }
  .cover h1 {
    color: #ffffff;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 42px;
    font-weight: 700;
    line-height: 1.2;
    margin-bottom: 16px;
  }
  .cover .accent-divider {
    width: 80px;
    height: 4px;
    background: ${C.accent};
    margin: 20px 0;
  }
  .cover .subtitle {
    color: rgba(255,255,255,0.7);
    font-size: 18px;
    margin-bottom: 8px;
  }
  .cover .author {
    color: rgba(255,255,255,0.6);
    font-size: 14px;
    margin-top: 32px;
  }
  .cover .date {
    color: rgba(255,255,255,0.4);
    font-size: 13px;
    margin-top: 8px;
  }

  /* Content pages */
  .content {
    padding: 60px 70px;
  }
  .section {
    margin-bottom: 36px;
  }
  .section h2 {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 20px;
    font-weight: 700;
    color: ${C.text};
    border-bottom: 3px solid ${C.accent};
    padding-bottom: 8px;
    margin-bottom: 16px;
  }
  .section p {
    margin-bottom: 10px;
    text-align: justify;
  }
  .section ul {
    margin: 10px 0 10px 24px;
  }
  .section li {
    margin-bottom: 6px;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 12px;
    border-radius: 8px;
    overflow: hidden;
  }
  thead tr {
    background: ${C.table_header};
    color: #ffffff;
  }
  th {
    padding: 10px 12px;
    text-align: left;
    font-weight: 600;
  }
  td {
    padding: 8px 12px;
    border-bottom: 1px solid ${C.border};
  }
  tbody tr:nth-child(even) {
    background: ${C.table_even};
  }
  tbody tr:nth-child(odd) {
    background: #ffffff;
  }

  /* Chart */
  .chart-container {
    margin: 20px 0;
    text-align: center;
  }
  .chart-container img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
  }
</style>
</head>
<body>
  <div class="cover">
    <h1>${escapeHtml(title)}</h1>
    <div class="accent-divider"></div>
    ${subtitle ? `<div class="subtitle">${escapeHtml(subtitle)}</div>` : ""}
    <div class="author">${escapeHtml(author)}</div>
    <div class="date">${dateStr}</div>
  </div>
  <div class="content">
    ${sectionsHtml}
  </div>
</body>
</html>`;
}
