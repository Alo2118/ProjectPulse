# UX Clarity Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform ProjectPulse from flat tables with opaque navigation into a connected, visually rich cruscotto where every page communicates state at a glance and every click is predictable.

**Architecture:** 4 layers of change: (1) backend APIs for dashboard aggregation, (2) new shared UI components for rich cells and grouping, (3) page-level redesign of lists/detail/home, (4) global affordance polish. Each layer builds on the previous.

**Tech Stack:** Express + Prisma (backend), React 18 + TanStack Query 5 + shadcn/ui + Tailwind + Framer Motion (frontend), existing design system tokens.

**Spec:** `docs/superpowers/specs/2026-03-10-ux-clarity-redesign-design.md`

---

## File Structure

### Backend (new files)

| File | Responsibility |
|------|----------------|
| `server/src/controllers/dashboardController.ts` | Dashboard stats + attention items endpoints |
| `server/src/services/dashboardService.ts` | Aggregation queries for KPIs, attention items, activity feed |
| `server/src/routes/dashboardRoutes.ts` | Route registration for `/api/dashboard/*` |
| `server/src/schemas/dashboardSchemas.ts` | Zod schemas for dashboard query params |

### Frontend (new files)

| File | Responsibility |
|------|----------------|
| `client/src/hooks/api/useDashboard.ts` | TanStack Query hooks for dashboard endpoints |
| `client/src/components/common/GroupHeader.tsx` | Collapsible group header for grouped lists |
| `client/src/components/common/DeadlineCell.tsx` | Date + urgency color badge cell |
| `client/src/components/common/ProblemIndicators.tsx` | Compact counters (risks, blocks, comments) |
| `client/src/components/common/ParentLink.tsx` | Clickable parent entity link with domain icon |
| `client/src/components/common/StatusDot.tsx` | Large colored dot for status |
| `client/src/components/common/RecurrenceBadge.tsx` | Frequency badge for recurring tasks |
| `client/src/components/common/NextActionSuggestion.tsx` | "Prossimo passo" suggestion box |
| `client/src/components/common/EntityPreviewTooltip.tsx` | Rich hover tooltip for cross-domain links |
| `client/src/components/common/ProjectTreeSidebar.tsx` | Mini milestone/task tree for project detail |
| `client/src/components/common/RelatedEntitiesSidebar.tsx` | Related entities counters with breakdown |
| `client/src/components/common/ActivityFeedItem.tsx` | Single activity feed entry |
| `client/src/components/domain/home/KpiStrip.tsx` | 5 KPI cards (projects, tasks, hours, risks, timer) |
| `client/src/components/domain/home/AttentionSection.tsx` | Alert items requiring attention |
| `client/src/components/domain/home/MyTasksToday.tsx` | Today's tasks with timer buttons |
| `client/src/components/domain/home/ActivityFeed.tsx` | Recent activity feed |

### Frontend (modified files)

| File | Changes |
|------|---------|
| `client/src/components/common/EntityList.tsx` | Add `groupBy` prop, render GroupHeaders |
| `client/src/components/common/DataTable.tsx` | Add row affordance (ChevronRight on hover), 2-3 line row support |
| `client/src/components/common/Breadcrumbs.tsx` | Support hierarchical paths (project → milestone → task) |
| `client/src/components/common/EntityDetail.tsx` | No structural changes (sidebar is passed as prop) |
| `client/src/lib/constants.ts` | Add `STATUS_VISUAL`, `STATUS_GROUP_ORDER`, urgency helpers |
| `client/src/pages/home/HomePage.tsx` | Complete rewrite to cruscotto layout |
| `client/src/pages/projects/ProjectListPage.tsx` | Rich columns + groupBy status |
| `client/src/pages/tasks/TaskListPage.tsx` | Rich columns + groupBy status + recurrence group |
| `client/src/pages/risks/RiskListPage.tsx` | Rich columns + groupBy severity |
| `client/src/pages/projects/ProjectDetailPage.tsx` | New sidebar with tree + related entities + suggestion |
| `client/src/pages/tasks/TaskDetailPage.tsx` | New sidebar with related entities + suggestion |

---

## Chunk 1: Backend — Dashboard API

### Task 1.1: Dashboard Service — Stats Aggregation

**Files:**
- Create: `server/src/services/dashboardService.ts`
- Create: `server/src/schemas/dashboardSchemas.ts`

- [ ] **Step 1: Create dashboard schemas**

Create `server/src/schemas/dashboardSchemas.ts`:
```typescript
import { z } from 'zod'

export const dashboardStatsQuerySchema = z.object({}).strict()

export const attentionQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(50)).default('10'),
}).strict()

export const activityQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(50)).default('10'),
}).strict()
```

- [ ] **Step 2: Create dashboard service — getStats**

Create `server/src/services/dashboardService.ts` with `getStats(userId: string, role: string)`:
- Count active projects (status not in ['completed', 'cancelled', 'on_hold'], isDeleted: false)
- Count previous week active projects for trend delta
- Count open tasks (status not in ['done', 'cancelled'], isDeleted: false) — filter by assigneeId if role === 'dipendente'
- Count previous week open tasks for trend delta
- Sum time entries duration for current week (Mon-Sun) — filter by userId if dipendente
- Sum previous week for trend delta
- Count open risks (status in ['open']) — omit for dipendente
- Count critical risks (probability * impact > 15)
- Return: `{ activeProjects, activeProjectsDelta, openTasks, openTasksDelta, weeklyHours, weeklyHoursDelta, openRisks, criticalRisks }`

