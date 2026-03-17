# Frontend Rebuild from Mockups — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild all frontend pages as mechanical translations of 11 HTML mockup files, achieving pixel-perfect fidelity with the mockup design system.

**Architecture:** Dual CSS variable system (mockup vars + shadcn aliases). Leaf components extracted from mockups compose into pages. EntityList/EntityDetail/EntityForm become thin layout shells. TanStack Query hooks, types, stores, and shadcn/ui primitives stay untouched.

**Tech Stack:** React 18, TypeScript, Tailwind CSS + custom CSS classes, shadcn/ui (24 primitives), TanStack Query 5, Zustand, Framer Motion, Recharts, Lucide Icons

**Spec:** `docs/superpowers/specs/2026-03-16-frontend-rebuild-from-mockups-design.md`
**Mockups:** `MockUp/` (11 HTML files)
**Design System Source:** `MockUp/projectpulse-design-system.html`

---

## Important Rules for ALL Tasks

1. **Translate, don't interpret.** Copy CSS values from mockup HTML. If mockup says `padding: 11px 14px`, use `p-[11px_14px]`. No rounding to Tailwind defaults.
2. **Entity names are always primary.** NEVER show entity codes (PRJ-, T0-, M0-, R0-, DOC-) as primary text. Names only. Codes in `text-[10px] text-[var(--text-muted)]` secondary detail if at all.
3. **Read the specific mockup HTML** before implementing. The mockup IS the spec. If anything in this plan contradicts the mockup, the mockup wins.
4. **CSS variables, not hex.** Components use `var(--bg-surface)`, `var(--text-primary)`, etc. Never hardcode `#10151c`.
5. **CSS variable collision resolution.** Where mockup and shadcn names collide, mockup vars are renamed:
   - `--border` (mockup) → `--border-default` (components use `var(--border-default)` for hex); shadcn `--border` stays HSL for Tailwind `border-border`.
   - `--accent` (mockup) → `--accent-hex` (components use `var(--accent-hex)` for hex); shadcn `--accent` stays HSL for Tailwind `bg-accent`.
   - All other mockup vars (`--bg-*`, `--text-*`, `--ctx-*`, `--status-*`) have no collision — use as-is.
6. **Verification after every page.** Run the checklist from spec Section 6 before marking done.

---

## Chunk 1: Foundation

### Task 1: Rebuild globals.css with dual variable system

**Files:**
- Rewrite: `client/src/styles/globals.css`

This is the most critical file. It defines all visual tokens for all 6 theme variants.

- [ ] **Step 1: Read the mockup design system CSS**

Read `MockUp/projectpulse-design-system.html` lines 9-50 (the `:root` block) to get all exact CSS variable values.

- [ ] **Step 2: Read the current globals.css**

Read `client/src/styles/globals.css` to understand the existing shadcn variable structure that must be preserved.

- [ ] **Step 3: Write the new globals.css**

The file must contain:

**a) Tailwind directives** (existing, keep)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**b) Google Fonts** (already in index.html — Syne + DM Sans + Inter)

**c) Base styles** (from mockup):
```css
* { box-sizing: border-box; }

body {
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  line-height: 1.6;
}

::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-subtle); border-radius: 3px; }
```

**d) Tech HUD Dark** (exact mockup values):
```css
:root[data-theme="tech-hud"].dark {
  /* Mockup source variables */
  --bg-base: #0a0d12;
  --bg-surface: #10151c;
  --bg-elevated: #171e28;
  --bg-overlay: #1e2733;
  --bg-hover: #242e3d;
  --text-primary: #e2eaf4;
  --text-secondary: #7d8fa3;
  --text-muted: #3d4f63;
  --accent-hex: #2d8cf0;       /* hex access for inline styles — shadcn `--accent` is HSL below */
  --accent-glow: rgba(45,140,240,0.18);
  --accent-dim: rgba(45,140,240,0.08);
  --border-default: #1e2733;   /* mockup `--border` renamed to avoid collision with shadcn HSL `--border` */
  --border-subtle: #141a22;
  --border-active: rgba(45,140,240,0.5);
  --ctx-project: #3b82f6;
  --ctx-milestone: #a855f7;
  --ctx-task: #22d3ee;
  --ctx-subtask: #14b8a6;
  --ctx-risk: #f97316;
  --ctx-document: #eab308;
  --ctx-team: #22c55e;
  --status-idle: #475569;
  --status-active: #3b82f6;
  --status-review: #eab308;
  --status-done: #22c55e;
  --status-blocked: #ef4444;
  --status-late: #f97316;
  --radius: 8px;
  --radius-sm: 5px;
  --radius-lg: 12px;

  /* shadcn/ui compatibility aliases (HSL without hsl()) */
  --background: 216 28% 4%;
  --foreground: 214 52% 92%;
  --card: 216 24% 8%;
  --card-foreground: 214 52% 92%;
  --popover: 215 22% 12%;
  --popover-foreground: 214 52% 92%;
  --primary: 213 86% 56%;
  --primary-foreground: 0 0% 100%;
  --secondary: 215 19% 12%;
  --secondary-foreground: 214 52% 92%;
  --muted: 215 19% 12%;
  --muted-foreground: 213 17% 44%;
  --accent: 213 86% 56%;       /* shadcn alias — overrides mockup --accent hex; use var(--accent-hex) for hex access */
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 215 22% 12%;
  --input: 215 22% 12%;
  --ring: 213 86% 56%;
  --success: 142 71% 45%;
  --success-foreground: 0 0% 100%;
  --warning: 38 92% 50%;
  --warning-foreground: 0 0% 100%;
  --info: 213 86% 56%;
  --info-foreground: 0 0% 100%;
}
```

**e) Tech HUD Light** (inverted backgrounds, same accents):
```css
:root[data-theme="tech-hud"] {
  --bg-base: #f8fafc;
  --bg-surface: #ffffff;
  --bg-elevated: #f1f5f9;
  --bg-overlay: #e2e8f0;
  --bg-hover: #cbd5e1;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  /* ... same accent/context/status/radius values ... */
  /* ... same shadcn aliases but for light ... */
  --background: 210 40% 98%;
  --foreground: 222 47% 11%;
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;
  /* etc. */
}
```

**f) Office Classic Light/Dark** (existing values as starting point, radius 4px)

**g) Asana Like Light/Dark** (existing values as starting point, radius 12px)

**h) Custom utility classes** (from mockup CSS):
```css
/* Card glow line — Tech HUD only, no-op in other themes */
[data-theme="tech-hud"] .pp-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
}

/* KPI accent bar */
.pp-accent-bar {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 2px;
}

/* Progress bar fill shine */
.pp-progress-fill::after {
  content: '';
  position: absolute;
  top: 0; right: 0;
  width: 20px; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25));
  border-radius: 99px;
}

/* Animations */
@keyframes pp-fadeInUp {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
.pp-ani { animation: pp-fadeInUp 0.22s ease both; }
.pp-d1 { animation-delay: 0.05s; }
.pp-d2 { animation-delay: 0.10s; }
.pp-d3 { animation-delay: 0.15s; }
.pp-d4 { animation-delay: 0.20s; }

@keyframes pp-shimmer {
  from { background-position: -200% 0; }
  to { background-position: 200% 0; }
}
.pp-skeleton {
  background: linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-overlay) 50%, var(--bg-elevated) 75%);
  background-size: 200% 100%;
  animation: pp-shimmer 1.5s infinite;
  border-radius: 4px;
}
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `cd client && npx tsc --noEmit 2>&1 | head -20`
Expected: No CSS-related errors (globals.css is not type-checked, but imports must resolve)

- [ ] **Step 5: Verify Vite dev server starts**

Run: `cd client && npx vite --host 0.0.0.0 &` — verify no build errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/styles/globals.css
git commit -m "feat(ui): rebuild globals.css with dual variable system from mockup design tokens"
```

