# Dashboard Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign both Dipendente and Direzione dashboards with 3-level information hierarchy (Semaforo → Attenzione → Dettaglio), forward-looking predictions, and actionable insights.

**Architecture:** New dashboard components replace existing ones in `client/src/components/dashboard/`. One new backend endpoint (`/api/analytics/delivery-forecast`) leverages existing `planningService`. Stores updated to support period selection and delivery forecast data. No DB changes needed.

**Tech Stack:** React 18, TypeScript, Zustand, TailwindCSS, Recharts, Lucide Icons, Framer Motion (existing)

---

## Phase 1: Backend — New Endpoint + Period Support

### Task 1: Add delivery forecast endpoint to analyticsService

**Files:**
- Modify: `server/src/services/analyticsService.ts`

**Step 1: Add `getDeliveryForecast` function at end of file**

Add this function that combines projectHealth with velocity-based delivery prediction:

```typescript
export interface DeliveryForecast {
  projectId: string
  projectCode: string
  projectName: string
  progress: number
  targetEndDate: string | null
  daysRemaining: number | null
  healthStatus: 'healthy' | 'at_risk' | 'critical'
  velocityTasksPerWeek: number
  remainingTasks: number
  estimatedCompletionDays: number | null
  predictedDelay: number | null // positive = days late, negative = ahead, null = no deadline
}

export async function getDeliveryForecast(): Promise<DeliveryForecast[]> {
  const projectHealthData = await getProjectHealth()
  const now = new Date()

  // Get completion velocity per project (last 4 weeks)
  const fourWeeksAgo = new Date(now)
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

  const forecasts: DeliveryForecast[] = []

  for (const project of projectHealthData) {
    const completedRecently = await prisma.task.count({
      where: {
        projectId: project.projectId,
        status: 'done',
        isDeleted: false,
        updatedAt: { gte: fourWeeksAgo }
      }
    })

    const velocityTasksPerWeek = completedRecently / 4
    const remainingTasks = project.tasksTotal - project.tasksCompleted

    let estimatedCompletionDays: number | null = null
    let predictedDelay: number | null = null

    if (velocityTasksPerWeek > 0 && remainingTasks > 0) {
      const weeksNeeded = remainingTasks / velocityTasksPerWeek
      estimatedCompletionDays = Math.ceil(weeksNeeded * 7)

      if (project.daysRemaining !== null) {
        predictedDelay = estimatedCompletionDays - project.daysRemaining
      }
    }

    forecasts.push({
      projectId: project.projectId,
      projectCode: project.projectCode,
      projectName: project.projectName,
      progress: project.progress,
      targetEndDate: project.targetEndDate,
      daysRemaining: project.daysRemaining,
      healthStatus: project.healthStatus,
      velocityTasksPerWeek: parseFloat(velocityTasksPerWeek.toFixed(1)),
      remainingTasks,
      estimatedCompletionDays,
      predictedDelay: predictedDelay !== null ? Math.round(predictedDelay) : null
    })
  }

  // Sort: critical first, then at_risk, then by predicted delay desc
  const healthOrder = { critical: 0, at_risk: 1, healthy: 2 }
  forecasts.sort((a, b) => {
    const ha = healthOrder[a.healthStatus] ?? 3
    const hb = healthOrder[b.healthStatus] ?? 3
    if (ha !== hb) return ha - hb
    return (b.predictedDelay ?? 0) - (a.predictedDelay ?? 0)
  })

  return forecasts
}
```

**Step 2: Add `getDeliveryForecast` route to analyticsRoutes.ts**

In `server/src/routes/analyticsRoutes.ts`, add after the existing `project-health` route:

```typescript
router.get('/delivery-forecast', authMiddleware, requireRole('admin', 'direzione'), async (req, res) => {
  try {
    const data = await analyticsService.getDeliveryForecast()
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Error fetching delivery forecast', { error })
    res.status(500).json({ success: false, error: 'Errore nel calcolo previsioni consegna' })
  }
})
```

**Step 3: Add `period` support to `getTaskCompletionTrend`**

The function already accepts a `days` parameter. No backend change needed — the frontend will pass different `days` values based on period selection.

