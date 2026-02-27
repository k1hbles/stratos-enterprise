import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const councilRouter = router({
  getSession: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      const session = ctx.db
        .prepare(
          "SELECT * FROM council_sessions WHERE id = ? AND user_id = ?"
        )
        .get(input.id, ctx.userId) as Record<string, unknown> | undefined;

      if (!session) throw new Error("Session not found");

      const tasks = ctx.db
        .prepare(
          "SELECT * FROM council_tasks WHERE session_id = ? ORDER BY created_at ASC"
        )
        .all(input.id) as Record<string, unknown>[];

      const exchanges = ctx.db
        .prepare(
          "SELECT * FROM council_exchanges WHERE session_id = ? ORDER BY created_at ASC"
        )
        .all(input.id) as Record<string, unknown>[];

      const documents = ctx.db
        .prepare(
          "SELECT * FROM council_documents WHERE session_id = ? ORDER BY created_at ASC"
        )
        .all(input.id) as Record<string, unknown>[];

      // Parse JSON fields
      for (const task of tasks) {
        if (typeof task.result_data === "string") {
          try { task.result_data = JSON.parse(task.result_data as string); } catch {}
        }
      }

      return { ...session, tasks, exchanges, documents };
    }),

  listSessions: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(20),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.db
        .prepare(
          "SELECT id, goal, mode, stage, created_at, updated_at FROM council_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
        )
        .all(ctx.userId, input.limit) as Record<string, unknown>[];
    }),
});
