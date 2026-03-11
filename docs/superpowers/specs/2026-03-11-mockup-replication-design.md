# Mockup Replication — Design Spec

> **Goal**: Replicare pixel-accurate nel codebase ProjectPulse i mockup HTML della cartella `mockup/`, aggiornando design tokens, componenti e pagine per tutti e 3 i temi.

**Source**: 11 file HTML in `mockup/` (design system + 10 pagine)
**Branch**: `feature/ux-redesign-jarvis`

---

## Decisioni prese

| Decisione | Scelta |
|-----------|--------|
| Scope temi | Tutti e 3 aggiornati (mockup guida Tech HUD, gli altri adattati) |
| Radius Tech HUD | 8px/5px (dal mockup, rimpiazza 2px) |
| Font | Syne + DM Sans solo per Tech HUD; Inter per Office Classic/Asana Like |
| Integrazione template | Estendere EntityList/EntityDetail/EntityForm con nuove prop |
| Fedeltà | Pixel-accurate rispetto al mockup |
| Backend | Nuove API se necessario per KPI/alert/aggregati |

---

## Layer 0: Design Tokens

### 0.1 Aggiornamento `globals.css` — Tech HUD

Il mockup definisce un set di colori diverso dall'attuale tech-hud. Cambio principale: **accent da cyan a blue** (`#2d8cf0`), sfondo più scuro (`#0a0d12`), radius da 2px a 8px.

**Variabili da aggiornare in `globals.css`** per `[data-theme="tech-hud"]`:

```css
/* Tech HUD Light — derivata dal mockup dark con luminosità invertita */
:root[data-theme="tech-hud"] {
  --background: 210 20% 98%;       /* invariato (light mode) */
  --foreground: 215 25% 12%;       /* testo scuro */
  --card: 210 15% 96%;
  --card-foreground: 215 25% 12%;
  --popover: 210 15% 96%;
  --popover-foreground: 215 25% 12%;
  --primary: 211 89% 56%;          /* #2d8cf0 → HSL ≈ 211 89% 56% */
  --primary-foreground: 0 0% 100%;
  --secondary: 215 15% 92%;
  --secondary-foreground: 215 25% 25%;
  --muted: 215 15% 92%;
  --muted-foreground: 215 15% 50%;
  --accent: 211 89% 56%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;
  --border: 215 15% 88%;
  --input: 215 15% 88%;
  --ring: 211 89% 56%;
  --success: 142 71% 45%;
  --success-foreground: 0 0% 100%;
  --warning: 32 95% 44%;
  --warning-foreground: 0 0% 100%;
  --info: 211 89% 56%;
  --info-foreground: 0 0% 100%;
  --radius: 0.5rem;                /* 8px — dal mockup */
  --radius-sm: 0.3125rem;          /* 5px — dal mockup */
  --font-data: 'JetBrains Mono', monospace;
  --font-heading: 'Syne', sans-serif;
  --font-body: 'DM Sans', sans-serif;
  --shadow-theme: 0 1px 4px 0 rgb(0 0 0 / 0.08);
}

/* Tech HUD Dark — dal mockup, pixel-accurate */
:root[data-theme="tech-hud"].dark {
  --background: 216 35% 4%;        /* #0a0d12 → HSL ≈ 216 35% 4% */
  --foreground: 212 40% 92%;       /* #e2eaf4 → HSL ≈ 212 40% 92% */
  --card: 215 28% 9%;              /* #10151c → HSL ≈ 215 28% 9% */
  --card-foreground: 212 40% 92%;
  --popover: 214 22% 13%;          /* #171e28 → HSL ≈ 214 22% 13% */
  --popover-foreground: 212 40% 92%;
  --primary: 211 89% 56%;          /* #2d8cf0 */
  --primary-foreground: 0 0% 100%;
  --secondary: 214 22% 13%;
  --secondary-foreground: 212 25% 55%;
  --muted: 213 20% 18%;            /* #1e2733 → HSL ≈ 213 20% 18% */
  --muted-foreground: 213 17% 44%; /* #3d4f63 → HSL ≈ 213 17% 44% */
  --accent: 211 89% 56%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;
  --border: 213 20% 16%;           /* #1e2733 */
  --input: 215 25% 11%;            /* #141a22 */
  --ring: 211 89% 56%;
  --success: 142 71% 45%;
  --success-foreground: 0 0% 100%;
  --warning: 25 95% 53%;
  --warning-foreground: 0 0% 100%;
  --info: 211 89% 56%;
  --info-foreground: 0 0% 100%;
  --radius: 0.5rem;
  --radius-sm: 0.3125rem;
  --font-data: 'JetBrains Mono', monospace;
  --font-heading: 'Syne', sans-serif;
  --font-body: 'DM Sans', sans-serif;
  --shadow-theme: 0 0 8px 0 rgba(45, 140, 240, 0.18);

  /* Nuove variabili mockup-specific */
  --bg-elevated: 214 22% 13%;     /* #171e28 — hover/pannelli */
  --bg-overlay: 213 20% 18%;      /* #1e2733 — overlay, modals */
  --bg-hover: 213 22% 21%;        /* #242e3d — hover interattivo */
  --accent-glow: rgba(45, 140, 240, 0.18);
  --accent-dim: rgba(45, 140, 240, 0.08);
  --border-active: rgba(45, 140, 240, 0.5);
  --border-subtle: 216 25% 8%;    /* #141a22 */
}
```

