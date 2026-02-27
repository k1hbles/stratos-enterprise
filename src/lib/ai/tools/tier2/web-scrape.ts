import type { AgentTool } from "@/lib/ai/agent/types";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export const webScrapeTool: AgentTool = {
  name: "web_fetch",
  description:
    "Fetch the content of a web page and extract its text. Use this to read articles, documentation, or other web content found via web_search.",
  input_schema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "The URL to fetch.",
      },
    },
    required: ["url"],
  },
  async execute(args) {
    const url = String(args.url);

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; NightshiftBot/1.0; +https://nightshift.ai)",
          Accept: "text/html,application/xhtml+xml,text/plain",
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        return {
          success: false,
          data: { error: `Fetch returned ${res.status}`, url },
        };
      }

      const html = await res.text();
      let content = stripHtml(html);

      // Truncate to ~5000 words
      const words = content.split(/\s+/);
      const maxWords = 5000;
      if (words.length > maxWords) {
        content = words.slice(0, maxWords).join(" ") + "…";
      }

      return {
        success: true,
        data: {
          content,
          url,
          word_count: Math.min(words.length, maxWords),
        },
      };
    } catch (err) {
      return {
        success: false,
        data: {
          error:
            err instanceof Error ? err.message : "Failed to fetch URL",
          url,
        },
      };
    }
  },
};