---

### Task 2: Update constants.ts with mockup color palette

**Files:**
- Modify: `client/src/lib/constants.ts`

- [ ] **Step 1: Read current constants.ts**

Read `client/src/lib/constants.ts` fully to understand all exports.

- [ ] **Step 2: Update STATUS_COLORS to use mockup palette**

Replace Tailwind color classes with CSS variable-based inline styles. The mockup uses `rgba()` patterns, not Tailwind classes:

```typescript
export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  todo:        { bg: 'rgba(71,85,105,0.15)',  text: '#94a3b8', border: 'rgba(71,85,105,0.3)' },
  in_progress: { bg: 'rgba(59,130,246,0.1)',  text: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
  review:      { bg: 'rgba(234,179,8,0.1)',   text: '#facc15', border: 'rgba(234,179,8,0.25)' },
  done:        { bg: 'rgba(34,197,94,0.1)',   text: '#4ade80', border: 'rgba(34,197,94,0.25)' },
  blocked:     { bg: 'rgba(239,68,68,0.1)',   text: '#f87171', border: 'rgba(239,68,68,0.25)' },
  cancelled:   { bg: 'rgba(71,85,105,0.15)',  text: '#94a3b8', border: 'rgba(71,85,105,0.3)' },
  // Project statuses
  active:      { bg: 'rgba(59,130,246,0.1)',  text: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
  on_hold:     { bg: 'rgba(234,179,8,0.1)',   text: '#facc15', border: 'rgba(234,179,8,0.25)' },
  completed:   { bg: 'rgba(34,197,94,0.1)',   text: '#4ade80', border: 'rgba(34,197,94,0.25)' },
  // Risk statuses
  open:        { bg: 'rgba(239,68,68,0.08)',  text: '#f87171', border: 'rgba(239,68,68,0.18)' },
  mitigated:   { bg: 'rgba(99,102,241,0.08)', text: '#a5b4fc', border: 'rgba(99,102,241,0.2)' },
  accepted:    { bg: 'rgba(234,179,8,0.08)',  text: '#facc15', border: 'rgba(234,179,8,0.2)' },
  closed:      { bg: 'rgba(34,197,94,0.08)',  text: '#4ade80', border: 'rgba(34,197,94,0.2)' },
  // Document statuses
  draft:       { bg: 'rgba(71,85,105,0.15)',  text: '#94a3b8', border: 'rgba(71,85,105,0.3)' },
  approved:    { bg: 'rgba(34,197,94,0.1)',   text: '#4ade80', border: 'rgba(34,197,94,0.25)' },
  obsolete:    { bg: 'rgba(71,85,105,0.1)',   text: '#64748b', border: 'rgba(71,85,105,0.2)' },
}
```

- [ ] **Step 3: Add DOMAIN_COLORS from mockup**

```typescript
export const DOMAIN_COLORS: Record<string, { hex: string; bg: string; text: string; border: string; gradient: string }> = {
  project:   { hex: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  text: '#60a5fa', border: 'rgba(59,130,246,0.25)', gradient: 'linear-gradient(90deg, #1d4ed8, #3b82f6)' },
  milestone: { hex: '#a855f7', bg: 'rgba(168,85,247,0.1)', text: '#c084fc', border: 'rgba(168,85,247,0.25)', gradient: 'linear-gradient(90deg, #7e22ce, #a855f7)' },
  task:      { hex: '#22d3ee', bg: 'rgba(34,211,238,0.1)',  text: '#22d3ee', border: 'rgba(34,211,238,0.25)', gradient: 'linear-gradient(90deg, #0e7490, #22d3ee)' },
  subtask:   { hex: '#14b8a6', bg: 'rgba(20,184,166,0.1)',  text: '#2dd4bf', border: 'rgba(20,184,166,0.25)', gradient: 'linear-gradient(90deg, #0d9488, #14b8a6)' },
  risk:      { hex: '#f97316', bg: 'rgba(249,115,22,0.1)',  text: '#fb923c', border: 'rgba(249,115,22,0.25)', gradient: 'linear-gradient(90deg, #c2410c, #f97316)' },
  document:  { hex: '#eab308', bg: 'rgba(234,179,8,0.1)',   text: '#facc15', border: 'rgba(234,179,8,0.25)', gradient: 'linear-gradient(90deg, #a16207, #eab308)' },
  team:      { hex: '#22c55e', bg: 'rgba(34,197,94,0.1)',   text: '#4ade80', border: 'rgba(34,197,94,0.25)', gradient: 'linear-gradient(90deg, #15803d, #22c55e)' },
}
```

- [ ] **Step 4: Add PRIORITY_COLORS**

```typescript
export const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  critical: { bg: 'rgba(239,68,68,0.08)', text: '#f87171', border: 'rgba(239,68,68,0.2)', bar: '#ef4444' },
  high:     { bg: 'rgba(239,68,68,0.08)', text: '#f87171', border: 'rgba(239,68,68,0.2)', bar: '#ef4444' },
  medium:   { bg: 'rgba(249,115,22,0.08)', text: '#fb923c', border: 'rgba(249,115,22,0.2)', bar: '#f97316' },
  low:      { bg: 'rgba(234,179,8,0.08)', text: '#facc15', border: 'rgba(234,179,8,0.2)', bar: '#3b82f6' },
}
```

- [ ] **Step 5: Add ROLE_COLORS**

```typescript
export const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  admin:       { bg: 'rgba(239,68,68,0.12)', text: '#f87171', border: 'rgba(239,68,68,0.25)' },
  direzione:   { bg: 'rgba(165,180,252,0.12)', text: '#a5b4fc', border: 'rgba(165,180,252,0.25)' },
  dipendente:  { bg: 'rgba(74,222,128,0.12)', text: '#4ade80', border: 'rgba(74,222,128,0.25)' },
  guest:       { bg: 'rgba(71,85,105,0.12)', text: '#94a3b8', border: 'rgba(71,85,105,0.25)' },
}
```

- [ ] **Step 6: Add NAV_DOMAIN_COLORS for sidebar active states**