### 0.2 Nuove CSS variables condivise (tutti i temi)

Aggiungere a tutti i temi in `globals.css`:

```css
/* Gradient progress per contesto — usati da ProgressGradient */
--gradient-project: linear-gradient(90deg, #1d4ed8, #3b82f6);
--gradient-milestone: linear-gradient(90deg, #7e22ce, #a855f7);
--gradient-task: linear-gradient(90deg, #0e7490, #22d3ee);
--gradient-success: linear-gradient(90deg, #15803d, #22c55e);
--gradient-warning: linear-gradient(90deg, #c2410c, #f97316);
--gradient-danger: linear-gradient(90deg, #b91c1c, #ef4444);
```

### 0.3 Font import

In `index.html` (o `globals.css`), aggiungere Google Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
```

### 0.4 `tailwind.config.js`

Aggiornare `fontFamily`:

```javascript
fontFamily: {
  sans: ['var(--font-body, Inter)', 'system-ui', 'sans-serif'],
  heading: ['var(--font-heading, Inter)', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
  data: ['var(--font-data, inherit)'],
},
```

Aggiungere `borderRadius`:

```javascript
borderRadius: {
  lg: "var(--radius)",
  md: "calc(var(--radius) - 2px)",
  sm: "var(--radius-sm, calc(var(--radius) - 4px))",
},
```

Aggiungere `boxShadow` per glow:

```javascript
boxShadow: {
  'glow': '0 0 16px var(--accent-glow, rgba(45,140,240,0.18))',
  'glow-sm': '0 0 8px var(--accent-glow, rgba(45,140,240,0.12))',
},
```

### 0.5 Aggiornamento Office Classic e Asana Like

I pattern del mockup (progress gradient, avatar stack, KPI) funzionano con i token già esistenti. Le uniche modifiche necessarie per questi 2 temi:

- `--font-heading` e `--font-body`: per office-classic e asana-like rimangono `Inter, system-ui, sans-serif`
- I gradienti progress usano gli stessi colori Tailwind in tutti i temi (sono colori di dominio, non di tema)
- L'accent-glow non si applica per office-classic (shadow-sm standard) e asana-like (shadow-md soft)

---

## Layer 1: Nuovi Componenti Centralizzati

Tutti in `client/src/components/common/`. Tutti usano token semantici, `cn()`, shadcn/ui dove applicabile.

### 1.1 `KpiStrip`

```typescript
interface KpiCard {
  label: string
  value: string | number
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' }
  subtitle?: string
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'cyan'
  icon?: LucideIcon
}

interface KpiStripProps {
  cards: KpiCard[]
  className?: string
}
```

**Render**: griglia responsive (`grid-cols-2 md:grid-cols-3 lg:grid-cols-5`), ogni card con:
- Label uppercase 10px muted
- Valore grande (font-heading 2xl font-extrabold)
- Trend badge con freccia colorata
- Subtitle muted
- Barra colorata bottom 2px con gradiente contesto
- Hover: translateY(-1px), border-color primary

### 1.2 `EditableBadge`

```typescript
interface EditableBadgeOption {
  value: string
  label: string
  color?: string
  icon?: React.ReactNode
}

interface EditableBadgeProps {
  value: string
  options: EditableBadgeOption[]
  onChange: (value: string) => void
  variant?: 'status' | 'priority' | 'user' | 'project' | 'date'
  disabled?: boolean
  className?: string
}
```

**Render**: usa Popover di shadcn/ui. Il trigger è un Badge con dot colorato. Il content è un Command list con search (per user/project) o list semplice (per status/priority). Per `variant="date"` mostra un mini calendario inline.

### 1.3 `PhasePips`

```typescript
interface PhasePip {
  key: string
  label: string
  status: 'done' | 'current' | 'upcoming' | 'late'
}

interface PhasePipsProps {
  phases: PhasePip[]
  currentPhaseLabel?: string
  compact?: boolean  // mini (solo pips senza label) vs full (con pills)
  className?: string
}
```

**Render compact** (per liste): flex row di cerchietti 4px colorati (green done, blue current con glow, gray upcoming, orange late).
**Render full** (per detail): pills orizzontali con connettori e checkmark/dot/circle, come nel mockup.

### 1.4 `AvatarStack`

```typescript
interface AvatarStackProps {
  users: Array<{ id: string; name: string; initials?: string }>
  max?: number  // default 3, overflow come "+2"
  size?: 'sm' | 'md'  // sm: 22px, md: 28px
  className?: string
}
```

**Render**: flex row con margin-left negativo (-7px per sm, -8px per md). Usa shadcn Avatar. Overflow: cerchio muted con "+N".

### 1.5 `AlertStrip`

```typescript
interface AlertItem {
  id: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  subtitle?: string
  projectName?: string
  time: string
}

interface AlertStripProps {
  alerts: AlertItem[]
  collapsible?: boolean
  className?: string
}
```

**Render**: Card con header (conteggi per severity + toggle chevron). Body collassabile con lista alert, ciascuno con 3px left border colorato per severity, icona, testo, tag progetto.

### 1.6 `DotRating`

```typescript
interface DotRatingProps {
  value: number   // 1-3 o 1-5
  max?: number    // default 3
  color?: string  // Tailwind color class
  className?: string
}
```

**Render**: row di cerchi 6px. Filled = color, empty = border muted. Per probability/impact nei rischi.

### 1.7 `ProgressGradient`

```typescript
interface ProgressGradientProps {
  value: number            // 0-100
  context: 'project' | 'milestone' | 'task' | 'success' | 'warning' | 'danger'
  height?: 'sm' | 'md'    // sm: 3px (liste), md: 6px (dettaglio)
  showLabel?: boolean      // mostra percentuale
  className?: string
}
```

**Render**: barra con sfondo muted, fill con `var(--gradient-{context})`, `border-radius: 99px`, `transition: width 0.6s cubic-bezier(0.4,0,0.2,1)`.

### 1.8 `RoleSwitcher`

```typescript
interface RoleSwitcherProps {
  value: 'direzione' | 'dipendente'
  onChange: (role: 'direzione' | 'dipendente') => void
  className?: string
}
```

**Render**: 2 button, active ha bg-primary/10 + border-primary/30, inactive ha bg-card. Con icone Shield/User.

### 1.9 `ViewToggle`

```typescript
interface ViewToggleProps {
  value: 'list' | 'grid'
  onChange: (view: 'list' | 'grid') => void
  className?: string
}
```

**Render**: 2 icon button (LayoutList / LayoutGrid). Active ha bg-primary/10 + accent color.

### 1.10 `DrawerDetail`

```typescript
interface DrawerDetailProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  badges?: React.ReactNode
  infoGrid?: Array<{ label: string; value: React.ReactNode }>
  children?: React.ReactNode
  actions?: React.ReactNode
}
```

**Render**: usa shadcn Sheet (side="right"). Layout interno: header + info grid 2 colonne + content scrollabile + footer actions.

### 1.11 `ActivityFeed`

```typescript
interface ActivityItem {
  id: string
  type: 'comment' | 'system'
  user?: { name: string; initials: string }
  action: string
  target?: string
  content?: string   // testo commento
  time: string
  color?: string
}

