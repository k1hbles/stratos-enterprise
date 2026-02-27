# HYPRNOVA ENTERPRISE
## Master Build Prompt — Agent-First, Battle-Ready
### Feb 25, 2026

---

## WHAT THIS IS

Hyprnova is not an LLM interface. It is an **autonomous agent system** — a board of directors that acts.

The distinction: an LLM answers questions. An agent **executes goals**. Given "analyze our Q3 margin compression and draft a response strategy", Hyprnova does not return text. It:

1. Searches live web for competitor pricing and market conditions
2. Pulls the actual P&L from Google Sheets
3. Runs a Python financial model in a sandbox to quantify the gap
4. Has the CFO and CSO debate the findings
5. Drafts a strategy document in Google Drive
6. Schedules a calendar event for the review meeting
7. Pushes a summary to WhatsApp
8. Logs the decision and queues a follow-up mission for next week

All of this from one instruction. That is the target.

**Self-improving:** The board can write, test, and deploy new capabilities onto its own VM. Like OpenClaw creating features from a voice message — the board identifies a gap in its own tooling, writes the code in a sandbox, validates it, and registers it as a new tool. Secured, sandboxed, proprietary.

**Autonomy model:**
- Default: confirmation required before any write action (send email, create doc, deploy code)
- Council/Board modes: fully autonomous, no confirmation
- Configurable per-action in Settings
- All data encrypted at rest (AES-256) and in transit (TLS 1.3)

---

## READ FIRST

1. Read `github.com/steipete/openclaw` — architecture: agentic tool loop, memory, skills, heartbeat
2. Understand what makes it an agent, not an LLM: the loop runs until the goal is achieved, not until a response is generated
3. Understand OpenClaw's weaknesses Hyprnova must not repeat:
   - 42K+ instances exposed publicly (no auth)
   - 341 malicious community skills (untrusted code execution)
   - $500–5K/mo token costs (no model routing)
   - Users clone it but never read it (black box)
4. Hyprnova's answers: auth-gated web UI, MCP only (no community skills), OpenRouter model routing, built from scratch

---

## ARCHITECTURE — THREE LAYERS

```
┌─────────────────────────────────────────────────────┐
│  LAYER 3 — AGENT SWARM ORCHESTRATION                │
│  Chairman decomposes goal → parallel sub-agents     │
│  PARL-style: concurrent execution, merged output    │
├─────────────────────────────────────────────────────┤
│  LAYER 2 — LLM COUNCIL (Karpathy 3-stage)           │
│  7 directors: Independent → Peer Review → Synthesis │
│  Each director is a full agent with tool access     │
├─────────────────────────────────────────────────────┤
│  LAYER 1 — OPENCLAW AGENT CORE                      │
│  Agentic loop: goal → tools → results → loop        │
│  Memory, MCP integrations, VM execution, heartbeat  │
└─────────────────────────────────────────────────────┘
```

The key: **every director is a full agent**. Not a prompt variant — an agent with its own tool loop, memory, and execution context. The CFO doesn't just write about financials, it pulls the actual data, runs the model, and produces verified outputs.

---

## TECH STACK (LOCKED — DO NOT DEVIATE)

### Runtime & Language
```
typescript (strict)       Throughout — frontend and backend
node.js 20+               Runtime
tsx                       TypeScript runner for agent process
```

### Frontend
```
next.js 15                App Router, React Server Components
tailwindcss               Styling
inter + geist mono        Fonts
```

### Agent & LLM
```
@anthropic-ai/sdk         Claude — primary for council sessions
openai                    Whisper STT, embeddings
ai (Vercel AI SDK)        Streaming, tool use, multi-step agentic loops
openrouter                Multi-model routing (Gemini free → Claude Haiku → Sonnet)
@modelcontextprotocol/sdk MCP client — all external integrations
```

### VM & Code Execution
```
e2b                       Sandboxed Python execution (financial models, data analysis)
                          Each execution isolated, no host access
                          Board writes code → E2B runs it → result returned
                          Self-improvement: board writes new tools → validated in E2B → registered
```

### Database
```
postgresql                Primary (Supabase or Cloud SQL)
pgvector                  Vector embeddings for semantic memory
drizzle-orm               Type-safe ORM
drizzle-kit               Migrations
```

