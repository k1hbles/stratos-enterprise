import type { AgentTool } from "@/lib/ai/agent/types";

export const webSearchTool: AgentTool = {
  name: "web_search",
  description:
    "Search the web using Brave Search API. Returns titles, URLs, and snippets for the top results. Use this for research, fact-checking, and gathering current information.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query.",
      },
      count: {
        type: "number",
        description: "Number of results to return (1-10). Default 5.",
      },
    },
    required: ["query"],
  },
  async execute(args) {
    const query = String(args.query);
    const count = Math.min(Math.max(Number(args.count) || 5, 1), 10);

    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        data: { error: "Brave Search API key not configured" },
      };
    }

    try {
      const params = new URLSearchParams({
        q: query,
        count: String(count),
      });

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

      if (!res.ok) {
        return {
          success: false,
          data: { error: `Search API returned ${res.status}` },
        };
      }

      const body = await res.json();
      const webResults = body.web?.results ?? [];

      const results = webResults.map(
        (r: { title?: string; url?: string; description?: string }) => ({
          title: r.title ?? "",
          url: r.url ?? "",
          snippet: r.description ?? "",
        })
      );

      return {
        success: true,
        data: { results, result_count: results.length },
      };
    } catch (err) {
      return {
        success: false,
        data: {
          error:
            err instanceof Error ? err.message : "Web search failed",
        },
      };
    }
  },
};
