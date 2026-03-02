import type { QAResult } from "./types";

const MIN_SIZES: Record<string, number> = {
  pptx: 10_000,   // 10KB
  docx: 5_000,    // 5KB
  xlsx: 2_000,    // 2KB
};

const MAX_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Validate that the generated output file is structurally sound.
 * All three Office formats (PPTX, DOCX, XLSX) are ZIP-based.
 */
export function validateOutput(
  buffer: Buffer,
  fileType: "pptx" | "docx" | "xlsx"
): QAResult {
  const issues: string[] = [];

  // ZIP header check (PK signature: 0x50 0x4B)
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    issues.push("Invalid file: missing ZIP header (PK signature)");
  }

  // Minimum size check
  const minSize = MIN_SIZES[fileType] ?? 2_000;
  if (buffer.length < minSize) {
    issues.push(
      `File too small: ${buffer.length} bytes (minimum ${minSize} for ${fileType})`
    );
  }

  // Maximum size check
  if (buffer.length > MAX_SIZE) {
    issues.push(
      `File too large: ${(buffer.length / 1024 / 1024).toFixed(1)}MB (max 100MB)`
    );
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