**Step 4: Export `DeliveryForecast` type from server types**

In `server/src/types/index.ts`, add:

```typescript
export type { DeliveryForecast } from '../services/analyticsService'
```

---

## Phase 2: Frontend — Stores Update

### Task 2: Add DeliveryForecast type to client types

**Files:**
- Modify: `client/src/types/index.ts`

Add at end of analytics types section:

```typescript
export interface DeliveryForecast {
  projectId: string
  projectCode: string
  projectName: string
  progress: number
  targetEndDate: string | null
  daysRemaining: number | null
  healthStatus: 'healthy' | 'at_risk' | 'critical'
  velocityTasksPerWeek: number
  remainingTasks: number
  estimatedCompletionDays: number | null
  predictedDelay: number | null
}
```

### Task 3: Update analyticsStore with delivery forecast + period support

**Files:**
- Modify: `client/src/stores/analyticsStore.ts`

**Changes:**

1. Add `DeliveryForecast` to type imports
2. Add state fields:
```typescript
deliveryForecast: DeliveryForecast[]
trendPeriodDays: number // 7, 30, 90
```
3. Add actions:
```typescript
fetchDeliveryForecast: () => Promise<void>
setTrendPeriodDays: (days: number) => void
```
4. In `fetchAll()`, add `this.fetchDeliveryForecast()` to the `Promise.all`
5. When `trendPeriodDays` changes, re-fetch completion trend with new `days` param

**Implementation for fetchDeliveryForecast:**
```typescript
fetchDeliveryForecast: async () => {
  try {
    const res = await api.get('/analytics/delivery-forecast')
    set({ deliveryForecast: res.data.data })
  } catch {
    // Non-critical, don't block dashboard
  }
}
```

**Implementation for setTrendPeriodDays:**
```typescript
setTrendPeriodDays: (days: number) => {
  set({ trendPeriodDays: days })
  get().fetchCompletionTrend(days)
}
```

### Task 4: Update dashboardLayoutStore with new widget IDs

**Files:**
- Modify: `client/src/stores/dashboardLayoutStore.ts`

**Changes:**

1. Update `WidgetId` type — replace old IDs with new ones:
```typescript
type WidgetId =
  // Direzione
  | 'traffic_light'        // replaces 'executive_kpi'
  | 'attention_direzione'  // replaces 'company_alerts'
  | 'delivery_outlook'     // NEW
  | 'team_capacity'        // replaces 'team_performance'
  | 'trend_chart'          // replaces 'advanced_kpi'
  | 'project_health'       // kept
  // Dipendente
  | 'status_bar'           // NEW (welcome + daily summary)
  | 'focus_today'          // replaces 'timer_widget' + 'my_tasks_today'
  | 'timer_weekly'         // replaces 'weekly_summary' + 'weekly_hours_chart'
  | 'attention_dipendente' // replaces 'alerts'
  | 'recent_tasks'         // kept
  // Removed: 'project_distribution', 'recent_projects' (merged or removed)
```

2. Update `DEFAULT_WIDGETS` array with new widget configs matching the new IDs, labels, descriptions, and `availableTo` values.

3. Bump persist version to `3` so old layout gets reset.

---

## Phase 3: Frontend — New Dashboard Components (Parallelizable)

These 5 components can be built in parallel by separate agents.

### Task 5: Create TrafficLightSection component (Direzione)

**Files:**
- Create: `client/src/components/dashboard/TrafficLightSection.tsx`

**Props:**
```typescript
interface TrafficLightSectionProps {
  projectHealth: ProjectHealth[]
  teamWorkload: TeamWorkloadEntry[]
  isLoading?: boolean
}
```

**Behavior:**
- 4 large cards in a responsive grid (`grid-cols-2 lg:grid-cols-4`)
- Card 1: Green count (healthy projects) — green bg accent
- Card 2: Amber count (at_risk projects) — amber bg accent
- Card 3: Red count (critical projects) — red bg accent
- Card 4: Team utilization % (avg of teamWorkload) — blue bg accent
- Each card: large number, label, subtle icon (CheckCircle, AlertTriangle, XCircle, Users)
- Click handler prop for drill-down (scrolls to relevant section)
- Skeleton loading state with 4 placeholder cards
- Dark mode variants on all colors