interface ActivityFeedProps {
  items: ActivityItem[]
  maxItems?: number
  showInput?: boolean
  onComment?: (text: string) => void
  className?: string
}
```

**Render**: lista verticale. Per comment: avatar + nome bold + azione + timestamp + box testo. Per system: dot colorato + testo. Input commento in cima se `showInput`.

### 1.12 `NextActionChip`

```typescript
interface NextActionChipProps {
  action: 'advance' | 'unblock' | 'approve' | 'report' | 'review'
  onClick: () => void
  size?: 'sm' | 'md'
  className?: string
}
```

**Render**: chip con icona + label. Colore basato su action: advance=primary, unblock=warning, approve=amber, report=success, review=info.

---

## Layer 2: Estensione Template

### 2.1 `EntityList` — Nuove prop

```typescript
// Aggiunte alla interface esistente EntityListProps<T>
interface EntityListProps<T> {
  // ... existing props ...

  // NEW: KPI strip sopra la lista
  kpiStrip?: KpiCard[]

  // NEW: View toggle list/grid
  viewMode?: 'list' | 'grid'
  onViewModeChange?: (mode: 'list' | 'grid') => void
  gridRenderItem?: (item: T) => React.ReactNode  // card renderer per grid view

  // NEW: Role switcher
  roleSwitcher?: {
    value: 'direzione' | 'dipendente'
    onChange: (role: 'direzione' | 'dipendente') => void
  }

