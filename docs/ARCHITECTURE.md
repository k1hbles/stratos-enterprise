# Hyprnova Architecture — Synthesis Document

**Date:** 2026-02-25
**Status:** Pre-build analysis — zero application code
**Purpose:** Document the architectural synthesis of Karpathy's LLM Council and OpenClaw into the Hyprnova agent system before any implementation begins.

---

## 1. Reference Architectures

Hyprnova synthesizes two open-source systems into something neither achieves alone:

- **Karpathy's LLM Council** — A 3-stage multi-LLM deliberation protocol where multiple models independently answer, anonymously rank each other, and a chairman synthesizes the best response.
- **OpenClaw** — A persistent multi-channel AI agent gateway with agentic tool loops, file-based memory injection, heartbeat scheduling, and channel-agnostic message routing.

Neither is sufficient on its own. The Council has no tools — it only reasons over text. OpenClaw has no deliberation — it runs a single agent with no peer review. Hyprnova gives every council member a full agent loop.

---

## 2. Karpathy's LLM Council — What We Take and What We Fix

### Source: `council.py` (~250 lines), `config.py` (~15 lines)

### What We Take

| Pattern | Implementation in Karpathy | Adoption in Hyprnova |
|---------|---------------------------|---------------------|
| **3-stage protocol** | `stage1_collect_responses` → `stage2_collect_rankings` → `stage3_synthesize_final` | Becomes the inner loop of Stage 3 (Peer Review) in our 4-stage orchestration |
| **Anonymized peer review** | Responses labelled "Response A/B/C", `label_to_model` mapping hidden until after ranking | Kept verbatim — directors review anonymized outputs to prevent self-preference bias |
| **Strict ranking format** | `"FINAL RANKING:"` header + numbered list, parsed via regex by `parse_ranking_from_text()` | Kept — machine-parseable format for aggregate ranking computation |
| **Aggregate ranking** | `calculate_aggregate_rankings()` computes average rank position across all rankers | Kept — weighted by director confidence scores rather than simple average |
| **Parallel collection** | `asyncio.gather()` for all model calls in Stage 1 and Stage 2 | Kept — `Promise.all()` with SSE streaming per director |
| **Graceful degradation** | Failed responses filtered out, remaining responses proceed | Kept — council continues with available directors, logs failures to audit |
| **Chairman separation** | Chairman is a different model from council members | Evolved (see below) |

### What We Fix

| Gap in Karpathy | Problem | Hyprnova Fix |
|----------------|---------|-------------|
| **No tool access** | Models only reason over text — CFO can't pull actual P&L data | Every director is a full agent with tool loop (max 15 iterations), not a prompt variant |
| **No memory** | Every query starts cold, no accumulated knowledge | 3-tier memory: Core (company facts) → Buffer (recent context) → Semantic (pgvector long-term) |
| **No auth or audit** | Weekend hack, no security considerations | Auth gate on every route, whitelist enforcement, immutable audit log on every tool call |
| **No streaming** | Waits for all responses before showing anything | SSE streaming — each director's tool calls visible in real time on the Council page |
| **No confirmation gate** | Chairman has unbounded authority in Stage 3 | Write actions require user confirmation by default; autonomous mode is opt-in per Settings |
| **No specialization** | All council members get the identical query | Chairman decomposes the goal — each director gets a tailored subtask matching their expertise |
| **Chairman marks own homework** | Chairman synthesizes without constraint | Secretary compiles, Chairman adjudicates conflicts — two separate roles, neither evaluates their own work |
| **Ephemeral metadata** | Rankings and mappings not persisted | All council exchanges, rankings, and documents stored in `council_sessions`, `council_tasks`, `council_exchanges` tables |
| **JSON file storage** | No infrastructure, no query capability | PostgreSQL + Drizzle ORM with encrypted columns, pgvector for semantic search |
| **Title via cheap model** | Uses `gemini-2.5-flash` for title generation | OpenRouter model routing — Quick mode uses free tier, Council/Board use Claude |

---

## 3. OpenClaw — What We Take and What We Fix

### Source: Documented architecture analysis (6-layer system)