### Job Queue & Scheduling
```
bullmq                    Job queue for long-running agent sessions
ioredis                   Redis for BullMQ (Upstash serverless)
node-cron                 Mission scheduler, proactive heartbeat
```

### Document Processing
```
mammoth                   Word (.docx) → text
xlsx (SheetJS)            Excel → structured data + analysis
pdf-parse                 PDF → text
sharp                     Image processing for uploaded screenshots
```

### Encryption & Security
```
node:crypto               AES-256-GCM for data at rest
tls 1.3                   In transit (Cloud Run handles)
bcrypt                    Password hashing
jose                      JWT tokens
```

### Communication
```
@whiskeysockets/baileys   WhatsApp outbound-only (summaries pushed, never receives)
elevenlabs                TTS voice summaries (Session 7)
```

### Infrastructure
```
google cloud run          Deployment — persistent SSE, scales to zero
supabase                  Postgres + pgvector + auth
upstash redis             Serverless Redis for BullMQ
docker                    Local dev environment
```

---

## AGENT CORE — THE LOOP

This is not optional architecture detail. This is the foundation everything else runs on.

```typescript
// agent/loop.ts
interface AgentContext {
  goal: string
  directorId: string
  tools: Tool[]
  memory: MemoryContext
  autonomyLevel: 'confirm' | 'autonomous'
  sessionId: string
}

interface AgentResult {
  output: string
  toolCallsExecuted: ToolCall[]
  factsExtracted: string[]
  actionsRequiringConfirmation: PendingAction[]
  iterationsUsed: number
}

async function agentLoop(ctx: AgentContext): Promise<AgentResult> {
  const MAX_ITERATIONS = 15  // hard limit — non-negotiable
  let iterations = 0
  const messages: Message[] = []
  const pendingActions: PendingAction[] = []

  // Inject 3-tier memory into system prompt
  const systemPrompt = buildSystemPrompt(ctx.directorId, ctx.memory)
  
  while (iterations < MAX_ITERATIONS) {
    iterations++
    
    const response = await llm.generate({
      system: systemPrompt,
      messages,
      tools: ctx.tools,
      stream: true  // always stream
    })
    
    // Pure response — done
    if (response.type === 'text') {
      const facts = await extractFacts(response.text, ctx.sessionId)
      return { output: response.text, factsExtracted: facts, 
               actionsRequiringConfirmation: pendingActions, 
               iterationsUsed: iterations, toolCallsExecuted: [] }
    }
    
    // Tool call — execute or queue for confirmation
    if (response.type === 'tool_call') {
      const tool = ctx.tools.find(t => t.name === response.toolName)
      
      // Write actions require confirmation unless autonomous mode
      if (tool.isWriteAction && ctx.autonomyLevel === 'confirm') {
        pendingActions.push({ tool, args: response.args })
        messages.push({ role: 'tool', content: 'Action queued for user confirmation.' })
        continue
      }
      
      // Execute tool
      const result = await tool.execute(response.args)
      
      // Encrypt sensitive results before storing
      const storedResult = tool.handlesSensitiveData 
        ? await encrypt(result) 
        : result
      
      await auditLog(ctx.sessionId, ctx.directorId, tool.name, response.args)
      messages.push({ role: 'tool', content: result })
    }
  }
  
  // Hit iteration limit — return what we have
  return { output: 'Max iterations reached.', iterationsUsed: MAX_ITERATIONS, ... }
}
```

---

## TOOLS — WHAT THE AGENT CAN DO

Every tool has: `name`, `description`, `execute()`, `isWriteAction`, `handlesSensitiveData`, `requiresConfirmation`.

### Tier 1 — Always Available
```typescript
get_current_time()              // baseline, always present
query_memory(query: string)     // semantic search over pgvector
store_memory(fact: string)      // write fact to semantic memory
get_orchestration_status()      // check what other directors are doing
```

### Tier 2 — Research & Analysis
```typescript
web_search(query: string)               // Brave/Tavily — live web
web_scrape(url: string)                 // full page content
get_market_data(ticker: string)         // financial data
search_news(query: string, days: int)   // news monitoring
read_uploaded_file(fileId: string)      // PDF, Excel, Word from DB
```

