# Hyprnova — Design System v2
## Nightshift base + Kimi layout precision. Lock this before touching the frontend.

---

## What Changed from v1 (and Why)

The original Nightshift design system had the right philosophy — dark, minimal, premium.
These updates bring specific components into exact alignment with Kimi's actual implementation,
which is the reference UI for this project.

| What | v1 | v2 | v2.1 (from homepage screenshot) |
|------|----|----|---|
| User bubble | unspecified | near-white `bg-white/[0.92]`, `rounded-br-sm`, no avatar | ✓ confirmed |
| AI response | unspecified | no bubble, bare text on background, 28px circle avatar left | ✓ confirmed |
| Step card spec | "subtle inline rows" | exact 36px height, icon + label + chevron, border, sub-item indent | ✓ confirmed |
| "Task completed" bar | missing | dark pill h-11, icon left, expand button right | ✓ confirmed |
| Nav badges | missing | blue + grey pill variants | ✓ confirmed |
| Input bar layout | "auto-resize + paperclip + send" | two-row: textarea + action row | ✓ confirmed |
| Send button | unspecified | white 32px circle, `ArrowUp` icon | ✓ confirmed |
| **Greeting weight** | `font-light (300)` | `font-light (300)` | **CORRECTED: `font-bold` or `font-extrabold` (800–900)** — homepage screenshot shows heavy weight |
| **Greeting size** | 32–36px | 32–36px | **CORRECTED: ~64–72px (`text-6xl` or `text-7xl`)** — dominates the viewport |
| **Mode chip label** | unspecified | "Layers / Council" | **CORRECTED: "⚡ Auto ˅"** — lightning bolt icon + "Auto" + dropdown chevron |
| **Quick action chips** | 5 generic chips | 5 generic chips | **CORRECTED: match your actual pages** — Council, Research, Intelligence, Analyze, Missions |
| **Sidebar pages** | Council, Intelligence… | Council, Intelligence… | **CORRECTED: Home, Chat, Intelligence, Actions, Automations, Audit, Integrations, Settings** |
| **History section** | expanded list | expanded list | **CORRECTED: collapsed by default, ">" expand arrow** |
| `text-secondary` opacity | `white/65` | `white/55` | ✓ confirmed |
| AI body text | dimmed | full `text-white` | ✓ confirmed |
| Nav item height | 38–40px | 36px fixed (h-9) | ✓ confirmed |

Everything in the original colour palette, card system, glassmorphism, button
styles, spacing philosophy, and status indicators is kept as-is.

---

## Guiding Principles

1. **Black is the canvas.** `#0a0a0a` everywhere. Depth comes from layered transparent
   whites, not colour variation.
2. **Text does the work.** Structure through size, weight, opacity, spacing — not boxes.
3. **Actions are inline.** Tool calls and agent steps are 36px rows. Not modals.
4. **The right panel is the output.** Documents, spreadsheets, council reports open
   there — not new tabs, not modals.
5. **Low density is a feature.** Premium tools breathe.

---

## Colour Tokens

```css
/* ── Backgrounds ── */
--bg-base:          #0a0a0a;                    /* page — true near-black */
--bg-surface:       #111111;                    /* elevated cards, input */
--bg-hover:         rgba(255, 255, 255, 0.04);
--bg-active:        rgba(255, 255, 255, 0.06);
--bg-selected:      rgba(255, 255, 255, 0.08);

/* ── Text ── */
--text-primary:     #ffffff;                    /* headings, AI body, active nav */
--text-secondary:   rgba(255, 255, 255, 0.55);  /* sidebar inactive items */
--text-tertiary:    rgba(255, 255, 255, 0.30);  /* section labels, metadata */
--text-placeholder: rgba(255, 255, 255, 0.25);  /* input placeholder */
--text-disabled:    rgba(255, 255, 255, 0.18);

/* ── Borders ── */
--border:           rgba(255, 255, 255, 0.06);
--border-hover:     rgba(255, 255, 255, 0.10);
--border-focus:     rgba(255, 255, 255, 0.16);

/* ── Accent ── */
--accent:           #3b82f6;
--accent-dim:       rgba(59, 130, 246, 0.15);

/* ── Status ── */
--status-running:   #22c55e;
--status-complete:  #10b981;
--status-pending:   rgba(255, 255, 255, 0.30);
--status-failed:    #ef4444;

/* ── Chat bubbles ── */
--bubble-user-bg:   rgba(255, 255, 255, 0.92);  /* near-white */
--bubble-user-text: #0a0a0a;                    /* dark text on light bubble */
```

