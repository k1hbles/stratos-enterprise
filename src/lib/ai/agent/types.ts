import type { JobWithDetails } from "@/types/jobs";

export interface AgentContext {
  job: JobWithDetails;
  userId: string;
  stepCounter: number;
  totalTokensUsed: number;
}

export interface AgentTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  execute: (
    args: Record<string, unknown>,
    ctx: AgentContext
  ) => Promise<ToolResult>;
  isWriteAction?: boolean;
}

export interface ToolResult {
  success: boolean;
  data: Record<string, unknown>;
  output_files?: OutputFile[];
}

export interface OutputFile {
  fileName: string;
  storagePath: string;
  fileSize: number;
  resultType: string;
  contentMarkdown?: string;
}
