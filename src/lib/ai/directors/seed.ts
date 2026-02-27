import type { DirectorConfig } from "./types";
import { CHAIRMAN_PROMPT } from "./prompts/chairman";
import { CFO_PROMPT } from "./prompts/cfo";
import { CMO_PROMPT } from "./prompts/cmo";
import { CTO_PROMPT } from "./prompts/cto";
import { COO_PROMPT } from "./prompts/coo";
import { CSO_PROMPT } from "./prompts/cso";
import { CRO_PROMPT } from "./prompts/cro";
import { SECRETARY_PROMPT } from "./prompts/secretary";

export const DIRECTOR_SEEDS: DirectorConfig[] = [
  {
    id: "seed-chairman",
    slug: "chairman",
    displayName: "Chairman",
    roleDescription:
      "Strategic orchestrator, goal decomposer, conflict resolver",
    systemPrompt: CHAIRMAN_PROMPT,
    toolWhitelist: [
      "think",
      "web_search",
      "web_fetch",
      "query_memory",
      "store_memory",
    ],
    modelPreference: "claude-sonnet-4-5-20250929",
  },
  {
    id: "seed-cfo",
    slug: "cfo",
    displayName: "Chief Financial Officer",
    roleDescription:
      "Financial analysis, cost optimization, modeling, forecasting",
    systemPrompt: CFO_PROMPT,
    toolWhitelist: [
      "think",
      "web_search",
      "web_fetch",
      "parse_file",
      "create_chart",
      "query_memory",
      "generate_document",
    ],
    modelPreference: "gemini-2.5-flash",
  },
  {
    id: "seed-cmo",
    slug: "cmo",
    displayName: "Chief Marketing Officer",
    roleDescription:
      "Market analysis, branding, customer acquisition, positioning",
    systemPrompt: CMO_PROMPT,
    toolWhitelist: [
      "think",
      "web_search",
      "web_fetch",
      "query_memory",
      "store_memory",
    ],
    modelPreference: "moonshot-v1-8k",
  },
  {
    id: "seed-cto",
    slug: "cto",
    displayName: "Chief Technology Officer",
    roleDescription:
      "Technical architecture, tech stack, engineering strategy",
    systemPrompt: CTO_PROMPT,
    toolWhitelist: [
      "think",
      "web_search",
      "web_fetch",
      "query_memory",
    ],
    modelPreference: "gpt-4o-mini",
  },
  {
    id: "seed-coo",
    slug: "coo",
    displayName: "Chief Operating Officer",
    roleDescription:
      "Operations, supply chain, efficiency, process optimization",
    systemPrompt: COO_PROMPT,
    toolWhitelist: [
      "think",
      "web_search",
      "web_fetch",
      "parse_file",
      "query_memory",
    ],
    modelPreference: "gpt-4o-mini",
  },
  {
    id: "seed-cso",
    slug: "cso",
    displayName: "Chief Strategy Officer",
    roleDescription:
      "Competitive strategy, market positioning, long-term vision",
    systemPrompt: CSO_PROMPT,
    toolWhitelist: [
      "think",
      "web_search",
      "web_fetch",
      "query_memory",
      "store_memory",
      "generate_document",
    ],
    modelPreference: "gpt-4o",
  },
  {
    id: "seed-cro",
    slug: "cro",
    displayName: "Chief Revenue Officer",
    roleDescription:
      "Revenue growth, sales strategy, pricing, customer expansion",
    systemPrompt: CRO_PROMPT,
    toolWhitelist: [
      "think",
      "web_search",
      "web_fetch",
      "parse_file",
      "create_chart",
      "query_memory",
    ],
    modelPreference: "gemini-2.5-flash",
  },
  {
    id: "seed-secretary",
    slug: "secretary",
    displayName: "Board Secretary",
    roleDescription:
      "Synthesis, documentation, meeting notes, action items",
    systemPrompt: SECRETARY_PROMPT,
    toolWhitelist: [
      "think",
      "generate_document",
      "generate_slides",
      "query_memory",
      "store_memory",
    ],
    modelPreference: "claude-sonnet-4-5-20250929",
  },
];