**Layout per card:**
```
┌────────────────┐
│ Icon      12   │  ← large number
│ Progetti       │
│ in salute      │
└────────────────┘
```

### Task 6: Create AttentionSection component (Both roles)

**Files:**
- Create: `client/src/components/dashboard/AttentionSection.tsx`

**Props:**
```typescript
interface AttentionSectionProps {
  // Direzione data
  projectHealth?: ProjectHealth[]
  teamWorkload?: TeamWorkloadEntry[]
  overview?: OverviewStats | null
  // Dipendente data
  myTasks?: Task[]
  // Common
  role: 'direzione' | 'dipendente'
}
```

**Behavior:**
- **Renders NOTHING if no alerts exist** (no wrapper, no "tutto ok" message)
- Direzione alerts (computed from props):
  - Critical projects: `projectHealth.filter(p => p.healthStatus === 'critical')`
  - Overloaded team: `teamWorkload.filter(w => w.utilizationPercent > 100)`
  - Underutilized team: `teamWorkload.filter(w => w.utilizationPercent < 30)`
  - Blocked tasks count from overview
- Dipendente alerts (computed from myTasks):
  - Blocked tasks: `myTasks.filter(t => t.status === 'blocked')`
  - Overdue tasks: `myTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done')`
  - Due today: `myTasks.filter(t => t.dueDate && isToday(t.dueDate))`
- Each alert: colored left border (red/amber), icon, title, count, expandable detail
- Framer Motion: `AnimatePresence` for smooth show/hide
- Links to relevant pages (task detail, project detail)

### Task 7: Create FocusTodaySection component (Dipendente)

**Files:**
- Create: `client/src/components/dashboard/FocusTodaySection.tsx`

**Props:**
```typescript
interface FocusTodaySectionProps {
  tasks: Task[]
  weeklyHours: UserWeeklyHours | null
  runningTimer: TimeEntry | null
  canTrackTime: boolean
  runningTimerTaskId: string | null
  onTimerToggle: (taskId: string) => void
  isLoading?: boolean
}
```

**Behavior:**
- **Status bar** at top: "Buongiorno, {name}! Oggi hai {n} task · {h}h/{target}h loggate"
  - Calculates tasks due today from `tasks` by dueDate
  - Shows today's logged hours from `weeklyHours.byDay` matching today's dayOfWeek
- **Two-column layout** (lg:grid-cols-2):
  - **Left: Task list by horizon**
    - "Oggi" section: tasks due today, sorted by priority
    - "Domani" section: tasks due tomorrow
    - "Questa settimana" section: tasks due within 7 days (not today/tomorrow)
    - Each task row: priority dot, title (link), project badge, timer button
    - Empty horizon sections are hidden
  - **Right: Timer + Weekly progress**
    - Running timer (if active): task name, project, LiveTimer, stop button
    - No timer: compact "Nessun timer attivo" message
    - Weekly progress bar (from WeeklySummaryCard logic)
    - Mini bar chart: hours per weekday (Mon-Fri), today highlighted
- Skeleton loading state

### Task 8: Create DeliveryOutlookSection component (Direzione)

**Files:**
- Create: `client/src/components/dashboard/DeliveryOutlookSection.tsx`

**Props:**
```typescript
interface DeliveryOutlookSectionProps {
  forecasts: DeliveryForecast[]
  isLoading?: boolean
}
```

**Behavior:**
- Card with "Previsioni Consegna" header
- Each project as a row:
  - Project name (link to project detail)
  - Progress bar (colored by health)
  - Deadline label ("Scade il 15 Mar" or "Nessuna deadline")
  - Days remaining badge
  - Predicted delay indicator:
    - Green "In anticipo di X giorni" (predictedDelay < 0)
    - Green "In tempo" (predictedDelay === 0 or null with healthy)
    - Amber "Possibile ritardo di X giorni" (predictedDelay 1-7)
    - Red "Ritardo stimato X giorni" (predictedDelay > 7)
  - Velocity: "{n} task/sett" small text
