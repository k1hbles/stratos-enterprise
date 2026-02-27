import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  listCoreMemories,
  deleteCoreMemory,
  searchSemanticMemories,
} from "@/lib/memory";

export const memoryRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
        limit: z.number().optional().default(50),
      })
    )
    .query(({ ctx, input }) => {
      return listCoreMemories(ctx.userId, input.category, input.limit);
    }),

  search: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        limit: z.number().optional().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      return searchSemanticMemories(ctx.userId, input.query, input.limit);
    }),

  delete: protectedProcedure
    .input(z.object({ key: z.string() }))
    .mutation(({ ctx, input }) => {
      const success = deleteCoreMemory(ctx.userId, input.key);
      return { success };
    }),
});