### Tier 3 — Code Execution (E2B sandbox)
```typescript
execute_python(code: string): {
  // Runs in isolated E2B sandbox
  // Can do: pandas, numpy, matplotlib, financial calcs
  // Cannot do: network calls (unless explicitly allowed), file system access
  // Returns: stdout, stderr, generated files (charts, CSVs)
  stdout: string
  files: GeneratedFile[]  // charts returned as base64
}

write_and_register_tool(
  name: string,
  description: string, 
  code: string
): {
  // Self-improvement: board writes a new tool
  // Validated in E2B sandbox first
  // If tests pass: registered as available tool for future sessions
  // Requires confirmation regardless of autonomy mode — deploying new capabilities always confirms
  toolId: string
  testResults: TestResult[]
}
```

### Tier 4 — Google Workspace (MCP)
```typescript
// All via @modelcontextprotocol/server-gdrive + server-gmail + server-gcal
gdrive_read(fileId: string)                         // READ
gdrive_write(title: string, content: string)        // WRITE — confirm
gdrive_search(query: string)                        // READ
gsheets_read(spreadsheetId: string, range: string)  // READ
gsheets_write(spreadsheetId, range, values)         // WRITE — confirm
gmail_read(query: string, limit: int)               // READ
gmail_draft(to, subject, body)                      // WRITE — confirm
gmail_send(draftId: string)                         // WRITE — confirm + extra confirm
gcal_read(timeMin, timeMax)                         // READ
gcal_create_event(title, time, attendees)           // WRITE — confirm
```

### Tier 5 — Internal Database
```typescript
query_sales_data(filters: SalesFilter)          // READ
query_inventory(productId?: string)             // READ
query_financial_metrics(period: string)         // READ
// Write operations require explicit unlock in Settings
```

### Tier 6 — Communication (outbound only)
```typescript
whatsapp_send(phone: string, message: string)   // WRITE — confirm
// WhatsApp NEVER receives. Baileys client is send-only.
// Incoming messages: ignored at the library level, not just application level
```

### Tier 7 — Self-Improvement (VM)
```typescript
write_and_register_tool(...)    // See Tier 3 above
update_director_prompt(         // Improve a director's system prompt
  directorId: string, 
  proposedChanges: string,
  reasoning: string
)                               // Always confirms, logs to audit
run_eval(toolId: string)        // Run test suite against a tool
```

---

## DIRECTOR AGENTS

Each director is an independent agent running the same loop with different:
- System prompt (role, analytical lens, communication style)
- Tool access (CFO gets financial tools, CTO gets code execution priority)
- Memory scope (director_id-scoped semantic memory)

```typescript
const DIRECTORS = {
  chairman: {
    role: 'Chief Orchestrator',
    focus: 'Decompose goals, coordinate directors, final judgment, synthesis',
    tools: ['all'],  // Chairman has full tool access
    autonomy: 'high',
    personality: 'Decisive, sees the full picture, manages conflict between directors'
  },
  cfo: {
    role: 'Chief Financial Officer', 
    focus: 'P&L, margins, cash flow, financial modeling, investment analysis',
    tools: ['web_search', 'execute_python', 'gsheets_read', 'query_financial_metrics'],
    autonomy: 'medium',
    personality: 'Precise, data-driven, skeptical of projections without evidence'
  },
  cmo: {
    role: 'Chief Marketing Officer',
    focus: 'Brand, consumer sentiment, market positioning, campaign analysis',
    tools: ['web_search', 'web_scrape', 'search_news', 'execute_python'],
    autonomy: 'medium',
    personality: 'Consumer-obsessed, challenges assumptions about market position'
  },
  cto: {
    role: 'Chief Technology Officer',
    focus: 'Technology strategy, digital infrastructure, data systems, automation',
    tools: ['execute_python', 'write_and_register_tool', 'web_search'],
    autonomy: 'high',  // CTO can write code autonomously
    personality: 'Systems thinker, identifies automation opportunities others miss'
  },
  coo: {
    role: 'Chief Operating Officer',
    focus: 'Supply chain, logistics, operations efficiency, vendor management',
    tools: ['web_search', 'query_inventory', 'execute_python', 'gsheets_read'],
    autonomy: 'medium',
    personality: 'Execution-focused, spots operational bottlenecks, pragmatic'
  },
  cso: {
    role: 'Chief Strategy Officer',
    focus: 'Competitive intelligence, market entry, strategic positioning, M&A',
    tools: ['web_search', 'web_scrape', 'search_news', 'execute_python'],
    autonomy: 'medium',
    personality: 'Long-horizon thinker, challenges short-term thinking'
  },
  cro: {
    role: 'Chief Risk Officer',
    focus: 'Risk assessment, regulatory compliance, FX exposure, scenario analysis',
    tools: ['web_search', 'execute_python', 'query_financial_metrics'],
    autonomy: 'low',   // CRO always confirms — risk actions are consequential
    personality: 'Devil\'s advocate by design, stress-tests every proposal'
  },
  secretary: {
    role: 'Board Secretary',
    focus: 'Minutes, synthesis, action items, decisions, follow-up scheduling',
    tools: ['gdrive_write', 'gcal_create_event', 'store_memory'],
    autonomy: 'medium',
    personality: 'Precise, captures nuance, ensures nothing is lost'
  }
}
```

