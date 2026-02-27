# Project Guidelines & Directives

This document outlines the core architecture, design system, and operational rules for the Hyprnova enterprise project. **These rules take absolute precedence over general defaults.**

## Design System & UI Principles

The overall design is directly attributed to **KIMI.com's UI designs**. The interface employs a dark, minimal, premium layout, evolving from Nightshift v1 to Hyprnova v2. Ensure these constraints are rigorously followed when building or modifying the frontend:

### 1. The Canvas
- **Black is the canvas**: Use `#0a0a0a` as the main page background (`--bg-base`).
- **Surface Elevation**: Use `#111111` for elevated cards/inputs (`--bg-surface`).
- **Depth without Shadows**: Do not use CSS shadows. Achieve depth solely through transparent white layered backgrounds (`rgba(255, 255, 255, X)`) and subtle border contrasts.

### 2. Typography & Layout
- **Structure through text**: Rely on size, weight, opacity, and spacing to build hierarchy—not bounding boxes.
- **Greeting/Hero**: `font-extrabold` (800-900), size `64-72px` (`text-6xl` or `text-7xl`). Dominates the viewport.
- **AI Body Text**: Must remain full opacity `text-white` with `leading-relaxed`. Do not dim the AI responses.
- **Nav items & Action Rows**: Stick to fixed heights (e.g., 36px or `h-9` for nav/steps, `h-11` for action rows).

### 3. Components & Interactions
- **Agent Step Cards**: Use 36px inline rows with distinct icons (from `lucide-react`) + labels inside AI responses. Do not use heavy blocks or modals.
- **Right Panel Output**: Spreadsheets, documents, and complex reports slide in from the right (`animation: slideIn 180ms`). Do not use modals or new tabs for this.
- **Chat Bubbles**: User bubbles are `bg-white/[0.92]` with dark text and a `rounded-br-sm` tail. AI responses have no bubble, placing text directly on the page background alongside an avatar.
- **Animations**: Restrict animations strictly to status dots (pulse), streaming cursors (blink), and the right panel sliding in. Interactive components should only use `transition-colors duration-150`.

## Workspace Permissions

Respect the following boundaries to prevent conflicts with other tools (e.g., Claude Code) and preserve the backend integrity:

### 🚫 What NOT to touch (Strictly Off-Limits)
- `/src/lib/ai/**` — Backend AI pipeline. (Claude Code owns this domain).
- `/src/lib/db/**` — Database layer.
- `/src/app/api/**` — API routes.
- **Critical Contexts**: Any file containing the keywords **"OpenClaw"**, **"RouterContext"**, or **"RoutingContext"** must not be modified.

### ✅ Safe to edit (Your Domain)
- `/src/components/**` — All UI components.
- `/src/app/(dashboard)/**` (or related page paths) — Page layouts and structure.
- Tailwind classes and CSS variables within `src/styles/globals.css`.
