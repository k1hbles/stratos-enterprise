/**
 * Shared E2B chart runner — executes Python code in a sandbox and returns the
 * first PNG output as a Buffer.  Returns undefined when E2B is unavailable.
 */
export async function runChartInSandbox(
  code: string
): Promise<Buffer | undefined> {
  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) return undefined;

  try {
    const e2bModule = await import("@e2b/code-interpreter");
    const CodeInterpreter =
      (e2bModule as any).CodeInterpreter ?? (e2bModule as any).default;

    const sandbox = await CodeInterpreter.create({ apiKey });

    try {
      const execution = await sandbox.notebook.execCell(code);

      if (execution.error) {
        console.error(
          `Chart sandbox error: ${execution.error.name}: ${execution.error.value}`
        );
        return undefined;
      }

      for (const result of execution.results) {
        if (result.png) {
          return Buffer.from(result.png, "base64");
        }
      }

      return undefined;
    } finally {
      await sandbox.close();
    }
  } catch (err) {
    console.error("runChartInSandbox failed:", err);
    return undefined;
  }
}