---

## SWARM ORCHESTRATION

```
USER GOAL: "Analyze Q3 margin compression and prepare board response"

STEP 1 — CHAIRMAN DECOMPOSES (1-2s)
  Produces orchestration plan:
  {
    parallel_tasks: [
      { director: 'cfo',   subtask: 'Pull Q3 P&L, model margin drivers, run Python analysis' },
      { director: 'cso',   subtask: 'Research competitor pricing changes, market conditions' },
      { director: 'coo',   subtask: 'Identify supply chain cost increases, vendor pricing' },
      { director: 'cro',   subtask: 'Assess FX impact, raw material price risk' },
    ],
    synthesis_instruction: 'Produce board memo with root cause, 3 strategic options, recommended action'
  }

STEP 2 — PARALLEL EXECUTION (all 4 run simultaneously)
  CFO: execute_python(financial_model) → web_search(commodity prices) → gsheets_read(P&L)
  CSO: web_search(competitor pricing) → web_scrape(industry reports) → execute_python(analysis)
  COO: query_inventory(cost data) → execute_python(supply chain model)
  CRO: execute_python(FX scenarios) → web_search(regulatory changes)
  
  All stream results via SSE → Council page updates in real time

STEP 3 — PEER REVIEW (directors cross-reference)
  CFO challenges CSO's revenue assumptions
  CRO stress-tests CFO's projections
  COO validates CRO's supply chain numbers
  Exchanges stored, visible in Council UI

STEP 4 — SYNTHESIS
  Secretary compiles all outputs → structured document
  Chairman makes final calls on conflicts
  Output: Google Drive document created, decision logged, mission scheduled for follow-up
  Secretary: gcal_create_event("Q3 Margin Review") + whatsapp_send(summary to father)
```

---

## MEMORY — 3-TIER

```typescript
// Tier 1: Core Memory — company facts, always injected
// Stored in: memory_core table
// Format: key-value, categorized (company/product/person/market/risk)
// Example: { key: 'company_name', value: 'PT Kie Group', category: 'company' }
// Updated: manually via Settings or when agent extracts a permanent fact

// Tier 2: Conversation Buffer — recent context
// Stored in: memory_buffer table
// Format: compressed summary of last N messages per conversation
// Injected: last 3 conversation summaries into every session

// Tier 3: Semantic Long-term — vector search
// Stored in: memory_semantic table (pgvector, 1536 dimensions)
// Populated: after every council session via fact extraction
// Queried: cosine similarity search before every agent response
// Example stored facts:
//   "Q3 2025: Snacks division gross margin down 2.3pp, driven by palm oil price increase"
//   "Competitor Indofood expanding into QSR, 3 Java locations confirmed Feb 2026"
//   "Father approved pricing adjustment Oct 2025, +4% blended across SKUs"
```

---

## SECURITY — NON-NEGOTIABLE

