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

    const braveKey = process.env.BRAVE_SEARCH_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    // Strategy 1: Brave Search API (primary)
    if (braveKey) {
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
              "X-Subscription-Token": braveKey,
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
    }

    // Strategy 2: Perplexity Sonar via OpenRouter (no extra API key needed)
    if (openrouterKey) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "perplexity/sonar",
            messages: [
              {
                role: "user",
                content: `Search the web for: ${query}\n\nReturn ${count} results. For each result include the title, URL, and a brief snippet.`,
              },
            ],
            max_tokens: 2048,
          }),
        });
        if (!res.ok) {
          return {
            success: false,
            data: { error: `Sonar search returned ${res.status}` },
          };
        }
        const body = await res.json();
        const text = body.choices?.[0]?.message?.content ?? "";
        const citations: string[] = body.citations ?? [];

        const results = citations.length > 0
          ? citations.slice(0, count).map((url: string, i: number) => ({
              title: `Source ${i + 1}`,
              url,
              snippet: "",
            }))
          : [];

        return {
          success: true,
          data: results.length > 0
            ? { results, result_count: results.length, summary: text }
            : { summary: text },
        };
      } catch (err) {
        return {
          success: false,
          data: {
            error: err instanceof Error ? err.message : "Sonar search failed",
          },
        };
      }
    }

    return {
      success: false,
      data: { error: "Search not configured — set BRAVE_SEARCH_API_KEY or OPENROUTER_API_KEY" },
    };
  },
};