  // NEW: Row left accent color
  rowAccentColor?: (item: T) => string | undefined  // "blue" | "green" | "orange" | "red"

  // NEW: Next action per row
  rowAction?: (item: T) => React.ReactNode  // NextActionChip o simile
}
```

**Implementazione**:
- Se `kpiStrip` presente, renderizza `<KpiStrip>` sopra i filtri
- Se `viewMode` presente, aggiungi `<ViewToggle>` nella toolbar
- Se `roleSwitcher` presente, aggiungi `<RoleSwitcher>` nella toolbar
- Se `viewMode === 'grid'`, renderizza griglia con `gridRenderItem` anziché tabella
- Se `rowAccentColor`, aggiungi 3px left border colorato alla riga
- Se `rowAction`, aggiungi colonna azioni con il chip

### 2.2 `EntityDetail` — Nuove prop

```typescript
interface EntityDetailProps {
  // ... existing props ...

  // NEW: Editable badges nel header (sostituiscono badges statici)
  editableBadges?: React.ReactNode

  // NEW: KPI row sotto header
  kpiRow?: React.ReactNode  // <KpiStrip> o custom

  // NEW: Color bar sopra il titolo
  colorBar?: string  // gradient CSS o colore
}
```

### 2.3 Stile aggiornamenti

- **Row hover**: aggiungere `border-color → hsl(var(--primary) / 0.3)` + `bg-accent/5` al hover delle righe DataTable
- **Stagger animation**: animazione entrata con delay progressivo (0.05s per elemento) su righe e card
- **Card top gradient**: pseudo-element `::before` con gradiente trasparente→bianco/5%→trasparente in cima alla card

---

## Layer 3: Backend API

### 3.1 Estensione Dashboard API

Endpoint esistenti da verificare/aggiornare:
- `GET /api/dashboard/stats` — KPI aggregati (verificare che ritorni tutti i campi mockup)
- `GET /api/dashboard/attention` — alert per l'alert strip

**Nuovi dati richiesti dal mockup Dashboard**:

```typescript
// GET /api/dashboard/stats response (per direzione)
{
  activeProjects: number      // progetti attivi
  activeProjectsDelta: number // variazione periodo
  criticalProjects: number    // in fase critica
  openTeamTasks: number       // task aperti team
  openTeamTasksDelta: number
  dueSoonTasks: number        // in scadenza questa sett
  weeklyTeamHours: number     // ore settimana team
  weeklyHoursDelta: number
  activeResources: number
  activeRisks: number         // rischi attivi
  activeRisksDelta: number
  criticalRisks: number
  mediumRisks: number
  budgetUsedPercent: number   // % budget usato
  budgetUsedDelta: number
  budgetUsed: number          // €
  budgetTotal: number
}