---

## Typography

**Font:** Inter. Fallback: system-ui, -apple-system, sans-serif.

```
Role                    Size         Weight              Colour          Notes
────────────────────────────────────────────────────────────────────────────────────
Greeting / hero         64–72px      800–900 extrabold   text-white      centered, dominates viewport
                        (text-6xl    (font-extrabold)                    "Good evening." weight is HEAVY
                        or text-7xl)                                     NOT font-light — confirmed from screenshot
Chat title bar          14px         500 medium          text-white
Section heading         15px         500 medium          text-white
AI response body        14px         400 normal          text-white      leading-relaxed — never dim
Step card label         13px         400 normal          text-white/70
Step sub-item           12px         400 normal          text-white/40
Sidebar nav (inactive)  13px         400 normal          text-white/55
Sidebar nav (active)    13px         400 normal          text-white
History item            13px         400 normal          text-white/55   truncate
Section label           10px         500 medium          text-white/30   uppercase tracking-widest
Badge text              11px         500 medium          —               see badge spec
Metadata / timestamp    11–12px      400 normal          text-white/30
Input placeholder       14px         400 normal          text-white/25
```

---

## Spacing

```
Page horizontal padding    px-8       32px
Page vertical padding      pt-8       32px
Section gap                gap-6      24px
Card internal padding      p-4        16px
Step card height           h-9        36px    fixed
Step sub-item height       h-8        32px    fixed
Nav item height            h-9        36px    fixed
Input textarea             min-h-[52px], max-h-[200px], auto-expands
Input action row           h-11       44px    fixed
Sidebar width              w-60       240px
Chat max-width             max-w-[680px] centered in main panel
Right panel width          min-w-[480px], grows to ~45vw
```

---

## Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  Sidebar 240px fixed  │  Main panel (flex-1)     │  Right panel      │
│  bg-[#0a0a0a]         │  bg-[#0a0a0a]            │  slides in        │
│  no visible border    │  max-w-[680px] mx-auto   │  bg-[#0d0d0d]     │
│                       │  sticky bottom input      │  own header + tabs│
└──────────────────────────────────────────────────────────────────────┘
```

**Sidebar:** Fixed `w-60`. Same background as page. No dividing line.
Collapses to `w-16` icon strip when toggled.

**Main panel:** `flex-1 min-w-0`. Content in `max-w-[680px] mx-auto`. Input `sticky bottom-0`.

**Right panel:** Opens when output is produced. Slides in from right (`animation: slideIn 180ms`).
Main panel shrinks to accommodate — panel never overlaps content.

---

## Sidebar

**Confirmed from homepage screenshot. Do not change this structure.**

```
┌──────────────────────────┐
│ [✦]           [⊞ toggle] │  h-14 px-4 — sparkle logo only. No wordmark beside it.
├──────────────────────────┤
│ 🔍 Search         ⌘K    │  h-9 mx-3 — pill border input, NOT a nav item
├──────────────────────────┤
│ ○ Home                   │
│ ○ Chat                   │
│ ○ Intelligence           │  h-9 px-3 rounded-lg — standard nav items
│ ○ Actions                │
│ ○ Automations            │
│ ○ Audit                  │
│ ○ Integrations           │
├──────────────────────────┤
│  HISTORY           >     │  Collapsible. Default: CLOSED. ">" chevron rotates on open.
│  (chat history here      │  Section label + right chevron. Expands inline.
│   when open)             │
├──────────────────────────┤
│ ○ Settings               │  Pinned above user row — not in main nav group
├──────────────────────────┤
│ [U] User           ˅     │  h-14 px-4 — coloured circle initial + name + dropdown
└──────────────────────────┘
```

**Search row** — pill-shaped input, visually distinct from nav items:
```tsx
<div className="mx-3 my-1">
  <div className="flex items-center gap-2 h-9 px-3 rounded-lg
                  border border-white/[0.06] text-[13px] text-white/30
                  cursor-pointer hover:border-white/[0.10] hover:text-white/45
                  transition-colors">
    <Search size={13} className="flex-shrink-0" />
    <span className="flex-1">Search</span>
    <span className="text-[11px] text-white/20">⌘K</span>
  </div>
</div>
```

**History section** — collapsible, default closed:
```tsx
<button
  onClick={() => setHistoryOpen(!open)}
  className="flex items-center justify-between w-full px-3 py-1.5
             text-[10px] font-medium uppercase tracking-widest text-white/30
             hover:text-white/45 transition-colors">
  <span>History</span>
  <ChevronRight size={12} className={cn("transition-transform duration-150",
    open ? "rotate-90" : "rotate-0")} />
</button>
{open && (
  <div className="space-y-0.5 px-1.5 pb-1">
    {conversations.map(c => <HistoryItem key={c.id} conversation={c} />)}
  </div>
)}
```

**Nav item:**
```tsx
className="flex items-center gap-3 h-9 px-3 rounded-lg text-[13px]
           text-white/55 hover:text-white hover:bg-white/[0.04]
           transition-colors cursor-pointer
           data-[active=true]:text-white data-[active=true]:bg-white/[0.06]"
```

**Badges (right side of nav item):**
```tsx
// Blue — "Pro", "Live", "Active"
"ml-auto text-[11px] font-medium px-1.5 py-0.5 rounded
 bg-blue-500/15 text-blue-400"

// Grey — "Beta", "Soon", "New"
"ml-auto text-[11px] font-medium px-1.5 py-0.5 rounded
 bg-white/[0.06] text-white/40"
```

**Section label:**
```tsx
"px-3 pt-5 pb-1 text-[10px] font-medium uppercase tracking-widest text-white/30"
```

**History item:**
```tsx
"flex items-center h-8 px-3 rounded-lg text-[13px] text-white/55
 truncate cursor-pointer hover:text-white/75 hover:bg-white/[0.04] transition-colors"
```

---

---

## Homepage

**This is the landing page — confirmed from screenshot. Structure is fixed.**

The homepage uses a vertically centered layout with the greeting at the top half
and the input + quick action chips below it. There is no chat history or content
below the chips — it is deliberately sparse.

```tsx
// src/app/page.tsx — homepage layout
export default function HomePage() {
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning.' :
    hour < 17 ? 'Good afternoon.' :
    'Good evening.'

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-8 pb-24">

      {/* Greeting — BOLD, LARGE. Not light weight. */}
      <h1 className="text-[68px] font-extrabold text-white mb-10 tracking-tight">
        {greeting}
      </h1>

      {/* Input box — centered, ~640px wide */}
      <div className="w-full max-w-[640px]">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02]
                        focus-within:border-white/[0.16] transition-colors mb-4">
          <textarea
            className="w-full bg-transparent px-4 pt-4 pb-2 resize-none outline-none
                       text-[14px] text-white placeholder:text-white/25 leading-relaxed
                       min-h-[56px] max-h-[200px]"
            placeholder="What do you want to know?"
          />
          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            <button className="p-1.5 rounded-lg text-white/30
                               hover:text-white/55 hover:bg-white/[0.04] transition-colors">
              <Plus size={16} />
            </button>
            <div className="flex items-center gap-2">
              {/* ⚡ Auto mode chip */}
              <button className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg
                                 border border-white/[0.08] text-[12px] text-white/45
                                 hover:border-white/[0.14] hover:text-white/65
                                 hover:bg-white/[0.03] transition-colors">
                <Zap size={12} />
                <span>Auto</span>
                <ChevronDown size={10} className="text-white/25" />
              </button>
              {/* Send — white circle */}
              <button className="w-8 h-8 rounded-full bg-white flex items-center
                                 justify-center hover:bg-white/90 transition-colors">
                <ArrowUp size={15} className="text-[#0a0a0a]" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick action chips — row below input */}
        <div className="flex items-center gap-2 flex-wrap">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.id}
              onClick={() => router.push(action.href)}
              className="flex items-center gap-2 h-9 px-4 rounded-full
                         border border-white/[0.08] text-[13px] text-white/55
                         hover:border-white/[0.14] hover:text-white/80 hover:bg-white/[0.03]
                         transition-colors">
              <action.icon size={14} className="text-white/35" />
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Quick actions — match your actual pages
const QUICK_ACTIONS = [
  { id: 'chat',           label: 'Chat',           href: '/chat',          icon: MessageSquare },
  { id: 'intelligence',   label: 'Intelligence',   href: '/intelligence',  icon: Globe },
  { id: 'actions',        label: 'Actions',        href: '/actions',       icon: Zap },
  { id: 'automations',    label: 'Automations',    href: '/automations',   icon: RotateCcw },
  { id: 'audit',          label: 'Audit',          href: '/audit',         icon: ScrollText },
]
```

**Critical details:**
- Greeting is `font-extrabold` (~800–900 weight), `text-[68px]` — heavy, dominant
- "Good evening." includes the period — it is part of the greeting text
- Input placeholder: "What do you want to know?" (not "Message Hyprnova")
- Mode chip: `<Zap>` icon + "Auto" + `<ChevronDown>` — not "Council"
- Quick actions link to real pages — not just decorative chips
- No content below the chips on the homepage — deliberately empty

---

## Chat Interface

### Chat title bar
```tsx
<div className="flex items-center justify-between h-[52px] px-4
                border-b border-white/[0.06] flex-shrink-0">
  <div className="w-8" />  {/* balance spacer */}
  <button className="flex items-center gap-1.5 text-[14px] font-medium
                     text-white hover:text-white/75 transition-colors">
    {conversationTitle}
    <ChevronDown size={14} className="text-white/35" />
  </button>
  <button className="p-1.5 rounded-lg text-white/35 hover:text-white/60
                     hover:bg-white/[0.04] transition-colors">
    <Share2 size={15} />
  </button>