```typescript
export const NAV_DOMAIN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  dashboard:  { bg: 'rgba(45,140,240,0.08)', text: '#60a5fa', border: 'rgba(45,140,240,0.2)' },
  projects:   { bg: 'rgba(59,130,246,0.08)', text: '#60a5fa', border: 'rgba(59,130,246,0.2)' },
  tasks:      { bg: 'rgba(34,211,238,0.08)', text: '#22d3ee', border: 'rgba(34,211,238,0.2)' },
  kanban:     { bg: 'rgba(34,211,238,0.08)', text: '#22d3ee', border: 'rgba(34,211,238,0.2)' },
  gantt:      { bg: 'rgba(59,130,246,0.08)', text: '#60a5fa', border: 'rgba(59,130,246,0.2)' },
  risks:      { bg: 'rgba(249,115,22,0.08)', text: '#fb923c', border: 'rgba(249,115,22,0.2)' },
  documents:  { bg: 'rgba(234,179,8,0.08)', text: '#facc15', border: 'rgba(234,179,8,0.2)' },
  reports:    { bg: 'rgba(59,130,246,0.08)', text: '#60a5fa', border: 'rgba(59,130,246,0.2)' },
  users:      { bg: 'rgba(99,102,241,0.1)',  text: '#a5b4fc', border: 'rgba(99,102,241,0.2)' },
  planning:   { bg: 'rgba(45,140,240,0.08)', text: '#60a5fa', border: 'rgba(45,140,240,0.2)' },
}
```

- [ ] **Step 7: Keep all existing label exports** (PROJECT_STATUS_LABELS, TASK_STATUS_LABELS, etc.) — don't remove them, only add the new color exports.

- [ ] **Step 8: Backward compatibility for STATUS_COLORS**

The old `STATUS_COLORS` was `Record<string, string>` (single Tailwind class). The new format is `Record<string, { bg, text, border }>`. To avoid breaking existing consumers during the rebuild:

```typescript
// Keep old format as deprecated alias until all consumers are rebuilt
/** @deprecated Use STATUS_COLORS instead — will be removed after rebuild */
export const STATUS_COLORS_LEGACY: Record<string, string> = {
  // ... copy existing Tailwind class mappings ...
}
```

Then search all existing files for `STATUS_COLORS` usage and update any imports that reference the old format to use `STATUS_COLORS_LEGACY` temporarily. They will be rebuilt in Chunks 5-8.

- [ ] **Step 9: Verify compilation**

Run: `cd client && npx tsc --noEmit 2>&1 | head -30`
Expected: No errors — legacy alias preserves backward compatibility

- [ ] **Step 9: Commit**

```bash
git add client/src/lib/constants.ts
git commit -m "feat(ui): update constants.ts with mockup color palette (domain, status, priority, role, nav)"
```

---

### Task 3: Simplify theme-config.ts

**Files:**
- Rewrite: `client/src/lib/theme-config.ts`

- [ ] **Step 1: Read current theme-config.ts**
- [ ] **Step 2: Simplify to only export what components need**

The mockup uses same Lucide icons across themes (FolderKanban, Flag, CheckSquare, etc.) with different wrapper effects. Simplify:

```typescript
import { FolderKanban, Flag, CheckSquare, GitBranch, AlertTriangle, FileText, Users } from 'lucide-react'

export const DOMAIN_ICONS = {
  project: FolderKanban,
  milestone: Flag,
  task: CheckSquare,
  subtask: GitBranch,
  risk: AlertTriangle,
  document: FileText,
  team: Users,
} as const

export const THEME_EMOJIS = {
  'tech-hud': {
    completed: '\u26A1', inProgress: '\u25B6\uFE0F', blocked: '\uD83D\uDD34',
    new: '\uD83D\uDD27', success: '\u2714\uFE0F', error: '\u26D4', warning: '\u26A0\uFE0F',
  },
  'office-classic': {
    completed: '\u2705', inProgress: '\uD83D\uDD04', blocked: '\uD83D\uDED1',
    new: '\uD83D\uDCC4', success: '\u2705', error: '\u274C', warning: '\u26A0\uFE0F',
  },
  'asana-like': {
    completed: '\uD83C\uDF89', inProgress: '\uD83D\uDE80', blocked: '\uD83D\uDE1F',
    new: '\u2728', success: '\uD83C\uDF8A', error: '\uD83D\uDE25', warning: '\uD83E\uDD14',
  },
} as const
```

- [ ] **Step 3: Update useThemeConfig hook and all consumers**

The `useThemeConfig()` hook at `client/src/hooks/ui/useThemeConfig.ts` exposes `icons` and `emojis`. After simplifying theme-config.ts, update the hook to use the new exports. Then search all files importing from `useThemeConfig`:

```bash
cd client && grep -r "useThemeConfig" src/ --include="*.tsx" --include="*.ts" -l
```

For each consumer, verify it still compiles. If the hook's return shape changed, update the consumer to use the new property names.

- [ ] **Step 4: Commit**

```bash
git add client/src/lib/theme-config.ts client/src/hooks/ui/useThemeConfig.ts
git commit -m "refactor(ui): simplify theme-config to domain icons and emoji maps"
```

---

## Chunk 2: Layout Shell

### Task 4: Rebuild Sidebar from mockup

**Files:**
- Rewrite: `client/src/components/layout/Sidebar.tsx`
- Rewrite: `client/src/components/layout/SidebarNavItem.tsx`
- Delete: `client/src/components/layout/SidebarNavGroup.tsx` (mockup has flat nav sections, not grouped)

- [ ] **Step 1: Read the mockup sidebar HTML**

Read `MockUp/dashboard.html` lines 242-285 (the `<aside class="sidebar">` section). This is the exact structure to reproduce.

- [ ] **Step 2: Build SidebarNavItem component**

```tsx
// client/src/components/layout/SidebarNavItem.tsx
interface SidebarNavItemProps {
  href: string
  icon: React.ReactNode
  label: string
  isActive?: boolean
  domainColor?: { bg: string; text: string; border: string }
  badge?: number
}
```

Exact CSS from mockup `.nav-item`:
- `display: flex; align-items: center; gap: 9px; padding: 7px 9px;`
- `border-radius: var(--radius-sm); font-size: 13px; font-weight: 500;`
- `color: var(--text-secondary); border: 1px solid transparent;`
- Active: `background: ${domainColor.bg}; color: ${domainColor.text}; border-color: ${domainColor.border};`
- SVG icon: `width: 15px; height: 15px; opacity: 0.7;` active: `opacity: 1;`

- [ ] **Step 3: Build Sidebar component**

Structure from mockup:
```
aside.sidebar (fixed, 216px, bg-surface, border-right)
  div.logo (padding 0 18px 20px, border-bottom)
    div.logo-text (Syne 800 16px — "Project" + accent "Pulse")
    div.logo-sub (10px uppercase muted — "Ufficio Tecnico")
  nav-section "Workspace" (label 9px uppercase)
    SidebarNavItem × 5 (Dashboard, Progetti, Task, Kanban, Gantt)
  nav-section "Gestione" (label 9px uppercase)
    SidebarNavItem × 3 (Rischi, Documenti, Report)
  sidebar-bottom (margin-top: auto, border-top)
    User avatar + name + role chip
```

Must support collapsed state (64px width, icons only).

- [ ] **Step 4: Verify sidebar renders correctly in browser**

