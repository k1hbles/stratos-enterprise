import { getDb } from "@/lib/db";
import type { DirectorConfig } from "./types";
import { DIRECTOR_SEEDS } from "./seed";

let cachedDirectors: DirectorConfig[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/** Load directors from DB with in-memory cache, fallback to seeds */
export function getDirectors(): DirectorConfig[] {
  if (cachedDirectors && Date.now() - cacheTime < CACHE_TTL) {
    return cachedDirectors;
  }

  const db = getDb();
  const data = db.prepare("SELECT * FROM directors ORDER BY slug").all() as Array<{
    id: string;
    slug: string;
    display_name: string;
    role_description: string;
    system_prompt: string;
    tool_whitelist: string;
    model_preference: string;
  }>;

  if (!data?.length) {
    // Fallback to seed data
    cachedDirectors = DIRECTOR_SEEDS;
    cacheTime = Date.now();
    return cachedDirectors;
  }

  cachedDirectors = data.map((d) => ({
    id: d.id,
    slug: d.slug,
    displayName: d.display_name,
    roleDescription: d.role_description,
    systemPrompt: d.system_prompt,
    toolWhitelist: JSON.parse(d.tool_whitelist ?? "[]"),
    modelPreference: d.model_preference ?? "claude-sonnet-4-5-20250929",
  }));
  cacheTime = Date.now();
  return cachedDirectors;
}

/** Get a specific director by slug */
export function getDirector(slug: string): DirectorConfig | null {
  const directors = getDirectors();
  return directors.find((d) => d.slug === slug) ?? null;
}

/** Invalidate the director cache */
export function invalidateDirectorCache(): void {
  cachedDirectors = null;
  cacheTime = 0;
}