</div>
```

### User message bubble
```tsx
<div className="flex justify-end mb-6">
  <div className="max-w-[85%] px-4 py-3 text-[14px] leading-relaxed
                  bg-white/[0.92] text-[#0a0a0a]
                  rounded-2xl rounded-br-sm">
    {content}
  </div>
</div>
```
- `bg-white/[0.92]` — near-white on dark background
- `rounded-br-sm` — Kimi's exact tail: flattened bottom-right corner
- No avatar. Max width 85%.

### AI response (no bubble)
```tsx
<div className="flex gap-3 mb-6">
  <div className="w-7 h-7 rounded-full bg-white/[0.08] border border-white/[0.06]
                  flex items-center justify-center flex-shrink-0 mt-0.5">
    <HyprnovaIcon size={14} />
  </div>
  <div className="flex-1 min-w-0">
    <p className="text-[14px] text-white leading-relaxed">{bodyText}</p>
    {stepCards.length > 0 && (
      <div className="mt-2 space-y-0.5">{stepCards}</div>
    )}
    {isComplete && <TaskCompletedBar />}
  </div>
</div>
```
- No bubble — text sits directly on page background
- Body text is full `text-white`, never dimmed
- Step cards render inline inside the response, gap `space-y-0.5`

---

## Agent Step Cards

The defining Kimi pattern. Every tool call, every agent action renders as a
slim 36px row inside the response. Not modals, not banners.

### Single step row
```tsx
<div className="flex items-center gap-2.5 h-9 px-3 rounded-lg
                bg-white/[0.03] border border-white/[0.05]
                text-[13px] text-white/70 cursor-pointer
                hover:bg-white/[0.05] hover:text-white/85 transition-colors">
  <Icon size={14} className="text-white/35 flex-shrink-0" />
  <span className="flex-1 truncate">{label}</span>
  <ChevronRight size={12} className="text-white/25 flex-shrink-0" />
</div>
```

### Step row with sub-items (expanded)
```tsx
<div className="rounded-lg border border-white/[0.05] overflow-hidden">
  {/* Parent — same as single but chevron rotated */}
  <div className="flex items-center gap-2.5 h-9 px-3 bg-white/[0.03]
                  text-[13px] text-white/70 cursor-pointer
                  hover:bg-white/[0.05] transition-colors">
    <Icon size={14} className="text-white/35 flex-shrink-0" />
    <span className="flex-1 truncate">{parentLabel}</span>
    <ChevronDown size={12} className="text-white/25 flex-shrink-0" />
  </div>
  {/* Sub-items — 32px, indented to pl-9, dimmer */}
  {subItems.map(item => (
    <div key={item} className="flex items-center h-8 pl-9 pr-3
                                border-t border-white/[0.04] bg-white/[0.015]
                                text-[12px] text-white/40">
      <span className="w-1 h-1 rounded-full bg-white/25 mr-2.5 flex-shrink-0" />
      <span className="truncate">{item}</span>
    </div>
  ))}
</div>
```

### Collapsed repeated steps
```tsx
// When same step type repeats 3+ times — collapse to count badge
<button className="flex items-center gap-1.5 h-7 px-2.5 rounded-md
                   bg-white/[0.03] border border-white/[0.05]
                   text-[11px] text-white/35
                   hover:text-white/55 hover:bg-white/[0.05] transition-colors">
  <RotateCcw size={10} />
  <span>×{count}</span>
</button>
```

### Icon map
```
web_search       → Search
execute_python   → Code2
read_file        → FileText
query_memory     → Brain
store_memory     → Database
web_scrape       → Globe
think            → Lightbulb
generate_doc     → FileOutput
read_skill       → BookOpen   ← matches Kimi "Read SKILL.md" exactly
```

---

## Task Completed Bar

End-of-response status row. Always the last element in an AI response.

```tsx
<div className="flex items-center justify-between h-11 px-4 mt-3 rounded-xl
                bg-white/[0.04] border border-white/[0.06]">
  <div className="flex items-center gap-2.5 text-[13px] text-white/60">
    <CheckCircle size={15} className="text-emerald-500" />
    <span>Task completed</span>
  </div>
  <button className="p-1.5 rounded-lg text-white/30
                     hover:text-white/60 hover:bg-white/[0.04] transition-colors">
    <Maximize2 size={13} />
  </button>
</div>
```

---

## Input Bar

Two internal rows inside one rounded container.

```tsx
<div className="sticky bottom-0 pb-6 pt-2 bg-[#0a0a0a]">
  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02]
                  focus-within:border-white/[0.16] transition-colors">

    {/* Row 1 — text area, auto-expands */}
    <textarea
      className="w-full bg-transparent px-4 pt-3.5 pb-1 resize-none outline-none
                 text-[14px] text-white placeholder:text-white/25 leading-relaxed
                 min-h-[52px] max-h-[200px]"
      placeholder="Message Hyprnova…"
    />

    {/* Row 2 — fixed action row */}
    <div className="flex items-center justify-between px-3 pb-3 pt-1">
      <div className="flex items-center gap-1.5">
        {/* Attach */}
        <button className="p-1.5 rounded-lg text-white/30
                           hover:text-white/55 hover:bg-white/[0.04] transition-colors">
          <Plus size={16} />
        </button>
        {/* Mode chip — "⚡ Auto ˅" from screenshot */}
        <button className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg
                           border border-white/[0.08] text-[12px] text-white/45
                           hover:border-white/[0.14] hover:text-white/65
                           hover:bg-white/[0.03] transition-colors">
          <Zap size={12} />
          <span>Auto</span>
          <ChevronDown size={10} className="text-white/25" />
        </button>
      </div>
      {/* Send */}
      <button
        disabled={isEmpty}
        className="w-8 h-8 rounded-full bg-white flex items-center justify-center
                   hover:bg-white/90 transition-colors
                   disabled:bg-white/20 disabled:cursor-not-allowed">
        <ArrowUp size={15} className="text-[#0a0a0a]" />
      </button>
    </div>
  </div>
