import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import type { Job, JobStep, JobFile, JobResult } from "@/types/jobs";

export const jobsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["all", "queued", "running", "completed", "failed"]).optional(),
        limit: z.number().optional().default(20),
        search: z.string().optional(),
      })
    )
    .query(({ ctx, input }) => {
      const conditions: string[] = ["user_id = ?"];
      const params: unknown[] = [ctx.userId];

      if (input.status && input.status !== "all") {
        conditions.push("status = ?");
        params.push(input.status);
      }
      if (input.search) {
        conditions.push("(title LIKE ? OR description LIKE ?)");
        params.push(`%${input.search}%`, `%${input.search}%`);
      }

      const where = conditions.join(" AND ");
      params.push(input.limit);

      return ctx.db
        .prepare(
          `SELECT id, title, description, status, task_type, created_at, updated_at
           FROM jobs WHERE ${where} ORDER BY created_at DESC LIMIT ?`
        )
        .all(...params) as Job[];
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      const job = ctx.db
        .prepare("SELECT * FROM jobs WHERE id = ? AND user_id = ?")
        .get(input.id, ctx.userId) as Job | undefined;

      if (!job) throw new Error("Job not found");

      const steps = ctx.db
        .prepare(
          "SELECT * FROM job_steps WHERE job_id = ? ORDER BY created_at ASC"
        )
        .all(input.id) as JobStep[];

      const files = ctx.db
        .prepare("SELECT * FROM job_files WHERE job_id = ?")
        .all(input.id) as JobFile[];

      const results = ctx.db
        .prepare(
          "SELECT * FROM job_results WHERE job_id = ? ORDER BY created_at ASC"
        )
        .all(input.id) as JobResult[];

      // Parse JSON fields in steps
      for (const step of steps) {
        if (typeof step.result_data === "string") {
          try { step.result_data = JSON.parse(step.result_data as string); } catch {}
        }
      }

      return { ...job, steps, files, results };
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string(),
        taskType: z.string(),
        outputFormat: z.enum(["auto", "pdf", "xlsx", "docx"]).default("auto"),
        fileIds: z.array(z.string()).optional(),
        files: z
          .array(
            z.object({
              fileName: z.string(),
              fileType: z.string(),
              fileSize: z.number(),
              storagePath: z.string(),
            })
          )
          .optional(),
        conversationId: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      const jobId = crypto.randomUUID();

      const job = ctx.db
        .prepare(
          `INSERT INTO jobs (id, user_id, title, description, task_type, output_format, status, conversation_id)
           VALUES (?, ?, ?, ?, ?, ?, 'queued', ?)
           RETURNING *`
        )
        .get(
          jobId,
          ctx.userId,
          input.title,
          input.description,
          input.taskType,
          input.outputFormat,
          input.conversationId ?? null
        ) as Job;

      // Link existing files
      if (input.fileIds?.length) {
        const placeholders = input.fileIds.map(() => "?").join(",");
        ctx.db
          .prepare(`UPDATE job_files SET job_id = ? WHERE id IN (${placeholders})`)
          .run(jobId, ...input.fileIds);
      }

      // Insert new file records
      if (input.files?.length) {
        const insert = ctx.db.prepare(
          "INSERT INTO job_files (id, job_id, file_name, file_type, file_size, storage_path) VALUES (?, ?, ?, ?, ?, ?)"
        );
        for (const f of input.files) {
          insert.run(
            crypto.randomUUID(),
            jobId,
            f.fileName,
            f.fileType,
            f.fileSize,
            f.storagePath
          );
        }
      }

      return job;
    }),

  retry: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      const data = ctx.db
        .prepare(
          "UPDATE jobs SET status = 'queued', error_message = NULL WHERE id = ? AND user_id = ? RETURNING *"
        )
        .get(input.id, ctx.userId) as Job | undefined;

      if (!data) throw new Error("Job not found");
      return data;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      ctx.db
        .prepare("DELETE FROM jobs WHERE id = ? AND user_id = ?")
        .run(input.id, ctx.userId);
      return { success: true };
    }),
});
