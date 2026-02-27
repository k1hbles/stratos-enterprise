import type { AgentTool } from "@/lib/ai/agent/types";
import { listCoreMemories } from "@/lib/memory/core";
import { searchSemanticMemories } from "@/lib/memory/semantic";

export const queryMemoryTool: AgentTool = {
  name: "query_memory",
  description:
    "Search the user's stored memories. Use this to recall previously stored facts, preferences, company details, or past analysis results.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Search query for semantic memory search. Leave empty to list all core memories.",
      },
      category: {
        type: "string",
        description:
          'Optional category filter for core memories (e.g. "company", "preferences", "general").',
      },
    },
    required: [],
  },
  async execute(args, ctx) {
    const query = typeof args.query === "string" ? args.query : "";
    const category = typeof args.category === "string" ? args.category : undefined;

    try {
      const coreMemories = listCoreMemories(
        ctx.userId,
        category,
        20
      );

      let semanticResults: { content: string; similarity?: number }[] = [];
      if (query) {
        semanticResults = await searchSemanticMemories(
          ctx.userId,
          query,
          5
        );
      }

      return {
        success: true,
        data: {
          core_memories: coreMemories.map((m) => ({
            key: m.key,
            value: m.value,
            category: m.category,
          })),
          semantic_results: semanticResults.map((m) => ({
            content: m.content.slice(0, 500),
            similarity: m.similarity,
          })),
          total_found:
            coreMemories.length + semanticResults.length,
        },
      };
    } catch (err) {
      return {
        success: false,
        data: {
          error:
            err instanceof Error
              ? err.message
              : "Memory query failed",
        },
      };
    }
  },
};
