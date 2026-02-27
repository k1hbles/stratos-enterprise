import type { AgentTool } from "@/lib/ai/agent/types";

export const thinkTool: AgentTool = {
  name: "think",
  description:
    "Use this tool to think through a problem step-by-step before taking action. The reasoning will be recorded but no external action is performed.",
  input_schema: {
    type: "object",
    properties: {
      reasoning: {
        type: "string",
        description: "Your step-by-step reasoning about the problem.",
      },
    },
    required: ["reasoning"],
  },
  async execute(args) {
    return {
      success: true,
      data: {
        acknowledged: true,
        reasoning_length: String(args.reasoning ?? "").length,
      },
    };
  },
};
