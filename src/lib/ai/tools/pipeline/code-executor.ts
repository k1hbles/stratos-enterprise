import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

// ── Safety patterns ──────────────────────────────────────────────────────────

const BLOCKED_REQUIRES = /require\s*\(\s*['"`](child_process|net|dgram|cluster|worker_threads|vm|http[s]?)['"`]\s*\)/;
// process.exit / kill / execPath — block unconditionally (never valid in generated code)
const BLOCKED_PROCESS_CALLS = /process\.(exit|kill|execPath)\s*[\(\[.]/;

// Strip single-line comments and string literals, then test for process.env
function hasBlockedEnvAccess(code: string): boolean {
  const noLineComments = code.replace(/\/\/[^\n]*/g, '');
  const noStrings = noLineComments.replace(/'[^']*'|"[^"]*"|`[^`]*`/gm, '""');
  return /process\.env/.test(noStrings);
}
const BLOCKED_IMPORTS = /import\s.*from\s+['"`](child_process|net|dgram|cluster|worker_threads|vm|http[s]?)['"`]/;
const BLOCKED_EVAL = /\beval\s*\(|\bFunction\s*\(/;

export class CodeSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CodeSafetyError";
  }
}

function scanCode(code: string): string[] {
  const issues: string[] = [];

  if (BLOCKED_REQUIRES.test(code)) {
    const match = code.match(BLOCKED_REQUIRES);
    issues.push(`Blocked require: ${match?.[1] ?? "unknown module"}`);
  }

  if (BLOCKED_IMPORTS.test(code)) {
    const match = code.match(BLOCKED_IMPORTS);
    issues.push(`Blocked import: ${match?.[1] ?? "unknown module"}`);
  }

  if (BLOCKED_PROCESS_CALLS.test(code)) {
    issues.push("Blocked process call (exit/kill/execPath)");
  }
  if (hasBlockedEnvAccess(code)) {
    issues.push("Blocked runtime process.env access — use __PIPELINE_OUTPUT_DIR__ instead");
  }

  if (BLOCKED_EVAL.test(code)) {
    issues.push("Blocked eval/Function constructor");
  }

  return issues;
}

// ── Executor ─────────────────────────────────────────────────────────────────

export interface ExecuteResult {
  buffer: Buffer;
  outputPath: string;
}

/**
 * Execute LLM-generated JavaScript code in a temp directory.
 * The script must produce `output.<ext>` in its working directory.
 */
export function executeGeneratedCode(
  code: string,
  tempDir: string,
  fileType: "pptx" | "docx" | "xlsx"
): ExecuteResult {
  // Safety scan
  const issues = scanCode(code);
  if (issues.length > 0) {
    throw new CodeSafetyError(`Code failed safety scan:\n${issues.join("\n")}`);
  }

  // Strip markdown fences if present
  let cleanCode = code.trim();
  if (cleanCode.startsWith("```")) {
    cleanCode = cleanCode.replace(/^```(?:javascript|js|typescript|ts)?\n?/, "");
    cleanCode = cleanCode.replace(/\n?```\s*$/, "");
  }

  // Inject output dir constant at top so generated code can use __PIPELINE_OUTPUT_DIR__
  // This avoids process.env access (which is blocked by safety scanner) while still
  // giving the script an absolute path to write its output file.
  const injectedHeader = `const __PIPELINE_OUTPUT_DIR__ = ${JSON.stringify(tempDir)};\n`;
  const finalCode = injectedHeader + cleanCode;

  // Write the script to temp dir
  const scriptPath = path.join(tempDir, "generate.js");
  fs.writeFileSync(scriptPath, finalCode, "utf-8");
  console.log(`[CodeExecutor] Script written to ${scriptPath} (${finalCode.length} chars total)`);
  console.log(`[CodeExecutor] Script preview (first 2000 chars):\n${finalCode.slice(0, 2000)}`);

  // Resolve NODE_PATH to project's node_modules
  const nodeModulesPath = path.join(process.cwd(), "node_modules");

  // Execute with timeout and buffer limits using execFileSync (no shell injection)
  try {
    execFileSync("node", [scriptPath], {
      cwd: tempDir,
      timeout: 300_000,           // 5 minutes
      maxBuffer: 50 * 1024 * 1024, // 50MB
      env: {
        ...process.env,
        NODE_PATH: nodeModulesPath,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stderr = (err as { stderr?: Buffer })?.stderr?.toString() ?? "";
    const stdout = (err as { stdout?: Buffer })?.stdout?.toString() ?? "";
    console.error(`[CodeExecutor] Execution FAILED for ${fileType}:`);
    console.error(`[CodeExecutor] FULL stderr:\n${stderr}`);
    if (stdout) console.error(`[CodeExecutor] stdout:\n${stdout}`);
    // Log dir contents to help diagnose path issues
    try {
      const dirContents = fs.readdirSync(tempDir).join(", ");
      console.error(`[CodeExecutor] Dir contents after failed exec: ${dirContents}`);
    } catch {}
    throw new Error(`Code execution failed:\n${stderr || msg}`);
  }

  // Log dir contents regardless of whether output file exists
  const dirContents = fs.readdirSync(tempDir).join(", ");
  console.log(`[CodeExecutor] Dir contents after exec: ${dirContents}`);

  // Read output file
  const outputPath = path.join(tempDir, `output.${fileType}`);
  if (!fs.existsSync(outputPath)) {
    console.error(`[CodeExecutor] output.${fileType} NOT FOUND at: ${outputPath}`);
    throw new Error(
      `Generated code did not produce output.${fileType}. Files in temp dir: ${dirContents}`
    );
  }

  const buffer = fs.readFileSync(outputPath);
  console.log(`[CodeExecutor] Success: output.${fileType} is ${buffer.length} bytes`);
  return { buffer, outputPath };
}