Use `prisma.$queryRaw` or aggregate queries. All in a single service method. Role check: dipendente sees only own data.

- [ ] **Step 3: Create dashboard service — getAttentionItems**

Add `getAttentionItems(userId: string, role: string, limit: number)` to dashboard service:
- Query blocked tasks (status = 'blocked', isDeleted: false) with project name — filter by assigneeId if dipendente
- Query tasks due within 24h (dueDate between now and now+24h, status not done/cancelled) with project name
- Query critical risks (open, score > 15) — omit for dipendente
- Query documents in review status for > 3 days — omit for dipendente
- Combine, sort by urgency (blocked first, then due soon, then risks, then documents)
- Limit to `limit` items
- Return: `Array<{ type: 'blocked_task' | 'due_soon' | 'critical_risk' | 'pending_review', entityId: string, title: string, projectName: string | null, projectId: string | null, dueDate: string | null, extra: string | null }>`

- [ ] **Step 4: Create dashboard service — getTodayTotal**

Add `getTodayTotal(userId: string)`:
- Sum duration of time entries where userId matches and startTime is today (00:00-23:59)
- Also get running entry if exists (isRunning: true, userId)
- Return: `{ todayMinutes: number, runningEntry: { id: string, taskId: string, taskTitle: string, startedAt: string } | null }`

- [ ] **Step 5: Create dashboard service — getMyTasksToday**

Add `getMyTasksToday(userId: string)`:
- Query tasks where assigneeId = userId AND (status = 'in_progress' OR (dueDate is today AND status = 'todo'))
- Select: id, title, status, dueDate, project (id, name), isRecurring, recurrencePattern
- Order by: status (in_progress first), then dueDate ASC
- Limit 10
- Return: `Task[]`

- [ ] **Step 6: Create dashboard service — getRecentActivity**

Add `getRecentActivity(userId: string, role: string, limit: number)`:
- Query from AuditLog table, ordered by createdAt DESC, limit
- If dipendente: filter by userId
- Select: id, action, entityType, entityId, createdAt, userId + user (firstName, lastName)
- Map to: `{ id, action, entityType, entityId, entityTitle, userName, timestamp }`
- Return array

- [ ] **Step 7: Commit dashboard service**

```bash
git add server/src/services/dashboardService.ts server/src/schemas/dashboardSchemas.ts
git commit -m "feat(api): add dashboard aggregation service with stats, attention, activity"
```

### Task 1.2: Dashboard Controller & Routes

**Files:**
- Create: `server/src/controllers/dashboardController.ts`
- Create: `server/src/routes/dashboardRoutes.ts`
- Modify: `server/src/routes/index.ts`

- [ ] **Step 1: Create dashboard controller**

Create `server/src/controllers/dashboardController.ts` with 5 endpoints:
- `getStats` — parse empty query, call service.getStats(userId, role), sendSuccess
- `getAttention` — parse attentionQuerySchema, call service.getAttentionItems, sendSuccess
- `getTodayTotal` — call service.getTodayTotal(userId), sendSuccess
- `getMyTasksToday` — call service.getMyTasksToday(userId), sendSuccess
- `getRecentActivity` — parse activityQuerySchema, call service.getRecentActivity, sendSuccess

All use `requireUserId(req)` and `try/catch` with `next(error)`.

- [ ] **Step 2: Create dashboard routes**

Create `server/src/routes/dashboardRoutes.ts`:
```typescript
import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import * as ctrl from '../controllers/dashboardController.js'

const router = Router()
router.use(authMiddleware)

router.get('/stats', ctrl.getStats)
router.get('/attention', ctrl.getAttention)
router.get('/today-total', ctrl.getTodayTotal)
router.get('/my-tasks-today', ctrl.getMyTasksToday)
router.get('/recent-activity', ctrl.getRecentActivity)

export default router
```

- [ ] **Step 3: Register routes in index.ts**

In `server/src/routes/index.ts`, add:
```typescript
import dashboardRoutes from './dashboardRoutes.js'
// ... after existing registrations
router.use('/dashboard', dashboardRoutes)
```

- [ ] **Step 4: Commit controller & routes**

```bash
git add server/src/controllers/dashboardController.ts server/src/routes/dashboardRoutes.ts server/src/routes/index.ts
git commit -m "feat(api): add dashboard controller with stats, attention, today, activity endpoints"
```

---

## Chunk 2: Frontend — Shared UI Components (Rich Cells)

### Task 2.1: Constants & Utility Additions

**Files:**
- Modify: `client/src/lib/constants.ts`

- [ ] **Step 1: Add STATUS_VISUAL map**