// GET /api/dashboard/stats response (per dipendente)
{
  myOpenTasks: number
  myOpenTasksDelta: number
  myDueSoonTasks: number
  myWeeklyHours: number
  myWeeklyHoursDelta: number
  myWeeklyTarget: number
  myClosedThisWeek: number
  myClosedDelta: number
  myClosedLastWeek: number
  myProjects: Array<{ id, name }>
}
```

### 3.2 Endpoint alert

`GET /api/dashboard/alerts` — già esistente come `attention`. Verificare che includa:
- severity (critical/warning/info)
- title, subtitle
- projectName
- timestamp

### 3.3 Endpoint milestones prossime

`GET /api/dashboard/upcoming-milestones` — per il tab Milestone della dashboard:
- milestone name, project name
- deadline + urgency
- progress %
- accent color (dal progetto)

### 3.4 Endpoint task per oggi

`GET /api/dashboard/my-tasks-today` — già esistente. Verificare che includa:
- task name, project tag
- priority (per left border color)
- status badge
- deadline
- assignee avatar
- subtask progress

---

## Layer 4: Pagine Pixel-Accurate

### 4.1 Dashboard (`HomePage`)

**Struttura dal mockup**:
```
Breadcrumb: Workspace > Dashboard
Header: "Dashboard operativa" + data odierna + "Nuovo task" button
Role Toggle: Direzione | Dipendente
KPI Strip: 5 card (diversi per ruolo)
Alert Strip: collassabile con severity badge
Domain Tabs: 4 tab (Milestone, Calendario, Task, Progetti)
  - Milestone: griglia 3 colonne, card con progress + deadline
  - Calendario: mini calendario mese + lista eventi
  - Task: 3 colonne (Urgenti/Oggi, Prossimi, Bloccati)
  - Progetti: griglia card progetto con KPI inline
```

### 4.2 Lista Progetti (`ProjectListPage`)

**Struttura dal mockup**:
```
Breadcrumb: Workspace > Progetti
Header: "Progetti" + "Nuovo progetto" button
KPI Strip: 5 card (Totale, In corso, In ritardo, Completati, Task aperti)
Toolbar: Search + Status filter chips + Advanced filters + View toggle (list/grid)
List View: 8 colonne (checkbox, progetto+meta, stato badge, avanzamento bar, fasi pips, team avatar, scadenza, azione)
Grid View: card responsive (min 340px) con progress, phases, deadline, action
Radial Menu: right-click context (6 azioni)
```

**Colonne mockup → colonne DataTable**:

| Mockup | Column key | Renderer |
|--------|-----------|----------|
| Checkbox | selection | built-in |
| Progetto + meta | name | Nome bold + "5 milestone · 23 task · 2 rischi" muted |
| Stato | status | StatusBadge con dot |
| Avanzamento | progress | Numero + ProgressGradient |
| Fasi | phases | PhasePips compact + label fase corrente |
| Team | team | AvatarStack |
| Scadenza | deadline | Data + delta relativo colorato |
| Azioni | action | NextActionChip |

### 4.3 Dettaglio Progetto (`ProjectDetailPage`)

**Struttura dal mockup**:
```
Breadcrumb: Progetti > XR-200 Alpha
Color bar: 4px gradient (colore progetto)
Domain badge: "Progetto"
Title + badges (status, milestone count, deadline, time remaining)
Actions: "Log ore", "Aggiungi task", "Avanza fase", more menu
KPI Row: 5 mini-card (avanzamento, task, ore, rischi, team)
Sticky Tabs: Panoramica (4), Task (23), Rischi (2), Documenti (5)

Tab Panoramica:
  - Phase timeline (pills orizzontali con connettori)
  - Grid 2 col: SVG chart avanzamento + Activity feed
  - Team di progetto (card membri)

Tab Task:
  - Milestone items collapsibili
  - Task list con checkbox, status, subtask espandibili
  - Radial menu su right-click

Tab Rischi:
  - Risk items con level box (high/medium/low)
  - Criticality badge, status badge, responsabile

Tab Documenti:
  - Document grid (auto-fill min 200px)
  - Doc card con icona tipo, meta, tag
  - Upload zone
