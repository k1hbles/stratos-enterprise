export type JobStatus = "queued" | "running" | "completed" | "failed";

export type TaskType =
  | "analysis"
  | "spreadsheet"
  | "research"
  | "study-guide"
  | "assignment"
  | "profitability"
  | "pareto"
  | "trend"
  | "anomaly"
  | "competitive"
  | "scenario"
  | "executive"
  | "data_audit"
  | "persona"
  | "trends"
  | "swot"
  | "pricing"
  | "gtm"
  | "journey"
  | "financial"
  | "risk"
  | "market_entry"
  | "market_sizing";

export type OutputFormat = "auto" | "pdf" | "xlsx" | "docx";

export interface Job {
  id: string;
  user_id: string;
  title: string;
  description: string;
  task_type: TaskType;
  status: JobStatus;
  priority: number;
  output_format: OutputFormat;
  steps_completed: number;
  total_steps: number | null;
  current_step_description: string | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  tokens_used: number;
  estimated_cost: number;
  conversation_id: string | null;
  trigger_run_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobFile {
  id: string;
  job_id: string | null;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  parsed_content: string | null;
  download_url?: string;
  created_at: string;
}

export interface JobResult {
  id: string;
  job_id: string;
  result_type: string;
  file_name: string;
  storage_path: string;
  file_size: number;
  content_markdown: string | null;
  intermediate?: boolean;
  download_url?: string;
  created_at: string;
}

export interface JobStep {
  id: string;
  job_id: string;
  step_number: number;
  tool_name: string;
  description: string;
  status: "running" | "completed" | "failed";
  tokens_used: number | null;
  duration_ms: number | null;
  reasoning: string | null;
  result_data: Record<string, unknown> | null;
  created_at: string;
}

export interface JobWithDetails extends Job {
  files: JobFile[];
  results: JobResult[];
  steps: JobStep[];
}
