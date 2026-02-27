import fs from "fs";
import path from "path";

const BASE_DIR = path.join(process.cwd(), "data", "files");

export function uploadFile(storagePath: string, buffer: Buffer): void {
  const fullPath = path.join(BASE_DIR, storagePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, buffer);
}

export function downloadFile(storagePath: string): Buffer {
  return fs.readFileSync(path.join(BASE_DIR, storagePath));
}

export function getFilePath(storagePath: string): string {
  return path.join(BASE_DIR, storagePath);
}

export function fileExists(storagePath: string): boolean {
  return fs.existsSync(path.join(BASE_DIR, storagePath));
}