- Sort: critical first, then at_risk, then healthy
- Max 10 projects shown, "Vedi tutti" link to projects page
- Skeleton: 5 rows of placeholder bars

### Task 9: Create PeriodSelector component (Shared)

**Files:**
- Create: `client/src/components/dashboard/PeriodSelector.tsx`

**Props:**
```typescript
interface PeriodSelectorProps {
  value: number  // days: 7, 30, 90
  onChange: (days: number) => void
}
```

**Behavior:**
- 3 toggle buttons in a button group: "Settimana" (7) | "Mese" (30) | "3 Mesi" (90)
- Active button has primary bg, others have ghost style
- Small size, inline with section headers
- Dark mode variants

---

## Phase 4: Frontend — Modify Existing Components

### Task 10: Enhance TeamPerformanceSection with capacity thresholds

**Files:**
- Modify: `client/src/components/dashboard/TeamPerformanceSection.tsx`

**Changes:**
1. Add visual threshold reference lines at 80% and 100% on the workload chart
2. Color bars: green (<80%), amber (80-100%), red (>100%)
3. Add summary line below chart: "{n} sovraccaricati · {m} sottoutilizzati"
   - Overloaded = utilizationPercent > 100
   - Underutilized = utilizationPercent < 30
4. Integrate PeriodSelector for the trend chart (right column)
5. Pass `trendPeriodDays` from analyticsStore to control days param

**Specific code changes:**
- In the BarChart for team workload, add two `<ReferenceLine>` components:
```tsx
<ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="3 3" label="80%" />
<ReferenceLine y={100} stroke="#ef4444" strokeDasharray="3 3" label="100%" />
```
- Change bar fill function to use thresholds:
```typescript
const getBarColor = (utilization: number) => {
  if (utilization > 100) return '#ef4444'  // red
  if (utilization >= 80) return '#f59e0b'  // amber
  return '#22c55e'  // green
}
```
- Add capacity summary below the chart:
```tsx
const overloaded = teamWorkload.filter(w => w.utilizationPercent > 100).length
const underutilized = teamWorkload.filter(w => w.utilizationPercent < 30).length
// Render summary line if either > 0
```

---

## Phase 5: Frontend — Rewire DashboardPage

### Task 11: Rewrite DashboardPage with new layout

**Files:**
- Modify: `client/src/pages/dipendente/DashboardPage.tsx`

**Complete restructure of the JSX:**

**Direzione layout:**
```tsx
<div className="space-y-6">
  {/* Level 1: Semaforo */}
  {isVisible('traffic_light') && (
    <TrafficLightSection
      projectHealth={projectHealth}
      teamWorkload={teamWorkload}
      isLoading={isLoadingAnalytics}
    />
  )}

  {/* Level 2: Attenzione (auto-hides) */}
  {isVisible('attention_direzione') && (
    <AttentionSection
      role="direzione"
      projectHealth={projectHealth}
      teamWorkload={teamWorkload}
      overview={overview}
    />
  )}

  {/* Level 3: Dettaglio */}
  {isVisible('delivery_outlook') && (
    <DeliveryOutlookSection
      forecasts={deliveryForecast}
      isLoading={isLoadingAnalytics}
    />
  )}

  {isVisible('team_capacity') && (
    <TeamPerformanceSection
      topContributors={topContributors}
      completionTrend={completionTrend}
      teamWorkload={teamWorkload}
      isLoading={isLoadingAnalytics}
    />
  )}

  {isVisible('project_health') && (
    <ProjectHealthSection
      projects={projectHealth}
      isLoading={isLoadingAnalytics}
    />
  )}

  {isVisible('trend_chart') && (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Trend Completamento
        </h2>
        <PeriodSelector
          value={trendPeriodDays}
          onChange={setTrendPeriodDays}
        />
      </div>
      {/* Reuse AreaChart from TeamPerformanceSection's right column */}
    </div>
  )}

  {isVisible('recent_tasks') && (
    {/* Recent Tasks section - kept as-is */}
  )}
</div>
```