</div>
```

---

## Right Panel

Slides in when output is produced.

```tsx
<aside className="flex flex-col h-full border-l border-white/[0.06] bg-[#0d0d0d]
                  w-[45vw] min-w-[480px]">

  {/* Header — 48px */}
  <div className="flex items-center justify-between h-12 px-4 flex-shrink-0
                  border-b border-white/[0.06]">
    <div className="flex items-center gap-2 min-w-0">
      <button className="p-1 rounded text-white/35 hover:text-white/65
                         hover:bg-white/[0.04] flex-shrink-0">
        <ChevronLeft size={15} />
      </button>
      <span className="text-[13px] text-white/65 truncate">{filename}</span>
    </div>
    <div className="flex items-center gap-0.5 flex-shrink-0">
      <PanelIconButton icon={Mail} />
      <PanelIconButton icon={Download} />
      <PanelIconButton icon={X} onClick={close} />
    </div>
  </div>

  {/* Tab bar — 36px, only shown for spreadsheets / multi-section outputs */}
  {hasTabs && (
    <div className="flex items-center h-9 px-3 gap-1 flex-shrink-0
                    border-b border-white/[0.06]">
      {tabs.map(tab => (
        <button key={tab.id}
          className={cn(
            "h-7 px-3 rounded text-[12px] transition-colors",
            active === tab.id
              ? "bg-white/[0.08] text-white"
              : "text-white/40 hover:text-white/65 hover:bg-white/[0.04]"
          )}>
          {tab.label}
        </button>
      ))}
    </div>
  )}

  {/* Content */}
  <div className="flex-1 overflow-auto">{children}</div>
