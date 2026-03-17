# Frontend Rebuild from Mockups — Design Spec

**Date**: 2026-03-16
**Branch**: `feature/frontend-rebuild-v6`
**Mockup source**: `MockUp/` (11 HTML files)
**Approach**: Mechanical translation of mockups into React — no interpretation

---

## 0. Mockup Authority & Conflict Resolution

**When a page mockup conflicts with `projectpulse-design-system.html`, the page mockup is authoritative for that page's components.** The design system file is the fallback for patterns not present in any page mockup.

Examples of known discrepancies:
- Sidebar: design system says 220px, page mockups say 216px → **use 216px**
- KPI card padding: design system says 20px, pages say 11px 14px → **two variants, see Section 4.2**
- Badge padding: design system says 3px 8px, pages say 2px 7px → **use page values**
- Page title font: some pages use Syne, others use DM Sans → **per-page, documented in Section 5**

---

## 1. Strategy

### What stays (untouched)

| Layer | Path | Reason |
|-------|------|--------|
| TanStack Query hooks | `hooks/api/` (30 hooks) | Backend contract, stable |
| TypeScript types | `types/` | Shared with backend |
| Zustand stores | `stores/` (6 stores) | UI-only state, stable |
| shadcn/ui primitives | `components/ui/` (24) | Low-level Radix wrappers |
| Utilities | `lib/utils.ts`, `lib/api.ts`, `lib/query-client.ts` | Infrastructure |
| Router | `App.tsx` routes | Route structure stable |

### What gets rebuilt

| Layer | Why |
|-------|-----|
| `styles/globals.css` | CSS variables must match mockup design system exactly |
| `lib/constants.ts` | Colors/labels must match mockup palette |
| `lib/theme-config.ts` | Theme config aligned to mockup components |
| `components/common/` | All templates rebuilt as mockup-faithful components |
| `components/layout/` | Sidebar, Header, AppShell rebuilt from mockup |
| `components/domain/` | Domain components rebuilt from mockup |
| `components/features/` | CommandPalette, NotificationPanel rebuilt |
| `pages/` | All ~28 pages rebuilt from mockup HTML |

### Guiding principle

**Translate, don't interpret.** If the mockup says `padding: 11px 14px`, the component uses `p-[11px_14px]` or inline style. If the mockup uses `font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em`, the component does exactly that. No rounding to Tailwind defaults. No "close enough".

---

## 2. Design System — CSS Variables

Extracted directly from `MockUp/projectpulse-design-system.html`.

### CRITICAL: Dual Variable System (shadcn/ui compatibility)

The shadcn/ui primitives (`components/ui/`) use Tailwind classes like `bg-background`, `text-foreground`, `bg-card`, `bg-primary`, etc., which map to CSS variables named `--background`, `--foreground`, `--card`, etc. in HSL format (without `hsl()` wrapper).

The mockup design system uses a different naming convention (`--bg-base`, `--bg-surface`, `--text-primary`, etc.) with hex values.

**Solution: globals.css defines BOTH sets of variables.** The mockup variables are the source of truth. The shadcn variables are derived aliases:

```css
:root[data-theme="tech-hud"].dark {
  /* Mockup source variables (hex) */
  --bg-base: #0a0d12;
  --bg-surface: #10151c;
  --bg-elevated: #171e28;
  --bg-overlay: #1e2733;
  --text-primary: #e2eaf4;
  --text-secondary: #7d8fa3;
  --text-muted: #3d4f63;
  --accent: #2d8cf0;
  --border-color: #1e2733;

  /* shadcn/ui compatibility aliases (HSL) */
  --background: 216 28% 4%;       /* = --bg-base */
  --foreground: 214 52% 92%;      /* = --text-primary */
  --card: 216 24% 8%;             /* = --bg-surface */
  --card-foreground: 214 52% 92%; /* = --text-primary */
  --popover: 215 22% 12%;         /* = --bg-overlay */
  --popover-foreground: 214 52% 92%;
  --primary: 213 86% 56%;         /* = --accent */
  --primary-foreground: 0 0% 100%;
  --secondary: 215 19% 12%;       /* = --bg-elevated */
  --secondary-foreground: 214 52% 92%;
  --muted: 215 19% 12%;           /* = --bg-elevated */
  --muted-foreground: 213 17% 44%; /* = --text-muted */
  --accent-hsl: 213 86% 56%;     /* = --accent */
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 215 22% 12%;          /* = --border-color */
  --input: 215 22% 12%;
  --ring: 213 86% 56%;            /* = --accent */
}
```

This means:
- New mockup-faithful components use `var(--bg-surface)`, `var(--text-primary)`, etc.
- Existing shadcn/ui components continue using `bg-background`, `text-foreground`, etc.
- Both resolve to the same visual values.
- Each theme block defines both sets.

### 2.1 Background Levels

| Token | Tech HUD Dark | Purpose |
|-------|--------------|---------|
| `--bg-base` | `#0a0d12` | Page background |
| `--bg-surface` | `#10151c` | Cards, sidebar, panels |
| `--bg-elevated` | `#171e28` | Hover bg, nested cards, inputs |
| `--bg-overlay` | `#1e2733` | Popover, dropdown, tooltip bg |
| `--bg-hover` | `#242e3d` | Active hover state |