Add to `lib/constants.ts`:
```typescript
export const STATUS_VISUAL: Record<string, { dot: string; label: string; group: string }> = {
  blocked: { dot: 'bg-red-500', label: 'Bloccato', group: 'blocked' },
  in_progress: { dot: 'bg-blue-500', label: 'In corso', group: 'active' },
  review: { dot: 'bg-amber-500', label: 'In revisione', group: 'review' },
  todo: { dot: 'bg-slate-400', label: 'Non iniziato', group: 'pending' },
  done: { dot: 'bg-green-500', label: 'Completato', group: 'completed' },
  cancelled: { dot: 'bg-slate-300', label: 'Annullato', group: 'completed' },
  // project statuses
  planning: { dot: 'bg-blue-500', label: 'Pianificazione', group: 'active' },
  design: { dot: 'bg-purple-500', label: 'Progettazione', group: 'active' },
  verification: { dot: 'bg-amber-500', label: 'Verifica', group: 'review' },
  validation: { dot: 'bg-amber-500', label: 'Validazione', group: 'review' },
  transfer: { dot: 'bg-blue-500', label: 'Trasferimento', group: 'active' },
  maintenance: { dot: 'bg-slate-500', label: 'Manutenzione', group: 'active' },
  completed: { dot: 'bg-green-500', label: 'Completato', group: 'completed' },
  on_hold: { dot: 'bg-amber-500', label: 'In pausa', group: 'pending' },
  // risk statuses
  open: { dot: 'bg-red-500', label: 'Aperto', group: 'active' },
  mitigated: { dot: 'bg-green-500', label: 'Mitigato', group: 'completed' },
  accepted: { dot: 'bg-amber-500', label: 'Accettato', group: 'review' },
  closed: { dot: 'bg-slate-400', label: 'Chiuso', group: 'completed' },
}

export const TASK_STATUS_GROUP_ORDER = ['blocked', 'in_progress', 'review', 'todo', 'recurring', 'done', 'cancelled']
export const PROJECT_STATUS_GROUP_ORDER = ['on_hold', 'planning', 'design', 'verification', 'validation', 'transfer', 'maintenance', 'completed', 'cancelled']
export const RISK_SEVERITY_GROUPS = [
  { key: 'critical', label: 'Critici', minScore: 16, dot: 'bg-red-500' },
  { key: 'high', label: 'Alti', minScore: 10, dot: 'bg-orange-500' },
  { key: 'medium', label: 'Medi', minScore: 5, dot: 'bg-amber-500' },
  { key: 'low', label: 'Bassi', minScore: 1, dot: 'bg-green-500' },
  { key: 'mitigated', label: 'Mitigati/Chiusi', minScore: 0, dot: 'bg-slate-400' },
]

export const COLLAPSED_BY_DEFAULT = ['done', 'cancelled', 'completed', 'mitigated', 'closed', 'todo']
```

- [ ] **Step 2: Add urgency helper**

Add to `lib/utils.ts`:
```typescript
export function getDeadlineUrgency(dueDate: string | null | undefined): 'overdue' | 'urgent' | 'soon' | 'normal' | 'none' {
  if (!dueDate) return 'none'
  const now = new Date()
  const due = new Date(dueDate)
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 3) return 'urgent'
  if (diffDays <= 7) return 'soon'
  return 'normal'
}

export function formatDaysRemaining(dueDate: string | null | undefined): string {
  if (!dueDate) return ''
  const now = new Date()
  const due = new Date(dueDate)
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return `${Math.abs(diffDays)}gg scaduto`
  if (diffDays === 0) return 'Oggi!'
  return `${diffDays}gg`
}

export function formatRecurrencePattern(pattern: string | null | undefined): string {
  if (!pattern) return ''
  try {
    const p = JSON.parse(pattern)
    if (p.frequency === 'daily') return 'Giornaliero'
    if (p.frequency === 'weekly' && p.interval === 1) return 'Settimanale'
    if (p.frequency === 'weekly' && p.interval === 2) return 'Ogni 2 sett'
    if (p.frequency === 'monthly') return 'Mensile'
    return p.frequency
  } catch { return '' }
}
```

- [ ] **Step 3: Commit constants & utils**

```bash
git add client/src/lib/constants.ts client/src/lib/utils.ts
git commit -m "feat(ui): add STATUS_VISUAL map, group orders, urgency helpers"
```

### Task 2.2: StatusDot Component

**Files:**
- Create: `client/src/components/common/StatusDot.tsx`

- [ ] **Step 1: Create StatusDot**

```typescript
import { cn } from '@/lib/utils'
import { STATUS_VISUAL } from '@/lib/constants'

interface StatusDotProps {
  status: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_MAP = { sm: 'h-2 w-2', md: 'h-3 w-3', lg: 'h-3.5 w-3.5' }

export function StatusDot({ status, size = 'md', className }: StatusDotProps) {
  const visual = STATUS_VISUAL[status]
  return (
    <span
      className={cn('rounded-full shrink-0 inline-block', SIZE_MAP[size], visual?.dot ?? 'bg-slate-400', className)}
      aria-label={visual?.label ?? status}
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/StatusDot.tsx
git commit -m "feat(ui): add StatusDot component with size variants"
```

### Task 2.3: DeadlineCell Component

**Files:**
- Create: `client/src/components/common/DeadlineCell.tsx`

- [ ] **Step 1: Create DeadlineCell**

Component that shows a date with urgency color coding:
- Displays formatted date + days remaining badge
- Colors: `text-destructive` (overdue), `text-warning` (urgent ≤3gg), `text-amber-600 dark:text-amber-400` (soon ≤7gg), `text-muted-foreground` (normal)
- Overdue: adds `animate-pulse` to the badge
- No date: returns null

