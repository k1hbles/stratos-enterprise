import type Database from "better-sqlite3";
import { DIRECTOR_SEEDS } from "@/lib/ai/directors/seed";

export function runSeeds(db: Database.Database): void {
  const existing = db
    .prepare("SELECT COUNT(*) as count FROM directors")
    .get() as { count: number };

  if (existing.count === 0) {
    const insert = db.prepare(
      "INSERT OR IGNORE INTO directors (id, slug, display_name, role_description, system_prompt, tool_whitelist, model_preference) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );

    for (const d of DIRECTOR_SEEDS) {
      insert.run(
        d.id,
        d.slug,
        d.displayName,
        d.roleDescription,
        d.systemPrompt,
        JSON.stringify(d.toolWhitelist),
        d.modelPreference
      );
    }
  }

  // Always sync tool whitelists from DIRECTOR_SEEDS
  const upsert = db.prepare(
    "UPDATE directors SET tool_whitelist = ? WHERE slug = ?"
  );
  for (const d of DIRECTOR_SEEDS) {
    upsert.run(JSON.stringify(d.toolWhitelist), d.slug);
  }
}
