import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import fs from "fs";
import path from "path";

/** Walk a directory recursively and return all file paths */
function walkDir(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      results.push(...walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

/**
 * Backfill any image files on disk that have no corresponding job_results row.
 * Runs on every GET so previously-generated images always appear.
 */
function backfillDiskImages(db: ReturnType<typeof getDb>) {
  const imagesDir = path.join(process.cwd(), "data", "files", "outputs", "images");
  const files = walkDir(imagesDir).filter((f) =>
    /\.(png|jpg|jpeg|webp|gif)$/i.test(f)
  );
  if (files.length === 0) return;

  const knownPaths = new Set(
    (
      db
        .prepare(`SELECT storage_path FROM job_results WHERE result_type = 'image' AND storage_path IS NOT NULL`)
        .all() as Array<{ storage_path: string }>
    ).map((r) => r.storage_path)
  );

  const insert = db.prepare(`
    INSERT INTO job_results (id, job_id, result_type, file_name, storage_path, file_size, content_markdown, created_at)
    VALUES (?, 'standalone', 'image', ?, ?, ?, NULL, ?)
  `);

  const insertMany = db.transaction((rows: Array<{ id: string; fileName: string; storagePath: string; size: number; mtime: string }>) => {
    for (const r of rows) {
      insert.run(r.id, r.fileName, r.storagePath, r.size, r.mtime);
    }
  });

  const toInsert = files
    .map((f) => {
      const storagePath = f.replace(path.join(process.cwd(), "data", "files") + path.sep, "").replace(/\\/g, "/");
      if (knownPaths.has(storagePath)) return null;
      const stat = fs.statSync(f);
      return {
        id: crypto.randomUUID(),
        fileName: path.basename(f),
        storagePath,
        size: stat.size,
        mtime: stat.mtime.toISOString().replace("T", " ").slice(0, 19),
      };
    })
    .filter(Boolean) as Array<{ id: string; fileName: string; storagePath: string; size: number; mtime: string }>;

  if (toInsert.length > 0) {
    insertMany(toInsert);
    console.log(`[/api/images] Backfilled ${toInsert.length} disk image(s) into job_results`);
  }
}

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 24, 1), 100);
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

  try {
    const db = getDb();

    // Ensure any images already on disk but not yet in DB are visible
    backfillDiskImages(db);

    // Get images from user's jobs OR standalone images
    const rows = db.prepare(`
      SELECT jr.id, jr.job_id, jr.file_name, jr.storage_path, jr.file_size, jr.content_markdown, jr.created_at
      FROM job_results jr
      LEFT JOIN jobs j ON jr.job_id = j.id
      WHERE jr.result_type = 'image'
        AND (j.user_id = ? OR jr.job_id = 'standalone')
      ORDER BY jr.created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset) as Array<{
      id: string;
      job_id: string;
      file_name: string | null;
      storage_path: string | null;
      file_size: number | null;
      content_markdown: string | null;
      created_at: string;
    }>;

    const total = (db.prepare(`
      SELECT COUNT(*) as count
      FROM job_results jr
      LEFT JOIN jobs j ON jr.job_id = j.id
      WHERE jr.result_type = 'image'
        AND (j.user_id = ? OR jr.job_id = 'standalone')
    `).get(userId) as { count: number }).count;

    const images = rows.map((row) => {
      let prompt: string | undefined;
      let model: string | undefined;
      if (row.content_markdown) {
        try {
          const parsed = JSON.parse(row.content_markdown);
          prompt = parsed.prompt;
          model = parsed.model;
        } catch {
          // ignore
        }
      }
      return {
        id: row.id,
        jobId: row.job_id,
        fileName: row.file_name,
        url: row.storage_path
          ? `/api/files/output?path=${encodeURIComponent(row.storage_path)}`
          : null,
        fileSize: row.file_size,
        prompt,
        model,
        createdAt: row.created_at,
      };
    });

    return NextResponse.json({ images, total, limit, offset });
  } catch (err) {
    console.error("[GET /api/images]", err);
    return NextResponse.json({ error: "Failed to load images" }, { status: 500 });
  }
}
