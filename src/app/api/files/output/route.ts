import { getSessionUserId } from "@/lib/auth/session";
import { downloadFile, fileExists } from "@/lib/storage";
import { NextRequest } from "next/server";
import path from "path";

const MIME_MAP: Record<string, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  csv: "text/csv",
  txt: "text/plain",
  json: "application/json",
};

// Types the browser can natively display inline
const INLINE_TYPES = new Set(["pdf", "png", "jpg", "jpeg", "gif", "svg", "txt", "csv", "json"]);

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const storagePath = req.nextUrl.searchParams.get("path");
  if (!storagePath) {
    return Response.json({ error: "Missing path" }, { status: 400 });
  }

  // Prevent path traversal
  const normalized = path.normalize(storagePath);
  if (normalized.startsWith("..") || normalized.includes("/../")) {
    return Response.json({ error: "Invalid path" }, { status: 400 });
  }

  // Only serve files from known output directories
  if (!normalized.startsWith("outputs/chat/") && !normalized.startsWith("outputs/images/")) {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }

  if (!fileExists(storagePath)) {
    return Response.json({ error: "File not found" }, { status: 404 });
  }

  const buffer = downloadFile(storagePath);
  const fileName = path.basename(storagePath);
  const ext = path.extname(fileName).slice(1).toLowerCase();
  const mimeType = MIME_MAP[ext] ?? "application/octet-stream";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `${INLINE_TYPES.has(ext) ? "inline" : "attachment"}; filename="${fileName}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
