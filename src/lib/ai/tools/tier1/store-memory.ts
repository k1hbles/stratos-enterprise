import type { AgentTool } from "@/lib/ai/agent/types";
import { upsertCoreMemory } from "@/lib/memory/core";
import { storeSemanticMemory } from "@/lib/memory/semantic";

export const storeMemoryTool: AgentTool = {
  name: "store_memory",
  description:
    "Store a fact or insight in the user's long-term memory. Use this to remember important company details, preferences, analysis results, or any information that should persist across sessions.",
  input_schema: {
    type: "object",
    properties: {
      key: {
        type: "string",
        description:
          'A short, descriptive key for this memory (e.g. "company_name", "industry", "revenue_2024").',
      },
      value: {
        type: "string",
        description: "The value or fact to remember.",
      },
      category: {
        type: "string",
        enum: [
          "company",
          "preferences",
          "analysis",
          "contact",
          "general",
        ],
        description: "Category for organization. Default: general.",
      },
    },
    required: ["key", "value"],
  },
  async execute(args, ctx) {
    const key = String(args.key);
    const value = String(args.value);
    const category =
      typeof args.category === "string" ? args.category : "general";

    try {
      // Store as core memory (key-value)
      const coreResult = upsertCoreMemory(
        ctx.userId,
        key,
        value,
        category,
        "agent"
      );

      // Also store semantically for future retrieval
      await storeSemanticMemory(ctx.userId, `${key}: ${value}`, {
        category,
        key,
      });

      return {
        success: true,
        data: {
          stored: true,
          key,
          category,
          memory_id: coreResult?.id ?? "unknown",
        },
      };
    } catch (err) {
      return {
        success: false,
        data: {
          error:
            err instanceof Error
              ? err.message
              : "Failed to store memory",
        },
      };
    }
  },
};
