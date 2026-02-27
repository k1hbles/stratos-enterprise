import { after } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";
import { runAgent } from "@/lib/ai/agent";
import type { JobWithDetails } from "@/types/jobs";

export async function POST(req: Request) {
  try {
    const userId = (await getSessionUserId()) ?? "anonymous";

    const { jobId } = await req.json();
    if (!jobId) {
      return Response.json({ success: false, error: "Missing jobId" }, { status: 400 });
    }

    const db = getDb();

    // Verify job exists and is queued
    const job = db
      .prepare("SELECT * FROM jobs WHERE id = ?")
      .get(jobId) as Record<string, unknown> | undefined;

    if (!job) {
      return Response.json({ success: false, error: "Job not found" }, { status: 404 });
    }

    if (job.status !== "queued") {
      return Response.json(
        { success: false, error: `Job is already ${job.status}` },
        { status: 400 }
      );
    }

    // Fetch files, results, and steps
    const files = db
      .prepare("SELECT * FROM job_files WHERE job_id = ? ORDER BY created_at ASC")
      .all(jobId) as Record<string, unknown>[];

    const results = db
      .prepare("SELECT * FROM job_results WHERE job_id = ? ORDER BY created_at ASC")
      .all(jobId) as Record<string, unknown>[];

    const steps = db
      .prepare("SELECT * FROM job_steps WHERE job_id = ? ORDER BY step_number ASC")
      .all(jobId) as Record<string, unknown>[];

    const jobWithDetails: JobWithDetails = {
      ...job,
      files,
      results,
      steps,
    } as unknown as JobWithDetails;

    // Fire-and-forget: run agent after response is sent
    after(async () => {
      await runAgent(jobWithDetails);
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("Job run route error:", err);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