```

### 4.4 Dettaglio Task (`TaskDetailPage`)

**Struttura dal mockup**:
```
Breadcrumb gerarchico: Progetti > XR-200 Alpha > M3 — Sviluppo > Task name
Color bar + domain badge "Task"
Title + code (#T-042 muted)
Editable badges inline: Status, Priorità, Assegnatario, Progetto, Milestone, Scadenza
Actions: "Log ore", "In revisione" (advance), more menu
KPI Row: 5 mini (avanzamento, subtask, ore/stimate, assegnato, fase)
Sticky Tabs: Dettagli (5), Subtask (3), Log ore (8), Allegati (2), Attività (6)

Tab Dettagli: Descrizione + task correlati
Tab Subtask: Progress bar + checklist items + add row
Tab Log ore: Summary (loggate/stimate/rimanenti) + time entries list
Tab Allegati: File cards + upload zone
Tab Attività: Comment input + activity feed (comment + system events)
```

### 4.5 Task Kanban (`KanbanBoardPage`)

```
Toolbar: search + filters + view toggle (kanban/list)
5 Columns: Idle, Active, Review, Done, Blocked
  - Header con colored dot + count badge
  - Kanban cards: drag handle, task name, phase badge, deadline, subtask progress, avatar
  - Quick actions on hover: Advance, Log, Assign
List view fallback: grouped rows by status, collapsible
```

### 4.6 Gantt (`GanttView`)

```
Top bar: domain badge, title, zoom selector (Week/Month/Quarter), expand/collapse, role toggle, export
Left sidebar: hierarchical rows (project → milestone → task)
Chart area: month/week timeline, bars with progress fill
Dependency arrows (SVG)
Today line
Drag handles for resize/move
```

### 4.7 Documenti (`DocumentListPage`)

```
KPI Strip: 4 card (Total, Approved, Review, Draft)
Toolbar: search + project filter + view toggle (list/project)
List view: table con status badge, type pill, revision, author, date
Project view: collapsible groups con card grid
Drawer detail: info grid + version history + download
```

### 4.8 Rischi (`RiskListPage`)

```
Role toggle
KPI Strip: 4 card (Total, Critical, Medium, Low)
Toolbar: search + severity chips + project select
Table: severity left border, risk score badge, probability dots, impact dots, task links
Drawer detail: description, mitigation, linked tasks, history timeline
```

### 4.9 Utenti (`UserListPage`)

```
3 Tabs: Utenti, Matrice permessi, Log accessi
Tab Utenti: KPI + table (name, email, role badge, status dot, projects, last access, actions)
Tab Permessi: matrix table (features × roles, yes/no/partial icons)
Tab Log: filter bar + log items (action icon colored, user, timestamp, resource)
Drawer: user form (create/edit)
```

### 4.10 Report Settimanale (`WeeklyReportPage`)

```
Week selector: prev/next + label + active week badge
KPI Strip: 5 card con delta indicators
Main grid: 2/3 task performance table + 1/3 team capacity
Task table: 7 columns (task, project, status, operations, hours, assignee, actions)
```

---

## Costanti da aggiornare

### `lib/constants.ts`

Aggiungere:

```typescript
// Gradient per contesto (usati da ProgressGradient)
export const CONTEXT_GRADIENTS = {
  project: 'from-blue-700 to-blue-500',
  milestone: 'from-purple-700 to-purple-500',
  task: 'from-cyan-700 to-cyan-400',
  success: 'from-green-700 to-green-500',
  warning: 'from-orange-700 to-orange-500',
  danger: 'from-red-700 to-red-500',
} as const

// Colori next action chip
export const NEXT_ACTION_COLORS = {
  advance: 'bg-primary/10 text-primary border-primary/20',
  unblock: 'bg-warning/10 text-warning border-warning/20',
  approve: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
  report: 'bg-success/10 text-success border-success/20',
  review: 'bg-info/10 text-info border-info/20',
} as const

// Alert severity colori
export const ALERT_SEVERITY_COLORS = {
  critical: 'border-l-red-500 bg-red-500/5',
  warning: 'border-l-orange-500 bg-orange-500/5',
  info: 'border-l-blue-500 bg-blue-500/5',
} as const
```

### `lib/theme-config.ts`

Aggiornare animations per tech-hud (dalla spec mockup):

```typescript
'tech-hud': {
  animations: {
    pageTransition: { duration: 0.22, ease: 'easeOut' },  // era 250ms easeIn
    stagger: 0.05,     // era 0.02
    hoverScale: 1.01,  // invariato
  }
}
```

---

## Priorità implementazione

L'ordine di implementazione per layer è:

```
1. Layer 0 (tokens) — fondazione, nessuna dipendenza
2. Layer 1 (componenti) — dipende da Layer 0
3. Layer 2 (template) — dipende da Layer 1
4. Layer 3 (backend) — indipendente, parallelizzabile con Layer 1-2
5. Layer 4 (pagine) — dipende da Layer 1-2-3
```

Per le pagine (Layer 4), ordine suggerito per massimizzare la copertura dei componenti nuovi:

1. **Dashboard** — usa tutti i componenti nuovi (KpiStrip, AlertStrip, RoleSwitcher, ActivityFeed)
2. **Lista Progetti** — usa ViewToggle, PhasePips, AvatarStack, NextActionChip, ProgressGradient
3. **Dettaglio Progetto** — usa EditableBadge (no, dettaglio progetto usa badge statici), Phase pills, ActivityFeed, tabs milestone
4. **Dettaglio Task** — usa EditableBadge, ActivityFeed, subtask list
5. **Kanban** — drag-drop + card kanban
6. **Documenti** — DrawerDetail, type pills
7. **Rischi** — DotRating, DrawerDetail, severity filters
8. **Utenti** — permissions matrix, log tab, DrawerDetail form
9. **Report** — week selector, task performance table
10. **Gantt** — più complesso, dedicato

---

## File coinvolti (riepilogo)

### Da modificare

| File | Modifica |
|------|----------|
| `client/src/styles/globals.css` | Token tech-hud dark/light, nuove variabili gradient |
| `client/tailwind.config.js` | fontFamily, borderRadius, boxShadow |
| `client/index.html` | Font import Google Fonts |
| `client/src/lib/constants.ts` | CONTEXT_GRADIENTS, NEXT_ACTION_COLORS, ALERT_SEVERITY_COLORS |
| `client/src/lib/theme-config.ts` | Animazioni tech-hud aggiornate |
| `client/src/components/common/EntityList.tsx` | Nuove prop: kpiStrip, viewMode, roleSwitcher, rowAccentColor, rowAction |
| `client/src/components/common/EntityDetail.tsx` | Nuove prop: editableBadges, kpiRow, colorBar |
| `client/src/components/common/DataTable.tsx` | Hover accent, left border, stagger |
| `client/src/pages/home/HomePage.tsx` | Rebuild pixel-accurate |
| `client/src/pages/projects/ProjectListPage.tsx` | Rebuild con nuove colonne |
| `client/src/pages/projects/ProjectDetailPage.tsx` | Tabs + phase timeline |
| `client/src/pages/tasks/TaskDetailPage.tsx` | Editable badges + tabs |
| + tutte le altre 6 pagine | Aggiornamento struttura |

### Da creare

| File | Tipo |
|------|------|
| `client/src/components/common/KpiStrip.tsx` | Componente |
| `client/src/components/common/EditableBadge.tsx` | Componente |
| `client/src/components/common/PhasePips.tsx` | Componente |
| `client/src/components/common/AvatarStack.tsx` | Componente |
| `client/src/components/common/AlertStrip.tsx` | Componente |
| `client/src/components/common/DotRating.tsx` | Componente |
| `client/src/components/common/ProgressGradient.tsx` | Componente |
| `client/src/components/common/RoleSwitcher.tsx` | Componente |
| `client/src/components/common/ViewToggle.tsx` | Componente |
| `client/src/components/common/DrawerDetail.tsx` | Componente |
| `client/src/components/common/ActivityFeed.tsx` | Componente |
| `client/src/components/common/NextActionChip.tsx` | Componente |

### Backend (se necessario)

| File | Modifica |
|------|----------|
| `server/src/controllers/dashboardController.ts` | Estendere stats per KPI mockup |
| `server/src/services/dashboardService.ts` | Query aggregate per KPI |
| `client/src/hooks/api/useDashboard.ts` | Aggiornare tipi response |

---

## Rischi e mitigazioni

| Rischio | Mitigazione |
|---------|-------------|
| Il mockup mostra solo tech-hud dark — adattare 5 varianti extra | Derivare light da dark invertendo luminosità; office-classic/asana-like usano stessi componenti con token diversi |
| Performance con 12 nuovi componenti | Componenti sono leggeri (Tailwind, no heavy JS). Usare React.memo per KpiStrip e ActivityFeed |
| Breaking change su EntityList/EntityDetail | Tutte le nuove prop sono opzionali — zero breaking change |
| Font Syne/DM Sans non disponibili offline | Fallback a Inter/system-ui tramite CSS font-family stack |
| Pixel-accuracy difficile con token semantici | Verificare ogni pagina visivamente dopo implementazione; i token HSL del mockup sono tradotti fedelmente |