### 2.2 Text Levels

| Token | Tech HUD Dark | Purpose |
|-------|--------------|---------|
| `--text-primary` | `#e2eaf4` | Main text, titles |
| `--text-secondary` | `#7d8fa3` | Descriptions, secondary info |
| `--text-muted` | `#3d4f63` | Labels, placeholders, disabled |

### 2.3 Accent & Border

| Token | Tech HUD Dark | Purpose |
|-------|--------------|---------|
| `--accent` | `#2d8cf0` | Primary action color |
| `--accent-glow` | `rgba(45,140,240,0.18)` | Focus ring, glow effects |
| `--accent-dim` | `rgba(45,140,240,0.08)` | Active nav bg, subtle highlight |
| `--border` | `#1e2733` | Standard borders |
| `--border-subtle` | `#141a22` | Inner/nested borders |
| `--border-active` | `rgba(45,140,240,0.5)` | Focused/active borders |

### 2.4 Context Colors (Domain)

| Domain | Hex | Light BG | Text | Border |
|--------|-----|----------|------|--------|
| Project | `#3b82f6` | `rgba(59,130,246,0.1)` | `#60a5fa` | `rgba(59,130,246,0.25)` |
| Milestone | `#a855f7` | `rgba(168,85,247,0.1)` | `#c084fc` | `rgba(168,85,247,0.25)` |
| Task | `#22d3ee` | `rgba(34,211,238,0.1)` | `#22d3ee` | `rgba(34,211,238,0.25)` |
| Subtask | `#14b8a6` | `rgba(20,184,166,0.1)` | `#2dd4bf` | `rgba(20,184,166,0.25)` |
| Risk | `#f97316` | `rgba(249,115,22,0.1)` | `#fb923c` | `rgba(249,115,22,0.25)` |
| Document | `#eab308` | `rgba(234,179,8,0.1)` | `#facc15` | `rgba(234,179,8,0.25)` |
| Team | `#22c55e` | `rgba(34,197,94,0.1)` | `#4ade80` | `rgba(34,197,94,0.25)` |

### 2.5 Status Colors

| Status | BG | Text | Border |
|--------|-----|------|--------|
| Idle (non iniziato) | `rgba(71,85,105,0.15)` | `#94a3b8` | `rgba(71,85,105,0.3)` |
| Active (in corso) | `rgba(59,130,246,0.1)` | `#60a5fa` | `rgba(59,130,246,0.25)` |
| Review (in revisione) | `rgba(234,179,8,0.1)` | `#facc15` | `rgba(234,179,8,0.25)` |
| Done (completato) | `rgba(34,197,94,0.1)` | `#4ade80` | `rgba(34,197,94,0.25)` |
| Blocked (bloccato) | `rgba(239,68,68,0.1)` | `#f87171` | `rgba(239,68,68,0.25)` |
| Late (in ritardo) | `rgba(249,115,22,0.1)` | `#fb923c` | `rgba(249,115,22,0.25)` |

### 2.6 Typography

| Level | Family | Size | Weight | Spacing | Transform |
|-------|--------|------|--------|---------|-----------|
| Display | Syne | 36px | 800 | -1px | none |
| Heading | Syne | 22px | 700 | -0.4px | none |
| Subheading | Syne | 15px | 600 | — | none |
| Section title | Syne | 18px | 700 | -0.3px | none |
| Body | DM Sans | 14px | 400 | — | none |
| Small | DM Sans | 12px | 400-500 | — | none |
| Micro/Label | DM Sans | 10px | 500-600 | 0.08em | uppercase |
| KPI Value | Syne | 32px | 800 | -1px | none |
| KPI Value (compact) | DM Sans | 20px | 600 | -0.4px | none |

**Font imports**: Google Fonts — `Syne:wght@400;500;600;700;800` + `DM+Sans:wght@300;400;500;600`

### 2.7 Spacing & Radius

**Border radius:**
- `--radius-sm`: 5px
- `--radius`: 8px (default)
- `--radius-lg`: 12px
- Progress bars: 99px (pill)