### What We Take

| Pattern | Implementation in OpenClaw | Adoption in Hyprnova |
|---------|--------------------------|---------------------|
| **Agentic tool loop** | `intake → context assembly → model inference → tool execution → reply → persist`, serialized per session | Core of `agent/loop.ts` — same loop pattern, hard-capped at 15 iterations |
| **Context injection** | SOUL.md + MEMORY.md + HEARTBEAT.md + SKILL.md assembled into system prompt before every run | Adopted as 3-tier memory injection: Core facts + Buffer summaries + Semantic search results injected via `buildSystemPrompt()` |
| **File-based memory model** | Accumulated facts from past sessions, inspectable and versionable | Evolved to database-backed equivalent — `memory_core`, `memory_buffer`, `memory_semantic` tables with encryption |
| **Two-tier heartbeat** | Cron wakes agent; cheap deterministic check first, LLM only if something requires attention | Adopted as mission scheduler — `node-cron` triggers deterministic check, BullMQ queues LLM work only when needed |
| **Serialized session lanes** | One run at a time per session, prevents tool/session races | Kept — BullMQ ensures serialized execution per session key |
| **Channel normalization** | Agent never knows which platform a message came from | Adopted in principle — agent loop is channel-agnostic, WhatsApp is outbound-only push |
| **Streaming assistant deltas** | Real-time partial responses via WebSocket | Adopted via SSE (Server-Sent Events) — more compatible with Next.js App Router |
| **Auto-compaction** | Context window management when conversation grows | Adopted as conversation buffer compression in `memory/buffer.ts` |

### What We Fix

| Vulnerability / Gap in OpenClaw | Severity | Hyprnova Fix |
|-------------------------------|----------|-------------|
| **CVE-2026-25253: WebSocket hijacking → RCE** | Critical | No WebSocket control plane. SSE is read-only by design. All mutations go through authenticated API routes |
| **42K+ instances public, many over plain HTTP** | Critical | Auth gate on every route. User whitelist in `.env`. No public pages except `/login`. TLS 1.3 enforced |
| **Writable SOUL.md** | High | Director system prompts are immutable at runtime. Editable only via Settings with audit log entry. No file on disk that reprograms an agent |
| **Community skills (ClawHub) — 341 malicious skills found** | High | MCP only — no custom skill files, no dynamic code evaluation, no dynamic require. All code execution in E2B sandbox. `write_and_register_tool` always requires confirmation |
| **No audit trail between heartbeats** | Medium | Every tool call, agent action, file access, confirmation decision logged to `audit_log` table — immutable, never encrypted (must remain readable) |
| **No approval workflow** | Medium | Write actions gated by confirmation modal. `always_confirm` actions (gmail_send, write_and_register_tool) cannot be overridden even in autonomous mode |
| **No cost controls** | Medium | OpenRouter model routing — free tier for Quick mode, Haiku for Council, Sonnet for Board. Heartbeat uses deterministic check first, LLM only when needed. Estimated $5–10/month |
| **Unsandboxed execution** | High | All Python execution in E2B sandboxes — isolated, no host filesystem access, no network unless tool explicitly enables it |
| **JSONL transcript storage** | Low | PostgreSQL with Drizzle ORM — queryable, encrypted at rest (AES-256-GCM), proper migration system |

---

## 4. The Combined Hyprnova Protocol

Karpathy's 3-stage becomes the inner loop. OpenClaw's agent core becomes the execution engine per director. The result is a 4-stage orchestration:

```
USER GOAL
  │
  ▼
STAGE 1 — DECOMPOSE (Chairman, 1-2s)
  Chairman receives goal + core memory + recent context
  Produces orchestration plan:
    - Which directors are needed
    - Subtask per director (tailored, not identical)
    - Synthesis instruction for final output
  │
  ▼
STAGE 2 — EXECUTE (Parallel directors, 5-30s)
  Each assigned director runs a full agent loop:
    intake → context assembly → model inference → tool execution → loop
  CFO pulls real P&L from Sheets, runs Python financial model
  CSO scrapes competitor data, analyzes market conditions
  CRO models FX scenarios, stress-tests assumptions
  All stream progress via SSE — tool calls visible in real time
  Max 15 iterations per director — hard stop, non-negotiable
  │
  ▼
STAGE 3 — REVIEW (Karpathy inner loop)
  Anonymized peer review of Stage 2 outputs:
    a) Directors see other outputs labelled "Response A/B/C" — no names
    b) Each ranks the outputs via strict "FINAL RANKING:" format
    c) Aggregate rankings computed
    d) Cross-challenges: CFO challenges CSO's revenue assumptions,
       CRO stress-tests CFO's projections, COO validates supply chain numbers
  All exchanges stored in council_exchanges table
  │
  ▼
STAGE 4 — SYNTHESIZE (Secretary + Chairman)
  Secretary compiles all outputs into structured document
  Chairman adjudicates conflicts between directors
  Output actions:
    - Google Drive document created (if applicable)
    - Decision logged to decisions table
    - Mission scheduled for follow-up (if applicable)
    - WhatsApp summary pushed (if configured)
    - Calendar event created (if applicable)
  All write actions gated by confirmation unless autonomous mode
```

### Why 4 stages, not 3

Karpathy's protocol sends the same query to all models. That works for text reasoning. It does not work when agents need to execute different tasks — the CFO needs financial data tools, not the same prompt as the CSO. Stage 1 (Decompose) is the missing piece: the Chairman assigns specialized subtasks before execution begins.

### Stage mapping

| Karpathy Stage | Hyprnova Stage | Key difference |
|---------------|---------------|----------------|
| `stage1_collect_responses` | Stage 2 (Execute) | Directors run full agent loops with tools, not just text generation |
| `stage2_collect_rankings` | Stage 3 (Review) | Anonymized ranking + cross-challenge debate between directors |
| `stage3_synthesize_final` | Stage 4 (Synthesize) | Secretary compiles, Chairman adjudicates — two roles, not one model |
| *(missing)* | Stage 1 (Decompose) | Chairman decomposes goal into director-specific subtasks |

---

## 5. Memory Model

Three tiers, mapped against OpenClaw's context injection pattern:

```
┌─────────────────────────────────────────────────────────────┐
│  TIER 1 — CORE MEMORY                                       │
│  Company facts, always injected into every prompt            │
│  Table: memory_core (key-value, categorized)                 │
│  Categories: company / product / person / market / risk      │
│  OpenClaw equivalent: SOUL.md (identity + facts)             │
│  Key difference: stored in DB, encrypted, not a writable     │
│  file — cannot be reprogrammed by agent                      │
├─────────────────────────────────────────────────────────────┤
│  TIER 2 — CONVERSATION BUFFER                                │
│  Compressed summaries of recent conversations                │
│  Table: memory_buffer (per conversation)                     │
│  Injected: last 3 conversation summaries per session         │
│  OpenClaw equivalent: MEMORY.md (accumulated facts)          │
│  Key difference: auto-compressed, not unbounded append       │
├─────────────────────────────────────────────────────────────┤
│  TIER 3 — SEMANTIC LONG-TERM                                 │
│  Vector embeddings of extracted facts                        │
│  Table: memory_semantic (pgvector, 1536 dimensions)          │
│  Populated: after every council session via fact extraction   │
│  Queried: cosine similarity before every agent response      │
│  Director-scoped: each director has own semantic namespace    │
│  OpenClaw equivalent: none — OpenClaw has no semantic search  │
└─────────────────────────────────────────────────────────────┘
```

### Memory injection flow (every agent run)

```
buildSystemPrompt(directorId, memory) {
  1. Load director system prompt (immutable, from directors table)
  2. Load ALL core memory facts (Tier 1)
  3. Load last 3 conversation summaries (Tier 2)
  4. Semantic search for relevant facts using goal embedding (Tier 3)
  5. Assemble into system prompt: identity → facts → context → task
}
```

This mirrors OpenClaw's "agent reconstitutes itself from files each run" pattern — but from database rows instead of filesystem files, and the identity portion (director prompt) is read-only at runtime.

---

## 6. Security Model

