import type { JobWithDetails } from "@/types/jobs";
import type { AgentContext } from "./types";
import { getDb } from "@/lib/db";
import { getToolsForTask } from "@/lib/ai/tools/registry";
import { buildSystemPrompt } from "./prompts";
import { executeAgentLoop } from "./loop";
import { buildMemoryContext } from "@/lib/memory";

/**
 * Runs the AI agent pipeline for a given job.
 * Called asynchronously via after() from the job run API route.
 */
export async function runAgent(job: JobWithDetails): Promise<void> {
  const db = getDb();

  // 1. Set job status to running
  db.prepare(
    "UPDATE jobs SET status = 'running', started_at = datetime('now') WHERE id = ?"
  ).run(job.id);

  const ctx: AgentContext = {
    job,
    userId: job.user_id,
    stepCounter: 0,
    totalTokensUsed: 0,
  };

  try {
    // 2. Build goal string from job details
    const fileList = job.files.length
      ? `\n\nAttached files:\n${job.files.map((f) => `- "${f.file_name}" (ID: ${f.id}, ${f.file_type})`).join("\n")}`
      : "";

    const goal = `# Task: ${job.title}\n\n${job.description}${fileList}\n\nPlease complete this task and produce the final deliverable.`;

    // 3. Select tools based on task type
    const tools = getToolsForTask(job.task_type);

    // 4. Build system prompt with memory context
    let systemPrompt = buildSystemPrompt(
      job.task_type,
      job.output_format,
      job.files
    );

    // Inject user memory context
    const memoryContext = await buildMemoryContext(
      job.user_id,
      `${job.title} ${job.description}`
    );
    if (memoryContext) {
      systemPrompt += memoryContext;
    }

    // 5. Execute the agent loop
    const summary = await executeAgentLoop(ctx, systemPrompt, goal, tools);

    // 6. Check if any results were produced
    const results = db
      .prepare("SELECT id FROM job_results WHERE job_id = ?")
      .all(job.id);

    // 7. Set job as completed
    db.prepare(
      `UPDATE jobs SET status = 'completed', completed_at = datetime('now'),
       steps_completed = ?, tokens_used = ?, current_step_description = ?
       WHERE id = ?`
    ).run(
      ctx.stepCounter,
      ctx.totalTokensUsed,
      summary ? summary.slice(0, 200) : "Task completed",
      job.id
    );

    if (!results?.length) {
      console.warn(
        `[Agent] Job ${job.id} completed but produced no output files`
      );
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown agent error";
    console.error(`[Agent] Job ${job.id} failed:`, errorMessage);

    db.prepare(
      `UPDATE jobs SET status = 'failed', error_message = ?,
       completed_at = datetime('now'), tokens_used = ?
       WHERE id = ?`
    ).run(errorMessage, ctx.totalTokensUsed, job.id);
  }
}