Open Vite dev server, check sidebar matches mockup visually.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/layout/Sidebar.tsx client/src/components/layout/SidebarNavItem.tsx
git commit -m "feat(ui): rebuild Sidebar from mockup with domain-colored active states"
```

---

### Task 5: Rebuild AppShell

**Note:** The existing `Header.tsx` top bar is removed — the mockup sidebar replaces it. Remove the `<Header />` render from AppShell. `Header.tsx` itself is deleted in Task 6.

**Files:**
- Rewrite: `client/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Read mockup layout structure**

From all mockups: `.app { display: flex; min-height: 100vh; }` + `.main { margin-left: 216px; flex: 1; padding: 0 0 48px; }`

- [ ] **Step 2: Build AppShell**

```tsx
// Minimal shell: sidebar + scrollable main area
// No max-width, no mx-auto — full width
// Main area: margin-left 216px (or 64px collapsed)
// Padding: 0 (pages handle their own padding of 28px)
```

Keep existing CommandPalette and NotificationPanel integration (they'll be restyled later).

- [ ] **Step 3: Commit**

```bash
git add client/src/components/layout/AppShell.tsx
git commit -m "feat(ui): rebuild AppShell with mockup layout (216px sidebar + flush main)"
```

---

### Task 6: Build PageHeader and Breadcrumb

**Note:** `PageHeader.tsx` is a NEW component (does not exist yet). The existing `Header.tsx` is the top app bar inside AppShell — it will be deleted in Task 5 (AppShell rebuild) since the mockup sidebar design replaces the top header.

**Files:**
- Create: `client/src/components/layout/PageHeader.tsx`
- Rewrite: `client/src/components/common/Breadcrumbs.tsx`
- Delete: `client/src/components/layout/Header.tsx` (replaced by sidebar-based navigation)

- [ ] **Step 1: Read mockup page header**

From `MockUp/dashboard.html` lines 296-317 (`.page-header`).

- [ ] **Step 2: Build PageHeader**

Props: `domainBadge`, `title`, `subtitle`, `actions` (ReactNode)

CSS from mockup:
- Container: `padding: 14px 28px 16px; display: flex; align-items: flex-start; justify-content: space-between;`
- Title: `font-family: DM Sans; font-weight: 700; font-size: 22px; letter-spacing: -0.3px;`
- DomainBadge inline: `display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px 3px 7px; border-radius: 6px; font-size: 11px; font-weight: 600;`

- [ ] **Step 3: Build Breadcrumb**

From mockup `.breadcrumb`: `padding: 16px 28px 0; font-size: 12px; color: var(--text-muted);`
Links: `color: var(--text-muted);` separator: chevron SVG 11px.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/layout/PageHeader.tsx client/src/components/common/Breadcrumbs.tsx
git commit -m "feat(ui): rebuild PageHeader and Breadcrumb from mockup"
```

---

## Chunk 3: Core Leaf Components (Part 1 — Badges, Progress, Avatar)

### Task 7: StatusBadge and ContextBadge

**Files:**
- Rewrite: `client/src/components/common/StatusBadge.tsx`
- Create: `client/src/components/common/ContextBadge.tsx`
- Create: `client/src/components/common/DomainBadge.tsx`

- [ ] **Step 1: Read mockup badge CSS**

From design system: `.badge` — `display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 500; border: 1px solid transparent;`

- [ ] **Step 2: Build StatusBadge**

```tsx
interface StatusBadgeProps {
  status: string
  label?: string  // override auto-lookup
  showDot?: boolean  // 5px colored dot before text
}
// Uses STATUS_COLORS from constants for inline style { background, color, borderColor }
// Label from TASK_STATUS_LABELS / PROJECT_STATUS_LABELS / etc.
```

- [ ] **Step 3: Build ContextBadge**

```tsx
interface ContextBadgeProps {
  domain: 'project' | 'milestone' | 'task' | 'subtask' | 'risk' | 'document' | 'team'
  label?: string
  icon?: React.ReactNode
}
// Uses DOMAIN_COLORS from constants
```

- [ ] **Step 4: Build DomainBadge** (larger, used in PageHeader)

From mockup `.domain-badge`: `padding: 3px 10px 3px 7px; border-radius: 6px; font-size: 11px; font-weight: 600;`
Includes icon (12px) from DOMAIN_ICONS.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/common/StatusBadge.tsx client/src/components/common/ContextBadge.tsx client/src/components/common/DomainBadge.tsx
git commit -m "feat(ui): rebuild StatusBadge, ContextBadge, DomainBadge from mockup"
```

---

### Task 8: ProgressBar

**Files:**
- Rewrite: `client/src/components/common/ProgressBar.tsx`
- Delete: `client/src/components/common/ProgressGradient.tsx` (replaced)
- Delete: `client/src/components/common/ProgressRing.tsx` (not in mockups — defer)

- [ ] **Step 1: Read mockup progress CSS**

From design system `.progress-bar`, `.progress-fill`, `.progress-fill::after`, and gradient classes.

- [ ] **Step 2: Build ProgressBar**

```tsx
interface ProgressBarProps {
  value: number  // 0-100
  size?: 'thin' | 'standard' | 'full'  // 3px | 5px | 6px
  gradient?: string  // CSS gradient string from DOMAIN_COLORS
  showLabel?: boolean  // show "72%" text
  className?: string
}
```

Size mapping: thin=3px, standard=5px, full=6px.
Fill: `border-radius: 99px; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);`
Shine: `::after` with `width: 20px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25));`

Use `.pp-progress-fill` class from globals.css for the `::after`.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/common/ProgressBar.tsx
git commit -m "feat(ui): rebuild ProgressBar with 3 sizes and gradient shine from mockup"
```

---

### Task 9: Avatar and AvatarStack

**Files:**
- Rewrite: `client/src/components/common/Avatar.tsx` (if exists, otherwise create in common/)
- Rewrite: `client/src/components/common/AvatarStack.tsx`

- [ ] **Step 1: Read mockup avatar CSS**

From mockup: `.avatar` — `width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; font-family: Syne; border: 1px solid var(--border-default);`

`.avatar-xs` — `width: 18px; height: 18px; font-size: 8px;`

`.avatar-stack .avatar` — `margin-left: -8px; border: 2px solid var(--bg-surface);`

- [ ] **Step 2: Build Avatar**

```tsx
interface AvatarProps {
  name: string
  size?: 'xs' | 'sm' | 'md'  // 18px | 20px | 28px
  color?: string  // background color
  className?: string
}
// Renders initials using getUserInitials() from lib/utils
// Background color from getAvatarColor() from lib/utils
```

- [ ] **Step 3: Build AvatarStack**

```tsx
interface AvatarStackProps {
  users: Array<{ name: string; id?: string }>
  max?: number  // show first N, then "+X"
  size?: 'xs' | 'sm' | 'md'
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/common/Avatar.tsx client/src/components/common/AvatarStack.tsx
git commit -m "feat(ui): rebuild Avatar and AvatarStack from mockup (Syne font, stacked overlap)"
```

---

### Task 10: KpiCard and KpiStrip

**Files:**
- Rewrite: `client/src/components/common/KpiCard.tsx` (extract from KpiStrip)
- Rewrite: `client/src/components/common/KpiStrip.tsx`

- [ ] **Step 1: Read mockup KPI CSS**

From `MockUp/dashboard.html` lines 76-89 (`.kpi-card`, `.kc-label`, `.kc-value`, `.kc-sub`, `.kc-delta`, `.kc-bar`).

- [ ] **Step 2: Build KpiCard**

```tsx
interface KpiCardProps {
  label: string           // 10px uppercase muted
  value: string | number  // 20px 600 weight
  valueColor?: string     // e.g., '#60a5fa'
  sub?: string            // 10px muted
  delta?: { value: string; direction: 'up' | 'down' }
  accentGradient?: string // CSS gradient for bottom 2px bar
  variant?: 'compact' | 'full'  // compact: 11px 14px | full: 20px
}
```

Compact CSS (from page mockups):
- `padding: 11px 14px; position: relative; overflow: hidden;`
- `background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius);`
- `::before` glow line (via `.pp-card` class)
- `.kc-bar` accent at bottom (via `.pp-accent-bar` class)
- Hover: `border-color: rgba(59,130,246,0.2);`

- [ ] **Step 3: Build KpiStrip**

```tsx
interface KpiStripProps {
  items: KpiCardProps[]
  columns?: 4 | 5  // grid-template-columns
  className?: string
}
// CSS: display: grid; gap: 10px; padding: 0 28px 16px;
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/common/KpiCard.tsx client/src/components/common/KpiStrip.tsx
git commit -m "feat(ui): rebuild KpiCard and KpiStrip from mockup with accent bars and deltas"
```

---

### Task 11: AlertStrip and AlertRow

**Files:**
- Rewrite: `client/src/components/common/AlertStrip.tsx`
- Create: `client/src/components/common/AlertRow.tsx`

- [ ] **Step 1: Read mockup alert CSS**

From `MockUp/dashboard.html` lines 91-118 (`.alert-strip`, `.alert-row`).

- [ ] **Step 2: Build AlertRow**

```tsx
interface AlertRowProps {
  severity: 'critical' | 'warning' | 'info'
  title: string
  subtitle?: string
  project?: string
  time?: string
  onClick?: () => void
}
```

CSS from mockup:
- Container: `display: flex; align-items: center; gap: 12px; padding: 9px 16px; border-bottom: 1px solid var(--border-subtle);`
- Severity border-left: critical=`3px solid rgba(239,68,68,0.5)`, warning=`rgba(249,115,22,0.4)`, info=`rgba(59,130,246,0.3)`
- Icon box: `width: 22px; height: 22px; border-radius: 4px; display: flex; align-items: center; justify-content: center;`
- Title: `font-size: 12px; font-weight: 600;` critical=`color: #f87171;`, warning=`color: #fb923c;`

- [ ] **Step 3: Build AlertStrip** (collapsible container)

```tsx
interface AlertStripProps {
  items: AlertRowProps[]
  criticalCount?: number
  warningCount?: number
  infoCount?: number
}
```

Header with count badges, collapsible body with AlertRow items. Uses localStorage for collapse state.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/common/AlertStrip.tsx client/src/components/common/AlertRow.tsx
git commit -m "feat(ui): rebuild AlertStrip with collapsible severity rows from mockup"
```

---

### Task 12: DeadlineBadge, PhasePills, SearchBox, ChipFilter, ViewToggle, RoleToggle, EmptyState, Drawer

**Files:**
- Rewrite/Create each in `client/src/components/common/`

- [ ] **Step 1: Build DeadlineBadge**

From mockup `.ms-days-badge` / `.task-due`:
- Urgent (<3 days): `bg: rgba(239,68,68,0.1); color: #f87171; border: rgba(239,68,68,0.2);`
- Soon (3-14 days): `bg: rgba(249,115,22,0.08); color: #fb923c; border: rgba(249,115,22,0.2);`
- OK (>14 days): `bg: rgba(34,197,94,0.08); color: #4ade80; border: rgba(34,197,94,0.2);`
- Font: `10px 700; padding: 2px 7px; border-radius: 3px;`

- [ ] **Step 2: Rebuild PhasePills**

From mockup `.phase-timeline`: flex row of pills + connectors.
- Done pill: `bg: rgba(34,197,94,0.1); color: #4ade80; border: rgba(34,197,94,0.2);`
- Current: `bg: rgba(45,140,240,0.12); color: #60a5fa; border: rgba(45,140,240,0.4); box-shadow: 0 0 0 1px rgba(45,140,240,0.15);`
- Upcoming: `bg: var(--bg-elevated); color: var(--text-muted); border: var(--border-default);`
- Connector: `width: 24px; height: 1px;` done=green, mid=gradient, off=border

- [ ] **Step 3: Build SearchBox**

From mockup: icon (13px muted) + input (`13px; padding: 7px 12px 7px 34px; background: var(--bg-elevated); border: 1px solid var(--border-default);`)
Focus: `border-color: var(--border-active); box-shadow: 0 0 0 3px var(--accent-glow);`

- [ ] **Step 4: Build ChipFilter**

From mockup `.chip`: `padding: 5px 11px; font-size: 11px; font-weight: 600; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: 5px;`
Active: domain-colored bg/text/border.

- [ ] **Step 5: Build ViewToggle**

From mockup: button group, `display: flex; gap: 2px; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: 6px; padding: 2px;`
Active button: `bg: var(--bg-overlay); color: var(--text-primary);`

- [ ] **Step 6: Build RoleToggle**

From mockup `.role-toggle`: same as ViewToggle but 2 buttons (Direzione/Dipendente).
Active Direzione: `color: #a5b4fc;`, Active Dipendente: `color: #4ade80;`

- [ ] **Step 7: Rebuild EmptyState**

From design system `.empty-state`: `display: flex; flex-direction: column; align-items: center; padding: 48px 24px; background: var(--bg-surface); border: 1px dashed var(--border-default); border-radius: var(--radius);`
Icon box: 48x48px, bg-elevated, border, radius 12px.

- [ ] **Step 8: Build Drawer**

From mockup `.drawer`: `position: fixed; top: 0; right: 0; width: 400px; height: 100vh; background: var(--bg-surface); border-left: 1px solid var(--border-default); z-index: 210; transform: translateX(100%);`
Open: `translateX(0); transition: transform 0.3s ease;`
Overlay: `position: fixed; inset: 0; background: rgba(0,0,0,0.5);`

- [ ] **Step 9: Commit all**

```bash
git add client/src/components/common/
git commit -m "feat(ui): rebuild all leaf components from mockup (DeadlineBadge, PhasePills, SearchBox, ChipFilter, ViewToggle, RoleToggle, EmptyState, Drawer)"
```

---

## Chunk 4: EntityList/EntityDetail/EntityForm Shells

### Task 13: Rebuild EntityList as thin layout shell

**Files:**
- Rewrite: `client/src/components/common/EntityList.tsx`

- [ ] **Step 1: Read current EntityList to understand all props used by pages**

- [ ] **Step 2: Rebuild as minimal shell**

The new EntityList provides ONLY structural layout:
```tsx
interface EntityListProps {
  children: React.ReactNode           // main content area
  breadcrumbs?: BreadcrumbItem[]
  header?: React.ReactNode            // PageHeader slot
  kpiStrip?: React.ReactNode          // KpiStrip slot
  alertStrip?: React.ReactNode        // AlertStrip slot
  toolbar?: React.ReactNode           // SearchBox + filters slot
  afterToolbar?: React.ReactNode      // ChipFilter row slot
  pagination?: PaginationProps        // PaginationControls
  emptyState?: React.ReactNode        // when no children
  isEmpty?: boolean
  isLoading?: boolean
  className?: string
}
```

CSS: just `padding: 0;` — each slot applies its own padding (28px horizontal from mockup).

- [ ] **Step 3: Commit**

```bash
git add client/src/components/common/EntityList.tsx
git commit -m "refactor(ui): rebuild EntityList as thin layout shell with mockup slots"
```

---

### Task 14: Rebuild EntityDetail as thin layout shell

**Files:**
- Rewrite: `client/src/components/common/EntityDetail.tsx`

- [ ] **Step 1: Read current EntityDetail to understand all props**

- [ ] **Step 2: Rebuild as minimal shell**

```tsx
interface EntityDetailProps {
  breadcrumbs?: BreadcrumbItem[]
  hero?: React.ReactNode              // color bar + title + badges
  kpiRow?: React.ReactNode            // KPI mini-cards
  beforeTabs?: React.ReactNode        // phase stepper, banners
  tabs?: TabConfig[]                  // sticky tab bar
  children: React.ReactNode           // tab content
  sidebar?: React.ReactNode           // right sidebar
  isLoading?: boolean
  className?: string
}
```

From mockup: sticky tabs bar, 2-col layout when sidebar present. No imposed styles on content.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/common/EntityDetail.tsx
git commit -m "refactor(ui): rebuild EntityDetail as thin layout shell with mockup structure"
```

---

### Task 15: Rebuild EntityForm as thin layout shell

**Files:**
- Rewrite: `client/src/components/common/EntityForm.tsx`

- [ ] **Step 1: Rebuild with mockup card styling**

```tsx
interface EntityFormProps {
  breadcrumbs?: BreadcrumbItem[]
  title: string
  children: React.ReactNode  // form fields
  onSubmit: () => void
  onCancel: () => void
  onDelete?: () => void
  isNew?: boolean
  isSubmitting?: boolean
  submitLabel?: string
}
```

Card: `bg: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius); padding: 16px;`
Form inputs styled per spec Section 9.4.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/EntityForm.tsx
git commit -m "refactor(ui): rebuild EntityForm with mockup card and input styles"
```