12-point hardening checklist, drawn from OpenClaw CVE lessons and Karpathy's missing auth/audit:

| # | Control | Threat Addressed | Implementation |
|---|---------|-----------------|----------------|
| 1 | **Auth gate** | Unauthorized access (42K+ OpenClaw instances exposed) | Every route behind Supabase Auth. No public pages except `/login` |
| 2 | **User whitelist** | Unauthorized users (OpenClaw has no auth at all) | Hardcoded allowed user IDs in `.env`. Silently reject others — no error reveals |
| 3 | **Secrets in .env only** | Secret leakage | Never in code, DB, logs, or memory. Audited on deploy |
| 4 | **Max iterations** | Runaway agent loops | Hard-capped at 15 in `agent/loop.ts`. No exceptions. No overrides. No config |
| 5 | **MCP only** | Malicious community skills (341 found in ClawHub) | No custom skill files. No dynamic code evaluation. Tools registered via MCP protocol only |
| 6 | **Write confirmation** | Agents taking irreversible actions (OpenClaw has no approval) | All write actions require confirmation by default. `always_confirm` for email send and tool registration — cannot be overridden |
| 7 | **WhatsApp receive disabled** | Inbound message injection | Baileys configured send-only at library level. Incoming messages ignored, not just filtered |
| 8 | **Sandbox execution** | Host compromise via code execution | All Python in E2B — isolated, no host filesystem, no network unless explicitly enabled |
| 9 | **Encryption at rest** | Data breach exposure | AES-256-GCM for: semantic memory content, uploaded file text, conversation messages, audit log metadata |
| 10 | **Immutable audit log** | No accountability (OpenClaw has no audit trail) | Every tool call, action, file access, confirmation decision logged with timestamp + user + IP. Never encrypted — must remain queryable |
| 11 | **Self-improvement gate** | Agent deploying unchecked capabilities | `write_and_register_tool` always requires confirmation regardless of autonomy mode. Full test suite in E2B before registration |
| 12 | **No telemetry** | Data exfiltration | Data never leaves unless explicitly connected external service. No analytics. LLM providers receive only the API call itself |

### Autonomy model

```
Default:     All write actions require confirmation
Council:     Autonomous (opt-in via Settings)
Board:       Autonomous (opt-in via Settings)
Exceptions:  gmail_send, write_and_register_tool → always_confirm, no override
```

---

## 7. Director Architecture

Each director is a full agent — not a prompt variant. The distinction matters: a prompt variant changes the system message and calls the same model. An agent has its own tool loop, memory scope, and execution context.

```
┌──────────────────────────────────────────────────┐
│  DIRECTOR = AGENT                                 │
│                                                   │
│  System Prompt ─── role, lens, communication      │
│  Tool Access   ─── scoped to director's domain    │
│  Memory Scope  ─── director_id-scoped semantic    │
│  Autonomy      ─── low / medium / high            │
│  Agent Loop    ─── same loop.ts, max 15 iters     │
└──────────────────────────────────────────────────┘
```

| Director | Role | Key Tools | Autonomy |
|----------|------|-----------|----------|
| **Chairman** | Chief Orchestrator — decomposes goals, coordinates, final judgment | All tools | High |
| **CFO** | Financial analysis — P&L, margins, cash flow, modeling | `execute_python`, `gsheets_read`, `query_financial_metrics`, `web_search` | Medium |
| **CMO** | Market & brand — consumer sentiment, positioning, campaigns | `web_search`, `web_scrape`, `search_news`, `execute_python` | Medium |
| **CTO** | Technology strategy — infrastructure, automation, code | `execute_python`, `write_and_register_tool`, `web_search` | High |
| **COO** | Operations — supply chain, logistics, vendor management | `query_inventory`, `execute_python`, `gsheets_read`, `web_search` | Medium |
| **CSO** | Strategy — competitive intel, market entry, M&A | `web_search`, `web_scrape`, `search_news`, `execute_python` | Medium |
| **CRO** | Risk — regulatory, FX, scenario analysis | `execute_python`, `query_financial_metrics`, `web_search` | Low |
| **Secretary** | Synthesis — minutes, action items, document generation | `gdrive_write`, `gcal_create_event`, `store_memory` | Medium |

