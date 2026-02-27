import type { AgentTool, AgentContext, OutputFile } from "@/lib/ai/agent/types";
import { uploadFile } from "@/lib/storage";

export const executePythonTool: AgentTool = {
  name: "create_chart",
  description:
    "Execute Python code in a secure sandbox to create charts, perform data analysis, or run computations. The sandbox has pandas, matplotlib, seaborn, numpy, and scipy pre-installed. To create a chart, save it as a PNG file using plt.savefig('/home/user/output.png'). All files saved in /home/user/ will be collected as outputs.",
  input_schema: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "Python code to execute.",
      },
      input_data: {
        type: "string",
        description:
          "Optional CSV data to write to /home/user/input.csv before execution.",
      },
    },
    required: ["code"],
  },
  async execute(args: Record<string, unknown>, ctx: AgentContext) {
    const code = String(args.code);
    const inputData =
      typeof args.input_data === "string" ? args.input_data : null;

    const apiKey = process.env.E2B_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        data: { error: "E2B sandbox API key not configured" },
      };
    }

    try {
      const e2bModule = await import("@e2b/code-interpreter");
      const CodeInterpreter = (e2bModule as any).CodeInterpreter ?? (e2bModule as any).default;

      const sandbox = await CodeInterpreter.create({ apiKey });

      try {
        // Write input data if provided
        if (inputData) {
          await sandbox.files.write("/home/user/input.csv", inputData);
        }

        // Execute the Python code
        const execution = await sandbox.notebook.execCell(code);

        const stdout = execution.logs.stdout.join("\n");
        const stderr = execution.logs.stderr.join("\n");

        if (execution.error) {
          return {
            success: false,
            data: {
              error: `Python error: ${execution.error.name}: ${execution.error.value}`,
              stdout,
              stderr,
            },
          };
        }

        // Collect output files (charts, generated files)
        const output_files: OutputFile[] = [];

        for (const result of execution.results) {
          if (result.png) {
            // Base64 PNG chart - upload to local storage
            const pngBuffer = Buffer.from(result.png, "base64");
            const fileName = `chart_${Date.now()}.png`;
            const storagePath = `outputs/${ctx.job.id}/${fileName}`;

            uploadFile(storagePath, pngBuffer);

            output_files.push({
              fileName,
              storagePath,
              fileSize: pngBuffer.length,
              resultType: "chart",
            });

            return {
              success: true,
              data: {
                chart_type: "generated",
                publicUrl: `/api/files/download?id=${storagePath}`,
                stdout,
              },
              output_files,
            };
          }
        }

        return {
          success: true,
          data: {
            stdout,
            stderr: stderr || undefined,
            files_created: output_files.length,
          },
          output_files,
        };
      } finally {
        await sandbox.close();
      }
    } catch (err) {
      return {
        success: false,
        data: {
          error:
            err instanceof Error
              ? err.message
              : "Failed to execute Python code",
        },
      };
    }
  },
};