---

## Chunk 5: Dashboard Page

### Task 16: Build Dashboard domain components

**Files:**
- Create: `client/src/components/domain/dashboard/MilestoneCard.tsx`
- Create: `client/src/components/domain/dashboard/MilestoneGrid.tsx`
- Create: `client/src/components/domain/dashboard/ProjectCard.tsx`
- Create: `client/src/components/domain/dashboard/ProjectGrid.tsx`
- Create: `client/src/components/domain/dashboard/TaskItem.tsx`
- Create: `client/src/components/domain/dashboard/TaskColumns.tsx`
- Create: `client/src/components/domain/dashboard/DomainTabs.tsx`
- Create: `client/src/components/domain/dashboard/CalendarPanel.tsx`

- [ ] **Step 1: Read dashboard.html milestone card section** (lines 448-500)

- [ ] **Step 2: Build MilestoneCard**

From mockup `.ms-card`:
- `background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius); padding: 14px;`
- Accent bar: `position: absolute; top: 0; left: 0; bottom: 0; width: 3px;` (colored by project)
- Content: name (13px 600) + project (11px muted) + ProgressBar thin + "X% completato" (10px)
- Days badge: DeadlineBadge top-right

- [ ] **Step 3: Build MilestoneGrid** — `display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;`

- [ ] **Step 4: Build ProjectCard**

