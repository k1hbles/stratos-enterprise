import type { AgentTool } from "@/lib/ai/agent/types";
import type { TaskType } from "@/types/jobs";
import { getCurrentTimeTool } from "./tier1/get-current-time";
import { thinkTool } from "./tier1/think";
import { webSearchTool } from "./tier2/web-search";
import { webScrapeTool } from "./tier2/web-scrape";
import { readUploadedFileTool } from "./tier2/read-uploaded-file";
import { executePythonTool } from "./tier3/execute-python";
import { generateDocumentTool } from "./output/generate-document";
import { generateSlidesTool } from "./output/generate-slides";
import { queryMemoryTool } from "./tier1/query-memory";
import { storeMemoryTool } from "./tier1/store-memory";

const base: AgentTool[] = [getCurrentTimeTool, thinkTool, queryMemoryTool, storeMemoryTool];
const research: AgentTool[] = [webSearchTool, webScrapeTool];
const fileTools: AgentTool[] = [readUploadedFileTool];
const code: AgentTool[] = [executePythonTool];
const output: AgentTool[] = [generateDocumentTool, generateSlidesTool];

const DATA_TASKS: TaskType[] = [
  "analysis",
  "profitability",
  "pareto",
  "trend",
  "anomaly",
  "data_audit",
  "spreadsheet",
];

const RESEARCH_TASKS: TaskType[] = [
  "research",
  "competitive",
  "trends",
  "market_entry",
  "market_sizing",
];

const STRATEGY_TASKS: TaskType[] = [
  "swot",
  "pricing",
  "gtm",
  "journey",
  "financial",
  "risk",
  "scenario",
  "executive",
  "persona",
];

const CONTENT_TASKS: TaskType[] = ["study-guide", "assignment"];

export function getToolsByNames(names: string[]): AgentTool[] {
  const allTools: AgentTool[] = [
    ...base, ...research, ...fileTools, ...code, ...output,
  ];
  return allTools.filter((t) => names.includes(t.name));
}

export function getToolsForTask(taskType: TaskType): AgentTool[] {
  if (DATA_TASKS.includes(taskType)) {
    return [...base, ...fileTools, ...code, ...output];
  }
  if (RESEARCH_TASKS.includes(taskType)) {
    return [...base, ...research, ...output];
  }
  if (STRATEGY_TASKS.includes(taskType)) {
    return [...base, ...research, ...fileTools, ...code, ...output];
  }
  if (CONTENT_TASKS.includes(taskType)) {
    return [...base, ...research, ...output];
  }
  // Fallback: give all tools
  return [...base, ...research, ...fileTools, ...code, ...output];
}

/** Convert AgentTool[] to Anthropic API tool definitions */
export function toAnthropicTools(
  tools: AgentTool[]
): Array<{
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}> {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }));
}
