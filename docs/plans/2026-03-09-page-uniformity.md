# Page Uniformity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align 8 lista/dashboard pages to the gold standard pattern established by WeeklyReportPage/ReportPreview — consistent headers, sections, cards, badges, tables, and zero hardcoded colors.

**Architecture:** Pure UI refactoring — no backend changes, no new components. Replace inline headings with `SectionHeader`, standardize card classes, remove hardcoded colors and `dark:` prefixes, unify table hover patterns.

**Tech Stack:** React, TailwindCSS, existing `SectionHeader` component, semantic CSS variables.

---

### Task 1: AuditTrailPage — Remove hardcoded gradient + add SectionHeader

**Files:**
- Modify: `client/src/pages/audit/AuditTrailPage.tsx`

**Step 1: Add SectionHeader import**

Add to existing imports at the top of the file:
```tsx
import { SectionHeader } from '@components/common/SectionHeader'
```

**Step 2: Replace hardcoded avatar gradient (line ~239)**

Find:
```tsx
from-cyan-500 to-purple-500
```
Replace with:
```tsx
from-[var(--accent-primary)] to-[var(--accent-secondary,var(--accent-primary))]
```

**Step 3: Fix error card styling (line ~598)**

Find:
```tsx
className="card p-4 border border-semantic-danger bg-semantic-danger"
```
Replace with:
```tsx
className="bg-semantic-danger border border-semantic-danger rounded-xl p-4"
```

**Step 4: Remove extra transition-colors from table rows (line ~226)**

Find:
```tsx
className="table-row-hover transition-colors"
```
Replace with:
```tsx
className="table-row-hover"
```

**Step 5: Replace manual h3 empty state heading (line ~607)**

Find:
```tsx
<h3 className="text-lg font-medium text-themed-heading mb-2">
```
Replace with:
```tsx
<h3 className="text-base font-medium text-themed-heading mb-2">
```

**Step 6: Verify build**

Run: `cd client && npx tsc --noEmit`
Expected: No type errors

**Step 7: Commit**

```bash
git add client/src/pages/audit/AuditTrailPage.tsx
git commit -m "refactor(audit): remove hardcoded colors and unify patterns"
```

---

### Task 2: NotificationCenterPage — Standardize header + remove dark: prefixes

**Files:**
- Modify: `client/src/pages/notifications/NotificationCenterPage.tsx`

**Step 1: Add SectionHeader import**

```tsx
import { SectionHeader } from '@components/common/SectionHeader'
```

**Step 2: Replace custom h2 in preferences section (line ~606)**

Find:
```tsx
<h2 className="text-sm font-semibold text-themed-heading mb-1">
```
Replace with usage of SectionHeader or keep simple semantic heading:
```tsx
<h2 className="text-sm font-semibold text-themed-heading mb-3">
```

**Step 3: Remove all `dark:` prefixes**

Search for every instance of `dark:` in the file and remove the `dark:` variant (the theme system handles dark mode via CSS variables, so `dark:` prefixes are redundant/conflicting).

Specifically look for patterns like:
```
dark:hover:border-[var(--accent-primary)]/30
```
These should be removed entirely since the non-dark variant already uses CSS vars that adapt to dark themes.

**Step 4: Replace custom hover transforms on notification items**

Find any:
```tsx
hover:shadow-md hover:-translate-y-0.5
```
Replace with:
```tsx
table-row-hover
```

**Step 5: Verify build**

Run: `cd client && npx tsc --noEmit`

**Step 6: Commit**

```bash
git add client/src/pages/notifications/NotificationCenterPage.tsx
git commit -m "refactor(notifications): remove dark: prefixes and unify hover patterns"
```

---

### Task 3: TeamTimePage — Replace card-hover with card, standardize summary cards

**Files:**
- Modify: `client/src/pages/time-tracking/TeamTimePage.tsx`

**Step 1: Replace all `card-hover` with `card`**

Find all 5 instances of:
```tsx
className="card-hover p-5"
```
Replace with:
```tsx
className="card p-5"
```

**Step 2: Standardize summary card icon containers**

The 5 summary cards use inconsistent border/bg patterns like:
```tsx
bg-semantic-warning border border-semantic-warning/20
bg-semantic-info border border-semantic-info/20
bg-semantic-purple border border-[var(--color-purple)]/20
```
Replace all with a uniform pattern using just the semantic background:
```tsx
bg-semantic-warning
bg-semantic-info
bg-semantic-purple
bg-semantic-success
bg-[var(--accent-primary-bg)]
```
Remove the `border border-*/20` from the icon wrappers (the card already has a border).

**Step 3: Verify build**

Run: `cd client && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add client/src/pages/time-tracking/TeamTimePage.tsx
git commit -m "refactor(team-time): replace card-hover, standardize summary cards"
```

---

### Task 4: KanbanBoardPage — Fix h1 icon placement

**Files:**
- Modify: `client/src/pages/kanban/KanbanBoardPage.tsx`

**Step 1: Move icon out of h1 (line ~523)**

