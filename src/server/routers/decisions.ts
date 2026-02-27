import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const decisionsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(20),
      })
    )
    .query(({ ctx, input }) => {
      const data = ctx.db
        .prepare(
          "SELECT * FROM decisions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
        )
        .all(ctx.userId, input.limit) as Record<string, unknown>[];

      // Parse JSON fields
      for (const d of data) {
        if (typeof d.directors_involved === "string") {
          try { d.directors_involved = JSON.parse(d.directors_involved as string); } catch {}
        }
      }
      return data;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      const data = ctx.db
        .prepare(
          "SELECT * FROM decisions WHERE id = ? AND user_id = ?"
        )
        .get(input.id, ctx.userId) as Record<string, unknown> | undefined;

      if (!data) throw new Error("Decision not found");

      if (typeof data.directors_involved === "string") {
        try { data.directors_involved = JSON.parse(data.directors_involved as string); } catch {}
      }
      return data;
    }),
});
