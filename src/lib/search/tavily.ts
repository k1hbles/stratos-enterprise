import { tavily } from "@tavily/core";

const client = tavily({ apiKey: process.env.TAVILY_API_KEY! });

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  score: number;
  rawContent?: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  answer?: string;
}

/**
 * Search the web via Tavily.
 * @param query - search query
 * @param numResults - number of results (default 5, max 10)
 * @param fetchContent - if true, returns full page text (uses more credits)
 */
export async function searchWeb(
  query: string,
  numResults = 5,
  fetchContent = false
): Promise<SearchResponse> {
  const res = await client.search(query, {
    maxResults: Math.min(numResults, 10),
    includeAnswer: true,
    includeRawContent: fetchContent ? "text" : false,
    searchDepth: "basic",
  });

  const results: SearchResult[] = (res.results || []).map((item) => ({
    title: item.title || "",
    url: item.url || "",
    snippet: item.content || "",
    domain: (() => {
      try {
        return new URL(item.url).hostname.replace("www.", "");
      } catch {
        return item.url;
      }
    })(),
    score: item.score || 0,
    rawContent: item.rawContent ?? undefined,
  }));

  return {
    query,
    results,
    answer: res.answer || undefined,
  };
}

/**
 * Fetch a specific URL via Tavily extract.
 * More reliable than raw fetch — Tavily handles JS-rendered pages.
 * Counts as 1 credit per URL.
 */
export async function fetchPage(url: string): Promise<{
  url: string;
  title: string;
  text: string;
  wordCount: number;
}> {
  const res = await client.extract([url]);
  const page = res.results?.[0];

  if (!page) {
    const failed = res.failedResults?.[0];
    throw new Error(
      failed ? `Tavily extract failed: ${failed.error}` : `Tavily could not extract: ${url}`
    );
  }

  const text = page.rawContent || "";
  const capped = text.slice(0, 12000); // cap at ~3k tokens

  // Extract a title from the first line or heading
  const firstLine = text.split("\n").find((l) => l.trim().length > 0) || url;
  const title = firstLine.replace(/^#+\s*/, "").slice(0, 120);

  return {
    url: page.url || url,
    title,
    text: capped,
    wordCount: text.split(/\s+/).length,
  };
}