Props: `{ dueDate: string | null | undefined, status?: string }` — skip urgency coloring if status is 'done' or 'cancelled'.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/DeadlineCell.tsx
git commit -m "feat(ui): add DeadlineCell with urgency color coding"
```

### Task 2.4: ProblemIndicators Component

**Files:**
- Create: `client/src/components/common/ProblemIndicators.tsx`

- [ ] **Step 1: Create ProblemIndicators**

Compact inline indicators that only show when count > 0:

Props:
```typescript
interface ProblemIndicatorsProps {
  blockedTasks?: number
  openRisks?: number
  comments?: number
  checklistDone?: number
  checklistTotal?: number
  className?: string
}
```

Renders inline flex row of small badges:
- `🔴{n}` for blockedTasks (text-destructive)
- `⚠{n}` for openRisks (text-warning)
- `💬{n}` for comments (text-muted-foreground)
- `✓{done}/{total}` for checklist (text-muted-foreground)

Each badge is a `<span>` with `text-xs gap-0.5 inline-flex items-center`. Only renders badges where count > 0.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/ProblemIndicators.tsx
git commit -m "feat(ui): add ProblemIndicators compact counter badges"
```

### Task 2.5: ParentLink Component

**Files:**
- Create: `client/src/components/common/ParentLink.tsx`

- [ ] **Step 1: Create ParentLink**

Clickable link showing parent entity name with domain icon:

Props:
```typescript
interface ParentLinkProps {
  name: string
  href: string
  domain: string  // 'project' | 'task' | 'risk' etc.
  className?: string
}
```

