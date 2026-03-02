import type { LLMToolDef } from "@/lib/ai/call";
import { uploadFile } from "@/lib/storage";

/** Provider-agnostic tool definitions for chat research mode */
export function getChatToolDefs(): LLMToolDef[] {
  return [
    {
      name: "web_search",
      description:
        "Search the web for current information, news, statistics, or research. " +
        "Use specific keywords. Call this before web_fetch to find relevant URLs.",
      input_schema: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description: "The search query. Be specific.",
          },
          num_results: {
            type: "number",
            description: "Number of results to return. Default 5, max 10.",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "web_fetch",
      description:
        "Read the full content of a specific URL. Use after web_search to read " +
        "a promising result in detail.",
      input_schema: {
        type: "object" as const,
        properties: {
          url: {
            type: "string",
            description: "The full URL to fetch including https://",
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
        "Generate a professional Word document (DOCX) or PDF with native editable text, tables, charts, and web-sourced images. The pipeline internally plans content, sources images, and builds the file natively. Call immediately without searching the web first.",
      input_schema: {
        type: "object" as const,
        properties: {
          title: {
            type: "string",
            description: "The document title (used as filename).",
          },
          description: {
            type: "string",
            description:
              "Detailed description of the document: topics, sections, data points, and requirements. Be specific about what content to include.",
          },
          format: {
            type: "string",
            enum: ["docx", "pdf"],
            description:
              "Output format: docx for Word documents, pdf for PDFs.",
          },
          language: {
            type: "string",
            enum: ["en", "id"],
            description: "Document language. Default en.",
          },
        },
        required: ["title", "description", "format"],
      },
    },
    {
      name: "generate_presentation",
      description:
        "Generate a professional PowerPoint (PPTX) presentation with native editable text, real shapes, web-sourced images, and embedded charts. The pipeline internally plans slides, sources images, and builds native PPTX. Call immediately without searching the web first.",
      input_schema: {
        type: "object" as const,
        properties: {
          title: {
            type: "string",
            description: "The presentation title (used as filename).",
          },
          description: {
            type: "string",
            description:
              "Detailed description of the presentation: key topics, data points, audience, sections, and requirements. Be specific about what to cover.",
          },
          slide_count: {
            type: "number",
            description: "Number of slides (8-20). Default 14.",
          },
          style: {
            type: "string",
            enum: ["dark", "corporate", "minimal"],
            description: "Visual style. Default dark.",
          },
          language: {
            type: "string",
            enum: ["en", "id"],
            description: "Presentation language. Default en.",
          },
        },
        required: ["title", "description"],
      },
    },
    {
      name: "generate_spreadsheet",
      description:
        "Generate a professional Excel workbook (XLSX) with formatted data, charts, formulas, and multiple sheets. The pipeline internally plans sheets, generates chart images, and builds the workbook natively. Call immediately without asking for clarification.",
      input_schema: {
        type: "object" as const,
        properties: {
          title: {
            type: "string",
            description: "Workbook title (used as filename).",
          },
          description: {
            type: "string",
            description:
              "Detailed description of the spreadsheet: what data/sheets/charts to include, column structure, metrics. Be specific.",
          },
          language: {
            type: "string",
            enum: ["en", "id"],
            description: "Spreadsheet language. Default en.",
          },
        },
        required: ["title", "description"],
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
    {
      name: "write_todo",
      description:
        "Create a task checklist for the current conversation. Use at the start of multi-step tasks to track progress. Items persist across messages.",
      input_schema: {
        type: "object" as const,
        properties: {
          items: {
            type: "array",
            items: { type: "string" },
            description: "List of task descriptions to add.",
          },
          complete: {
            type: "string",
            description: "Text of an existing task to mark as done (fuzzy match).",
          },
        },
        required: ["items"],
      },
    },
    {
      name: "read_todo",
      description:
        "Read the current task checklist for this conversation.",
      input_schema: {
        type: "object" as const,
        properties: {},
        required: [],
      },
    },
    {
      name: "execute_terminal",
      description:
        "Execute a shell command in a sandboxed cloud environment (E2B). Use for file operations, system tasks, or running CLI tools.",
      input_schema: {
        type: "object" as const,
        properties: {
          command: {
            type: "string",
            description: "The shell command to execute.",
          },
          description: {
            type: "string",
            description: "Brief human-readable description of what this command does.",
          },
        },
        required: ["command", "description"],
      },
    },
    {
      name: "execute_python",
      description:
        "Execute Python code in a sandboxed cloud environment (E2B). Use for data analysis, calculations, charts, or any computational task.",
      input_schema: {
        type: "object" as const,
        properties: {
          code: {
            type: "string",
            description: "Python code to execute.",
          },
          description: {
            type: "string",
            description: "Brief human-readable description of what this code does.",
          },
        },
        required: ["code", "description"],
      },
    },
  ];
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
  fetchedUrl?: string;
  fetchedTitle?: string;
};

export type ToolResult = string | FileResult | StringResultWithData;

export type ToolProgressCallback = (message: string) => void;

export interface ChatToolContext {
  conversationId?: string;
  jobId?: string;
}

/** Execute a chat tool call server-side (no DB context needed) */
export async function executeChatTool(
  name: string,
  input: Record<string, unknown>,
  onProgress?: ToolProgressCallback,
  context?: ChatToolContext
): Promise<ToolResult> {
  switch (name) {
    case "web_search": {
      const query = String(input.query);
      const numResults = Math.min(Math.max(Number(input.num_results) || 5, 1), 10);
      try {
        const { searchWeb } = await import("@/lib/search/tavily");
        const response = await searchWeb(query, numResults);
        const results = response.results.map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.snippet,
        }));
        return {
          text: JSON.stringify({
            results,
            result_count: results.length,
            ...(response.answer ? { summary: response.answer } : {}),
          }),
          searchResults: results,
        } as StringResultWithData;
      } catch (err) {
        return JSON.stringify({ error: err instanceof Error ? err.message : "Search failed" });
      }
    }

    case "web_fetch": {
      const url = String(input.url);
      try {
        const { fetchPage } = await import("@/lib/search/tavily");
        const result = await fetchPage(url);
        return {
          text: JSON.stringify({ content: result.text, url: result.url, title: result.title, word_count: result.wordCount }),
          fetchedUrl: result.url,
          fetchedTitle: result.title,
        } as StringResultWithData;
      } catch (err) {
        return JSON.stringify({ error: err instanceof Error ? err.message : "Fetch failed", url });
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
      const description = String(input.description ?? "");
      const format = String(input.format ?? "docx") as "docx" | "pdf";
      const language = String(input.language ?? "en");

      try {
        const { runNativePipeline } = await import("./pipeline/run-pipeline");
        const result = await runNativePipeline({
          type: "docx",
          title,
          description,
          language,
          style: "corporate",
          format,
          onProgress: (msg) => onProgress?.(msg),
        });

        const ext = "docx";
        const mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

        const sanitized = title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100);
        const fileName = `${sanitized}.${ext}`;
        const storagePath = `outputs/chat/${crypto.randomUUID()}/${fileName}`;

        uploadFile(storagePath, result.buffer);

        return {
          file: {
            name: fileName,
            size: result.buffer.length,
            url: `/api/files/output?path=${encodeURIComponent(storagePath)}`,
            mimeType,
          },
        };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Failed to generate document";
        console.error(`[generate_document] Pipeline failed for "${title}":`, errMsg);
        return JSON.stringify({
          error: errMsg,
          tool_failed: true,
          instruction: "File generation FAILED. Tell the user the document could not be generated and show the error. Do NOT describe or outline the document content as a substitute.",
        });
      }
    }

    case "generate_presentation": {
      const title = String(input.title ?? "Presentation");
      const description = String(input.description ?? "");
      const slideCount = Math.min(Math.max(Number(input.slide_count) || 14, 8), 20);
      const style = String(input.style ?? "dark");
      const language = String(input.language ?? "en");

      try {
        const { runNativePipeline } = await import("./pipeline/run-pipeline");
        const result = await runNativePipeline({
          type: "pptx",
          title,
          description,
          language,
          style,
          slideCount,
          onProgress: (msg) => onProgress?.(msg),
        });

        const sanitized = title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100);
        const fileName = `${sanitized}.pptx`;
        const storagePath = `outputs/chat/${crypto.randomUUID()}/${fileName}`;

        uploadFile(storagePath, result.buffer);

        return {
          file: {
            name: fileName,
            size: result.buffer.length,
            url: `/api/files/output?path=${encodeURIComponent(storagePath)}`,
            mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          },
        };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Failed to generate presentation";
        console.error(`[generate_presentation] Pipeline failed for "${title}":`, errMsg);
        return JSON.stringify({
          error: errMsg,
          tool_failed: true,
          instruction: "File generation FAILED. Tell the user the presentation could not be generated and show the error. Do NOT describe or outline the slides as a substitute.",
        });
      }
    }

    case "generate_spreadsheet": {
      const title = String(input.title ?? "Spreadsheet");
      const description = String(input.description ?? "");
      const language = String(input.language ?? "en");

      try {
        const { runNativePipeline } = await import("./pipeline/run-pipeline");
        const result = await runNativePipeline({
          type: "xlsx",
          title,
          description,
          language,
          style: "corporate",
          onProgress: (msg) => onProgress?.(msg),
        });

        const sanitized = title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100);
        const fileName = `${sanitized}.xlsx`;
        const storagePath = `outputs/chat/${crypto.randomUUID()}/${fileName}`;

        uploadFile(storagePath, result.buffer);

        return {
          file: {
            name: fileName,
            size: result.buffer.length,
            url: `/api/files/output?path=${encodeURIComponent(storagePath)}`,
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Failed to generate spreadsheet";
        console.error(`[generate_spreadsheet] Pipeline failed for "${title}":`, errMsg);
        return JSON.stringify({
          error: errMsg,
          tool_failed: true,
          instruction: "File generation FAILED. Tell the user the spreadsheet could not be generated and show the error. Do NOT describe or outline the data as a substitute.",
        });
      }
    }

    case "generate_report": {
      try {
        const { generateReport } = await import("@/lib/ai/tools/generate-report");
        return await generateReport(input as any, onProgress);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Failed to generate report";
        console.error(`[generate_report] Failed:`, errMsg);
        return JSON.stringify({
          error: errMsg,
          tool_failed: true,
          instruction: "File generation FAILED. Tell the user the report could not be generated and show the error. Do NOT describe or outline the report content as a substitute.",
        });
      }
    }

    case "generate_image": {
      const prompt = String(input.prompt ?? "");
      const size = (input.size as "1024x1024" | "1792x1024" | "1024x1792") ?? "1024x1024";

      // Emit shimmer tag — renders as "Creating image..." animation
      onProgress?.(`<image_generating>`);

      try {
        const { generateImage } = await import("@/lib/ai/tools/image-gen");
        const result = await generateImage(prompt, size);

        if (!result) {
          onProgress?.(`</image_generating>`);
          onProgress?.(`\nImage generation failed. Please try again.`);
          return JSON.stringify({ error: "Image generation unavailable (OPENAI_API_KEY not set or generation failed)" });
        }

        // Convert to base64 data URL — no auth issues, renders instantly
        const base64DataUrl = `data:image/png;base64,${result.buffer.toString("base64")}`;

        // Persist to job_results for gallery
        const imageId = crypto.randomUUID();
        try {
          const { getDb } = await import("@/lib/db");
          const db = getDb();
          db.prepare(`
            INSERT INTO job_results (id, job_id, result_type, file_name, storage_path, file_size, content_markdown)
            VALUES (?, ?, 'image', ?, ?, ?, ?)
          `).run(
            imageId,
            context?.jobId ?? 'standalone',
            `image_${Date.now()}.png`,
            result.storagePath,
            result.buffer.length,
            JSON.stringify({ prompt, model: 'dall-e-3', url: result.url })
          );
        } catch (err) {
          console.error('[generate_image] DB persist failed:', err);
        }

        // Close shimmer and emit image block
        onProgress?.(`</image_generating>`);
        onProgress?.(`<image_result src="${base64DataUrl}" prompt="${prompt.replace(/"/g, "'")}" id="${imageId}">`);
        onProgress?.(`</image_result>`);

        return JSON.stringify({ url: result.url, storagePath: result.storagePath, imageId });
      } catch (err) {
        onProgress?.(`</image_generating>`);
        return JSON.stringify({
          error: err instanceof Error ? err.message : "Failed to generate image",
        });
      }
    }

    case "write_todo": {
      const conversationId = context?.conversationId;
      if (!conversationId) {
        return JSON.stringify({ error: "No conversation context for todos" });
      }
      const items = (input.items as string[]) ?? [];
      const completeText = input.complete as string | undefined;

      try {
        const { addTodo, completeTodo, readTodos } = await import("@/lib/ai/tools/todo");

        for (const text of items) {
          addTodo(conversationId, text);
        }
        if (completeText) {
          completeTodo(conversationId, completeText);
        }

        const all = readTodos(conversationId);
        const done = all.filter((t) => t.done).length;
        const total = all.length;

        // Emit progress for each todo item
        for (const t of all) {
          onProgress?.(`${t.done ? "[x]" : "[ ]"} ${t.text}`);
        }

        // Emit metadata for the progress counter
        onProgress?.(JSON.stringify({ __type: "todos_update", todos: all }));

        return JSON.stringify({
          success: true,
          total,
          done,
          items: all.map((t) => ({ text: t.text, done: t.done })),
        });
      } catch (err) {
        return JSON.stringify({ error: err instanceof Error ? err.message : "Failed to write todos" });
      }
    }

    case "read_todo": {
      const conversationId = context?.conversationId;
      if (!conversationId) {
        return JSON.stringify({ error: "No conversation context for todos" });
      }
      try {
        const { readTodos } = await import("@/lib/ai/tools/todo");
        const all = readTodos(conversationId);
        const done = all.filter((t) => t.done).length;

        for (const t of all) {
          onProgress?.(`${t.done ? "[x]" : "[ ]"} ${t.text}`);
        }

        onProgress?.(JSON.stringify({ __type: "todos_update", todos: all }));

        return JSON.stringify({
          total: all.length,
          done,
          items: all.map((t) => ({ text: t.text, done: t.done })),
        });
      } catch (err) {
        return JSON.stringify({ error: err instanceof Error ? err.message : "Failed to read todos" });
      }
    }

    case "execute_terminal": {
      const command = String(input.command ?? "");
      const description = String(input.description ?? "Running command");

      try {
        onProgress?.(`$ ${command}`);
        const { Sandbox } = await import("@e2b/code-interpreter");
        const sandbox = await Sandbox.create();
        try {
          const wrapperCode = `import subprocess; r = subprocess.run(${JSON.stringify(command)}, shell=True, capture_output=True, text=True, timeout=30)\nprint(r.stdout[-2000:] if len(r.stdout) > 2000 else r.stdout)\nif r.stderr: print(r.stderr[-500:])`;
          const exec = await sandbox.runCode(wrapperCode);
          const output = exec.results.map((r) => r.text ?? "").join("\n") +
            (exec.logs.stdout.join("\n")) +
            (exec.logs.stderr.join("\n"));
          const truncated = output.slice(0, 2000);
          onProgress?.(truncated || "(no output)");
          return JSON.stringify({ success: true, output: truncated, description });
        } finally {
          await sandbox.kill();
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Terminal execution failed";
        onProgress?.(`Error: ${errMsg}`);
        return JSON.stringify({ error: errMsg });
      }
    }

    case "execute_python": {
      const code = String(input.code ?? "");
      const description = String(input.description ?? "Running Python");

      try {
        onProgress?.("Executing Python code...");
        const { Sandbox } = await import("@e2b/code-interpreter");
        const sandbox = await Sandbox.create();
        try {
          const exec = await sandbox.runCode(code);
          const output = exec.results.map((r) => r.text ?? "").join("\n") +
            (exec.logs.stdout.join("\n")) +
            (exec.logs.stderr.join("\n"));
          const truncated = output.slice(0, 2000);
          onProgress?.(truncated || "(no output)");
          return JSON.stringify({ success: true, output: truncated, description });
        } finally {
          await sandbox.kill();
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Python execution failed";
        onProgress?.(`Error: ${errMsg}`);
        return JSON.stringify({ error: errMsg });
      }
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

