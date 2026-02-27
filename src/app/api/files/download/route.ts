import { getDb } from "@/lib/db";
import { downloadFile, fileExists } from "@/lib/storage";
import { NextRequest } from "next/server";
import path from "path";

// Types the browser can natively display inline
const INLINE_TYPES = new Set([
  "application/pdf",
  "image/png", "image/jpeg", "image/gif", "image/svg+xml",
  "text/plain", "text/csv", "application/json",
]);

export async function GET(req: NextRequest) {
  try {
    const fileId = req.nextUrl.searchParams.get("id");
    if (!fileId) {
      return Response.json({ error: "Missing file id" }, { status: 400 });
    }

    const db = getDb();

    // Look up the file record
    const file = db
      .prepare("SELECT storage_path, file_name, file_type FROM job_files WHERE id = ?")
      .get(fileId) as { storage_path: string; file_name: string; file_type: string } | undefined;

    if (!file) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }

    if (!fileExists(file.storage_path)) {
      return Response.json({ error: "File not found on disk" }, { status: 404 });
    }

    const buffer = downloadFile(file.storage_path);
    const mimeType = file.file_type || "application/octet-stream";
    const disposition = INLINE_TYPES.has(mimeType) ? "inline" : "attachment";

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `${disposition}; filename="${path.basename(file.file_name)}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    console.error("Download route error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