```
1. Auth gate          Every route behind auth. No public pages except /login.
2. User whitelist     Hardcoded allowed user IDs in .env. Silently reject others.
3. Secrets in .env    Never in code, DB, logs, or memory files. Audited.
4. Max iterations     Agent loop hard-capped at 15. No exceptions. No overrides.
5. MCP only           No custom skill files. No eval(). No dynamic require().
6. Write confirmation Default: all write actions require user confirmation.
                      Overridable per-mode in Settings (Council/Board = autonomous).
7. WhatsApp receive   NEVER. Baileys configured send-only at library level.
8. Sandbox execution  All code runs in E2B. No host filesystem access. No network
                      unless tool explicitly enables it.
9. Encryption at rest AES-256-GCM for: memory_semantic content, uploaded file text,
                      conversation messages, audit log metadata.
10. Audit log         Every tool call, agent action, file access, confirmation bypass
                      logged immutably to audit_log with timestamp + user + IP.
11. Self-improvement  write_and_register_tool ALWAYS requires confirmation regardless
                      of autonomy mode. New tools run full test suite before register.
12. Data never leaves Unless explicitly connected external service. No telemetry.
                      No LLM provider receives data beyond the API call itself.
```

---

## SETTINGS — CONFIGURABLE

```typescript
interface SecuritySettings {
  // Autonomy
  defaultAutonomyLevel: 'confirm' | 'autonomous'
  modeOverrides: {
    quick: 'confirm'
    analyze: 'confirm'
    council: 'autonomous'   // default: confirm, can enable autonomous
    board: 'autonomous'     // default: confirm, can enable autonomous
  }
  
  // Per-action overrides
  actionOverrides: {
    gmail_send: 'always_confirm'       // can't be overridden
    write_and_register_tool: 'always_confirm'  // can't be overridden
    gdrive_write: 'confirm' | 'autonomous'
    whatsapp_send: 'confirm' | 'autonomous'
    gcal_create_event: 'confirm' | 'autonomous'
  }
  
  // Data
  encryptionEnabled: boolean          // default: true, can't be false in prod
  auditLogRetentionDays: number       // default: 90
  memoryRetentionDays: number         // default: 365
  
  // WhatsApp
  whatsappEnabled: boolean
  whatsappPhone: string               // father's number
  whatsappSummaryTriggers: string[]   // which events push to WhatsApp
}
```

---

## DATABASE SCHEMA

```sql
-- Core
users (id, email, name, role, whitelist_id, created_at)
directors (id, slug, name, title, system_prompt, tool_access jsonb, 
           autonomy_level, accent_color, avatar_path, created_at)

-- Conversations & Messages
conversations (id, user_id, title, mode, created_at, updated_at)
messages (id, conversation_id, role, director_id, content_encrypted text,
          tokens_used, created_at)

-- Council Sessions
council_sessions (id, conversation_id, mode, status, orchestration_plan jsonb,
                  phase varchar, started_at, completed_at)
council_tasks (id, session_id, director_id, status, subtask text,
               result_encrypted text, tool_calls jsonb, started_at, completed_at)
council_exchanges (id, session_id, from_director_id, to_director_id,
                   message text, created_at)
council_documents (id, session_id, title, content_markdown_encrypted text,
                   gdrive_url, created_at)

-- Memory
memory_core (id, key varchar unique, value_encrypted text, category varchar, updated_at)
memory_buffer (id, conversation_id, summary_encrypted text, created_at)
memory_semantic (id, content_encrypted text, embedding vector(1536),
                 director_id, session_id, category varchar, created_at)

-- Agent Actions
pending_confirmations (id, session_id, director_id, tool_name, tool_args_encrypted jsonb,
                       status varchar, created_at, resolved_at)
registered_tools (id, name, description, code_encrypted text, created_by_director,
                  test_results jsonb, is_active boolean, created_at)

-- Operations
missions (id, name, cron_expression, mode, prompt, is_active, 
          last_run_at, next_run_at, created_at)
decisions (id, session_id, title, description_encrypted text, status varchar,
           priority varchar, director_id, created_at)
uploaded_files (id, user_id, filename, file_type, extracted_text_encrypted text,
                processed boolean, created_at)
audit_log (id, user_id, director_id, action, tool_name, args_hash varchar,
           session_id, ip_address, created_at)  -- never encrypted — must be readable
whatsapp_queue (id, phone_encrypted varchar, message_encrypted text,
                status varchar, sent_at, created_at)
```