**Key spacing values (from mockups):**
- Page horizontal padding: 28px
- Card padding: 14-16px (compact), 20px (KPI full-size in design system)
- KPI compact padding: 11px 14px (used in page mockups)
- Grid gap: 10-12px
- Section gap: 16-20px
- Sidebar expanded: 216px (from page mockups, authoritative over design system's 220px)
- Sidebar collapsed: 64px (existing behavior preserved — not in mockups but needed for UX)
- Main content margin-left: matches sidebar width

### 2.8 Shadows & Glow

```css
/* Card top light line (all cards) */
::before { height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent); }

/* Button primary hover glow */
box-shadow: 0 0 16px rgba(45,140,240,0.18), inset 0 1px 0 rgba(255,255,255,0.05);

/* KPI accent line (bottom 2px) */
position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, color1, color2);

/* Phase current glow */
box-shadow: 0 0 0 1px rgba(45,140,240,0.15);

/* Tooltip shadow */
box-shadow: 0 4px 16px rgba(0,0,0,0.4);

/* Scrollbar */
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
```

### 2.9 Progress Bar Gradients

| Context | Gradient |
|---------|----------|
| Project/Blue | `linear-gradient(90deg, #1d4ed8, #3b82f6)` |
| Milestone/Purple | `linear-gradient(90deg, #7e22ce, #a855f7)` |
| Task/Cyan | `linear-gradient(90deg, #0e7490, #22d3ee)` |
| Done/Green | `linear-gradient(90deg, #15803d, #22c55e)` |
| Late/Orange | `linear-gradient(90deg, #c2410c, #f97316)` |
| Indigo | `linear-gradient(90deg, #3730a3, #6366f1)` |

Progress fill has a shine `::after`: `width: 20px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25));`

### 2.10 Animations

```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
.ani { animation: fadeInUp 0.22s ease both; }
.d1 { animation-delay: 0.05s; }
.d2 { animation-delay: 0.10s; }
.d3 { animation-delay: 0.15s; }
.d4 { animation-delay: 0.20s; }

@keyframes shimmer {
  from { background-position: -200% 0; }
  to { background-position: 200% 0; }
}
```

---

## 3. Multi-Theme Mapping

The mockups define Tech HUD dark. The other 5 variants (Tech HUD light, Office Classic light/dark, Asana Like light/dark) map the same CSS variable names to different values.

### Implementation approach

All mockup CSS classes use CSS variables. The `globals.css` defines 6 blocks:

```css
:root[data-theme="tech-hud"].dark {
  --bg-base: #0a0d12;
  --bg-surface: #10151c;
  /* ... exact mockup values */
}
:root[data-theme="tech-hud"] {
  --bg-base: #f8fafc;
  --bg-surface: #ffffff;
  /* ... light equivalent */
}
:root[data-theme="office-classic"] { /* light */ }
:root[data-theme="office-classic"].dark { /* dark */ }
:root[data-theme="asana-like"] { /* light */ }
:root[data-theme="asana-like"].dark { /* dark */ }
```

**Theme-specific differences:**

| Property | Tech HUD | Office Classic | Asana Like |
|----------|----------|---------------|------------|
| `--radius` | 8px | 4px | 12px |
| `--radius-sm` | 5px | 3px | 8px |
| Font heading | Syne | System/Inter | Inter |
| Font body | DM Sans | System/Inter | Inter |
| Card `::before` glow | Yes (rgba 0.04) | No | No |
| KPI accent line | Yes (2px gradient) | Yes (2px solid) | No (colored left border) |
| Button hover glow | Yes (box-shadow) | No | No (scale 1.02) |
| Sidebar nav active | accent-dim bg + border | solid bg | rounded + colored bg |

The DOM structure is IDENTICAL across themes. Only CSS variables and a few theme-specific utility classes change.

---

## 4. Leaf Components (from mockups)

These are the building blocks extracted from mockup HTML. Each maps to exactly one visual pattern.

### 4.1 Layout

| Component | Source | CSS Key |
|-----------|--------|---------|
| `AppShell` | All mockups | `.app` flex, sidebar 216px fixed + `.main` margin-left 216px |
| `Sidebar` | All mockups | Fixed 216px, logo + nav sections + bottom user |
| `SidebarNavItem` | All mockups | `.nav-item` — 13px, gap 9px. **Active state uses domain color, NOT fixed accent.** Dashboard/Gantt/Report: blue `rgba(45,140,240,.08)` + `#60a5fa`. Tasks: cyan `rgba(34,211,238,.08)` + `#22d3ee`. Risks: orange `rgba(249,115,22,.08)` + `#fb923c`. Documents: yellow `rgba(234,179,8,.08)` + `#facc15`. Users: indigo `rgba(99,102,241,.1)` + `#a5b4fc`. Each nav item gets a `domainColor` prop. |
| `PageHeader` | All mockups | `.page-header` — title + domain badge + actions, padding 14px 28px |
| `Breadcrumb` | All mockups | `.breadcrumb` — 12px muted, padding 16px 28px 0 |
| `RoleToggle` | dashboard, rischi | `.role-toggle` — elevated bg, 2 buttons, active state |

### 4.2 Data Display

| Component | Source | CSS Key |
|-----------|--------|---------|
| `KpiCard` | dashboard, lista-progetti, rischi, report | **Two variants:** (a) Compact (page mockups): 11px 14px padding, value DM Sans 20px 600, used in page KPI strips. (b) Full-size (design system): 20px padding, value Syne 32px 800, used in standalone dashboard widgets. Both have: label 10px uppercase, sub 10px muted, accent bar 2px gradient at bottom, `::before` glow line. |
| `KpiStrip` | dashboard, lista-progetti | `.kpi-row` — grid 5 cols, gap 10px, padding 0 28px |
| `AlertStrip` | dashboard | `.alert-strip` — collapsible, header + body, count badges |
| `AlertRow` | dashboard | `.alert-row` — severity border-left 3px, icon box, title, sub, project, time |
| `StatusBadge` | All mockups | `.badge` + status class — 11px, 3px 8px padding, 5px radius |
| `ContextBadge` | All mockups | `.badge` + context class — same sizing, domain colors |
| `ProgressBar` | All mockups | **Three variants:** (a) Thin 3px `.prog-bar-thin` — milestone cards, list rows. (b) Standard 5px `.prog-bar` — report cards, project detail. (c) Full 6px `.progress-bar` — design system default. All have gradient fill + shine `::after`. Prop: `size="thin" | "standard" | "full"` |
| `PhasePills` | lista-progetti, dettaglio-progetto | `.phase-timeline` — done/current/upcoming pills + connectors |
| `Avatar` | All mockups | `.avatar` 28px, `.avatar-xs` 18-20px, colored bg + initials |
| `AvatarStack` | lista-progetti | `.avatar-stack` — overlapping, margin-left -8px, border 2px |
| `DomainBadge` | All mockups | `.domain-badge` — icon + label, 11px 600, domain color bg |
| `DeadlineBadge` | All mockups | `.ms-days-badge` / `.task-due` — urgent/soon/ok colors |
| `RiskScore` | rischi | `.risk-score` — 28x20px, colored by severity |
| `DotRating` | rischi | `.dot-row` — 5 dots, filled vs empty |
| `TypePill` | documenti | `.type-pill` — 10px 700 uppercase, domain-colored |
| `RevBadge` | documenti | `.rev-badge` — Syne 700, 10px, bg-overlay |

### 4.3 Cards

| Component | Source | CSS Key |
|-----------|--------|---------|
| `MilestoneCard` | dashboard | `.ms-card` — accent bar 3px left, name + project + progress + pct |
| `ProjectCard` | dashboard, lista-progetti | `.proj-card` — name + meta + progress + stats + accent bar bottom |
| `TaskItem` | dashboard, task-kanban | `.task-item` — priority bar 3px, checkbox, name, meta, deadline, avatar |
| `KanbanCard` | task-kanban | `.k-card` — 11px 12px, context badges, phase, progress, subtasks, footer |
| `DocCard` | documenti | `.doc-card` — name + rev badge + type pill + status + meta |
| `RiskRow` | rischi | Table row — severity border-left, title, project, dots, score, status, owner |
| `ActivityItem` | dettaglio-progetto | Colored dot + name + action + time |

### 4.4 Interactive

| Component | Source | CSS Key |
|-----------|--------|---------|
| `DomainTabs` | dashboard | `.domain-tabs` — full-width, equal flex, icon + label + count badge |
| `ChipFilter` | rischi, task-kanban | `.chip` — 11px 600, elevated bg, active with domain color |
| `ViewToggle` | lista-progetti, documenti | Button group — icon buttons, active with bg-overlay |
| `SearchBox` | All lists | `.search-box` — icon + input, elevated bg, focus ring |
| `Drawer` | rischi, documenti, utenti | Fixed right panel 380-420px, header + body + footer |

### 4.5 Page Sections

| Component | Source | CSS Key |
|-----------|--------|---------|
| `MilestoneGrid` | dashboard | `.ms-grid` — 3 cols, MilestoneCard items |
| `TaskColumns` | dashboard | `.task-columns` — 2-3 cols, header + task items |
| `ProjectGrid` | dashboard, lista-progetti | `.proj-grid` — 3 cols, ProjectCard items |
| `CalendarPanel` | dashboard | `.cal-layout` — 320px widget + events panel |
| `GanttChart` | gantt | Sidebar 280px + header + bars + diamonds + dependencies |
| `PermissionTable` | utenti | `.perm-table` — check/partial/no icons per role×action |
| `AuditLog` | utenti | `.log-list` — icon + user + action + time |
| `WeeklyReportGrid` | report-weekly | 2-col grid of cards (bar chart, donut, progress, risks, team) |

---

## 5. Page Specifications

For each page: mockup source, layout, sections top-to-bottom, data displayed.

**Page title font**: All page mockups use `DM Sans 22px 700 -0.3px` for `.page-title`, NOT Syne. Syne is used for KPI values (32px) and display text (36px) in the design system, and for logo text.

### 5.1 Dashboard / HomePage

**Mockup**: `dashboard.html`
**Title**: "Command Center"
**Layout**: Full width, vertical sections

**Sections (top to bottom):**

1. **Breadcrumb**: Workspace > Dashboard
2. **PageHeader**: DomainBadge "Dashboard" + title "Command Center" + subtitle "Panoramica operativa — {date}" + actions (Cerca, Nuovo Task)
3. **RoleToggle**: Direzione / Dipendente + date chip + role info
4. **KpiStrip (5 cards)**: Progetti attivi, Task aperti, Ore settimana, Rischi attivi, Budget usato — each with value + delta + sub + accent bar
5. **AlertStrip**: Collapsible, severity count badges, AlertRow items
6. **DomainTabs**: Milestone (count) | Calendario (count) | Task (count) | Progetti (count)
7. **Tab panels**:
   - **Milestone**: 3-col grid of MilestoneCards
   - **Calendar**: CalendarPanel (mini calendar + event list)
   - **Task**: TaskColumns (2-3 cols: my tasks, team tasks, blocked)
   - **Projects**: 3-col grid of ProjectCards

**Role views:**
- Direzione: aggregated team data, all projects
- Dipendente: personal data, "I miei task", "Le mie ore"

### 5.2 Project List

**Mockup**: `lista-progetti.html`
**Title**: "Progetti"
**Layout**: Full width, vertical sections

**Sections:**
1. **Breadcrumb + PageHeader**: DomainBadge "Progetto" + title + subtitle + "Nuovo progetto" button
2. **KpiStrip (5)**: Totale, In corso, In ritardo, Completati, Task aperti
3. **Toolbar**: SearchBox + filter buttons (status, priority) + ViewToggle (list/grid)
4. **List view**: Table with columns — Checkbox | Name (+ meta counts) | Status | Progress (bar + fraction) | Phases (pips) | Team (avatar stack) | Deadline | Actions
   - Row: bg-surface, border 1px, accent bar 3px left, hover state
   - **Name shows human-readable name, NOT code**. Code in meta line as muted text.
5. **Grid view**: 3-col auto-fill (min 340px), ProjectCard with progress + phases + stats + next action chip

### 5.3 Project Detail

**Mockup**: `dettaglio-progetto.html`
**Title**: Project name (human-readable)
**Layout**: Full width, tabbed

**Sections:**
1. **Breadcrumb**: Progetti > {project name}
2. **Hero**: Color bar 4px gradient left + title 24px + DomainBadge + status/milestone/deadline badges
3. **KPI Row (5 mini cards)**: Avanzamento (% + bar), Task (open/closed), Ore (+ weekly), Rischi (+ critical), Team (avatars)
4. **Sticky Tabs**: Panoramica | Task (count) | Rischi (count) | Documenti (count)
5. **Tab: Panoramica**:
   - Phase timeline card (PhasePills)
   - 2-col grid: Progress chart (SVG area) | Activity log
   - Team section (member cards)
6. **Tab: Task**:
   - Milestone hierarchy: expandable MilestoneCard headers with nested TaskItem rows
   - Subtask nesting with left border indent
   - Add task button per milestone
7. **Tab: Rischi**: Risk cards with severity
8. **Tab: Documenti**: Document cards with version/status

### 5.4 Task Detail

**Mockup**: `dettaglio-task.html`
**Title**: Task name (human-readable)
**Layout**: Full width, tabbed

**Sections:**
1. **Breadcrumb**: Progetti > {project} > {milestone} > {task name}
2. **Hero**: Color bar 3px cyan gradient + title + DomainBadge "Task" + inline-editable meta (status, priority, assignee, project, milestone, deadline)
3. **Tabs**: Panoramica | Attivita | Sottoattivita | Tempo
4. **Tab: Panoramica**:
   - Description (editable textarea, 13px, code blocks in cyan)
   - Related items (blocks/related links)
   - Subtask checklist (add row + items)
   - Time entries (dot + description + hours)
   - Attachments (icon + name + meta + download)
   - Activity feed (dot + name + action + time + comments)

### 5.5 Task Kanban

**Mockup**: `task-kanban.html`
**Title**: "Task"
**Layout**: Horizontal kanban columns

**Sections:**
1. **PageHeader + Toolbar**: Search + filters + ViewToggle (Kanban/List)
2. **Kanban view**: 5 columns (Da iniziare, In corso, In revisione, Completato, Bloccato)
   - Column: 280px fixed width, scrollable, colored header dot
   - KanbanCard: 11px 12px padding, title + context badges + phase + progress + subtasks + footer (date + avatar)
   - Quick actions on hover
3. **List view**: Table with 8 columns — Checkbox | Name (+subtask expand) | Context | Status | Phase | Deadline | Assignee | Actions
   - Grouped by milestone with collapse/expand

### 5.6 Gantt

**Mockup**: `gantt.html`
**Title**: "Pianificazione"
**Layout**: Split — sidebar 280px + timeline

**Sections:**
1. **Top bar**: DomainBadge + title + zoom toggle (Settimana/Mese/Trimestre) + RoleToggle + buttons
2. **Gantt sidebar** (280px): Hierarchical rows — Project (12px 700) > Milestone (11px 600, indent 22px) > Task (11px, indent 36px). Row height 36px.
3. **Gantt chart**: Column headers (months + weeks), grid lines, today line (blue 2px)
   - Project bars: colored with progress overlay
   - Milestone diamonds: 16px rotated square
   - Task bars: colored with label + avatar, resize handles
   - Dependency arrows: dashed SVG paths
4. **Tooltip on hover**: Task name + dates + progress + assignee

### 5.7 Risk Register

**Mockup**: `rischi.html`
**Title**: "Registro Rischi"
**Layout**: Full width, table

**Sections:**
1. **PageHeader + RoleToggle**
2. **KpiStrip (4)**: Totale, Critici, In mitigazione, Chiusi
3. **Toolbar**: Search + project select + severity chips + status chips
4. **Table**: ID (muted) | Title + linked tasks | Project | Severity badge | Probability dots | Impact dots | Score badge | Status | Owner | Actions
   - Row: severity border-left 3px (red/orange/yellow)
   - Hover: show detail + edit buttons
5. **Detail drawer** (420px): Parameters grid + description + mitigation plan + linked tasks + history

### 5.8 Documents

**Mockup**: `documenti.html`
**Title**: "Documenti"
**Layout**: Full width, table or grouped

**Sections:**
1. **PageHeader**: Export + Upload buttons
2. **KpiStrip (4)**: Totale, Approvati, In revisione, Bozza
3. **Toolbar**: Search + project select + type select + status select + ViewToggle
4. **List view**: Table — Name (+filename) | TypePill | Project | RevBadge | Status | Owner | Updated | Actions
5. **Project view**: Collapsible project groups, 3-col grid of DocCards inside each
6. **Detail drawer** (400px): Info grid + description + version history + download button

### 5.9 Weekly Report

**Mockup**: `report-weekly.html`
**Title**: "Report Settimanale"
**Layout**: Full width, card grid

**Sections:**
1. **PageHeader + week selector** (nav arrows + date range + week chip + view toggle week/month/quarter)
2. **KpiStrip** (scrollable row): KPI cards with bar at bottom
3. **2-col grid of report cards**:
   - Ore per giorno (bar chart, 5 bars Mon-Fri)
   - Distribuzione task (donut chart + legend)
   - Avanzamento progetti (project rows with progress bars)
   - Rischi aperti (risk rows with severity + project)
   - Carico team (team rows with hours + task count)
   - Milestone in scadenza (milestone items with dots + date)
   - Task completati / aperti (task table)
   - Heatmap attivita (12x5 grid of colored squares)

### 5.10 Users / Admin

**Mockup**: `utenti.html`
**Title**: "Gestione Utenti"
**Layout**: Tabbed

**Sections:**
1. **Tabs**: Utenti | Permessi | Audit Log
2. **Tab: Utenti**:
   - KpiStrip (5): Totale, Attivi, Admin, Direzione, Dipendenti
   - Toolbar: Search + role filter + status filter
   - Table: Avatar+Name+Email | Role chip | Status | Last access | Projects assigned | Actions
   - Detail drawer (380px): Edit form with role, status, projects
3. **Tab: Permessi**:
   - Permission matrix table: Action rows × Role columns
   - Icons: check (green), partial (yellow), denied (gray)
   - Legend at bottom
4. **Tab: Audit Log**:
   - Filters (user, action type, date range)
   - Log list: Icon dot + user + action + details + time

---

## 6. Per-Page Verification Checklist

Run this checklist on EVERY page before marking it complete:

### Content & Data
- [ ] **No entity codes as primary text** — scan for PRJ-, T0, M0, R0, DOC- patterns in visible text. Names must be primary. Codes only as `text-muted` secondary detail.
- [ ] **All data labels match mockup** — same wording, same position
- [ ] **Data hierarchy is clear** — most important info is largest/brightest, secondary is smaller/muted
- [ ] **Empty states** — what shows when data is empty? Use EmptyState component.
- [ ] **Loading states** — skeleton shimmer animation while fetching

### Layout & Spacing
- [ ] **Page padding matches mockup** — 28px horizontal, sections use mockup-exact gaps
- [ ] **Card padding matches mockup** — 11-14px for compact, 16px for standard, 20px for KPI
- [ ] **Grid columns match mockup** — exact column counts and min-widths
- [ ] **No max-w-* or mx-auto** — AppShell handles centering

### Visual Fidelity
- [ ] **Colors use CSS variables** — no hardcoded hex in components
- [ ] **Fonts match mockup** — Syne for headings/values, DM Sans for body/labels
- [ ] **Font sizes match mockup** — 10px labels, 12px body, 20-32px values
- [ ] **Badge styling matches** — correct bg/text/border per status/context
- [ ] **Progress bars have gradients** — correct gradient per domain, shine ::after
- [ ] **Cards have ::before glow line** — subtle top gradient (Tech HUD)
- [ ] **KPI cards have accent bar** — 2px gradient at bottom
- [ ] **Hover states work** — border-active, bg-elevated on cards; show actions on rows

### Consistency Across Pages
- [ ] **Same StatusBadge component everywhere** — not inline styles
- [ ] **Same ProgressBar component** — gradient + shine, not plain colored div
- [ ] **Same Avatar component** — 28px standard, 18-20px small, colored bg
- [ ] **Same typography scale** — not ad-hoc font sizes
- [ ] **Animations** — fadeInUp stagger on page load sections

### Accessibility & Polish
- [ ] **Dark/light mode works** — toggle doesn't break layout
- [ ] **All 3 themes render correctly** — same structure, different token values
- [ ] **Focus states visible** — accent ring on interactive elements
- [ ] **Scrollbar styled** — 5px, subtle thumb

---

## 7. Implementation Order

Each page builds on shared components. Order to minimize rework:

### Phase 0: Foundation (no pages yet)
1. `globals.css` — all 6 theme blocks with exact mockup values
2. Google Fonts — Syne + DM Sans imports
3. `lib/constants.ts` — colors/labels aligned to mockup palette
4. `lib/theme-config.ts` — simplified, no icon interpretation

### Phase 1: Layout Shell
5. `Sidebar` — from mockup sidebar (all pages share it)
6. `AppShell` — sidebar + main container
7. `PageHeader` — title + domain badge + actions
8. `Breadcrumb` — simplified from mockup

### Phase 2: Core Leaf Components
9. `StatusBadge` — mockup `.badge` + status classes
10. `ContextBadge` / `DomainBadge` — mockup domain colors
11. `ProgressBar` — gradient + shine, configurable color
12. `Avatar` / `AvatarStack` — 28px/18px, stack overlap
13. `KpiCard` — compact (11px 14px) with label/value/sub/accent bar
14. `KpiStrip` — grid row of KpiCards
15. `AlertStrip` + `AlertRow` — collapsible, severity rows
16. `DeadlineBadge` — urgent/soon/ok colors
17. `PhasePills` — done/current/upcoming + connectors
18. `SearchBox` — icon + input + focus ring
19. `ChipFilter` — toggle chips with domain colors
20. `ViewToggle` — icon button group
21. `RoleToggle` — 2-button toggle with role colors
22. `EmptyState` — dashed border, icon box, title, sub, action

### Phase 3: Pages (one at a time, verify each)
23. **Dashboard** (HomePage) — most complex, uses most components
24. **Project List** (ProjectListPage) — list + grid views
25. **Project Detail** (ProjectDetailPage) — tabs + milestone hierarchy
26. **Task Kanban** (TaskListPage kanban view) — 5 columns
27. **Task List** (TaskListPage list view) — grouped table
28. **Task Detail** (TaskDetailPage) — editable fields + tabs
29. **Gantt** (GanttPage) — split layout, bars + diamonds
30. **Risk Register** (RiskListPage) — table + drawer
31. **Documents** (DocumentListPage) — table + project view + drawer
32. **Weekly Report** (WeeklyReportPage) — card grid + charts
33. **Users/Admin** (AdminConfigPage users tab) — table + drawer + permissions + audit

### Phase 4: Remaining pages (no mockup — follow closest pattern)
34. Risk detail, Document detail, etc. — follow Project Detail pattern
35. Form pages (create/edit) — EntityForm shell restyled with mockup tokens (see Section 9.4)
36. AdminConfigPage other tabs — follow Users tab pattern
37. NotificationPanel + CommandPalette — restyle to mockup aesthetic (see Section 9.3)

---

## 8. Technical Decisions

### CSS approach

Components use a mix of:
- **CSS variables** in `globals.css` for theme tokens
- **Tailwind utility classes** where they match mockup values exactly (e.g., `flex`, `gap-3`, `rounded-lg`)
- **Custom CSS classes** in `globals.css` for mockup-specific patterns that Tailwind can't express cleanly (e.g., `.kpi-accent-line`, `.progress-fill::after` shine, `.card::before` glow)
- **Arbitrary Tailwind values** for exact mockup values: `p-[11px_14px]`, `text-[10px]`, `tracking-[0.08em]`

This is NOT a pure-Tailwind approach. The mockups define specific visual effects (gradients, pseudo-elements, glow) that require custom CSS. Trying to force everything into Tailwind utilities would lose fidelity.

### Component file structure

```
components/
├── layout/
│   ├── AppShell.tsx
│   ├── Sidebar.tsx
│   ├── PageHeader.tsx
│   └── Breadcrumb.tsx
├── common/
│   ├── KpiCard.tsx
│   ├── KpiStrip.tsx
│   ├── AlertStrip.tsx
│   ├── AlertRow.tsx
│   ├── StatusBadge.tsx
│   ├── ContextBadge.tsx
│   ├── DomainBadge.tsx
│   ├── ProgressBar.tsx
│   ├── PhasePills.tsx
│   ├── Avatar.tsx
│   ├── AvatarStack.tsx
│   ├── DeadlineBadge.tsx
│   ├── SearchBox.tsx
│   ├── ChipFilter.tsx
│   ├── ViewToggle.tsx
│   ├── RoleToggle.tsx
│   ├── EmptyState.tsx
│   ├── Drawer.tsx
│   └── Skeleton.tsx
├── domain/
│   ├── dashboard/      # MilestoneGrid, TaskColumns, ProjectGrid, CalendarPanel
│   ├── projects/       # MilestoneCard, ProjectCard, PhaseTimeline
│   ├── tasks/          # TaskItem, KanbanCard, KanbanColumn
│   ├── gantt/          # GanttSidebar, GanttChart, GanttBar, GanttDiamond
│   ├── risks/          # RiskRow, RiskDrawer, DotRating, RiskScore
│   ├── documents/      # DocCard, DocRow, TypePill, RevBadge, DocDrawer
│   ├── reports/        # BarChart, DonutChart, Heatmap, ReportCard
│   └── users/          # UserRow, UserDrawer, PermissionTable, AuditLog
├── ui/                 # shadcn/ui primitives (unchanged)
└── features/           # CommandPalette, NotificationPanel
```

### EntityList/EntityDetail/EntityForm — Rebuilt, not removed

The previous template components were too generic and produced uniform-looking pages. The new approach:

1. **EntityList, EntityDetail, EntityForm still exist** (CLAUDE.md requires them), but they are **rebuilt with mockup-faithful internals**
2. They become **thin layout shells** that provide:
   - EntityList: page padding, toolbar slot, content area, pagination, empty state
   - EntityDetail: breadcrumb, hero slot, tabs infrastructure, sidebar slot
   - EntityForm: breadcrumb, card container, action buttons
3. **All visual personality comes from page-specific content** passed into these shells
4. The templates do NOT impose card styles, font sizes, or data layouts — they only handle structural layout (grid, scroll, sticky tabs)
5. Each page passes domain-specific components (KpiStrip, MilestoneGrid, TaskColumns, etc.) into the template slots

This preserves the CLAUDE.md architectural rule while allowing each page to look exactly like its mockup.

**CLAUDE.md will be updated** to reflect that the templates are layout shells, not visual prescriptions.

### Data display rules (hardcoded in components)

1. **Entity name is always the primary label** — `font-weight: 600`, `color: var(--text-primary)`
2. **Entity code is optional secondary** — `font-size: 10px`, `color: var(--text-muted)`, shown in meta line
3. **Dates use short format** — "20 mar", "3 giu 2025" (not ISO, not long)
4. **Relative times** — "2 ore fa", "ieri, 16:42", "9gg"
5. **Numbers with units** — "142h", "68%", "€142k"
6. **Status always via StatusBadge** — never inline colored text

---

## 9. Additional Specifications (from review)

### 9.1 Button Domain Variants

Mockups use domain-colored primary buttons, not just one blue primary:

| Variant | Background | Color | Border | Used on |
|---------|-----------|-------|--------|---------|
| `btn-primary` (blue) | `rgba(59,130,246,.12)` | `#60a5fa` | `rgba(59,130,246,.35)` | Dashboard, Projects |
| `btn-primary-cyan` | `rgba(34,211,238,.12)` | `#22d3ee` | `rgba(34,211,238,.35)` | Task pages |
| `btn-primary-orange` | `rgba(249,115,22,.12)` | `#fb923c` | `rgba(249,115,22,.35)` | Risk pages |
| `btn-primary-yellow` | `rgba(234,179,8,.12)` | `#facc15` | `rgba(234,179,8,.35)` | Document pages |

Implementation: Button accepts an optional `domainColor` prop. Default is blue.

### 9.2 Pagination

Mockups don't show pagination controls, but production needs them. Rules:
- Use existing `PaginationControls` component, restyled to match mockup aesthetic (bg-surface, border, compact)
- Pagination sits below the content area, inside the EntityList shell
- Style: same as mockup toolbar buttons — bg-elevated, border 1px, 11px font
- Default 20 items per page (existing backend contract)

### 9.3 NotificationPanel & CommandPalette

No mockup exists for these. Rules:
- **CommandPalette**: Keep existing implementation, restyle to mockup aesthetic (bg-overlay, border, accent active state). Deferred to Phase 4.
- **NotificationPanel**: Keep slide-over pattern, restyle internals to match AlertRow pattern from dashboard mockup. Deferred to Phase 4.

### 9.4 Form Pages (Create/Edit)

No mockup exists. Rules:
- Keep EntityForm as layout shell (breadcrumb + card + action buttons)
- Restyle card to match mockup `.card` pattern (bg-surface, border, `::before` glow, padding 16px)
- Form inputs use mockup `.form-input` style: bg-elevated, border, radius-sm, 13px, focus ring with accent-glow
- Labels: 12px 500 secondary color, 6px bottom margin
- Error states: border `rgba(239,68,68,0.5)`, message 11px red

### 9.5 Role-Based Visibility

The permission matrix from CLAUDE.md still applies to all rebuilt pages:
- "Nuovo progetto" button: only `admin` / `direzione`
- Delete actions: only `admin`
- Edit actions: only `admin` / `direzione`
- Employee view: own tasks/hours only
- Use `isPrivileged(user.role)` from `lib/constants` for checks
- Hide (don't just disable) actions the user cannot perform

### 9.6 Gantt Complexity

The Gantt page is the most complex component (~51KB of mockup HTML). Implementation approach:
- Keep existing `GanttChart` component in `components/domain/gantt/` as a starting point
- Restyle it to match mockup visual tokens (colors, bars, diamonds, row heights)
- **Deferred features**: drag-to-resize, dependency arrow editing, drag-to-move — implement visual display first, interactivity as follow-up
- Synchronized scrolling between sidebar and chart is required from day 1

### 9.7 Non-Tech-HUD Theme Values

The mockups only define Tech HUD dark. For the other 5 variants:
- **Tech HUD light**: Invert the background scale (light → dark for base/surface/elevated), keep same accent/status colors but adapt for light background
- **Office Classic**: Use existing `globals.css` values as starting point, align spacing/radius to mockup spec (radius 4px, no glow, no `::before` gradient, Syne replaced with Inter/system)
- **Asana Like**: Use existing values, radius 12px, no glow, softer shadows, Inter font

**These are generated AFTER Tech HUD dark is pixel-perfect.** The structure is identical — only CSS variable values differ. Phase 4 work.

---

## 10. What This Spec Does NOT Cover

- Backend API changes (none needed)
- TanStack Query hook changes (none needed unless API response shape changes)
- Mobile responsive (mockups are desktop — mobile is a follow-up)
- Accessibility audit beyond basic focus states
- E2E tests (follow-up)
- Performance optimization (follow-up after visual fidelity is confirmed)
