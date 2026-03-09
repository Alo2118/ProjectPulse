# Page Uniformity Design — Lista/Dashboard Pages

> Reference: `WeeklyReportPage.tsx` → `ReportPreview` component
> Scope: 8 pagine lista/dashboard
> Date: 2026-03-09

## Gold Standard Pattern (da ReportPreview)

### Page Header
```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
  <div>
    <h1 className="page-title">Titolo</h1>
    <p className="mt-1 text-themed-secondary">Sottotitolo</p>
  </div>
  <div className="flex flex-wrap gap-2">{actions}</div>
</div>
```

### Sezioni contenuto
- Wrapper: `<section className="card p-5">`
- Header: `<SectionHeader icon={Icon} label="Titolo" count={n} />`
- NO `<h2>/<h3>` manuali

### Tabelle
- Thead: `text-xs font-medium text-themed-secondary uppercase`, `border-b` con `var(--border-default)`
- Rows: `className="table-row-hover"` (no extras)
- Cells: `py-2.5 pr-3`

### Badge
- Pattern: `<span className="badge badge-semantic-{variant}">Label</span>`
- Variants: success, danger, warning, info, muted

### Metriche/KPI cards
- Grid: `grid grid-cols-2 sm:grid-cols-4 gap-3`
- Card: `p-3 rounded-lg` + `style={{ backgroundColor: 'var(--bg-hover)' }}`

### Tab bar
- Container: `rounded-lg p-1` + `style={{ backgroundColor: 'var(--bg-hover)' }}`
- Active: `card text-themed-heading shadow-sm`
- Inactive: `text-themed-secondary hover:text-themed-primary`

### Empty state
```tsx
<p className="text-sm text-themed-tertiary text-center py-6">Messaggio</p>
```

### Root container
- `space-y-5` (no `animate-fade-in`)

### Zero tolerance
- No `dark:` prefixes
- No hardcoded colors (hex, rgb, Tailwind gradients)
- No custom hover transforms (`hover:shadow-md hover:-translate-y-0.5`)

## Target Pages & Interventions

| Page | File | Issues |
|------|------|--------|
| DashboardPage | `pages/dashboard/DashboardPage.tsx` | Inline h3 → SectionHeader, standardize metric cards |
| AnalyticsPage | `pages/analytics/AnalyticsPage.tsx` | Add SectionHeader to chart sections, unify KPI cards |
| TimeTrackingPage | `pages/time-tracking/TimeTrackingPage.tsx` | Unify sections, custom modal overlay → BaseModal pattern |
| TeamTimePage | `pages/time-tracking/TeamTimePage.tsx` | `card-hover` → `card`, unify summary card pattern |
| NotificationCenterPage | `pages/notifications/NotificationCenterPage.tsx` | Redo header with page-title, remove `dark:` prefixes, standard hover |
| AuditTrailPage | `pages/audit/AuditTrailPage.tsx` | Remove hardcoded gradient, unify header, fix border card |
| KanbanBoardPage | `pages/kanban/KanbanBoardPage.tsx` | Move icon out of h1, unify column headers |
| MyDayPage | `pages/my-day/MyDayPage.tsx` | Integrate header into page-title pattern |
