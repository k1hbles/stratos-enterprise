import type { LLMToolDef } from "@/lib/ai/call";
import { uploadFile } from "@/lib/storage";

/** Provider-agnostic tool definitions for chat research mode */
export function getChatToolDefs(): LLMToolDef[] {
  return [
    {
      name: "web_search",
      description:
        "Search the web for current information. Returns titles, URLs, and snippets.",
      input_schema: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description: "The search query.",
          },
          count: {
            type: "number",
            description: "Number of results (1-10). Default 5.",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "web_fetch",
      description:
        "Fetch and extract text content from a web page URL.",
      input_schema: {
        type: "object" as const,
        properties: {
          url: {
            type: "string",
            description: "The URL to fetch.",
          },
        },
        required: ["url"],
      },
    },
    {
      name: "get_current_time",
      description: "Get the current date and time.",
      input_schema: {
        type: "object" as const,
        properties: {
          timezone: {
            type: "string",
            description: "IANA timezone. Defaults to UTC.",
          },
        },
        required: [],
      },
    },
    {
      name: "generate_document",
      description:
        "Generate a downloadable file (spreadsheet, Word document, or PDF) from content. Use this immediately whenever the user asks for a file, spreadsheet, report, or document — do not ask for clarification first. For professional PDF reports with charts and tables, use generate_report instead.",
      input_schema: {
        type: "object" as const,
        properties: {
          title: {
            type: "string",
            description: "The document title (used as filename).",
          },
          content_markdown: {
            type: "string",
            description:
              "Full document content in markdown. For xlsx, include a markdown table for structured data. For docx/pdf, use headings (##), bullet points (-), and paragraphs.",
          },
          format: {
            type: "string",
            enum: ["xlsx", "docx", "pdf"],
            description:
              "Output format: xlsx for spreadsheets/data, docx for Word documents, pdf for PDFs (falls back to docx if PDF renderer unavailable).",
          },
        },
        required: ["title", "content_markdown", "format"],
      },
    },
    {
      name: "generate_presentation",
      description:
        `Generate a PowerPoint (PPTX) presentation. You write raw HTML+CSS for each slide — it gets rendered at 1920×1080 and assembled into PPTX as full-slide images.

HTML RULES:
- Each slide's html is placed inside <body> which is 1920×1080px with background #0A0F1E.
- Use ONLY inline styles. No <style> tags, no class names.
- Use only system fonts: Georgia, Calibri, Arial, Helvetica, sans-serif, serif.
- All text must use color values (hex). No "currentColor" or "inherit".
- Use flexbox or grid for layout. No absolute positioning unless intentional.
- Keep HTML self-contained — no external resources except {{VISUAL}} data URIs.

DESIGN RULES:
- Pick 2-3 colors and stick to them (e.g. #A78BFA accent, #FFFFFF text, #1A1F3E cards).
- Vary layouts across slides — no two consecutive slides should look the same.
- Text must be large: titles 64-80px, body 28-36px, stats 120-200px.
- Generous whitespace — never fill every pixel.
- Use border-radius, subtle borders, gradients, and box-shadow for depth.

VISUAL PROMPT SLIDES:
- If visual_prompt is set, the generated image will replace {{VISUAL}} in the html.
- Use {{VISUAL}} as the src of an <img> tag for full-bleed backgrounds or hero images.
- Example: <img src="{{VISUAL}}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" />

ANTI-SLOP RULES:
- No "In today's rapidly evolving..." or "Let's dive in" or "In conclusion".
- No rainbow gradients. No generic stock-photo prompts.
- Be specific and direct.`,
      input_schema: {
        type: "object" as const,
        properties: {
          title: {
            type: "string",
            description: "The presentation title (used as filename).",
          },
          slides: {
            type: "array",
            description: "Array of slides. Each slide has HTML rendered at 1920×1080.",
            items: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "Slide title (used for metadata/notes, not rendered separately).",
                },
                html: {
                  type: "string",
                  description: "Complete self-contained HTML for a 1920×1080 viewport. Inline styles only. This is placed inside <body> which has width:1920px, height:1080px, background:#0A0F1E.",
                },
                visual_prompt: {
                  type: "string",
                  description: "If provided, an AI image is generated and injected into the html replacing {{VISUAL}} as a data URI. Prompt must be hyper-specific: subject, environment, lighting, mood. End with 'no text, no labels, no watermark'.",
                },
              },
              required: ["title", "html"],
            },
          },
        },
        required: ["title", "slides"],
      },
    },
    {
      name: "generate_spreadsheet",
      description:
        "Generate a rich multi-sheet Excel workbook with formatted headers, alternating row colors, number formatting, optional totals row, and embedded charts. Always include at least one chart showing key data visually. Before calling, decide what rows/columns/data to include. Populate with realistic numbers. Minimum 5 rows per sheet. Use Indonesian Rupiah (Rp) formatting for financial data when user writes in Indonesian.",
      input_schema: {
        type: "object" as const,
        properties: {
          title: {
            type: "string",
            description: "Workbook title (used as filename).",
          },
          sheets: {
            type: "array",
            description: "Array of sheets to create.",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Sheet tab name (max 31 chars).",
                },
                headers: {
                  type: "array",
                  items: { type: "string" },
                  description: "Column header labels.",
                },
                rows: {
                  type: "array",
                  items: {
                    type: "array",
                    items: { type: ["string", "number"] },
                  },
                  description: "Row data as arrays of cell values.",
                },
                totals_row: {
                  type: "boolean",
                  description: "If true, add a SUM totals row for numeric columns.",
                },
                charts: {
                  type: "array",
                  description: "Optional charts to embed in the sheet.",
                  items: {
                    type: "object",
                    properties: {
                      type: {
                        type: "string",
                        enum: ["bar", "line", "pie", "doughnut", "radar"],
                      },
                      title: { type: "string" },
                      labels: { type: "array", items: { type: "string" } },
                      datasets: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            label: { type: "string" },
                            data: { type: "array", items: { type: "number" } },
                          },
                          required: ["label", "data"],
                        },
                      },
                    },
                    required: ["type", "title", "labels", "datasets"],
                  },
                },
              },
              required: ["name", "headers", "rows"],
            },
          },
        },
        required: ["title", "sheets"],
      },
    },
    {
      name: "generate_report",
      description:
        "Generate a professional PDF report with layout-driven sections, hero visuals, metrics cards, charts, timelines, and callout boxes. You are the DESIGN DIRECTOR — choose the best layout per section. Call immediately — do NOT search the web first.",
      input_schema: {
        type: "object" as const,
        properties: {
          title: {
            type: "string",
            description: "Report title (shown on cover page and used as filename).",
          },
          subtitle: {
            type: "string",
            description: "Optional subtitle shown below the title on the cover page.",
          },
          author: {
            type: "string",
            description: "Report author. Default 'Stratos Intelligence'.",
          },
          color_scheme: {
            type: "string",
            enum: ["dark", "professional", "minimal"],
            description: "Color scheme: dark (blue accent), professional (green accent), minimal (purple accent). Default dark.",
          },
          sections: {
            type: "array",
            description: "Report sections. Vary layout types — never use the same layout 3 times in a row.",
            items: {
              type: "object",
              properties: {
                layout: {
                  type: "string",
                  enum: ["hero", "metrics", "two-col", "table", "chart", "callout", "timeline", "prose"],
                  description: "Section layout: hero (full-width visual), metrics (KPI cards), two-col (side-by-side), table (data), chart (visualization), callout (key insight), timeline (events), prose (narrative).",
                },
                title: { type: "string", description: "Section title." },
                content: {
                  type: "string",
                  description: "Section content as prose text. Use newlines for paragraphs, '- ' prefix for bullet points.",
                },
                visual_prompt: {
                  type: "string",
                  description: "Image prompt for hero sections. Be specific: subject, environment, lighting, mood. End with 'no text, no labels, no watermark'.",
                },
                metrics: {
                  type: "array",
                  description: "For metrics layout: array of 3-4 KPI cards.",
                  items: {
                    type: "object",
                    properties: {
                      value: { type: "string", description: "The number/stat (e.g. '47%', '$2.4M')." },
                      label: { type: "string", description: "What it measures." },
                      change: { type: "string", description: "Change indicator (e.g. '+12%', '-5%')." },
                    },
                    required: ["value", "label"],
                  },
                },
                columns: {
                  type: "array",
                  description: "For two-col layout: array of 2 columns.",
                  items: {
                    type: "object",
                    properties: {
                      heading: { type: "string" },
                      content: { type: "string" },
                    },
                    required: ["heading", "content"],
                  },
                },
                table: {
                  type: "object",
                  description: "For table layout: data table.",
                  properties: {
                    headers: { type: "array", items: { type: "string" } },
                    rows: {
                      type: "array",
                      items: { type: "array", items: { type: ["string", "number"] } },
                    },
                  },
                  required: ["headers", "rows"],
                },
                chart: {
                  type: "object",
                  description: "For chart layout: chart data + optional analysis text.",
                  properties: {
                    type: {
                      type: "string",
                      enum: ["bar", "line", "pie", "doughnut", "radar"],
                    },
                    title: { type: "string" },
                    labels: { type: "array", items: { type: "string" } },
                    datasets: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          label: { type: "string" },
                          data: { type: "array", items: { type: "number" } },
                        },
                        required: ["label", "data"],
                      },
                    },
                    analysis: { type: "string", description: "Analysis paragraph for the chart data." },
                  },
                  required: ["type", "title", "labels", "datasets"],
                },
                callout_text: { type: "string", description: "For callout layout: the key insight text." },
                callout_source: { type: "string", description: "For callout layout: attribution source." },
                timeline_events: {
                  type: "array",
                  description: "For timeline layout: chronological events.",
                  items: {
                    type: "object",
                    properties: {
                      date: { type: "string" },
                      title: { type: "string" },
                      description: { type: "string" },
                    },
                    required: ["date", "title"],
                  },
                },
              },
              required: ["layout", "title"],
            },
          },
          language: {
            type: "string",
            enum: ["en", "id"],
            description: "Report language. Default en.",
          },
        },
        required: ["title", "sections"],
      },
    },
    {
      name: "think",
      description:
        "Use this tool to think through a problem step-by-step before taking action. Always use this first when the task is complex, requires planning, or involves multiple steps. The reasoning will be recorded but no external action is performed.",
      input_schema: {
        type: "object" as const,
        properties: {
          reasoning: {
            type: "string",
            description: "Your step-by-step reasoning about the problem.",
          },
        },
        required: ["reasoning"],
      },
    },
    {
      name: "generate_image",
      description:
        "Generate an AI image using DALL-E 3. Use this when the user asks for an image, illustration, or visual.",
      input_schema: {
        type: "object" as const,
        properties: {
          prompt: {
            type: "string",
            description: "Descriptive prompt for image generation.",
          },
          size: {
            type: "string",
            enum: ["1024x1024", "1792x1024", "1024x1792"],
            description: "Image dimensions. Default 1024x1024.",
          },
        },
        required: ["prompt"],
      },
    },
  ];
}