</aside>
```

---

## Cards (Glassmorphism) — unchanged from v1

```tsx
"bg-white/[0.03] border border-white/[0.06] rounded-xl p-4"        // default
"hover:bg-white/[0.05] hover:border-white/[0.08]"                   // hover
"bg-white/[0.07] border-white/[0.10]"                               // active
"bg-white/[0.05] border-white/[0.08]"                               // elevated
// No shadows. Depth from background contrast only.
```

---

## Buttons — unchanged from v1, exact spec added

```tsx
// Primary — white fill
"h-9 px-4 rounded-lg bg-white text-[#0a0a0a] text-[13px] font-medium
 hover:bg-white/90 active:bg-white/80 transition-colors"

// Secondary — outline
"h-9 px-4 rounded-lg border border-white/[0.10] text-[13px] text-white/65
 hover:border-white/[0.18] hover:text-white hover:bg-white/[0.04] transition-colors"

// Ghost — no border
"h-9 px-4 rounded-lg text-[13px] text-white/50
 hover:text-white/80 hover:bg-white/[0.04] transition-colors"

// Destructive
"h-9 px-4 rounded-lg border border-red-500/30 text-[13px] text-red-400
 hover:bg-red-500/10 hover:border-red-500/50 transition-colors"

// Accent — blue fill
"h-9 px-4 rounded-lg bg-blue-500 text-white text-[13px] font-medium
 hover:bg-blue-600 transition-colors"

// Action chip — pill
"flex items-center gap-2 h-9 px-4 rounded-full border border-white/[0.08]
 text-[13px] text-white/55 hover:border-white/[0.14] hover:text-white/80
 hover:bg-white/[0.03] transition-colors"

// New chip — dashed pill
"flex items-center gap-2 h-9 px-4 rounded-full border border-dashed
 border-white/[0.10] text-[13px] text-white/40
 hover:border-white/[0.18] hover:text-white/60 hover:bg-white/[0.02] transition-colors"
```

---

## Status Indicators — unchanged from v1

```tsx
// Running — pulsing green
<span className="relative flex w-1.5 h-1.5">
  <span className="animate-ping absolute inset-0 rounded-full bg-green-400 opacity-75" />
  <span className="relative rounded-full w-1.5 h-1.5 bg-green-500" />
</span>