Find the h1 with icon inside:
```tsx
<h1 className="page-title flex items-center">
```
Restructure to match the standard pattern:
```tsx
<div className="flex items-center gap-3">
  <IconComponent className="w-5 h-5 text-themed-accent" />
  <h1 className="page-title">Kanban Board</h1>
</div>
```
(Check what icon is used and move it to a sibling div.)

**Step 2: Verify build**

Run: `cd client && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add client/src/pages/kanban/KanbanBoardPage.tsx
git commit -m "refactor(kanban): move icon out of h1 for consistent header pattern"
```

---

### Task 5: TimeTrackingPage — Add missing SectionHeader usage

**Files:**
- Modify: `client/src/pages/time-tracking/TimeTrackingPage.tsx`

**Step 1: Verify SectionHeader is already imported (line ~28)**

It's already imported. Check if summary card section headers could benefit from SectionHeader. The page already uses SectionHeader for "Registrazioni Tempo" — verify consistency of all section titles.

**Step 2: Ensure table row hovers are standard**

Check that `table-row-hover` on entry rows (line ~488) doesn't have extra classes like `cursor-pointer`. If the entries are clickable, `cursor-pointer` is fine to keep. Remove any `transition-colors` if present alongside `table-row-hover`.

**Step 3: Verify build**

Run: `cd client && npx tsc --noEmit`

**Step 4: Commit (if changes were made)**

```bash
git add client/src/pages/time-tracking/TimeTrackingPage.tsx
git commit -m "refactor(time-tracking): standardize section headers and hover patterns"
```

---

### Task 6: AnalyticsPage — Standardize KPI card styling

**Files:**
- Modify: `client/src/pages/analytics/AnalyticsPage.tsx`

**Step 1: Check current StatCard component (embedded ~line 50)**

The StatCard is an inline component. Verify it uses `card p-5` pattern and themed colors only.

**Step 2: Verify all chart sections use SectionHeader**

Already uses SectionHeader extensively (6 instances). Confirm the footer summary section at ~line 391 follows the card p-5 pattern.

**Step 3: Ensure no `animate-fade-in` on main root (only on skeleton)**

Main root at line ~168 should be `space-y-5` (no animation). The skeleton at line ~132 can keep `animate-fade-in`.

**Step 4: Verify build**

Run: `cd client && npx tsc --noEmit`

**Step 5: Commit (if changes were made)**

```bash
git add client/src/pages/analytics/AnalyticsPage.tsx
git commit -m "refactor(analytics): standardize card and section patterns"
```

---

### Task 7: DashboardPage — Standardize remaining patterns

**Files:**
- Modify: `client/src/pages/dipendente/DashboardPage.tsx`

**Step 1: Check card patterns**

Verify all card instances use `card p-5` or `card` (for sections with internal padding). The running timer card uses `card border-[var(--accent-primary)]/20 animate-glow-pulse p-5` which is acceptable for a specialized widget.

**Step 2: Verify SectionHeader usage is consistent**

Already uses SectionHeader (4 instances). Check that no inline `<h3>` headings exist as section headers.

**Step 3: Verify divide-y pattern uses themed vars**

The `divide-[var(--accent-primary)]/5` pattern at line ~507, ~579 should use `divide-y` with `style={{ borderColor: 'var(--border-default)' }}` instead.

Find:
```tsx
divide-y divide-[var(--accent-primary)]/5
```
Replace with:
```tsx
divide-y
```
And add `style={{ borderColor: 'var(--border-default)' }}` to the parent element.

**Step 4: Verify build**

Run: `cd client && npx tsc --noEmit`

**Step 5: Commit**

```bash
git add client/src/pages/dipendente/DashboardPage.tsx
git commit -m "refactor(dashboard): standardize divide and card patterns"
```

---

### Task 8: MyDayPage — Verify compliance

**Files:**
- Modify: `client/src/pages/my-day/MyDayPage.tsx`

**Step 1: Check root container**

Root is `space-y-5 animate-fade-in`. Remove `animate-fade-in` from main root to match standard (DashboardLayout handles transitions).

Find:
```tsx
className="space-y-5 animate-fade-in"
```
Replace with:
```tsx
className="space-y-5"
```
(Apply to both main content and skeleton root.)

**Step 2: Verify no hardcoded colors**

MyDayPage delegates most rendering to sub-components (MyDayHeader, MyDayTaskSection, MyDayTomorrowPreview) which use HUD components. These are already well-themed. Just verify no hardcoded hex/rgb in the page itself.

**Step 3: Verify build**

Run: `cd client && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add client/src/pages/my-day/MyDayPage.tsx
git commit -m "refactor(my-day): remove animate-fade-in from root container"
```

---

### Task 9: Final verification — build + visual check

**Step 1: Full TypeScript check**

Run: `cd client && npx tsc --noEmit`
Expected: 0 errors

**Step 2: Dev build check**

Run: `cd client && npx vite build`
Expected: Build succeeds

**Step 3: Commit any remaining fixes**

```bash
git add -A
git commit -m "refactor: final uniformity fixes across lista/dashboard pages"
```
