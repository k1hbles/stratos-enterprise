import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { hashPassword } from "../src/lib/auth/password";

async function main() {
  const dbPath =
    process.env.DB_PATH || path.join(process.cwd(), "data", "hyprnova.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const email = "hanzbennettkie@gmail.com";
  const password = "KieLes200607";
  const name = "Hanz";
  const id = crypto.randomUUID();

  const hash = await hashPassword(password);

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    console.log(`User already exists with email: ${email}`);
    db.close();
    return;
  }

  db.prepare(
    "INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))"
  ).run(id, email, hash);

  console.log(`User created: ${email} (id: ${id}, name: ${name})`);
  db.close();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