interface HtmlSlideSpec {
  title: string;
  html: string;
  visual_prompt?: string;
}

type FileResult = {
  file: {
    name: string;
    size: number;
    url: string;
    mimeType: string;
  };
  previewHtml?: string;
};

/** String result with optional structured data for expand */
type StringResultWithData = {
  text: string;
  searchResults?: Array<{ title: string; url: string; snippet: string }>;
};

export type ToolResult = string | FileResult | StringResultWithData;

export type ToolProgressCallback = (message: string) => void;

/** Execute a chat tool call server-side (no DB context needed) */
export async function executeChatTool(
  name: string,
  input: Record<string, unknown>,
  onProgress?: ToolProgressCallback
): Promise<ToolResult> {
  switch (name) {
    case "web_search": {
      const query = String(input.query);
      const count = Math.min(Math.max(Number(input.count) || 5, 1), 10);
      const apiKey = process.env.BRAVE_SEARCH_API_KEY;
      if (!apiKey) return JSON.stringify({ error: "Search not configured" });

      try {
        const params = new URLSearchParams({ q: query, count: String(count) });
        const res = await fetch(
          `https://api.search.brave.com/res/v1/web/search?${params}`,
          {
            headers: {
              Accept: "application/json",
              "Accept-Encoding": "gzip",
              "X-Subscription-Token": apiKey,
            },
          }
        );
        if (!res.ok) return JSON.stringify({ error: `Search returned ${res.status}` });
        const body = await res.json();
        const results: Array<{ title: string; url: string; snippet: string }> =
          (body.web?.results ?? []).map(
            (r: { title?: string; url?: string; description?: string }) => ({
              title: r.title ?? "",
              url: r.url ?? "",
              snippet: r.description ?? "",
            })
          );
        return {
          text: JSON.stringify({ results, result_count: results.length }),
          searchResults: results,
        };
      } catch (err) {
        return JSON.stringify({
          error: err instanceof Error ? err.message : "Search failed",
        });
      }
    }

    case "web_fetch": {
      const url = String(input.url);
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; NightshiftBot/1.0)",
            Accept: "text/html,application/xhtml+xml,text/plain",
          },
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) return JSON.stringify({ error: `Fetch returned ${res.status}`, url });
        const html = await res.text();
        let content = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        const words = content.split(/\s+/);
        if (words.length > 5000) {
          content = words.slice(0, 5000).join(" ") + "…";
        }
        return JSON.stringify({
          content,
          url,
          word_count: Math.min(words.length, 5000),
        });
      } catch (err) {
        return JSON.stringify({
          error: err instanceof Error ? err.message : "Fetch failed",
          url,
        });
      }
    }

    case "think": {
      return JSON.stringify({
        success: true,
        acknowledged: true,
        reasoning_length: String(input.reasoning ?? "").length,
      });
    }
    case "get_current_time": {
      const now = new Date();
      return JSON.stringify({
        iso: now.toISOString(),
        formatted: now.toLocaleString("en-US", {
          dateStyle: "full",
          timeStyle: "long",
        }),
      });
    }

    case "generate_document": {
      const title = String(input.title ?? "document");
      const content = String(input.content_markdown ?? "");
      const format = String(input.format ?? "docx") as "xlsx" | "docx" | "pdf";

      try {
        let buffer: Buffer;
        let ext: string;
        let mimeType: string;

        if (format === "xlsx") {
          onProgress?.("Building spreadsheet...");
          buffer = await generateXLSX(content, title);
          ext = "xlsx";
          mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        } else {
          // LLM-enhanced formatting (fast + cheap)
          onProgress?.("Structuring document...");
          let enhancedContent = content;
          try {
            const { callLLM } = await import("@/lib/ai/call");
            const { SECONDARY_MODEL } = await import("@/lib/ai/model-router");
            const resp = await callLLM({
              model: SECONDARY_MODEL,
              messages: [{
                role: "user" as const,
                content: `Rewrite as a well-structured professional document with clear heading hierarchy (# ## ###), proper paragraphs, bullets where appropriate, bold for key terms.\n\nTitle: ${title}\n\nContent:\n${content}\n\nReturn ONLY formatted markdown.`,
              }],
              systemPrompt: "You are a professional document formatter. Return only markdown. No preamble.",
            });
            if (resp.content?.trim()) enhancedContent = resp.content;
          } catch {
            // Use original content on LLM failure
          }

          if (format === "pdf") {
            onProgress?.("Rendering PDF...");
            try {
              const { renderHtmlToPdf } = await import("./renderers/html-to-pdf");
              const docHtml = markdownToDocHtml(enhancedContent, title);
              buffer = await renderHtmlToPdf(docHtml);
              ext = "pdf";
              mimeType = "application/pdf";
            } catch {
              onProgress?.("Falling back to Word...");
              buffer = await generateDOCX(enhancedContent, title);
              ext = "docx";
              mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            }
          } else {
            onProgress?.("Generating Word document...");
            buffer = await generateDOCX(enhancedContent, title);
            ext = "docx";
            mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          }
        }

        const sanitized = title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100);
        const fileName = `${sanitized}.${ext}`;
        const storagePath = `outputs/chat/${crypto.randomUUID()}/${fileName}`;

        uploadFile(storagePath, buffer);

        return {
          file: {
            name: fileName,
            size: buffer.length,
            url: `/api/files/output?path=${encodeURIComponent(storagePath)}`,
            mimeType,
          },
        };
      } catch (err) {
        return JSON.stringify({
          error: err instanceof Error ? err.message : "Failed to generate document",
        });
      }
    }

    case "generate_presentation": {
      const title = String(input.title ?? "Presentation");
      const slides = (input.slides ?? []) as HtmlSlideSpec[];

      try {
        const { generateSlideVisual } = await import("@/lib/ai/tools/image-gen-gemini");
        const { renderSlidesToPng } = await import("@/lib/ai/tools/renderers/html-to-slides");

        // ── Phase 1: Generate visuals in parallel ──
        console.log(`[Pres] Starting phase 1: generating visuals for ${slides.length} slides`);
        onProgress?.("Generating slide visuals...");
        const visualResults: (string | null)[] = await Promise.all(
          slides.slice(0, 10).map(async (s, i) => {
            if (!s.visual_prompt) return null;
            onProgress?.(`Generating visual ${i + 1}/${slides.length}...`);
            return generateSlideVisual(s.visual_prompt);
          })
        );
        console.log(`[Pres] Phase 1 complete: ${visualResults.filter(Boolean).length} visuals generated`);

        // Inject generated images as data URIs into {{VISUAL}} placeholders
        const processedHtmls = slides.map((s, i) => {
          let html = s.html;
          const imgB64 = visualResults[i] ?? null;
          if (imgB64 && html.includes("{{VISUAL}}")) {
            html = html.replace(/\{\{VISUAL\}\}/g, `data:image/png;base64,${imgB64}`);
          }
          return html;
        });

        // ── Phase 2: Render slides to PNG via Puppeteer ──
        console.log(`[Pres] Starting phase 2: rendering ${processedHtmls.length} slides to PNG`);
        onProgress?.("Rendering slides...");
        let pngBuffers: Buffer[];
        try {
          pngBuffers = await renderSlidesToPng(processedHtmls);
          console.log(`[Pres] Phase 2 complete: rendered ${pngBuffers.length} slide images`);
        } catch (renderErr) {
          console.error('[Pres] Puppeteer rendering FAILED:', renderErr);
          pngBuffers = [];
        }

        if (pngBuffers.length === 0) {
          throw new Error(
            'No slide images were rendered. Check Puppeteer/Chromium setup. See [Slides] logs for details.'
          );
        }

        // ── Phase 3: Assemble PPTX ──
        console.log(`[Pres] Starting phase 3: assembling PPTX with ${pngBuffers.length} slides`);
        onProgress?.("Assembling presentation...");
        const PptxGenJS = (await import("pptxgenjs")).default;
        const pres = new PptxGenJS();
        pres.layout = "LAYOUT_WIDE";

        for (let i = 0; i < pngBuffers.length; i++) {
          const slide = pres.addSlide();
          slide.addImage({
            data: `data:image/png;base64,${pngBuffers[i].toString("base64")}`,
            x: 0,
            y: 0,
            w: "100%",
            h: "100%",
          });
        }

        // ── Write file ──
        onProgress?.("Writing presentation file...");
        const pptxData = (await pres.write({ outputType: "nodebuffer" })) as Buffer;
        const buffer = Buffer.from(pptxData);

        const sanitized = title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100);
        const fileName = `${sanitized}.pptx`;
        const storagePath = `outputs/chat/${crypto.randomUUID()}/${fileName}`;

        uploadFile(storagePath, buffer);

        return {
          file: {
            name: fileName,
            size: buffer.length,
            url: `/api/files/output?path=${encodeURIComponent(storagePath)}`,
            mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          },
          previewHtml: processedHtmls[0],
        };
      } catch (err) {
        return JSON.stringify({
          error: err instanceof Error ? err.message : "Failed to generate presentation",
        });
      }
    }

    case "generate_spreadsheet": {
      const title = String(input.title ?? "Spreadsheet");
      const sheets = (input.sheets ?? []) as Array<{
        name: string;
        headers: string[];
        rows: Array<Array<string | number>>;
        totals_row?: boolean;
        charts?: Array<{
          type: "bar" | "line" | "pie" | "doughnut" | "radar";
          title: string;
          labels: string[];
          datasets: { label: string; data: number[] }[];
        }>;
      }>;

      try {
        const ExcelJS = (await import("exceljs")).default;
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Stratos";
        workbook.created = new Date();

        const HEADER_BG = "FF1A1A2E";
        const HEADER_TEXT = "FFFFFFFF";
        const ROW_EVEN = "FFF8F8FC";
        const ROW_ODD = "FFFFFFFF";

        // ── Pass 1: Build all sheets (rows, formatting, auto-width) ──
        const sheetRefs: Array<{
          sheet: import("exceljs").Worksheet;
          charts: typeof sheets[number]["charts"];
          chartRowOffset: number;
        }> = [];

        for (let si = 0; si < sheets.length; si++) {
          const sheetDef = sheets[si];
          onProgress?.(`Building sheet ${si + 1}: ${sheetDef.name}...`);
          const sheet = workbook.addWorksheet(sheetDef.name.slice(0, 31));

          // Header row
          const headerRow = sheet.addRow(sheetDef.headers);
          headerRow.font = { bold: true, color: { argb: HEADER_TEXT } };
          headerRow.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: HEADER_BG },
            };
            cell.alignment = { horizontal: "center", vertical: "middle" };
          });

          // Freeze top row
          sheet.views = [{ state: "frozen", ySplit: 1 }];

          // Data rows with alternating colors
          for (let ri = 0; ri < sheetDef.rows.length; ri++) {
            const row = sheet.addRow(sheetDef.rows[ri]);
            const bgColor = ri % 2 === 0 ? ROW_EVEN : ROW_ODD;
            row.eachCell((cell) => {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: bgColor },
              };
              if (typeof cell.value === "number") {
                cell.numFmt = "#,##0";
              }
            });
          }

          // Totals row
          if (sheetDef.totals_row && sheetDef.rows.length > 0) {
            const totalsData: Array<string | { formula: string }> = [];
            for (let ci = 0; ci < sheetDef.headers.length; ci++) {
              const isNumeric = sheetDef.rows.some((r) => typeof r[ci] === "number");
              if (isNumeric && ci > 0) {
                const colLetter = String.fromCharCode(65 + ci);
                const startRow = 2;
                const endRow = 1 + sheetDef.rows.length;
                totalsData.push({ formula: `SUM(${colLetter}${startRow}:${colLetter}${endRow})` });
              } else if (ci === 0) {
                totalsData.push("Total" as any);
              } else {
                totalsData.push("" as any);
              }
            }
            const totalsRow = sheet.addRow(totalsData);
            totalsRow.font = { bold: true };
            totalsRow.eachCell((cell) => {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: HEADER_BG },
              };
              cell.font = { bold: true, color: { argb: HEADER_TEXT } };
              if (typeof cell.value === "object" || typeof cell.value === "number") {
                cell.numFmt = "#,##0";
              }
            });
          }

          // Auto-width columns
          sheet.columns.forEach((col) => {
            let maxLen = 10;
            col.eachCell?.({ includeEmpty: false }, (cell) => {
              const len = String(cell.value ?? "").length;
              if (len > maxLen) maxLen = Math.min(len, 60);
            });
            col.width = maxLen + 4;
          });

          // Collect chart info for pass 2
          const chartRowOffset = sheetDef.rows.length + (sheetDef.totals_row ? 4 : 3);
          sheetRefs.push({
            sheet,
            charts: sheetDef.charts,
            chartRowOffset,
          });
        }

        // ── Pass 2: Generate and embed all charts sequentially ──
        const totalCharts = sheetRefs.reduce(
          (sum, ref) => sum + (ref.charts?.length ?? 0), 0
        );
        let chartIdx = 0;

        if (totalCharts > 0) {
          const { generateChartImage } = await import("./renderers/chart-gen");

          for (const ref of sheetRefs) {
            if (!ref.charts?.length) continue;
            let rowOffset = ref.chartRowOffset;

            for (const chartSpec of ref.charts) {
              chartIdx++;
              onProgress?.(`Generating chart ${chartIdx} of ${totalCharts}: ${chartSpec.title}...`);
              const chartBuffer = await generateChartImage(chartSpec);
              const imageId = workbook.addImage({
                base64: chartBuffer.toString("base64"),
                extension: "png",
              });
              ref.sheet.addImage(imageId, {
                tl: { col: 1, row: rowOffset },
                ext: { width: 600, height: 300 },
              });
              rowOffset += 20;
            }
          }
        }

        onProgress?.("Writing workbook...");
        const buf = await workbook.xlsx.writeBuffer();
        const buffer = Buffer.from(buf);

        const sanitized = title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100);
        const fileName = `${sanitized}.xlsx`;
        const storagePath = `outputs/chat/${crypto.randomUUID()}/${fileName}`;

        uploadFile(storagePath, buffer);

        return {
          file: {
            name: fileName,
            size: buffer.length,
            url: `/api/files/output?path=${encodeURIComponent(storagePath)}`,
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        };
      } catch (err) {
        return JSON.stringify({
          error: err instanceof Error ? err.message : "Failed to generate spreadsheet",
        });
      }
    }

    case "generate_report": {
      try {
        const { generateReport } = await import("@/lib/ai/tools/generate-report");
        return await generateReport(input as any, onProgress);
      } catch (err) {
        return JSON.stringify({
          error: err instanceof Error ? err.message : "Failed to generate report",
        });
      }
    }

    case "generate_image": {
      const prompt = String(input.prompt ?? "");
      const size = (input.size as "1024x1024" | "1792x1024" | "1024x1792") ?? "1024x1024";

      try {
        const { generateImage } = await import("@/lib/ai/tools/image-gen");
        const result = await generateImage(prompt, size);
        if (!result) {
          return JSON.stringify({ error: "Image generation unavailable (OPENAI_API_KEY not set or generation failed)" });
        }
        return {
          file: {
            name: `image_${crypto.randomUUID().slice(0, 8)}.png`,
            size: result.buffer.length,
            url: result.url,
            mimeType: "image/png",
          },
        };
      } catch (err) {
        return JSON.stringify({
          error: err instanceof Error ? err.message : "Failed to generate image",
        });
      }
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

async function generateXLSX(content: string, title: string): Promise<Buffer> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title.slice(0, 31));

  const lines = content.split("\n").filter((l) => l.trim());
  const tableLines = lines.filter((l) => l.includes("|"));

  if (tableLines.length > 2) {
    for (let i = 0; i < tableLines.length; i++) {
      const cells = tableLines[i]
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.every((c) => /^[-:]+$/.test(c))) continue;

      const row = sheet.addRow(cells);
      if (i === 0) {
        row.font = { bold: true, color: { argb: "FFFFFFFF" } };
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF1F2937" },
          };
        });
      }
    }
  } else {
    sheet.addRow([title]).font = { bold: true, size: 14 };
    sheet.addRow([]);
    for (const line of lines) {
      sheet.addRow([line]);
    }
  }

  sheet.columns.forEach((col) => {
    let maxLen = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > maxLen) maxLen = Math.min(len, 60);
    });
    col.width = maxLen + 2;
  });

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

