# Nightshift v1 — Design System

## Overview
Modern dark-themed AI workspace UI. Premium, spacious, minimal.
Inspired by: Kimi, Linear, Apple developer tools.

## Color Palette
```css
--bg-primary: #0a0a0a;
--bg-secondary: #111111;
--bg-hover: rgba(255,255,255,0.04);
--bg-active: rgba(255,255,255,0.06);

--text-primary: #ffffff;
--text-secondary: rgba(255,255,255,0.65);
--text-tertiary: rgba(255,255,255,0.35);

--accent: #3b82f6;
--border: rgba(255,255,255,0.06);
--border-hover: rgba(255,255,255,0.12);
--border-focus: rgba(255,255,255,0.15);
```

## Component Patterns

### Cards (Glassmorphism)
- Background: `bg-white/[0.03]`
- Border: `border border-white/[0.06]`
- Hover: `hover:bg-white/[0.05]`
- Border radius: `rounded-xl` (12px)
- No shadows — depth from background contrast only

### Buttons
- Ghost/outline: `border border-white/[0.08] bg-transparent hover:bg-white/[0.04]`
- Primary: `bg-[var(--accent)] text-white`
- Pill shape: `rounded-full` for action chips
- Rectangular: `rounded-lg` (8px) for standard buttons

### Input Fields
- Border: `border border-white/[0.08]`
- Background: `bg-white/[0.03]`
- Focus: `focus-within:border-white/[0.15]`
- Placeholder: `text-[var(--text-tertiary)]`

### Sidebar
- Width: 220-240px, collapsible
- Same bg as main (#0a0a0a) — no visible edge
- Nav items: 38-40px height, subtle hover states
- Active: white text + `bg-white/[0.06]`
- Inactive: `text-white/45`

### Typography
- Greeting/hero text: 32-36px, font-weight 300-400
- Section labels: 10-11px uppercase, tracking-wide, `text-white/30`
- Body text: 13-14px, `leading-relaxed`
- System font stack or Inter

### Spacing
- Section gaps: 24-32px
- Card padding: 16px internal
- Page padding: 32-40px horizontal
- LOW density — premium tools breathe

### Status Indicators
- Running: green dot (6px) with subtle pulse/glow animation
- Scheduled: grey dot
- Completed: emerald checkmark
- Failed: red dot

### Action Chips (Quick Actions)
- Pill shape, 36-38px height
- Outline: `border border-white/[0.08] rounded-full`
- Small icon (16px) + text (13px)
- Dashed border for "+ New" variant

## Key Files
- `src/styles/globals.css` — CSS variables, base styles
- `src/app/layout.tsx` — Root layout with sidebar
- `src/components/` — All UI components
  - `chat/` — Chat interface, message bubbles, step cards
  - `workspace/` — Agent workspace, deliverables
  - `ui/` — Shared primitives (buttons, inputs, badges)
- `tailwind.config.*` — Theme extensions

## Unique Design Elements
1. Large centered greeting with time-of-day awareness
2. Kimi-style agent step cards (subtle inline rows, not heavy blocks)
3. Glassmorphic cards that float on dark background
4. Outline-style action chips (pill buttons with thin borders)
5. Split-pane workspace (conversation left, agent progress right)
6. Auto-resizing chat input with paperclip + send button
7. Deliverable cards with forced blob-download (no new tab)
8. Collapsible repeated agent steps (x3 badge)

## Adapting for New Projects
1. Clone this template
2. Run `npm install` with deps from original package.json
3. Update CSS variables in globals.css for your brand colors
4. Replace "Nightshift" branding in layout/sidebar
5. Keep the dark theme, spacing, and glassmorphism patterns
6. Add your own pages following the existing component patterns