From mockup `.proj-card`:
- Name (13px 600) + status badge + meta (11px muted: team size, task count)
- ProgressBar thin + percentage
- Stats row (border-top subtle): task count, milestone count, team size
- Accent bar bottom 2px gradient

- [ ] **Step 5: Build ProjectGrid** — `grid-template-columns: repeat(3, 1fr); gap: 12px;`

- [ ] **Step 6: Build TaskItem**

From mockup `.task-item`:
- Priority bar 3px left (colored)
- Checkbox 14x14px
- Name (12px 500), meta (10px muted: project, deadline)
- Avatar right

- [ ] **Step 7: Build TaskColumns** — `grid-template-columns: 1fr 1fr (1fr for blocked); gap: 16px;`

- [ ] **Step 8: Build DomainTabs**

From mockup `.domain-tabs`:
- Full-width container, 4 equal-flex tabs
- Each: icon (12px) + label + count badge
- Active: bg-overlay, text-primary, border

- [ ] **Step 9: Build CalendarPanel**

From mockup dashboard.html (Calendar tab):
- Layout: `.cal-layout` — 320px calendar widget left + events panel right
- Calendar widget: grid 7 cols, day cells 30px, event dots colored
- Events panel: grouped by day, event items with time + title + project name
- CSS: `background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius); padding: 16px;`

- [ ] **Step 10: Commit**

```bash
git add client/src/components/domain/dashboard/
git commit -m "feat(ui): build dashboard domain components from mockup (milestone, project, task, calendar + tabs)"
```

---

### Task 17: Rebuild HomePage

**Files:**
- Rewrite: `client/src/pages/home/HomePage.tsx`

- [ ] **Step 1: Read dashboard.html fully** to understand the complete page structure

- [ ] **Step 2: Build HomePage composing all components**

Structure (from mockup, top to bottom):
```tsx
<Breadcrumbs items={[{ label: 'Workspace' }, { label: 'Dashboard' }]} />
<PageHeader
  domainBadge={<DomainBadge domain="project" label="Dashboard" />}
  title="Command Center"
  subtitle={`Panoramica operativa — ${formatDate(new Date())}`}
  actions={<>{searchBtn}{newTaskBtn}</>}
/>
<RoleToggle />
<KpiStrip items={kpiItems} columns={5} />
<AlertStrip items={alertItems} />
<DomainTabs activeTab={tab} onTabChange={setTab} tabs={[...]} />
{tab === 'ms' && <MilestoneGrid milestones={milestones} />}
{tab === 'cal' && <CalendarPanel />}
{tab === 'task' && <TaskColumns tasks={myTasks} teamTasks={teamTasks} blocked={blockedTasks} />}
{tab === 'proj' && <ProjectGrid projects={projects} />}
```

Data from: `useDashboardStatsQuery()`, `useDashboardAttentionQuery()`, `useTasksQuery()`, `useProjectsQuery()`

- [ ] **Step 3: Wire to TanStack Query hooks** — use existing hooks from `hooks/api/useDashboard.ts` and `hooks/api/useProjects.ts`

- [ ] **Step 4: Run verification checklist** (spec Section 6)