---

## FRONTEND SPEC

### Design System (Kimi-inspired, locked)
```css
--bg: #111111; --s1: #191919; --s2: #1f1f1f; --bd: #282828;
--t1: #e2e2e2; --t2: #787878; --t3: #4a4a4a; --t4: #303030;
--violet: #a78bfa; --emerald: #34d399; --pink: #f472b6; --blue: #60a5fa;
--amber: #fbbf24; --cyan: #22d3ee; --red: #f87171; --zinc: #71717a;
```
No glows. No colored card borders. Full-width rows with right chevron. Kimi pattern throughout.

### Pages
```
/              Home — 50/50: left inbox (decisions/insights/missions), right live VM
/chat          Chat — Nightshift: greeting + input + chips + conversation
/council       Council — Kimi swarm: agent feed (55%) + output doc (45%)
/missions      Mission scheduler
/decisions     Decision log
/audit         Audit log (read-only, immutable display)
/settings      Config + Security + Memory viewer
```

### Home — 50/50
Left: Needs Your Attention (pending confirmations + decisions) + Flagged Insights + Upcoming missions.
Right: Live board status + active task timeline with subtasks + board status grid.
Bottom bar: hidden when idle, "● Board in Session · N tasks" when active → links to /council.

### Chat
Greeting "Good morning/afternoon/evening, Hanz." Time-aware.
Quick chips: Morning Briefing · P&L Review · Competitive Scan · Risk Assessment · Board Session.
Mode selector: Quick ⚡ · Analyze 📊 · Council 🏛 (~$0.08) · Board 👔 (~$0.10).
**Confirmation modal**: when agent queues a write action, shows inline in chat:
```
┌─────────────────────────────────────────┐
│ ⚠ The CFO wants to:                    │
│ Send email to procurement@company.com   │
│ Subject: "Urgent: Palm oil pricing..."  │
│                                         │
│  [View draft]    [Approve]  [Reject]   │
└─────────────────────────────────────────┘
```

### Council
Agent feed shows tool calls in real time:
```
[CF] The CFO  ──────────────────  ● Running  ›
  └─ 🔍 Searching "palm oil futures 2026"
  └─ 🐍 Running financial model...
  └─ 📊 Reading Q3 P&L spreadsheet
```
Each tool call is a visible row — user can see exactly what the agent is doing.

---

## FOLDER STRUCTURE

```
hyprnova/
├── app/                           # Next.js App Router
│   ├── (auth)/login/
│   ├── (app)/
│   │   ├── page.tsx               # Home 50/50
│   │   ├── chat/page.tsx
│   │   ├── council/page.tsx
│   │   ├── missions/page.tsx
│   │   ├── decisions/page.tsx
│   │   ├── audit/page.tsx
│   │   └── settings/page.tsx
│   └── api/
│       ├── chat/route.ts          # SSE streaming
│       ├── council/
│       │   ├── start/route.ts
│       │   └── stream/route.ts    # SSE — director updates
│       ├── orchestration/
│       │   └── status/route.ts    # Polled every 5s
│       ├── confirmations/
│       │   ├── route.ts           # GET pending
│       │   └── [id]/route.ts      # POST approve/reject
│       ├── missions/route.ts
│       ├── decisions/route.ts
│       ├── files/route.ts
│       └── memory/route.ts
│
├── agent/                         # OpenClaw core — agent process
│   ├── loop.ts                    # THE loop — max 15 iterations, hard stop
│   ├── orchestrator.ts            # Chairman PARL decomposition
│   ├── council.ts                 # Karpathy 3-stage protocol
│   ├── directors/
│   │   ├── base.ts                # Base director agent class
│   │   ├── chairman.ts
│   │   ├── cfo.ts
│   │   ├── cmo.ts
│   │   ├── cto.ts
│   │   ├── coo.ts
│   │   ├── cso.ts
│   │   ├── cro.ts
│   │   └── secretary.ts
│   ├── tools/
│   │   ├── registry.ts            # Tool registration + validation
│   │   ├── tier1/                 # Always available
│   │   ├── tier2/                 # Research
│   │   ├── tier3/                 # E2B code execution
│   │   ├── tier4/                 # Google Workspace (MCP)
│   │   ├── tier5/                 # Internal DB
│   │   ├── tier6/                 # Communication
│   │   └── tier7/                 # Self-improvement
│   ├── memory/
│   │   ├── core.ts
│   │   ├── buffer.ts
│   │   └── semantic.ts            # pgvector operations
│   ├── mcp/
│   │   ├── client.ts
│   │   └── mcp.config.ts
│   └── security/
│       ├── encryption.ts          # AES-256-GCM
│       ├── audit.ts               # Immutable audit logging
│       └── confirmation.ts        # Write action gating
│
├── db/
│   ├── schema.ts                  # Full schema above
│   ├── migrations/
│   └── index.ts
│
├── jobs/
│   ├── queue.ts                   # BullMQ
│   ├── workers/
│   │   ├── council-worker.ts
│   │   └── mission-worker.ts
│   └── scheduler.ts               # node-cron heartbeat
│
├── lib/
│   ├── auth.ts
│   ├── llm.ts                     # OpenRouter + model routing
│   ├── whatsapp.ts                # Outbound-only Baileys wrapper
│   └── parsers/                   # mammoth, SheetJS, pdf-parse
│
├── components/                    # Frontend — see frontend spec
│
├── .env.example                   # All keys documented, no defaults
├── docker-compose.yml             # Postgres + Redis local
└── package.json
```