### How directors differ from Karpathy's council members

In Karpathy's system, all council models receive the identical prompt and produce text-only responses. In Hyprnova:

1. **Different subtasks** — Chairman assigns each director a specific aspect of the problem
2. **Different tools** — CFO pulls real spreadsheet data, CTO writes code, CMO scrapes market data
3. **Different memory** — Each director accumulates domain-specific semantic memory
4. **Different autonomy** — CRO always confirms (risk actions are consequential), CTO can write code autonomously

---

## 8. What We Explicitly Do Not Build

Lessons from OpenClaw's mistakes and scope discipline:

| Excluded Feature | Why |
|-----------------|-----|
| **Community skills / skill marketplace** | 341 malicious skills found in ClawHub. No untrusted code execution. MCP protocol only |
| **Inbound WhatsApp** | Attack surface — message injection, spam, uncontrolled input. Baileys is send-only |
| **Writable SOUL.md equivalent** | Anything that can write director prompts can reprogram the agent. Prompts are immutable at runtime |
| **Unsandboxed code execution** | All code in E2B. No host filesystem. No network unless tool enables it |
| **WebSocket control plane** | CVE-2026-25253 — cross-site WebSocket hijacking. SSE is read-only by design |
| **Multi-tenant / public deployment** | Single-tenant, private. Auth whitelist, not registration flow |
| **Custom model fine-tuning** | Out of scope. Use model routing via OpenRouter instead |
| **Voice input** | Out of scope for initial build. Text-first, voice summary output only (ElevenLabs TTS) |

---

## 9. Layer Map — How It All Fits

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3 — AGENT SWARM ORCHESTRATION                        │
│  Chairman decomposes → parallel sub-agents → peer review    │
│  Source: Karpathy 3-stage + Chairman decomposition          │
│  Files: agent/orchestrator.ts, agent/council.ts             │
├─────────────────────────────────────────────────────────────┤
│  LAYER 2 — LLM COUNCIL (Karpathy 3-stage, evolved)         │
│  7 directors + secretary: Independent → Review → Synthesis  │
│  Each director is a full agent with own loop + tools        │
│  Source: Karpathy anonymized ranking + OpenClaw agent loop  │
│  Files: agent/directors/*.ts                                │
├─────────────────────────────────────────────────────────────┤
│  LAYER 1 — OPENCLAW AGENT CORE (hardened)                   │
│  Agentic loop: goal → tools → results → loop (max 15)      │
│  3-tier memory injection, MCP integrations, E2B execution   │
│  Source: OpenClaw loop pattern, fixed security model        │
│  Files: agent/loop.ts, agent/memory/*.ts, agent/tools/*.ts  │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Decision Log

Key architectural decisions made in this analysis, with rationale:

| Decision | Rationale |
|----------|-----------|
| SSE over WebSocket | WebSocket is bidirectional — attack surface. SSE is read-only, sufficient for streaming agent output. Aligns with Next.js App Router patterns |
| PostgreSQL over JSON files | Karpathy uses JSON on disk — fine for weekend hack, not for queryable memory or audit logs. Drizzle ORM gives type safety |
| Director prompts in DB, not filesystem | OpenClaw's SOUL.md is writable by any process with file access. DB-stored prompts are gated by application logic + auth |
| E2B over local Docker | OpenClaw runs code unsandboxed. E2B provides true isolation — no host access, no persistence between executions |
| BullMQ over in-process scheduling | Agent sessions can run 30+ seconds. Job queue provides reliability, retries, and serialized execution per session |
| OpenRouter over direct API calls | Cost control — route Quick mode to free Gemini, Council to Haiku, Board to Sonnet. Single integration point |
| Anonymized review kept verbatim | Karpathy's insight is correct — models show self-preference bias. Anonymization is cheap and effective |
| Secretary as separate role | Karpathy's chairman both adjudicates and synthesizes. Separation ensures synthesis captures all perspectives, not just the chairman's |

---

*This document is the foundation for all implementation sessions. No application code exists yet. Build proceeds from Session 1.*
