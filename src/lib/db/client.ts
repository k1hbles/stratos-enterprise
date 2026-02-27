import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export type Db = Database.Database;

let db: Db | null = null;

export function getDb(): Db {
  if (db) return db;
  const dbPath =
    process.env.DB_PATH || path.join(process.cwd(), "data", "hyprnova.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  // Run migrations on first open
  const { runMigrations } = require("./migrate");
  runMigrations(db);
  const { runSeeds } = require("./seed");
  runSeeds(db);
  return db;
}