async function generateDOCX(content: string, title: string): Promise<Buffer> {
  const docx = await import("docx");
  const { Document, Paragraph, TextRun, HeadingLevel, Packer } = docx;

  const children: InstanceType<typeof Paragraph>[] = [];

  children.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 300 },
    })
  );

  const lines = content.split("\n");
  for (const line of lines) {
    if (line.startsWith("# ")) {
      children.push(
        new Paragraph({
          text: line.replace(/^#+\s*/, ""),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        })
      );
    } else if (line.startsWith("## ")) {
      children.push(
        new Paragraph({
          text: line.replace(/^#+\s*/, ""),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (line.startsWith("### ")) {
      children.push(
        new Paragraph({
          text: line.replace(/^#+\s*/, ""),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 },
        })
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line.replace(/^[-*]\s*/, "") })],
          bullet: { level: 0 },
        })
      );
    } else if (line.trim()) {
      const parts = line.split(/\*\*(.*?)\*\*/);
      const runs: InstanceType<typeof TextRun>[] = [];
      for (let i = 0; i < parts.length; i++) {
        if (parts[i]) {
          runs.push(new TextRun({ text: parts[i], bold: i % 2 === 1 }));
        }
      }
      children.push(new Paragraph({ children: runs, spacing: { after: 120 } }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  const buf = await Packer.toBuffer(doc);
  return Buffer.from(buf);
}

async function generatePDF(content: string, title: string): Promise<Buffer> {
  const ReactPDF = await import("@react-pdf/renderer");
  const React = (await import("react")).default;
  const { Document, Page, Text, View, StyleSheet } = ReactPDF;

  const styles = StyleSheet.create({
    page: { padding: 50, fontSize: 11, fontFamily: "Helvetica" },
    title: { fontSize: 22, marginBottom: 20, fontFamily: "Helvetica-Bold" },
    heading: { fontSize: 14, marginTop: 15, marginBottom: 8, fontFamily: "Helvetica-Bold" },
    paragraph: { marginBottom: 6, lineHeight: 1.5 },
    listItem: { marginBottom: 4, paddingLeft: 15 },
  });

  const elements: React.ReactElement[] = [];
  elements.push(React.createElement(Text, { style: styles.title, key: "title" }, title));

  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("# ") || line.startsWith("## ") || line.startsWith("### ")) {
      elements.push(
        React.createElement(Text, { style: styles.heading, key: `h-${i}` }, line.replace(/^#+\s*/, ""))
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        React.createElement(Text, { style: styles.listItem, key: `li-${i}` }, `• ${line.replace(/^[-*]\s*/, "")}`)
      );
    } else if (line.trim()) {
      elements.push(
        React.createElement(Text, { style: styles.paragraph, key: `p-${i}` }, line.replace(/\*\*(.*?)\*\*/g, "$1"))
      );
    }
  }

  const doc = React.createElement(
    Document,
    {},
    React.createElement(Page, { size: "A4", style: styles.page }, React.createElement(View, {}, ...elements))
  );

  const pdfBuf = await ReactPDF.renderToBuffer(doc as any);
  return Buffer.from(pdfBuf);
}

function markdownToDocHtml(markdown: string, title: string): string {
  const lines = markdown.split("\n");
  let html = "";
  for (const line of lines) {
    if (line.startsWith("# ")) {
      html += `<h1>${escapeDocHtml(line.slice(2))}</h1>`;
    } else if (line.startsWith("## ")) {
      html += `<h2>${escapeDocHtml(line.slice(3))}</h2>`;
    } else if (line.startsWith("### ")) {
      html += `<h3>${escapeDocHtml(line.slice(4))}</h3>`;
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      html += `<li>${line.slice(2).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</li>`;
    } else if (line.trim()) {
      html += `<p>${line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</p>`;
    }
  }
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    body { font-family: Georgia, serif; max-width: 720px; margin: 60px auto;
           color: #1a1a1a; font-size: 14px; line-height: 1.8; background: #fff; }
    h1 { font-size: 32px; margin-bottom: 8px; color: #111; }
    h2 { font-size: 22px; margin-top: 36px; margin-bottom: 12px;
         border-bottom: 1px solid #ddd; padding-bottom: 6px; }
    h3 { font-size: 16px; margin-top: 24px; margin-bottom: 8px; color: #333; }
    p { margin-bottom: 14px; }
    li { margin-bottom: 6px; margin-left: 24px; list-style: disc; }
    strong { color: #111; }
    @page { margin: 60px 72px; }
  </style></head><body>
  <h1>${escapeDocHtml(title)}</h1>
  ${html}
  </body></html>`;
}

function escapeDocHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