Specifically:
- [ ] No entity codes as primary text (scan all rendered text)
- [ ] KPI values show numbers, not icons
- [ ] AlertStrip shows severity-colored rows
- [ ] DomainTabs switch content correctly
- [ ] Stagger animation on sections (pp-ani, pp-d1, pp-d2...)

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/home/HomePage.tsx
git commit -m "feat(ui): rebuild HomePage from dashboard.html mockup with full fidelity"
```

---

## Chunk 6: Project Pages

### Task 18: Build ProjectListPage

**Files:**
- Rewrite: `client/src/pages/projects/ProjectListPage.tsx`

- [ ] **Step 1: Read lista-progetti.html mockup fully**

- [ ] **Step 2: Build the page composing leaf components**

Structure:
- EntityList shell with:
  - `header`: PageHeader (DomainBadge "Progetto" + "Progetti" + subtitle + "Nuovo progetto" button)
  - `kpiStrip`: KpiStrip 5 items
  - `toolbar`: SearchBox + filter buttons + ViewToggle
  - List view: table rows with — project name (NOT code), status, progress bar, phase pips, avatar stack, deadline
  - Grid view: ProjectCard grid

- [ ] **Step 3: Build table row component**

From mockup: grid columns `28px 1fr 130px 180px 120px 110px 80px 72px`
- Checkbox
- Name (13px 600, NOT code) + meta line (11px muted: task count, code if needed)
- StatusBadge
- ProgressBar + fraction text
- PhasePills (compact)
- AvatarStack
- DeadlineBadge
- Action icons

- [ ] **Step 4: Wire to hooks** — `useProjectsQuery()`, role check for "Nuovo progetto" button

- [ ] **Step 5: Run verification checklist**

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/projects/ProjectListPage.tsx
git commit -m "feat(ui): rebuild ProjectListPage from lista-progetti.html mockup"
```

---

### Task 19: Build ProjectDetailPage

**Files:**
- Rewrite: `client/src/pages/projects/ProjectDetailPage.tsx`
- Create/Rewrite domain components as needed in `client/src/components/domain/projects/`

- [ ] **Step 1: Read dettaglio-progetto.html mockup fully**

- [ ] **Step 2: Build hero section**

Color bar (4px gradient left) + title (24px 700) + badges (status, milestone count, deadline) + action buttons

- [ ] **Step 3: Build KPI row** (5 mini cards: avanzamento, task, ore, rischi, team)

- [ ] **Step 4: Build sticky tabs** (Panoramica | Task | Rischi | Documenti with count badges)

- [ ] **Step 5: Build Tab: Panoramica** — PhasePills card + 2-col (progress chart + activity) + team section

- [ ] **Step 6: Build Tab: Task** — Milestone hierarchy with expandable cards + nested TaskItem rows

- [ ] **Step 7: Wire to hooks** — `useProjectDetailQuery(id)`, `useProjectPhasesQuery(id)`, `useTasksQuery({projectId})`

- [ ] **Step 8: Run verification checklist**

- [ ] **Step 9: Commit**

```bash
git add client/src/pages/projects/ProjectDetailPage.tsx client/src/components/domain/projects/
git commit -m "feat(ui): rebuild ProjectDetailPage from dettaglio-progetto.html mockup"
```

---

## Chunk 7: Task Pages

### Task 20: Build TaskListPage (Kanban + List views)

**Files:**
- Rewrite: `client/src/pages/tasks/TaskListPage.tsx`
- Create: `client/src/components/domain/tasks/KanbanColumn.tsx`
- Rewrite: `client/src/components/domain/tasks/KanbanBoard.tsx`
- Create: `client/src/components/domain/tasks/KanbanCard.tsx`

- [ ] **Step 1: Read task-kanban.html mockup**

- [ ] **Step 2: Build KanbanCard** from mockup `.k-card` (11px 12px, context badges, phase, progress, subtasks, footer)

- [ ] **Step 3: Build KanbanColumn** (280px width, colored header dot, scrollable body)

- [ ] **Step 4: Build KanbanBoard** (flex row, overflow-x auto, 5 columns)

- [ ] **Step 5: Build list view** (table with 8 columns, grouped by milestone)

- [ ] **Step 6: Build TaskListPage** with ViewToggle switching between Kanban and List

- [ ] **Step 7: Wire to hooks** — `useTasksQuery()` with filters

- [ ] **Step 8: Run verification checklist**

- [ ] **Step 9: Commit**

```bash
git add client/src/pages/tasks/TaskListPage.tsx client/src/components/domain/tasks/
git commit -m "feat(ui): rebuild TaskListPage with Kanban and List views from task-kanban.html mockup"
```

---

### Task 21: Build TaskDetailPage

**Files:**
- Rewrite: `client/src/pages/tasks/TaskDetailPage.tsx`

- [ ] **Step 1: Read dettaglio-task.html mockup**

- [ ] **Step 2: Build hero** with color bar (cyan gradient), title, DomainBadge "Task", inline-editable meta dropdowns

- [ ] **Step 3: Build tabs** (Panoramica, Attivita, Sottoattivita, Tempo)

- [ ] **Step 4: Build Panoramica tab** — description + related items + subtask checklist + time entries + attachments + activity feed

- [ ] **Step 5: Wire to hooks** — `useTaskDetailQuery(id)`, `useSubtasksQuery(taskId)`, `useTimeEntriesQuery(taskId)`