// Completed  →  <CheckCircle size={12} className="text-emerald-500" />
// Scheduled  →  <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
// Failed     →  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
```

---

## Council-Specific Components

### Director card (live session)
```tsx
<div className={cn(
  "rounded-xl border p-4 transition-colors",
  status === 'running' ? "border-white/[0.10] bg-white/[0.04]"
                       : "border-white/[0.06] bg-white/[0.03]"
)}>
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center
                      justify-center text-[11px] font-medium text-white/55">
        {initials}
      </div>
      <div>
        <div className="text-[13px] font-medium text-white leading-none">{name}</div>
        <div className="text-[11px] text-white/35 mt-0.5">{role}</div>
      </div>
    </div>
    <StatusIndicator status={status} />
  </div>
  {toolCalls.length > 0 && (
    <div className="space-y-0.5 mb-3">
      {toolCalls.map(tc => <StepCard key={tc.id} {...tc} />)}
    </div>
  )}
  {output && (
    <p className="text-[13px] text-white/65 leading-relaxed
                  border-t border-white/[0.05] pt-3">
      {output}
      {status === 'running' && (
        <span className="inline-block w-0.5 h-[14px] bg-white/40 ml-0.5 animate-pulse" />
      )}
    </p>
  )}
</div>
```

### Peer review exchange row
```tsx
<div className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 my-1">
  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5">
    {reviewerName} · reviewing anonymized outputs
  </div>
  <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-white/50">
    <span>Ranked:</span>
    {rankings.map((label, i) => (
      <span key={label} className="px-1.5 py-0.5 rounded bg-white/[0.06] text-white/65">
        {i + 1}. {label}
      </span>
    ))}
  </div>
</div>
```

### Phase progress bar
```tsx
// phases: ['Decomposition', 'Analysis', 'Peer Review', 'Synthesis', 'Complete']
<div className="flex items-center border border-white/[0.06] rounded-full
                overflow-hidden h-7 text-[11px]">
  {phases.map(phase => (
    <div key={phase} className={cn(
      "flex-1 flex items-center justify-center h-full px-3 transition-colors",
      current === phase ? "bg-white/[0.08] text-white"
      : done.includes(phase) ? "bg-white/[0.03] text-white/35"
      : "text-white/20"
    )}>
      {phase}
    </div>
  ))}
</div>
```

---

## Animation

```css
@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
.panel-enter { animation: slideIn 180ms ease forwards; }

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
.cursor-blink { animation: blink 900ms step-end infinite; }

/* Tailwind's animate-ping handles the running dot — no custom keyframes needed */
```

All interactive elements: `transition-colors duration-150`.
Nothing bounces. Nothing slides except the right panel.
Only two things animate continuously: running status dots and streaming cursor.

---

## Key Files

```
src/styles/globals.css              ← CSS variables, base reset
src/app/layout.tsx                  ← sidebar + main + right panel slot
src/components/
  chat/
    MessageList.tsx                 ← renders user bubbles + AI responses
    UserBubble.tsx                  ← near-white pill, rounded-br-sm
    AIResponse.tsx                  ← bare text + step cards + task bar
    StepCard.tsx                    ← 36px row, single/expanded/collapsed
    TaskCompletedBar.tsx
    InputBar.tsx                    ← two-row: textarea + action row
    ChatTitleBar.tsx                ← centered title + share
  council/
    DirectorCard.tsx
    ExchangeRow.tsx
    PhaseBar.tsx
  layout/
    Sidebar.tsx                     ← nav + badges + history + user
    RightPanel.tsx                  ← sliding output panel
  ui/
    Badge.tsx                       ← blue + grey nav badge variants
    Button.tsx                      ← all button variants
    StatusIndicator.tsx
```

---

## What NOT to Do

- No white backgrounds except user message bubbles
- No `rounded-full` except action chips, send button, status dots, and avatars
- No box shadows — depth from background only
- No borders above `border-white/[0.16]` on structural elements
- No font sizes above 32px (greeting only)
- No font weights above `font-medium` (500)
- No coloured section backgrounds
- No modal dialogs for routine confirmations — use inline rows
- Do not dim AI response body text — always full `text-white`
- Do not use `space-y` greater than `space-y-1` between step cards
- Do not animate anything except: status dots, streaming cursor, panel slide-in
- Do not render LLM output in `<pre>` or monospace unless it is actual code
