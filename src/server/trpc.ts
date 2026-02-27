import { initTRPC, TRPCError } from "@trpc/server";
import { getDb, type Db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";

export async function createTRPCContext() {
  const userId = await getSessionUserId();
  const db = getDb();
  return { userId: userId ?? "anonymous", db };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId || ctx.userId === "anonymous") {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});