Renders: domain icon (14px, domain color from DOMAIN_COLORS) + name in `text-muted-foreground text-sm`. On hover: `underline text-foreground`. Uses `<Link>` from react-router-dom. Stops propagation on click (so row click doesn't fire).

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/ParentLink.tsx
git commit -m "feat(ui): add ParentLink cross-domain navigation component"
```

### Task 2.6: RecurrenceBadge Component

**Files:**
- Create: `client/src/components/common/RecurrenceBadge.tsx`

- [ ] **Step 1: Create RecurrenceBadge**

Props: `{ pattern: string | null | undefined, lastExecuted?: string | null, className?: string }`

Renders: `🔄 {frequency}` badge in `text-info text-xs`. If lastExecuted provided, shows "Ultima: Xgg fa" in secondary text. If last execution is too old relative to frequency (e.g., weekly but >10 days ago), uses `text-warning`.

Uses `formatRecurrencePattern` and `formatRelative` from utils.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/RecurrenceBadge.tsx
git commit -m "feat(ui): add RecurrenceBadge with frequency and staleness indicator"
```

### Task 2.7: GroupHeader Component

**Files:**
- Create: `client/src/components/common/GroupHeader.tsx`

- [ ] **Step 1: Create GroupHeader**

Collapsible group header for grouped lists:

Props:
```typescript
interface GroupHeaderProps {
  status: string
  label: string
  count: number
  isCollapsed: boolean
  onToggle: () => void
}
```

Renders: `▶`/`▼` chevron + StatusDot + label + count badge `(N)` in muted. Full width with `border-b border-border`. `cursor-pointer` on the whole row. Chevron rotates with 150ms transition.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/GroupHeader.tsx
git commit -m "feat(ui): add GroupHeader collapsible section for grouped lists"
```

### Task 2.8: EntityList — Add groupBy Support

**Files:**
- Modify: `client/src/components/common/EntityList.tsx`

- [ ] **Step 1: Add groupBy prop to EntityList**

Add to EntityListProps:
```typescript
groupBy?: {
  getGroup: (item: T) => string
  order: string[]
  labels: Record<string, string>
  collapsedByDefault?: string[]
}
```

- [ ] **Step 2: Implement grouping logic**

When `groupBy` is provided:
- Group `data` array by `getGroup(item)`, maintaining `order` sequence
- Track collapsed state in `useState` initialized from `collapsedByDefault` and `localStorage` key `entitylist-groups-{title}`
- Instead of passing `data` directly to DataTable, render a sequence of GroupHeader + DataTable pairs
- Each group's DataTable gets only that group's items
- Collapsed groups show only GroupHeader, not DataTable
- Save collapsed state to localStorage on toggle

- [ ] **Step 3: Commit**

```bash
git add client/src/components/common/EntityList.tsx
git commit -m "feat(ui): add groupBy support to EntityList with collapsible groups"
```

### Task 2.9: DataTable — Row Affordance

**Files:**
- Modify: `client/src/components/common/DataTable.tsx`

- [ ] **Step 1: Add ChevronRight affordance on clickable rows**

When `onRowClick` is provided:
- Add `ChevronRight` icon (lucide-react) as last visual element in each row, initially `opacity-0`
- On row hover: `opacity-100` transition
- Ensure `cursor-pointer` is on the row
- Add `group` class to TableRow, chevron uses `opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground`

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/DataTable.tsx
git commit -m "feat(ui): add ChevronRight hover affordance on clickable DataTable rows"
```

---

## Chunk 3: Frontend — Dashboard Hooks & HomePage Redesign

### Task 3.1: Dashboard TanStack Query Hooks

**Files:**
- Create: `client/src/hooks/api/useDashboard.ts`

- [ ] **Step 1: Create dashboard hooks**

```typescript
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

const KEYS = {
  stats: ['dashboard', 'stats'] as const,
  attention: ['dashboard', 'attention'] as const,
  todayTotal: ['dashboard', 'today-total'] as const,
  myTasksToday: ['dashboard', 'my-tasks-today'] as const,
  recentActivity: ['dashboard', 'recent-activity'] as const,
}

export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: KEYS.stats,
    queryFn: async () => {
      const { data } = await api.get('/dashboard/stats')
      return data.data
    },
    staleTime: 60_000,
  })
}

export function useAttentionItemsQuery(limit = 10) {
  return useQuery({
    queryKey: [...KEYS.attention, limit],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/attention', { params: { limit } })
      return data.data
    },
    staleTime: 60_000,
  })
}

export function useTodayTotalQuery() {
  return useQuery({
    queryKey: KEYS.todayTotal,
    queryFn: async () => {
      const { data } = await api.get('/dashboard/today-total')
      return data.data
    },
    staleTime: 30_000,
  })
}

export function useMyTasksTodayQuery() {
  return useQuery({
    queryKey: KEYS.myTasksToday,
    queryFn: async () => {
      const { data } = await api.get('/dashboard/my-tasks-today')
      return data.data
    },
    staleTime: 60_000,
  })
}

export function useRecentActivityQuery(limit = 10) {
  return useQuery({
    queryKey: [...KEYS.recentActivity, limit],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/recent-activity', { params: { limit } })
      return data.data
    },
    staleTime: 30_000,
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/hooks/api/useDashboard.ts
git commit -m "feat(ui): add TanStack Query hooks for dashboard API"
```

### Task 3.2: HomePage Domain Components

**Files:**
- Create: `client/src/components/domain/home/KpiStrip.tsx`
- Create: `client/src/components/domain/home/AttentionSection.tsx`
- Create: `client/src/components/domain/home/MyTasksToday.tsx`
- Create: `client/src/components/domain/home/ActivityFeed.tsx`

- [ ] **Step 1: Create KpiStrip**

5 cards in a responsive grid (`grid-cols-2 md:grid-cols-3 lg:grid-cols-5`). Each card is a shadcn `Card` with:
- Icon (domain color)
- Label (text-sm muted)
- Value (text-2xl font-bold)
- Delta badge: `▲N` green or `▼N` red (text-xs)
- Mini ProgressRing (sm) or dot indicators for risks

5th card is the Timer card:
- If running: task name (truncated, clickable) + live elapsed time + Stop button
- If not running: "Nessun timer" + Play button (disabled, opens time tracking)
- Bottom line: "Oggi: Xh Ym" from `useTodayTotalQuery`

Uses `useDashboardStatsQuery()` and `useTodayTotalQuery()`. Skeleton state for loading.

- [ ] **Step 2: Create AttentionSection**

Card with title "Attenzione Richiesta" (AlertCircle icon). Uses `useAttentionItemsQuery()`.

Maps each item to a clickable row:
- Icon per type: 🔴 blocked_task, ⏰ due_soon, ⚠ critical_risk, 📄 pending_review
- Count + description
- Project name in muted (if available)
- `ChevronRight` at end
- Click navigates to entity detail

If empty: shows "Tutto sotto controllo" with CheckCircle icon in green.

Skeleton for loading.

- [ ] **Step 3: Create MyTasksToday**

Card with title "I Miei Task Oggi". Uses `useMyTasksTodayQuery()`.

Each task row:
- StatusDot + task title (clickable → `/tasks/:id`)
- Project name via ParentLink (if exists)
- Timer play button (starts timer for this task via existing mutation)

If empty: "Nessun task per oggi" EmptyState.

- [ ] **Step 4: Create ActivityFeed**

Card with title "Attività Recente". Uses `useRecentActivityQuery()`.

Each entry (ActivityFeedItem):
- Timestamp (formatRelative) in muted
- User name + action verb + entity name (linked)
- Action mapping: 'CREATE' → "ha creato", 'UPDATE' → "ha aggiornato", 'DELETE' → "ha eliminato", 'STATUS_CHANGE' → "ha cambiato stato di"

ScrollArea with max-h for overflow.

- [ ] **Step 5: Commit domain components**

```bash
git add client/src/components/domain/home/
git commit -m "feat(ui): add HomePage domain components — KpiStrip, AttentionSection, MyTasksToday, ActivityFeed"
```

### Task 3.3: HomePage Rewrite

**Files:**
- Modify: `client/src/pages/home/HomePage.tsx`

- [ ] **Step 1: Rewrite HomePage layout**

Replace current content with 3-fascia layout:
```tsx
<motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-6">
  {/* Fascia 1 — KPI Strip */}
  <KpiStrip />

  {/* Fascia 2 — Attenzione Richiesta */}
  <AttentionSection />

  {/* Fascia 3 — Due colonne */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <MyTasksToday />
    <ActivityFeed />
  </div>
</motion.div>
```

Keep `useSetPageContext({ domain: 'home' })`. Role-based: dipendente sees all 3 fasce (filtered server-side). Guest sees only Fascia 1 (KPIs).

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/home/HomePage.tsx
git commit -m "feat(ui): rewrite HomePage as operational cruscotto with KPIs, attention, tasks, activity"
```

---

## Chunk 4: Frontend — Rich List Pages

### Task 4.1: ProjectListPage — Rich Grouped Columns

**Files:**
- Modify: `client/src/pages/projects/ProjectListPage.tsx`

- [ ] **Step 1: Redesign columns**

Replace current columns with rich 2-line layout:

Column 1 — "name" (flex-1):
- Line 1: ProgressRing (sm) + project name (font-medium) + ProblemIndicators (blocked tasks from `_count`, open risks from `_count`)
- Line 2: owner name + " · " + priority badge (StatusBadge)
- Line 3: Progress bar (thin, using shadcn Progress component)

Column 2 — "deadline" (w-24):
- DeadlineCell with targetEndDate

Remove separate columns for code, priority, status, responsible, tasks, progress. All info is now embedded in the rich row.

- [ ] **Step 2: Add groupBy configuration**

```typescript
const groupBy = {
  getGroup: (p: ProjectRow) => p.status,
  order: PROJECT_STATUS_GROUP_ORDER,
  labels: PROJECT_STATUS_LABELS,
  collapsedByDefault: COLLAPSED_BY_DEFAULT,
}
```

Pass to EntityList.

- [ ] **Step 3: Enrich ProjectRow interface**

The backend already returns `_count.tasks`, `_count.risks`, `stats.completionPercentage`. Add `_count.risks` to the query if not already included (check selectFields). The ProjectRow interface needs:
```typescript
interface ProjectRow {
  id: string
  name: string
  status: string
  priority: string
  targetEndDate?: string | null
  owner?: { firstName: string; lastName: string } | null
  stats?: { completionPercentage?: number; totalTasks?: number; completedTasks?: number } | null
  _count?: { tasks?: number; risks?: number } | null
}
```

Remove `code` and `sortOrder` from the interface (no longer displayed in list).

- [ ] **Step 4: Add "Solo problematici" filter toggle**

Add a toggle button/switch in `headerExtra` that sets a URL param `?problemsOnly=true`. When active, filter client-side to show only projects where `_count.risks > 0` or `stats.completionPercentage < 30` with approaching deadline.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/projects/ProjectListPage.tsx
git commit -m "feat(ui): redesign ProjectListPage with rich grouped rows and problem indicators"
```

### Task 4.2: TaskListPage — Rich Grouped Columns with Recurrence

**Files:**
- Modify: `client/src/pages/tasks/TaskListPage.tsx`

- [ ] **Step 1: Redesign columns**

Column 1 — "title" (flex-1):
- Line 1: StatusDot (md) + task title (font-medium) + ProblemIndicators (comments, checklist from `_count`)
- Line 2: ParentLink (project name, if exists) + " · " + assignee name
- Line 3 (only if blocked): blockedReason in `text-destructive text-xs italic`
- Line 3 (only if recurring): RecurrenceBadge

For recurring tasks: show RecurrenceBadge instead of progress/deadline.

Column 2 — "deadline" (w-24):
- DeadlineCell for normal tasks
- "Ultima: Xgg fa" for recurring tasks (uses task's updatedAt as proxy)

- [ ] **Step 2: Add groupBy for tasks**

```typescript
const getTaskGroup = (t: TaskRow) => {
  if (t.isRecurring && t.status !== 'done') return 'recurring'
  return t.status
}

const groupBy = {
  getGroup: getTaskGroup,
  order: TASK_STATUS_GROUP_ORDER,
  labels: { ...TASK_STATUS_LABELS, recurring: 'Ricorrenti attive' },
  collapsedByDefault: COLLAPSED_BY_DEFAULT,
}
```

- [ ] **Step 3: Enrich TaskRow**

```typescript
interface TaskRow {
  id: string
  title: string
  taskType: string
  status: string
  priority: string
  dueDate?: string | null
  blockedReason?: string | null
  isRecurring?: boolean
  recurrencePattern?: string | null
  project?: { id: string; name: string } | null
  assignee?: { id: string; firstName: string; lastName: string } | null
  _count?: { comments?: number; subtasks?: number } | null
}
```

The backend already returns `isRecurring`, `recurrencePattern`, `blockedReason` in the task select fields. Verify and add to hook if needed.

- [ ] **Step 4: Style blocked rows**

For rows where `status === 'blocked'`, add `className="bg-destructive/5"` to the DataTable row. This requires DataTable to accept a `rowClassName` prop:
```typescript
rowClassName?: (item: T) => string | undefined
```

Add this prop to DataTable and apply it to TableRow.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/tasks/TaskListPage.tsx client/src/components/common/DataTable.tsx
git commit -m "feat(ui): redesign TaskListPage with rich grouped rows, recurrence, blocked highlighting"
```

### Task 4.3: RiskListPage — Grouped by Severity

**Files:**
- Modify: `client/src/pages/risks/RiskListPage.tsx`

- [ ] **Step 1: Redesign columns**

Column 1 — "title" (flex-1):
- Line 1: colored dot (severity) + `P{n}×I{n}` badge + risk title
- Line 2: ParentLink (project name) + " · " + owner name
- Line 3: category badge + thin score bar (proportional to 25, colored by severity)

Column 2 — "score" (w-20):
- Score number large + label (Critico/Alto/Medio/Basso)

- [ ] **Step 2: Add groupBy for risks by severity**

Group by computed score (probability × impact), using `RISK_SEVERITY_GROUPS`:
```typescript
const getRiskGroup = (r: RiskRow) => {
  const score = (r.probability ?? 1) * (r.impact ?? 1)
  if (r.status === 'mitigated' || r.status === 'closed') return 'mitigated'
  if (score >= 16) return 'critical'
  if (score >= 10) return 'high'
  if (score >= 5) return 'medium'
  return 'low'
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/risks/RiskListPage.tsx
git commit -m "feat(ui): redesign RiskListPage with severity grouping and score bars"
```

---

## Chunk 5: Frontend — Connected Detail Pages

### Task 5.1: Sidebar Components

**Files:**
- Create: `client/src/components/common/ProjectTreeSidebar.tsx`
- Create: `client/src/components/common/RelatedEntitiesSidebar.tsx`
- Create: `client/src/components/common/NextActionSuggestion.tsx`

- [ ] **Step 1: Create ProjectTreeSidebar**

Mini interactive tree showing project's milestone/task hierarchy.

Props:
```typescript
interface ProjectTreeSidebarProps {
  projectId: string
}
```

Uses `useTaskListQuery({ projectId, limit: 100 })` to get all tasks of this project. Groups by parentTaskId to build tree:
- Root milestones (taskType = 'milestone', parentTaskId = null)
- Root tasks (taskType = 'task', parentTaskId = null)
- Children of each milestone/task

Renders collapsible tree:
- Milestone nodes: Flag icon + title + "(N task · M completati)" when collapsed
- Task nodes: StatusDot + title (clickable → `/tasks/:id`)
- Subtask nodes: smaller StatusDot + title (clickable)
- Blocked tasks in `text-destructive`
- First milestone with non-completed tasks expanded by default, rest collapsed
- "Task senza milestone" section for orphan root tasks
- Footer: "Vedi tutto →" link to project detail Tasks tab
- Max depth: 3 levels (milestone → task → subtask)

- [ ] **Step 2: Create RelatedEntitiesSidebar**

Shows entity counts with breakdown for problematic ones.

Props:
```typescript
interface RelatedEntitiesSidebarProps {
  projectId?: string
  taskId?: string
  counts?: {
    tasks?: number
    risks?: number
    documents?: number
    totalHours?: number
    weekHours?: number
    blockedTasks?: number
    criticalRisks?: number
    reviewDocuments?: number
    completedTasks?: number
    inProgressTasks?: number
  }
}
```

Renders a Card with sections per entity type. Each section:
- Icon + label + total count + problem badge if applicable
- Indented breakdown lines (only problematic counts), each with `→` link
- Links navigate to filtered list: e.g., `/tasks?projectId=X&status=blocked`

The calling page passes the counts (precomputed from existing queries or from a new stats endpoint).

- [ ] **Step 3: Create NextActionSuggestion**

Smart suggestion box.

Props:
```typescript
interface NextActionSuggestionProps {
  suggestions: Array<{
    icon: string      // emoji
    message: string
    actionLabel: string
    actionHref: string
  }>
}
```

Renders only the first suggestion (highest priority). Card with `bg-primary/5 border-primary/20`:
- Lightbulb icon + "Prossimo passo" label
- Message text
- Action button (ghost + →)

If empty array: renders nothing.

The calling page computes suggestions based on entity state (blocked tasks, incomplete checklists, etc.) and passes them sorted by priority.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/common/ProjectTreeSidebar.tsx client/src/components/common/RelatedEntitiesSidebar.tsx client/src/components/common/NextActionSuggestion.tsx
git commit -m "feat(ui): add ProjectTreeSidebar, RelatedEntitiesSidebar, NextActionSuggestion components"
```

### Task 5.2: ProjectDetailPage — Connected Sidebar

**Files:**
- Modify: `client/src/pages/projects/ProjectDetailPage.tsx`

- [ ] **Step 1: Redesign sidebar**

Replace current sidebar content with:
```tsx
<div className="space-y-4">
  {/* Status section (keep existing MetaRow items) */}
  <Card>
    <CardHeader><CardTitle className="text-sm">Stato</CardTitle></CardHeader>
    <CardContent className="space-y-2">
      {/* status, priority, progress ring, deadline, manager — keep existing */}
    </CardContent>
  </Card>

  {/* Project structure tree */}
  <Card>
    <CardHeader><CardTitle className="text-sm">Struttura Progetto</CardTitle></CardHeader>
    <CardContent>
      <ProjectTreeSidebar projectId={project.id} />
    </CardContent>
  </Card>

  {/* Related entities */}
  <Card>
    <CardHeader><CardTitle className="text-sm">Entità Collegate</CardTitle></CardHeader>
    <CardContent>
      <RelatedEntitiesSidebar projectId={project.id} counts={computedCounts} />
    </CardContent>
  </Card>

  {/* Next action suggestion */}
  <NextActionSuggestion suggestions={computeSuggestions(project, stats)} />
</div>
```

- [ ] **Step 2: Compute suggestions**

Add helper function `computeProjectSuggestions(project, stats)` that returns sorted suggestions:
- If blockedTasks > 0: "X task bloccati → Vai al più urgente"
- If completionPercentage < 30 and deadline within 7 days: "Scadenza tra Xgg ma solo Y% completato"
- If completionPercentage === 100: "Tutti i task completati → Chiudi progetto?"
- If criticalRisks > 0: "Rischio critico: [name] → Vedi dettaglio"

- [ ] **Step 3: Enrich breadcrumbs**

Update breadcrumbs to include Home:
```tsx
breadcrumbs={[
  { label: 'Home', href: '/' },
  { label: 'Progetti', href: '/projects', domain: 'project' },
  { label: project.name }
]}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/projects/ProjectDetailPage.tsx
git commit -m "feat(ui): redesign ProjectDetailPage sidebar with tree, related entities, suggestions"
```

### Task 5.3: TaskDetailPage — Connected Sidebar

**Files:**
- Modify: `client/src/pages/tasks/TaskDetailPage.tsx`

- [ ] **Step 1: Redesign sidebar**

Replace current sidebar with:
- Status section (keep existing MetaRow items)
- Parent project link (ParentLink component, if projectId exists)
- Subtask summary (count + status breakdown) if task has subtasks
- Recent comments preview (last 2-3 comments, truncated)
- Hours logged ("Xh registrate, stimata Yh")
- NextActionSuggestion

- [ ] **Step 2: Compute task suggestions**

- If checklist incomplete: "Checklist X/Y → Completa per avanzare"
- If no time entries: "Nessuna ora registrata → Avvia timer"
- If all subtasks done but task not done: "Tutti i subtask completati → Segna come completato?"
- If recurring and updatedAt > frequency threshold: "Non eseguito da Xgg → Registra esecuzione"

- [ ] **Step 3: Enrich breadcrumbs with hierarchy**

Build breadcrumb chain: Home → Progetti → [Project name] → [Milestone title if parent is milestone] → [Task title]

Use task's `parentTask` and `project` relations already returned by the API.

```tsx
const crumbs = [{ label: 'Home', href: '/' }]
if (task.project) {
  crumbs.push({ label: 'Progetti', href: '/projects', domain: 'project' })
  crumbs.push({ label: task.project.name, href: `/projects/${task.project.id}` })
}
if (task.parentTask) {
  crumbs.push({ label: task.parentTask.title, href: `/tasks/${task.parentTask.id}` })
}
crumbs.push({ label: task.title })
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/tasks/TaskDetailPage.tsx
git commit -m "feat(ui): redesign TaskDetailPage sidebar with parent links, suggestions, rich breadcrumbs"
```

---

## Chunk 6: Frontend — Global Affordance Polish

### Task 6.1: EntityPreviewTooltip

**Files:**
- Create: `client/src/components/common/EntityPreviewTooltip.tsx`

- [ ] **Step 1: Create EntityPreviewTooltip**

Rich tooltip that shows entity summary on hover (500ms delay).

Props:
```typescript
interface EntityPreviewTooltipProps {
  entityType: 'project' | 'task' | 'risk' | 'document'
  entityId: string
  children: React.ReactNode
}
```

Uses TanStack Query cache (`queryClient.getQueryData`) to get entity from cache — **no new API calls**. If not in cache, just renders children without tooltip.

Tooltip content (via shadcn Tooltip with custom content):
- Domain icon + name
- StatusDot + status label + priority
- Progress or score (if available)
- Deadline (if available)

Delay open: 500ms. On mobile: disabled (just renders children).

- [ ] **Step 2: Wrap ParentLink with EntityPreviewTooltip**

In `ParentLink.tsx`, wrap the link with `EntityPreviewTooltip`:
```tsx
<EntityPreviewTooltip entityType={domainToEntityType(domain)} entityId={extractId(href)}>
  <Link ...>...</Link>
</EntityPreviewTooltip>
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/common/EntityPreviewTooltip.tsx client/src/components/common/ParentLink.tsx
git commit -m "feat(ui): add EntityPreviewTooltip for cross-domain link hover previews"
```

### Task 6.2: Toast Navigation Links

**Files:**
- Modify: various pages where toast.success is called

- [ ] **Step 1: Add navigation to toast calls**

Find all `toast.success()` calls in form pages and mutation callbacks. Add action links:

```typescript
// Example in ProjectFormPage onSuccess:
toast.success('Progetto salvato', {
  action: {
    label: 'Vai al progetto →',
    onClick: () => navigate(`/projects/${data.id}`),
  },
})

// Example in TaskDetailPage status change:
toast.success('Stato aggiornato', {
  action: {
    label: 'Vedi task →',
    onClick: () => navigate(`/tasks/${taskId}`),
  },
})
```

Sonner supports `action: { label, onClick }` natively.

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/
git commit -m "feat(ui): add navigation links to toast notifications across all form/mutation pages"
```

### Task 6.3: Breadcrumbs Enhancement

**Files:**
- Modify: `client/src/components/common/Breadcrumbs.tsx`

- [ ] **Step 1: Add Home as default first item**

If first breadcrumb item is not "Home", automatically prepend `{ label: 'Home', href: '/', icon: Home }`.

Also add domain icon coloring to intermediate items (already partially implemented — verify and ensure consistency).

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/Breadcrumbs.tsx
git commit -m "feat(ui): auto-prepend Home to breadcrumbs, ensure domain icon consistency"
```

### Task 6.4: Page Transitions

**Files:**
- Modify: `client/src/App.tsx` (or wherever routes are rendered)

- [ ] **Step 1: Add AnimatePresence wrapper**

Wrap route outlet with Framer Motion `AnimatePresence`:
```tsx
import { AnimatePresence, motion } from 'framer-motion'

// In AppShell main content area:
<AnimatePresence mode="wait">
  <motion.div
    key={location.pathname}
    initial={{ opacity: 0, x: 8 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -8 }}
    transition={{ duration: 0.15 }}
  >
    <Outlet />
  </motion.div>
</AnimatePresence>
```

Keep transition short (150ms) to feel snappy, not sluggish.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/layout/AppShell.tsx
git commit -m "feat(ui): add page transition animations with AnimatePresence"
```

### Task 6.5: Final Verification

- [ ] **Step 1: Verify TypeScript compilation**

Run `cd client && npx tsc --noEmit` and fix any type errors.

- [ ] **Step 2: Verify dev server starts**

Run `cd client && npm run dev` and check no runtime errors in console.

- [ ] **Step 3: Visual smoke test**

Navigate through:
1. HomePage → verify KPI strip, attention section, tasks, activity
2. Projects list → verify grouped rows, progress rings, problem indicators
3. Project detail → verify tree sidebar, related entities, breadcrumbs
4. Tasks list → verify grouped rows, recurring section, blocked highlighting
5. Task detail → verify parent link, suggestions, rich breadcrumbs
6. Risks list → verify severity grouping
7. Test dark mode + all 3 themes

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(ui): address TypeScript errors and visual issues from UX clarity redesign"
```
