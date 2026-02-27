import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

interface Conversation {
  id: string;
  title: string | null;
  preview: string | null;
  updated_at: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
}

export const chatRouter = router({
  listConversations: protectedProcedure
    .input(z.object({ limit: z.number().optional().default(50) }))
    .query(({ ctx, input }) => {
      return ctx.db
        .prepare(
          "SELECT id, title, preview, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?"
        )
        .all(ctx.userId, input.limit) as Conversation[];
    }),

  getConversation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      const conversation = ctx.db
        .prepare(
          "SELECT id, title, preview, updated_at FROM conversations WHERE id = ? AND user_id = ?"
        )
        .get(input.id, ctx.userId) as Conversation | undefined;

      if (!conversation) throw new Error("Conversation not found");

      const messages = ctx.db
        .prepare(
          "SELECT id, role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
        )
        .all(input.id) as Message[];

      return { ...conversation, messages };
    }),

  createConversation: protectedProcedure
    .input(z.object({}).optional())
    .mutation(({ ctx }) => {
      const id = crypto.randomUUID();
      const data = ctx.db
        .prepare(
          "INSERT INTO conversations (id, user_id, title) VALUES (?, ?, 'New Chat') RETURNING id, title"
        )
        .get(id, ctx.userId) as { id: string; title: string };

      return data;
    }),

  renameConversation: protectedProcedure
    .input(z.object({ id: z.string(), title: z.string() }))
    .mutation(({ ctx, input }) => {
      const data = ctx.db
        .prepare(
          "UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ? RETURNING id, title, updated_at"
        )
        .get(input.title, input.id, ctx.userId) as { id: string; title: string; updated_at: string } | undefined;

      if (!data) throw new Error("Conversation not found");
      return data;
    }),

  deleteConversation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      ctx.db
        .prepare(
          "DELETE FROM conversations WHERE id = ? AND user_id = ?"
        )
        .run(input.id, ctx.userId);
      return { success: true };
    }),
});
