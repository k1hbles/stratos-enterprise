import type { TaskType } from "./jobs";

export interface Mission {
  id: string;
  user_id: string; // internal UUID (NOT Clerk ID)
  company_id: string;
  title: string;
  description: string | null;
  skill: TaskType;
  schedule_cron: string | null;
  schedule_timezone: string;
  data_source_ids: string[];
  parameters: Record<string, unknown>;
  delivery_channels: DeliveryChannels;
  active: boolean;
  last_run_at: string | null;
  last_run_job_id: string | null;
  run_count: number;
  created_at: string;
  updated_at: string;
}

export interface DeliveryChannels {
  email?: { enabled: boolean; recipients: string[] };
}
