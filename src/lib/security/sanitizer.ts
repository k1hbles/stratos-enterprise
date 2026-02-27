import { getDb } from "@/lib/db";
import { logAction } from "@/lib/security/audit";

export interface SanitizationSession {
  sanitize: (text: string) => string;
  restore: (text: string) => string;
  entityCount: number;
}

interface EntityEntry {
  original: string;
  placeholder: string;
}

/**
 * Build a registry of entities from core memory that should be anonymized.
 * Reads memory_core WHERE category IN ('company', 'person', 'product').
 * Also adds financial regex patterns for Rp amounts and large numbers.
 */
function buildEntityRegistry(userId: string): EntityEntry[] {
  const db = getDb();
  const entries: EntityEntry[] = [];

  const counters: Record<string, number> = {};

  // Load named entities from core memory
  const memories = db
    .prepare(
      "SELECT key, value, category FROM memory_core WHERE user_id = ? AND category IN ('company', 'person', 'product')"
    )
    .all(userId) as Array<{ key: string; value: string; category: string }>;

  for (const mem of memories) {
    const cat = mem.category.toUpperCase();
    counters[cat] = (counters[cat] || 0) + 1;
    const placeholder = `[${cat}_${counters[cat]}]`;

    // Only add if value is meaningful (>2 chars, not just a generic description)
    const value = mem.value.trim();
    if (value.length > 2) {
      entries.push({ original: value, placeholder });
    }
  }

  return entries;
}

/**
 * Financial patterns to sanitize — Rp amounts, large IDR numbers, financial percentages.
 */
const FINANCIAL_PATTERNS: Array<{ regex: RegExp; replacer: (match: string, idx: number) => string }> = [
  // Rp amounts: Rp 1.500.000, Rp1,500,000, Rp 1.5M, etc.
  {
    regex: /Rp\.?\s?[\d.,]+(?:\s?(?:juta|miliar|triliun|ribu|rb|jt|M|B|T))?/gi,
    replacer: (_match, idx) => `[AMOUNT_${idx}]`,
  },
  // IDR amounts: IDR 1,500,000
  {
    regex: /IDR\s?[\d.,]+(?:\s?(?:million|billion|trillion))?/gi,
    replacer: (_match, idx) => `[AMOUNT_${idx}]`,
  },
  // Large standalone numbers with dots/commas (Indonesian format): 1.500.000.000
  {
    regex: /\b\d{1,3}(?:[.,]\d{3}){3,}\b/g,
    replacer: (_match, idx) => `[AMOUNT_${idx}]`,
  },
];

/**
 * Create a sanitization session for a user.
 * If no entities found (no memory seeded), returns a transparent pass-through.
 */
export function createSanitizationSession(userId: string): SanitizationSession {
  const entityRegistry = buildEntityRegistry(userId);

  // If no entities, return a no-op session
  if (entityRegistry.length === 0) {
    return {
      sanitize: (text: string) => text,
      restore: (text: string) => text,
      entityCount: 0,
    };
  }

  // Reverse map for restoration: placeholder → original
  const reverseMap = new Map<string, string>();
  let financialCounter = 0;

  function sanitize(text: string): string {
    let result = text;

    // Replace named entities (longest first to avoid partial matches)
    const sorted = [...entityRegistry].sort(
      (a, b) => b.original.length - a.original.length
    );
    for (const entry of sorted) {
      // Case-insensitive replacement
      const escaped = entry.original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "gi");
      result = result.replace(regex, (match) => {
        reverseMap.set(entry.placeholder, match);
        return entry.placeholder;
      });
    }

    // Replace financial patterns
    for (const pattern of FINANCIAL_PATTERNS) {
      result = result.replace(pattern.regex, (match) => {
        financialCounter++;
        const placeholder = pattern.replacer(match, financialCounter);
        reverseMap.set(placeholder, match);
        return placeholder;
      });
    }

    // Log sanitization
    logAction({
      userId,
      toolName: "sanitizer",
      toolArgs: { entityCount: entityRegistry.length, replacements: reverseMap.size },
      resultSummary: `Sanitized ${reverseMap.size} replacements`,
      success: true,
    });

    return result;
  }

  function restore(text: string): string {
    let result = text;
    // Replace placeholders back with originals (longest placeholder first)
    const entries = [...reverseMap.entries()].sort(
      (a, b) => b[0].length - a[0].length
    );
    for (const [placeholder, original] of entries) {
      result = result.split(placeholder).join(original);
    }
    return result;
  }

  return { sanitize, restore, entityCount: entityRegistry.length };
}
