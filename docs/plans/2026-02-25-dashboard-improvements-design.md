# Dashboard Improvements Design

**Date**: 2026-02-25
**Status**: Approved
**Scope**: Complete redesign of both Dipendente and Direzione dashboards

---

## Problem Statement

Both dashboards lack information hierarchy, forward-looking data, and actionable insights. The Dipendente dashboard shows all tasks instead of today's focus. The Direzione dashboard is a wall of numbers without narrative.

## Design Principles

1. **3-level hierarchy**: Semaforo (glance) → Attenzione (alerts) → Dettaglio (drill-down)
2. **No news is good news**: Alert sections hide when empty
3. **Forward-looking**: Predictions alongside historical data
4. **Actionable**: Every widget should suggest what to do next

---

## 1. Semaforo Generale (Direzione only)

**Purpose**: Single-row health summary answering "How are things going?" in 3 seconds.

**Data**:
- Projects healthy (green count)
- Projects at risk (amber count)
- Projects critical (red count)
- Team utilization % (aggregate)

**Source**: Existing `GET /analytics/project-health` + `GET /analytics/team-workload`

**Behavior**:
- 4 large stat cards with colored indicators
- Click on any card scrolls to relevant detail section
- Replaces current ExecutiveKPISection (7 cards → 4 focused cards)

---

## 2. "Richiede Attenzione" Section (Both roles)

**Purpose**: Actionable alert section that only appears when there are problems.

### Direzione version
Aggregated alerts:
- Critical projects with reason (blocked tasks, overdue, high risks)
- Overloaded team members (>100% capacity)
- Underutilized team members (<30% capacity)
- Unassigned tasks count

### Dipendente version
Personal alerts:
- Blocked tasks (with blocker reason)
- Overdue tasks (with days overdue)
- Due today/tomorrow tasks

**Behavior**: Section is completely hidden when no alerts exist (no "Tutto in ordine!" placeholder).

**Source**: Existing endpoints, client-side filtering with thresholds.

---

## 3. Focus del Giorno (Dipendente only)

**Purpose**: Transform MyTasksToday from "all active tasks" to "today's plan".

**Data**:
- Tasks due today
- Tasks due tomorrow
- Tasks due this week
- Grouped by time horizon with visual separation
- Daily progress: tasks completed today / tasks due today
- Running timer prominently displayed

**Layout**:
```
Status Bar: "Buongiorno, Marco! Oggi hai 5 task · 2h/8h loggate"

┌─────────────────┬────────────────────┐
│ FOCUS OGGI      │ TIMER + ORE SETT.  │
│ Tasks by horizon│ Running timer       │
│ (today/tomorrow/│ Weekly progress bar │
│  this week)     │ Hours by day chart  │
└─────────────────┴────────────────────┘
```

**Source**: Existing `GET /tasks/my` filtered by dueDate ranges client-side.

---

## 4. Delivery Outlook (Direzione only)

**Purpose**: Forward-looking project status with estimated delivery prediction.

**Data per project**:
- Progress % bar
- Days remaining to deadline
- Health status indicator
- Predicted delay (if any) based on current velocity

**Prediction logic**: Uses existing `planningService.suggestTimeline` data — compares current burndown rate against remaining work to estimate if deadline will be met.

**Source**: `GET /analytics/project-health` + new endpoint `GET /api/planning/delivery-forecast` (leverages planningService).

---

## 5. Team Capacity con Soglie (Direzione only)

**Purpose**: Improve existing TeamPerformanceSection with clear over/under thresholds.

**Enhancements**:
- Visual threshold lines at 80% (warning) and 100% (overload)
- Color coding: green (<80%), amber (80-100%), red (>100%)
- Summary line: "2 persone sovraccariche · 1 sottoutilizzata"
- Click on person → shows their task list for rebalancing

**Source**: Existing `GET /analytics/team-workload`, add threshold logic client-side.

---

## 6. Periodo Selezionabile (Both roles)

**Purpose**: Allow users to change the time range for trend data.

**Options**: Questa settimana / Ultimo mese / Ultimi 3 mesi

**Affected widgets**:
- Trend completamento task (Direzione)
- Weekly hours chart (Dipendente)
- Velocity/burndown (Direzione)

**Implementation**: Add `period` query param to existing analytics endpoints, default to current behavior.

---

## Backend Changes

### New endpoint
- `GET /api/planning/delivery-forecast` — returns per-project delivery predictions

### Modified endpoints
- `GET /analytics/overview-with-delta` — add `period` query param
- `GET /analytics/task-completion-trend` — already supports `days` param
- `GET /analytics/team-workload` — add threshold annotations in response

### No new DB models needed

---

## Component Changes

### New components
- `TrafficLightSection` — semaforo generale (4 cards)
- `AttentionSection` — actionable alerts (replaces CompanyAlertsSection + AlertsSection)
- `FocusTodaySection` — today's task plan (replaces MyTasksToday)
- `DeliveryOutlookSection` — project delivery predictions
- `PeriodSelector` — time range selector

### Modified components
- `TeamPerformanceSection` — add capacity thresholds and color coding
- `DashboardPage` — new layout structure with 3-level hierarchy
- `dashboardStore` — add delivery forecast fetch, period state
- `dashboardLayoutStore` — update widget registry

### Removed/replaced
- `ExecutiveKPISection` → replaced by `TrafficLightSection`
- `CompanyAlertsSection` → merged into `AttentionSection`
- `AlertsSection` → merged into `AttentionSection`
- `MyTasksToday` → replaced by `FocusTodaySection`
- `AdvancedKPISection` — simplified, key charts moved into other sections

---

## Layout: Final Structure

### Dipendente
```
1. Status Bar (welcome + daily summary)
2. FocusTodaySection (left) + Timer & Weekly Progress (right)
3. AttentionSection (only if alerts exist)
4. Trend chart (with PeriodSelector)
5. Recent Tasks (tree view)
```

### Direzione
```
1. TrafficLightSection (4 semaforo cards)
2. AttentionSection (only if issues exist)
3. DeliveryOutlookSection (project forecasts)
4. TeamPerformanceSection (with capacity thresholds)
5. Trend chart (with PeriodSelector)
```