---

## BUILD ORDER — FINISH TODAY

### Phase 1 — Foundation (do this first, ~1 hour)
```
1. Scaffold full folder structure
2. Next.js 15 + TypeScript strict + Tailwind + design system tokens
3. PostgreSQL + Drizzle + full schema migration
4. Supabase Auth (or NextAuth) — whitelist enforced
5. OpenClaw loop (agent/loop.ts) — one tool: get_current_time, max 15 iterations
6. /api/chat SSE endpoint wired to loop
7. Minimal chat UI — input bar + message list
8. E2E test: message → loop → tool → response → displayed
```

### Phase 2 — Agent Tools (parallel with Phase 3)
```
1. Web search tool (Brave/Tavily)
2. E2B Python sandbox tool
3. File upload + parsing (PDF, Excel, Word)
4. Google Workspace MCP (read only first)
5. Internal DB query tools
6. Memory tools (query + store)
```

### Phase 3 — Council + Swarm (~2 hours)
```
1. Director agent instances (all 7 + secretary)
2. Chairman orchestrator — goal decomposition
3. Parallel execution engine — Promise.all with SSE streaming
4. Peer review protocol
5. Secretary synthesis + document generation
6. Council SSE endpoint + frontend wired
```

### Phase 4 — Memory
```
1. Core memory — inject into every prompt
2. Conversation buffer — compress + inject
3. Semantic memory — embed after sessions, query before
4. Memory viewer in Settings
```

### Phase 5 — Security + Confirmation Flow
```
1. Encryption layer on sensitive DB columns
2. Confirmation modal in chat UI
3. pending_confirmations table + approve/reject API
4. Audit log wired to every tool call
5. Settings security panel
```

### Phase 6 — Missions + WhatsApp + Deploy
```
1. Mission scheduler (node-cron + BullMQ)
2. WhatsApp outbound push (Baileys, send-only)
3. Google Cloud Run deployment
4. Redis (Upstash) for job queue
5. Environment + secrets management
```

---

## COST MODEL

| Mode | Model | Per session | Use case |
|------|-------|-------------|---------|
| Quick ⚡ | Gemini Flash | Free | Fast Q&A |
| Analyze 📊 | Gemini Pro | Free | Single-agent deep analysis |
| Council 🏛 | Claude Haiku ×3 | ~$0.08 | Multi-director debate |
| Board 👔 | Claude Sonnet ×7 | ~$0.10 | Full board + all tools |

All routed via OpenRouter. Monthly at moderate usage: $5–10.

---

*Hyprnova Master Build Prompt — Feb 25, 2026*
*This is an agent system. It acts. It executes. It improves itself.*
*Build the loop first. Everything else is tools on top of the loop.*
