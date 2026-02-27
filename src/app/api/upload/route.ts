import { getDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";
import { uploadFile } from "@/lib/storage";

export async function POST(req: Request) {
  try {
    const userId = (await getSessionUserId()) ?? "anonymous";

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    const storagePath = `uploads/${userId}/${Date.now()}-${file.name}`;

    // Upload to local storage
    const buffer = Buffer.from(await file.arrayBuffer());
    uploadFile(storagePath, buffer);

    // Create job_files record
    const db = getDb();
    const fileId = crypto.randomUUID();
    const record = db
      .prepare(
        "INSERT INTO job_files (id, file_name, file_type, file_size, storage_path) VALUES (?, ?, ?, ?, ?) RETURNING *"
      )
      .get(
        fileId,
        file.name,
        file.type || "application/octet-stream",
        file.size,
        storagePath
      ) as Record<string, unknown>;

    return Response.json({
      id: record.id,
      fileName: record.file_name,
      fileSize: record.file_size,
      storagePath: record.storage_path,
    });
  } catch (err) {
    console.error("Upload route error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