**Dipendente layout:**
```tsx
<div className="space-y-6">
  {/* Level 1+2: Focus + Timer (combined) */}
  {isVisible('focus_today') && (
    <FocusTodaySection
      tasks={myTasks}
      weeklyHours={weeklyHours}
      runningTimer={runningTimer}
      canTrackTime={canTrackTime}
      runningTimerTaskId={runningTimerTaskId}
      onTimerToggle={handleTimerToggle}
      isLoading={isLoading}
    />
  )}

  {/* Level 2: Attenzione (auto-hides) */}
  {isVisible('attention_dipendente') && (
    <AttentionSection
      role="dipendente"
      myTasks={myTasks}
    />
  )}

  {/* Level 3: Dettaglio */}
  {isVisible('recent_tasks') && (
    {/* Recent Tasks section with tree/list toggle - kept */}
  )}
</div>
```

**Import changes:**
- Remove: `ExecutiveKPISection`, `CompanyAlertsSection`, `AdvancedKPISection`, `MyTasksToday`, `TimerWidget`, `WeeklySummaryCard`, `WeeklyHoursChart`, `AlertsSection`, `ProjectDistribution`
- Add: `TrafficLightSection`, `AttentionSection`, `FocusTodaySection`, `DeliveryOutlookSection`, `PeriodSelector`
- Keep: `ProjectHealthSection`, `TeamPerformanceSection`, `DashboardCustomizer`, `TaskTreeView`

**Store usage changes:**
- Add from `useAnalyticsStore`: `deliveryForecast`, `trendPeriodDays`, `setTrendPeriodDays`
- Remove unused store selectors for removed widgets

### Task 12: Update DashboardCustomizer for new widget IDs

**Files:**
- Modify: `client/src/components/dashboard/DashboardCustomizer.tsx`

No code changes needed — it reads widget list from `dashboardLayoutStore` dynamically. Just ensure the store's DEFAULT_WIDGETS (Task 4) has correct labels and descriptions in Italian.

---

## Phase 6: Cleanup

### Task 13: Remove deprecated components (after verifying new ones work)

**Files to potentially delete (only if no longer imported anywhere):**
- `client/src/components/dashboard/ExecutiveKPISection.tsx` — replaced by TrafficLightSection
- `client/src/components/dashboard/CompanyAlertsSection.tsx` — replaced by AttentionSection
- `client/src/components/dashboard/AdvancedKPISection.tsx` — charts moved to TeamPerformance + standalone trend
- `client/src/components/dashboard/MyTasksToday.tsx` — replaced by FocusTodaySection
- `client/src/components/dashboard/AlertsSection.tsx` — replaced by AttentionSection
- `client/src/components/dashboard/ProjectDistribution.tsx` — removed (low value)
- `client/src/components/dashboard/WeeklySummaryCard.tsx` — merged into FocusTodaySection
- `client/src/components/dashboard/WeeklyHoursChart.tsx` — merged into FocusTodaySection
- `client/src/components/dashboard/TimerWidget.tsx` — merged into FocusTodaySection

**Before deleting:** Grep for imports of each component across the codebase to ensure they're not used elsewhere.

---

## Dependency Graph

```
Task 1 (backend endpoint)     → no deps
Task 2 (client types)         → no deps
Task 3 (analyticsStore)       → Task 2
Task 4 (layoutStore)          → no deps

Task 5 (TrafficLightSection)  → Task 2 (types)
Task 6 (AttentionSection)     → Task 2 (types)
Task 7 (FocusTodaySection)    → Task 2 (types)
Task 8 (DeliveryOutlookSection) → Task 2 (types)
Task 9 (PeriodSelector)       → no deps

Task 10 (TeamPerformance mod) → Task 9 (PeriodSelector)
Task 11 (DashboardPage)       → Tasks 3-10 (all components + stores)
Task 12 (Customizer update)   → Task 4 (layoutStore)
Task 13 (Cleanup)             → Task 11 (new page working)
```

## Parallelization Strategy

**Wave 1** (parallel): Tasks 1, 2, 4, 9
**Wave 2** (parallel, after Wave 1): Tasks 3, 5, 6, 7, 8
**Wave 3** (after Wave 2): Tasks 10, 11, 12
**Wave 4** (after Wave 3): Task 13
