/**
 * Test script for the native document generation pipeline.
 *
 * Usage: npx tsx src/scripts/test-native-pipeline.ts [pptx|docx|xlsx]
 *
 * Requires environment variables:
 *   - OPENROUTER_API_KEY (for LLM calls)
 *   - BRAVE_SEARCH_API_KEY (for image sourcing, optional)
 */

import { runNativePipeline } from "@/lib/ai/tools/pipeline/run-pipeline";
import type { PipelineContext } from "@/lib/ai/tools/pipeline/types";
import fs from "fs";

const fileType = (process.argv[2] as "pptx" | "docx" | "xlsx") || "pptx";

const configs: Record<string, Omit<PipelineContext, "onProgress">> = {
  pptx: {
    type: "pptx",
    title: "Market Analysis 2026",
    description: `Create a comprehensive market analysis presentation covering:
- Global technology market overview with key metrics ($5.3T market size, 7.2% growth)
- Regional breakdown: North America, Europe, Asia Pacific with revenue figures
- Key trends: AI adoption (67% enterprise), cloud infrastructure ($890B), digital transformation
- Competitive landscape with 4-5 major players and market share
- Southeast Asian market opportunity with growth projections
- Risk factors and mitigation strategies
- Financial projections for 2026-2028
- Strategic recommendations and next steps`,
    language: "en",
    style: "dark",
    slideCount: 14,
  },
  docx: {
    type: "docx",
    title: "Quarterly Business Review Q4 2025",
    description: `Create a quarterly business review document covering:
- Executive summary with key highlights
- Financial performance: revenue, costs, profit margins
- Product metrics: user growth, engagement, retention
- Market analysis and competitive positioning
- Team updates and hiring progress
- Q1 2026 goals and roadmap
- Include tables with financial data and charts for trends`,
    language: "en",
    style: "corporate",
    format: "docx",
  },
  xlsx: {
    type: "xlsx",
    title: "Financial Dashboard 2025",
    description: `Create a financial dashboard spreadsheet with:
- Revenue sheet: monthly revenue by product line for 2025, with totals and YoY growth
- Expenses sheet: operational costs by category (salaries, infrastructure, marketing, R&D)
- P&L summary sheet: profit/loss calculations with formulas
- KPI sheet: key metrics (CAC, LTV, churn rate, NRR) by quarter
- Include charts for revenue trends and expense breakdown`,
    language: "en",
    style: "corporate",
  },
};

const config = configs[fileType];
if (!config) {
  console.error(`Unknown file type: ${fileType}. Use pptx, docx, or xlsx.`);
  process.exit(1);
}

async function main() {
  console.log(`\n=== Testing Native Pipeline: ${fileType.toUpperCase()} ===\n`);
  const start = Date.now();

  try {
    const result = await runNativePipeline({
      ...config,
      onProgress: (msg) => console.log(`  [Progress] ${msg}`),
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const outputPath = `/tmp/test-native.${fileType}`;
    fs.writeFileSync(outputPath, result.buffer);

    console.log(`\n=== SUCCESS ===`);
    console.log(`  File: ${outputPath}`);
    console.log(`  Size: ${(result.buffer.length / 1024).toFixed(1)} KB`);
    console.log(`  Time: ${elapsed}s`);
    console.log(`  Type: ${result.fileType}`);
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.error(`\n=== FAILED (${elapsed}s) ===`);
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
