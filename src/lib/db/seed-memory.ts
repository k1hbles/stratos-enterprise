import { upsertCoreMemory } from "@/lib/memory/core";

const CORE_SEEDS: Array<{
  key: string;
  value: string;
  category: string;
}> = [
  // Company
  { key: "company_name", value: "PT Hyprnova Indonesia", category: "company" },
  { key: "company_legal_entity", value: "Perseroan Terbatas (PT) registered in Indonesia", category: "company" },
  { key: "company_industry", value: "AI-powered business intelligence and enterprise automation", category: "company" },
  { key: "company_hq", value: "Jakarta, Indonesia", category: "company" },
  // Product
  { key: "product_name", value: "Hyprnova — AI executive assistant for Indonesian SMEs and enterprises", category: "product" },
  { key: "product_core_feature", value: "Multi-director AI council that performs strategic analysis (SWOT, competitive, financial, risk)", category: "product" },
  { key: "product_delivery", value: "Web dashboard with real-time streaming, PDF/XLSX report generation, WhatsApp notifications", category: "product" },
  { key: "product_tech_stack", value: "Next.js, SQLite, Claude API (Anthropic), OpenAI embeddings, SSE streaming", category: "product" },
  // Market
  { key: "target_market", value: "Indonesian SMEs and mid-market enterprises seeking AI-driven strategic insights", category: "market" },
  { key: "market_currency", value: "Indonesian Rupiah (IDR/Rp) — primary operating currency", category: "market" },
  { key: "market_language", value: "Bahasa Indonesia (primary), English (secondary)", category: "market" },
  // Risk
  { key: "risk_regulatory", value: "Must comply with Indonesian data protection regulations (PDP Law / UU PDP)", category: "risk" },
  { key: "risk_competitive", value: "Competing with global AI tools (ChatGPT, Gemini) plus local players in Indonesian market", category: "risk" },
];

/**
 * Seed core memories for a new user.
 * Uses upsert so re-running is safe (no duplicates).
 */
export function seedCoreMemory(userId: string): void {
  for (const seed of CORE_SEEDS) {
    upsertCoreMemory(userId, seed.key, seed.value, seed.category, "seed");
  }
}
