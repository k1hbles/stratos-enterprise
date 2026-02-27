import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  getPendingConfirmations,
  resolveConfirmation,
} from "@/lib/security/confirmation";

export const confirmationsRouter = router({
  pending: protectedProcedure.query(({ ctx }) => {
    return getPendingConfirmations(ctx.userId);
  }),

  resolve: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        approved: z.boolean(),
      })
    )
    .mutation(({ ctx, input }) => {
      const success = resolveConfirmation(input.id, ctx.userId, input.approved);
      return { success };
    }),
});
