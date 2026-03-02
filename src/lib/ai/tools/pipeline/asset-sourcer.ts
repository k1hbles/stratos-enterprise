import fs from "fs";
import path from "path";
import { generateChartImage } from "../renderers/chart-gen";
import type { ContentPlan, AssetManifest, SlidePlan, DocumentSection, SpreadsheetSheet } from "./types";
import type { ChartSpec } from "../renderers/chart-gen";
import type { PipelineContext } from "./types";

/**
 * Stage 2: Source assets (images + charts) in parallel.
 * Downloads web images via Brave Image Search, generates chart PNGs.
 */
export async function sourceAssets(
  plan: ContentPlan,
  tempDir: string,
  ctx: PipelineContext
): Promise<AssetManifest> {
  ctx.onProgress("Sourcing images and charts...");

  const manifest: AssetManifest = {
    images: new Map(),
    charts: new Map(),
    tempDir,
  };

  // Collect image queries and chart specs from plan
  const imageJobs: { index: number; query: string }[] = [];
  const chartJobs: { index: number; spec: ChartSpec }[] = [];

  const items = getItems(plan, ctx.type);
  for (const item of items) {
    if (item.imageQuery) {
      imageJobs.push({ index: item.index, query: item.imageQuery });
    }
    if (item.chartSpec) {
      chartJobs.push({ index: item.index, spec: item.chartSpec });
    }
  }

  // Run image and chart sourcing in parallel
  const [imageResults, chartResults] = await Promise.all([
    Promise.all(
      imageJobs.map(async (job) => {
        try {
          const filePath = await downloadTavilyImage(job.query, job.index, tempDir);
          return { index: job.index, path: filePath };
        } catch (err) {
          console.warn(
            `[Asset] Image download failed for index ${job.index}: ${err instanceof Error ? err.message : String(err)}`
          );
          return null;
        }
      })
    ),
    Promise.all(
      chartJobs.map(async (job) => {
        try {
          const chartBuffer = await generateChartImage(job.spec);
          const filePath = path.join(tempDir, `chart_${job.index}.png`);
          fs.writeFileSync(filePath, chartBuffer);
          return { index: job.index, path: filePath };
        } catch (err) {
          console.warn(
            `[Asset] Chart generation failed for index ${job.index}: ${err instanceof Error ? err.message : String(err)}`
          );
          return null;
        }
      })
    ),
  ]);

  for (const result of imageResults) {
    if (result) manifest.images.set(result.index, result.path);
  }
  for (const result of chartResults) {
    if (result) manifest.charts.set(result.index, result.path);
  }

  const imgCount = manifest.images.size;
  const chartCount = manifest.charts.size;
  ctx.onProgress(`Assets ready: ${imgCount} images, ${chartCount} charts`);

  return manifest;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

interface PlanItem {
  index: number;
  imageQuery?: string;
  chartSpec?: ChartSpec;
}

function getItems(plan: ContentPlan, type: string): PlanItem[] {
  if (type === "pptx" && plan.slides) {
    return plan.slides.map((s: SlidePlan) => ({
      index: s.index,
      imageQuery: s.imageQuery,
      chartSpec: s.chartSpec,
    }));
  }
  if (type === "docx" && plan.sections) {
    return plan.sections.map((s: DocumentSection) => ({
      index: s.index,
      imageQuery: s.imageQuery,
      chartSpec: s.chartSpec,
    }));
  }
  if (type === "xlsx" && plan.sheets) {
    return plan.sheets.map((s: SpreadsheetSheet, i: number) => ({
      index: i,
      chartSpec: s.chartSpec,
    }));
  }
  return [];
}

async function downloadTavilyImage(
  query: string,
  index: number,
  tempDir: string
): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY not configured");
  }

  const searchRes = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      include_images: true,
      max_results: 3,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!searchRes.ok) {
    throw new Error(`Tavily search returned ${searchRes.status}`);
  }

  const body = await searchRes.json();
  const imageUrls: string[] = body.images ?? [];

  if (imageUrls.length === 0) {
    throw new Error(`No images found for query: ${query}`);
  }

  for (const imageUrl of imageUrls.slice(0, 3)) {
    try {
      const imageRes = await fetch(imageUrl, {
        signal: AbortSignal.timeout(10_000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ELKBot/1.0)" },
      });

      if (!imageRes.ok) continue;

      const contentType = imageRes.headers.get("content-type") ?? "";
      const ext = contentType.includes("png") ? "png" : "jpg";
      const buffer = Buffer.from(await imageRes.arrayBuffer());

      if (buffer.length < 1000) continue;

      const filePath = path.join(tempDir, `image_${index}.${ext}`);
      fs.writeFileSync(filePath, buffer);
      return filePath;
    } catch {
      continue;
    }
  }

  throw new Error(`Failed to download any image for query: ${query}`);
}