- [ ] **Step 6: Run verification checklist**

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/tasks/TaskDetailPage.tsx
git commit -m "feat(ui): rebuild TaskDetailPage from dettaglio-task.html mockup"
```

---

## Chunk 8: Remaining Pages

### Task 22: Build RiskListPage

**Files:**
- Rewrite: `client/src/pages/risks/RiskListPage.tsx`
- Create: `client/src/components/domain/risks/RiskRow.tsx`
- Create: `client/src/components/domain/risks/RiskDrawer.tsx`
- Create: `client/src/components/domain/risks/DotRating.tsx`
- Create: `client/src/components/domain/risks/RiskScore.tsx`

- [ ] **Step 1: Read rischi.html mockup**
- [ ] **Step 2: Build RiskRow, DotRating, RiskScore components**
- [ ] **Step 3: Build RiskDrawer** (420px right panel with sections)
- [ ] **Step 4: Build RiskListPage** — KpiStrip 4 + toolbar + table + drawer
- [ ] **Step 5: Wire to hooks, run checklist, commit**

```bash
git commit -m "feat(ui): rebuild RiskListPage from rischi.html mockup"
```

---

### Task 23: Build DocumentListPage

**Files:**
- Rewrite: `client/src/pages/documents/DocumentListPage.tsx`
- Create: `client/src/components/domain/documents/DocCard.tsx`
- Create: `client/src/components/domain/documents/TypePill.tsx`
- Create: `client/src/components/domain/documents/RevBadge.tsx`
- Create: `client/src/components/domain/documents/DocDrawer.tsx`

- [ ] **Step 1: Read documenti.html mockup**
- [ ] **Step 2: Build DocCard, TypePill, RevBadge components**
- [ ] **Step 3: Build DocDrawer** (400px, info grid + description + version history)
- [ ] **Step 4: Build DocumentListPage** — list view + project view + drawer
- [ ] **Step 5: Wire to hooks, run checklist, commit**

```bash
git commit -m "feat(ui): rebuild DocumentListPage from documenti.html mockup"
```

---

### Task 24: Build WeeklyReportPage

**Files:**
- Rewrite: `client/src/pages/reports/WeeklyReportPage.tsx`
- Create: `client/src/components/domain/reports/BarChart.tsx`
- Create: `client/src/components/domain/reports/DonutChart.tsx`
- Create: `client/src/components/domain/reports/Heatmap.tsx`
- Create: `client/src/components/domain/reports/ReportCard.tsx`

- [ ] **Step 1: Read report-weekly.html mockup**
- [ ] **Step 2: Build chart components** (BarChart SVG, DonutChart SVG, Heatmap grid)
- [ ] **Step 3: Build ReportCard** wrapper (bg-elevated, border, padding 16px, title)
- [ ] **Step 4: Build WeeklyReportPage** — week selector + KpiStrip + 2-col grid
- [ ] **Step 5: Wire to hooks, run checklist, commit**

```bash
git commit -m "feat(ui): rebuild WeeklyReportPage from report-weekly.html mockup"
```

---

### Task 25: Build AdminConfigPage (Users tab)

**Files:**
- Rewrite: `client/src/pages/admin/AdminConfigPage.tsx`
- Create: `client/src/components/domain/users/UserRow.tsx`
- Create: `client/src/components/domain/users/UserDrawer.tsx`
- Create: `client/src/components/domain/users/PermissionTable.tsx`
- Create: `client/src/components/domain/users/AuditLog.tsx`

- [ ] **Step 1: Read utenti.html mockup**
- [ ] **Step 2: Build UserRow, UserDrawer components**
- [ ] **Step 3: Build PermissionTable** (matrix with check/partial/denied icons)
- [ ] **Step 4: Build AuditLog** (icon dots + user + action + time list)
- [ ] **Step 5: Build AdminConfigPage** — tabs (Utenti | Permessi | Audit Log)
- [ ] **Step 6: Wire to hooks, run checklist, commit**

```bash
git commit -m "feat(ui): rebuild AdminConfigPage from utenti.html mockup"
```

---

### Task 26: Restyle Gantt view (TaskListPage gantt view mode + GanttChart)

**Note:** Gantt is a view mode inside `TaskListPage`, NOT a standalone page. There is no `GanttPage.tsx`.

**Files:**
- Modify: `client/src/pages/tasks/TaskListPage.tsx` (gantt view mode section)
- Restyle: `client/src/components/domain/gantt/GanttChart.tsx`

- [ ] **Step 1: Read gantt.html mockup** — focus on layout and visual tokens, not drag interactivity
- [ ] **Step 2: Restyle existing GanttChart** to match mockup colors, row heights (36px), bar styles, diamond markers, `var(--bg-surface)` background, `var(--border-default)` grid lines
- [ ] **Step 3: Update TaskListPage gantt view section** — 280px sidebar layout, mockup top bar styling
- [ ] **Step 4: Ensure synchronized scrolling** between sidebar and chart
- [ ] **Step 5: Wire to hooks, run checklist, commit**

```bash
git commit -m "feat(ui): restyle Gantt view from gantt.html mockup (visual only, interactivity deferred)"
```

---

## Chunk 9: Remaining Pages + Cleanup

### Task 27: Rebuild remaining detail/form pages and restyle non-mockup pages

**Files with mockup-derived patterns:**
- Rewrite: `client/src/pages/risks/RiskDetailPage.tsx` (follow Project Detail pattern)
- Rewrite: `client/src/pages/documents/DocumentDetailPage.tsx` (follow Project Detail pattern)
- Rewrite: `client/src/pages/projects/ProjectFormPage.tsx` (EntityForm shell + mockup inputs)
- Rewrite: `client/src/pages/tasks/TaskFormPage.tsx`

**Pages without mockups — restyle with mockup tokens and closest pattern:**
- Restyle: `client/src/pages/time-tracking/TimeTrackingPage.tsx` (follow TaskListPage list pattern)
- Restyle: `client/src/pages/profile/ProfilePage.tsx` (follow EntityDetail pattern)
- Restyle: `client/src/pages/analytics/AnalyticsPage.tsx` (follow Report pattern)
- Restyle: `client/src/pages/planning/PlanningDashboardPage.tsx` (follow Dashboard pattern)
- Restyle: `client/src/pages/planning/PlanningWizardPage.tsx` (follow EntityForm pattern)
- Restyle: `client/src/pages/inputs/UserInputListPage.tsx` (follow EntityList pattern)
- Restyle: `client/src/pages/inputs/UserInputDetailPage.tsx` (follow EntityDetail pattern)
- Restyle: `client/src/pages/admin/DepartmentListPage.tsx` (follow user list table pattern)
- Restyle: `client/src/pages/admin/UserListPage.tsx`, `UserDetailPage.tsx`, `UserFormPage.tsx` (follow utenti.html pattern)
- Restyle: `client/src/pages/auth/LoginPage.tsx`, `AcceptInvitationPage.tsx` (apply mockup tokens only)
- Restyle: `client/src/pages/NotFoundPage.tsx` (apply mockup tokens only)
- Restyle: Admin tabs in `client/src/pages/admin/AdminConfigPage.tsx`: WorkflowsTab, TemplatesTab, AutomationsTab, ImportExportTab, CustomFieldsTab (apply mockup tokens)

- [ ] **Step 1: Rebuild pages with mockup-derived patterns** — detail pages follow dettaglio-progetto pattern, form pages follow EntityForm shell
- [ ] **Step 2: Restyle non-mockup pages** — apply `var(--bg-surface)`, `var(--text-primary)`, `var(--border-default)` tokens, use closest mockup pattern for layout structure
- [ ] **Step 3: Run verification checklist on each**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat(ui): rebuild remaining pages with mockup styling and tokens"
```

---

### Task 28: Update CLAUDE.md

**Files:**
- Modify: `.claude/CLAUDE.md`

- [ ] **Step 1: Update the EntityList/EntityDetail/EntityForm section** to reflect they are now thin layout shells, not visual prescriptions

- [ ] **Step 2: Update the component inventory** to reflect new leaf components

- [ ] **Step 3: Update STATUS_COLORS documentation** to reflect object format `{ bg, text, border }` instead of Tailwind class strings

- [ ] **Step 4: Commit**

```bash
git commit -m "docs: update CLAUDE.md to reflect mockup-based frontend rebuild"
```

---

### Task 29: Final cross-page verification

- [ ] **Step 1: Open every page in browser and compare to its mockup HTML**
- [ ] **Step 2: Run spec Section 6 checklist on each page**
- [ ] **Step 3: Specifically scan for:**
  - Entity codes shown as primary text (PRJ-, T0-, M0-, R0-, DOC-)
  - Inconsistent spacing between pages
  - Missing hover states
  - Missing loading/empty states
  - Broken theme switching (test all 3 themes)
- [ ] **Step 4: Fix any issues found**
- [ ] **Step 5: Final commit**

```bash
git commit -m "fix(ui): address cross-page verification findings"
```
