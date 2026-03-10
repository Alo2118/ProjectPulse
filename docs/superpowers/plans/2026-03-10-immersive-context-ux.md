# Immersive Context UX — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform ProjectPulse into a context-aware app with multi-theme system, radial menu, progress visualization, guided workflows, and dynamic permission management.

**Architecture:** 6 subsystems built in dependency order — foundation first (themes, context provider, permissions), then UI features (radial menu, progress viz, workflows) that consume the foundation. Backend changes are minimal (permission policies CRUD + DB migration).

**Tech Stack:** React 18, TypeScript, Zustand, TanStack Query 5, shadcn/ui (Radix + Tailwind), Framer Motion, Recharts, Prisma 7 + SQL Server, Zod, Express

**Spec:** `docs/superpowers/specs/2026-03-10-immersive-context-ux-design.md`

---

## Chunk 1: Multi-Theme Foundation

This chunk establishes the 3-theme × 2-mode system. Everything else builds on these CSS variables and theme config.

### Task 1: Update ThemeStore for multi-theme support

**Files:**
- Modify: `client/src/stores/themeStore.ts`
- Modify: `client/src/types/index.ts`

- [ ] **Step 1: Update types**

Add to `client/src/types/index.ts`:

```typescript
export type ThemeStyle = "office-classic" | "asana-like" | "tech-hud"
export type ThemeMode = "light" | "dark" | "system"
```

Remove old `Theme` type if it exists (was `'light' | 'dark'`).

- [ ] **Step 2: Rewrite themeStore**

Replace `client/src/stores/themeStore.ts` with:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeStyle, ThemeMode } from '@/types'

interface ThemeState {
  theme: ThemeStyle
  mode: ThemeMode
  setTheme: (theme: ThemeStyle) => void
  setMode: (mode: ThemeMode) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'office-classic',
      mode: 'system',
      setTheme: (theme) => set({ theme }),
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'pp-theme',
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        if (version < 2) {
          const old = persisted as Record<string, unknown>
          return {
            theme: 'office-classic' as ThemeStyle,
            mode: (old?.theme === 'dark' ? 'dark' : old?.theme === 'light' ? 'light' : 'system') as ThemeMode,
          }
        }
        return persisted as ThemeState
      },
    }
  )
)
```

- [ ] **Step 3: Verify build compiles**

Run: `cd client && npx tsc --noEmit 2>&1 | head -20`

Fix any type errors from old `Theme` type references.

- [ ] **Step 4: Commit**

```bash
git add client/src/stores/themeStore.ts client/src/types/index.ts
git commit -m "feat(theme): update themeStore for multi-theme support (3 themes × 2 modes)"
```

---

### Task 2: Update ThemeProvider for data-theme attribute

**Files:**
- Modify: `client/src/components/layout/ThemeProvider.tsx`

- [ ] **Step 1: Rewrite ThemeProvider**

The ThemeProvider must now:
1. Set `data-theme` attribute on `<html>` from `themeStore.theme`
2. Set/remove `.dark` class from `themeStore.mode` (with system detection)

```typescript
import { useEffect } from 'react'
import { useThemeStore } from '@/stores/themeStore'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, mode } = useThemeStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    const applyMode = (dark: boolean) => {
      root.classList.toggle('dark', dark)
    }

    if (mode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      applyMode(mq.matches)
      const handler = (e: MediaQueryListEvent) => applyMode(e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }

    applyMode(mode === 'dark')
  }, [mode])

  return <>{children}</>
}
```

- [ ] **Step 2: Verify theme toggle still works**

Run: `cd client && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add client/src/components/layout/ThemeProvider.tsx
git commit -m "feat(theme): update ThemeProvider for data-theme attribute + mode"
```

---

### Task 3: Create 6 CSS variable sets in globals.css

**Files:**
- Modify: `client/src/styles/globals.css`

- [ ] **Step 1: Read current globals.css**

Read `client/src/styles/globals.css` to understand the current variable structure.

- [ ] **Step 2: Restructure with data-theme selectors**

Replace the `:root` and `.dark` blocks with 6 blocks. Each theme defines all the same CSS variables. Add new variables: `--font-data`, `--shadow-theme`.

Current variables to preserve and set per-theme:
- `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`
- `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`
- `--destructive`, `--destructive-foreground`
- `--border`, `--input`, `--ring`
- `--success`, `--success-foreground`, `--warning`, `--warning-foreground`, `--info`, `--info-foreground`
- `--radius` (varies by theme: 0.25rem / 0.75rem / 0.125rem)
- `--sidebar-width`, `--sidebar-collapsed-width`, `--header-height` (keep same)

New variables:
- `--font-data` (for numeric/data displays: system-ui / system-ui / 'JetBrains Mono', monospace)
- `--shadow-theme` (theme-specific shadow pattern)

**Office Classic Light:**
- Clean whites, subtle grays, professional blue primary
- `--radius: 0.25rem`
- `--background: 0 0% 100%`, `--foreground: 222.2 84% 4.9%`
- `--primary: 221.2 83.2% 53.3%` (standard blue)

**Office Classic Dark:**
- Deep grays, not pure black, same blue primary lightened
- `--background: 222.2 84% 4.9%`, `--foreground: 210 40% 98%`

**Asana Like Light:**
- Warm whites, soft pastels, vibrant coral/pink primary
- `--radius: 0.75rem`
- `--background: 0 0% 99%`, `--foreground: 240 10% 20%`
- `--primary: 350 80% 56%` (coral/pink accent)

**Asana Like Dark:**
- Soft dark, warm undertones
- `--background: 240 10% 8%`, `--foreground: 0 0% 95%`

**Tech HUD Light:**
- Light gray background, sharp borders, cyan primary
- `--radius: 0.125rem`
- `--background: 210 20% 98%`, `--foreground: 210 40% 10%`
- `--primary: 188.7 94.5% 42.7%` (cyan/teal)

**Tech HUD Dark:**
- Near-black, neon cyan glow, minimal borders
- `--background: 220 30% 4%`, `--foreground: 180 10% 90%`
- `--primary: 188 100% 50%`

Structure:
```css
/* Office Classic */
:root[data-theme="office-classic"] { /* light */ }
:root[data-theme="office-classic"].dark { /* dark */ }

/* Asana Like */
:root[data-theme="asana-like"] { /* light */ }
:root[data-theme="asana-like"].dark { /* dark */ }

/* Tech HUD */
:root[data-theme="tech-hud"] { /* light */ }
:root[data-theme="tech-hud"].dark { /* dark */ }

/* Default fallback (office-classic light) */
:root:not([data-theme]) { /* same as office-classic light */ }
:root:not([data-theme]).dark { /* same as office-classic dark */ }
```

- [ ] **Step 3: Verify all 6 variants render**

Run: `cd client && npm run dev` and toggle themes in browser devtools by setting `data-theme` attribute on `<html>`.

- [ ] **Step 4: Commit**

```bash
git add client/src/styles/globals.css
git commit -m "feat(theme): add 6 CSS variable sets (3 themes × 2 modes)"
```

---

### Task 4: Create theme-config.ts (icons, emojis, effects)

**Files:**
- Create: `client/src/lib/theme-config.ts`

- [ ] **Step 1: Create theme config**

```typescript
import type { LucideIcon } from 'lucide-react'
import {
  FolderKanban, Flag, CheckSquare, GitBranch,
  AlertTriangle, FileText, Users, MessageSquarePlus,
} from 'lucide-react'
import type { ThemeStyle } from '@/types'

// Domain icons — same Lucide icons for all themes
export const DOMAIN_ICONS: Record<string, LucideIcon> = {
  project: FolderKanban,
  milestone: Flag,
  task: CheckSquare,
  subtask: GitBranch,
  risk: AlertTriangle,
  document: FileText,
  user: Users,
  input: MessageSquarePlus,
}

// Domain labels (Italian)
export const DOMAIN_LABELS: Record<string, string> = {
  project: 'Progetti',
  milestone: 'Milestone',
  task: 'Task',
  subtask: 'Subtask',
  risk: 'Rischi',
  document: 'Documenti',
  user: 'Utenti',
  input: 'Richieste',
}

// Icon wrapper styles per theme — applied around domain icons
export const ICON_STYLES: Record<ThemeStyle, {
  wrapper: string
  hover: string
}> = {
  'office-classic': {
    wrapper: 'p-1.5',
    hover: '',
  },
  'asana-like': {
    wrapper: 'p-2 rounded-full',
    hover: 'hover:scale-110 transition-transform',
  },
  'tech-hud': {
    wrapper: 'p-1.5',
    hover: 'hover:drop-shadow-[0_0_6px_currentColor] transition-all',
  },
}

// Icon wrapper with domain color — generates full className
export function getIconWrapperClass(theme: ThemeStyle, domainColor: string): string {
  const base = ICON_STYLES[theme]
  const asanaColorBg = domainColor.replace('text-', 'bg-').replace('-800', '-100')
  const asanaDarkBg = domainColor.replace('text-', 'dark:bg-').replace('-800', '-900/20').replace('-400', '-900/20')

  switch (theme) {
    case 'asana-like':
      return `${base.wrapper} ${asanaColorBg} ${asanaDarkBg} ${base.hover}`
    case 'tech-hud':
      return `${base.wrapper} shadow-[0_0_6px] shadow-current/40 ${base.hover}`
    default:
      return `${base.wrapper} ${base.hover}`
  }
}

// Emojis per theme — different tone
export const THEME_EMOJIS: Record<ThemeStyle, {
  completed: string
  inProgress: string
  blocked: string
  new: string
  success: string
  error: string
  warning: string
}> = {
  'office-classic': {
    completed: '✅',
    inProgress: '🔄',
    blocked: '🛑',
    new: '📄',
    success: '✅',
    error: '❌',
    warning: '⚠️',
  },
  'asana-like': {
    completed: '🎉',
    inProgress: '🚀',
    blocked: '😟',
    new: '✨',
    success: '🎊',
    error: '😥',
    warning: '🤔',
  },
  'tech-hud': {
    completed: '⚡',
    inProgress: '▶️',
    blocked: '🔴',
    new: '🔧',
    success: '✔️',
    error: '⛔',
    warning: '⚠️',
  },
}

// Animation config per theme
export const THEME_ANIMATIONS: Record<ThemeStyle, {
  pageTransition: { duration: number; ease: string }
  listStagger: number
  hoverScale: number
  openDuration: number
}> = {
  'office-classic': {
    pageTransition: { duration: 0.15, ease: 'easeOut' },
    listStagger: 0,
    hoverScale: 1.0,
    openDuration: 0.15,
  },
  'asana-like': {
    pageTransition: { duration: 0.2, ease: 'easeOut' },
    listStagger: 0.03,
    hoverScale: 1.08,
    openDuration: 0.2,
  },
  'tech-hud': {
    pageTransition: { duration: 0.25, ease: 'easeIn' },
    listStagger: 0.02,
    hoverScale: 1.0,
    openDuration: 0.2,
  },
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd client && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add client/src/lib/theme-config.ts
git commit -m "feat(theme): create theme-config with icons, emojis, and animation configs"
```

---

### Task 5: Create useThemeConfig hook

**Files:**
- Create: `client/src/hooks/ui/useThemeConfig.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useMemo } from 'react'
import { useThemeStore } from '@/stores/themeStore'
import {
  DOMAIN_ICONS, DOMAIN_LABELS, ICON_STYLES,
  THEME_EMOJIS, THEME_ANIMATIONS, getIconWrapperClass,
} from '@/lib/theme-config'

export function useThemeConfig() {
  const theme = useThemeStore((s) => s.theme)

  return useMemo(() => ({
    theme,
    icons: DOMAIN_ICONS,
    labels: DOMAIN_LABELS,
    iconStyles: ICON_STYLES[theme],
    emojis: THEME_EMOJIS[theme],
    animations: THEME_ANIMATIONS[theme],
    getIconWrapper: (domainColor: string) => getIconWrapperClass(theme, domainColor),
  }), [theme])
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/hooks/ui/useThemeConfig.ts
git commit -m "feat(theme): create useThemeConfig hook for theme-aware icons/emojis/animations"
```

---

### Task 6: Update Header with theme selector

**Files:**
- Modify: `client/src/components/layout/Header.tsx`

- [ ] **Step 1: Read current Header.tsx**

Read `client/src/components/layout/Header.tsx` to understand current layout.

- [ ] **Step 2: Replace theme toggle with theme/mode selector**

Add a dropdown in the Header that lets users pick:
- **Theme:** Office Classic / Asana Like / Tech HUD (3 options)
- **Mode:** Light / Dark / System (3 options)

Use shadcn `DropdownMenu` with two groups. Replace the existing sun/moon toggle button.

Import `useThemeStore` and use `setTheme`/`setMode`. Show current theme name + mode icon.

- [ ] **Step 3: Verify toggle works visually**

Run dev server, click through all 6 combinations, verify colors change.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/layout/Header.tsx
git commit -m "feat(theme): add theme/mode selector dropdown in Header"
```

---

## Chunk 2: Context System

### Task 7: Create PageContext provider and hook

**Files:**
- Create: `client/src/hooks/ui/usePageContext.ts`

- [ ] **Step 1: Create the PageContext**

```typescript
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { DOMAIN_COLORS } from '@/lib/constants'
import { DOMAIN_ICONS, DOMAIN_LABELS } from '@/lib/theme-config'
import type { LucideIcon } from 'lucide-react'

export type Domain = 'project' | 'task' | 'risk' | 'document' | 'input' | 'time_entry' | 'user' | 'analytics' | 'admin' | 'home'

interface PageContextValue {
  domain: Domain
  entityId?: string
  parentDomain?: Domain
  parentId?: string
  color: string          // Tailwind color class (e.g. "blue")
  colorClasses: string   // Full badge classes from DOMAIN_COLORS
  icon: LucideIcon
  label: string
}

const PageContext = createContext<PageContextValue | null>(null)

export function PageContextProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState<PageContextValue | null>(null)

  return (
    <PageContext.Provider value={context}>
      <PageContextSetterContext.Provider value={setContext}>
        {children}
      </PageContextSetterContext.Provider>
    </PageContext.Provider>
  )
}

const PageContextSetterContext = createContext<React.Dispatch<React.SetStateAction<PageContextValue | null>> | null>(null)

// Hook for pages to declare their context
export function useSetPageContext(config: {
  domain: Domain
  entityId?: string
  parentDomain?: Domain
  parentId?: string
}) {
  const setContext = useContext(PageContextSetterContext)

  const value = useMemo((): PageContextValue => {
    const domainColorMap: Record<string, string> = {
      project: 'blue',
      task: 'blue',
      risk: 'red',
      document: 'purple',
      input: 'amber',
      time_entry: 'emerald',
      user: 'green',
      analytics: 'indigo',
      admin: 'slate',
      home: 'blue',
    }

    return {
      ...config,
      color: domainColorMap[config.domain] ?? 'slate',
      colorClasses: DOMAIN_COLORS[config.domain] ?? '',
      icon: DOMAIN_ICONS[config.domain] ?? DOMAIN_ICONS.task,
      label: DOMAIN_LABELS[config.domain] ?? config.domain,
    }
  }, [config.domain, config.entityId, config.parentDomain, config.parentId])

  useEffect(() => {
    setContext?.(value)
    return () => setContext?.(null)
  }, [value, setContext])
}

// Hook for consumers to read context
export function usePageContext(): PageContextValue | null {
  return useContext(PageContext)
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/hooks/ui/usePageContext.ts
git commit -m "feat(context): create PageContext provider and useSetPageContext/usePageContext hooks"
```

---

### Task 8: Integrate PageContextProvider into AppShell

**Files:**
- Modify: `client/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Read current AppShell.tsx**

- [ ] **Step 2: Wrap children with PageContextProvider**

Import `PageContextProvider` from `@/hooks/ui/usePageContext` and wrap the content area.

- [ ] **Step 3: Add context header bar**

Read `usePageContext()` in a child component inside AppShell. Add a `<div>` above `<main>` that renders a 3px-high colored bar when a context is active:

```tsx
function ContextBar() {
  const ctx = usePageContext()
  if (!ctx) return null
  return <div className={cn('h-[3px]', `bg-${ctx.color}-500`)} />
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/layout/AppShell.tsx
git commit -m "feat(context): integrate PageContextProvider and context bar into AppShell"
```

---

### Task 9: Update Sidebar with context-aware active item

**Files:**
- Modify: `client/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Read current Sidebar.tsx**

- [ ] **Step 2: Use PageContext for active item coloring**

Import `usePageContext`. When the active nav item matches the current context domain, apply domain-colored left border and background instead of generic `bg-accent`:

```tsx
const ctx = usePageContext()
const isContextMatch = ctx && item.domain === ctx.domain

// Active item classes:
// Default: bg-accent text-accent-foreground
// Context match: border-l-2 border-{ctx.color}-500 bg-{ctx.color}-100/10 dark:bg-{ctx.color}-900/10
```

This requires adding a `domain` property to the sidebar nav items configuration.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/layout/Sidebar.tsx
git commit -m "feat(context): color sidebar active item with domain context color"
```

---

### Task 10: Update Breadcrumbs with domain icons

**Files:**
- Modify: `client/src/components/common/Breadcrumbs.tsx`

- [ ] **Step 1: Read current Breadcrumbs.tsx**

- [ ] **Step 2: Add optional icon + domain color to breadcrumb segments**

Extend the breadcrumb segment type to accept an optional `icon` (LucideIcon) and `domain` (string). When provided, render the icon before the label with the domain's color.

The pages will pass domain-specific breadcrumbs using `useThemeConfig()` to get the correct icon.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/common/Breadcrumbs.tsx
git commit -m "feat(context): add domain icons and colors to Breadcrumbs"
```

---

### Task 11: Add context accent to EntityDetail and EntityForm

**Files:**
- Modify: `client/src/components/common/EntityDetail.tsx`
- Modify: `client/src/components/common/EntityForm.tsx`

- [ ] **Step 1: Read both files**

- [ ] **Step 2: Add top border accent from PageContext**

In both components, read `usePageContext()` and apply a 2px top border with the domain color to the main card/container:

```tsx
const ctx = usePageContext()
// Add to the main wrapper:
className={cn('...existing', ctx && `border-t-2 border-${ctx.color}-500`)}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/common/EntityDetail.tsx client/src/components/common/EntityForm.tsx
git commit -m "feat(context): add domain-colored top border accent to EntityDetail/EntityForm"
```

---

### Task 12: Add useSetPageContext to all ~28 pages

**Files:**
- Modify: All page files in `client/src/pages/`

- [ ] **Step 1: List all page files**

Run: `find client/src/pages -name '*.tsx' -type f | sort`

- [ ] **Step 2: Add useSetPageContext to each page**

For each page, add as first hook call:

```tsx
import { useSetPageContext } from '@/hooks/ui/usePageContext'

// Inside component, before other hooks:
useSetPageContext({ domain: 'project' })  // appropriate domain for each page
```

Domain mapping:
- `pages/projects/*` → `domain: 'project'`
- `pages/tasks/*` → `domain: 'task'`
- `pages/risks/*` → `domain: 'risk'`
- `pages/documents/*` → `domain: 'document'`
- `pages/inputs/*` → `domain: 'input'`
- `pages/time-tracking/*` → `domain: 'time_entry'`
- `pages/home/*` → `domain: 'home'`
- `pages/analytics/*` → `domain: 'analytics'`
- `pages/planning/*` → `domain: 'analytics'`
- `pages/reports/*` → `domain: 'analytics'`
- `pages/admin/*` → `domain: 'admin'`
- `pages/auth/*` → no context (skip)
- `pages/profile/*` → `domain: 'user'`

For detail pages, also pass `entityId` from route params:
```tsx
useSetPageContext({ domain: 'project', entityId: id })
```

- [ ] **Step 3: Verify build compiles**

Run: `cd client && npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/
git commit -m "feat(context): add useSetPageContext to all 28 pages"
```

---

## Chunk 3: Permission System (Backend + Frontend)

### Task 13: Add PermissionPolicy model to Prisma schema

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Read current schema.prisma end section**

Read the last 50 lines to find where to add the new model.

- [ ] **Step 2: Add PermissionPolicy model**

```prisma
model PermissionPolicy {
  id        String   @id @default(uuid())
  role      String   @db.NVarChar(50)
  domain    String   @db.NVarChar(50)
  action    String   @db.NVarChar(50)
  allowed   Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([role, domain, action])
  @@map("permission_policies")
}
```

- [ ] **Step 3: Generate migration**

Run: `cd server && npx prisma migrate dev --name add_permission_policies`

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat(permissions): add PermissionPolicy model and migration"
```

---

### Task 14: Create permission schemas, service, controller, routes

**Files:**
- Create: `server/src/schemas/permissionSchemas.ts`
- Create: `server/src/services/permissionService.ts`
- Create: `server/src/controllers/permissionController.ts`
- Create: `server/src/routes/permissionRoutes.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create Zod schemas**

```typescript
// server/src/schemas/permissionSchemas.ts
import { z } from 'zod'

const ROLES = ['admin', 'direzione', 'dipendente', 'guest'] as const
const DOMAINS = ['project', 'task', 'risk', 'document', 'input', 'time_entry', 'user', 'analytics'] as const
const ACTIONS = ['view', 'create', 'edit', 'delete', 'advance_phase', 'block', 'assign', 'export', 'manage_team', 'approve', 'evaluate', 'convert'] as const

export const policySchema = z.object({
  role: z.enum(ROLES),
  domain: z.enum(DOMAINS),
  action: z.enum(ACTIONS),
  allowed: z.boolean(),
})

export const updatePoliciesSchema = z.object({
  policies: z.array(policySchema).min(1).max(500),
})

export { ROLES, DOMAINS, ACTIONS }
```

- [ ] **Step 2: Create permission service**

`server/src/services/permissionService.ts`:

Implements:
- `getAllPolicies()` — returns all PermissionPolicy records
- `upsertPolicies(policies[])` — batch upsert with `prisma.$transaction`
- `resetToDefaults()` — delete all + seed defaults
- `seedDefaults()` — called from seed.ts, creates ~192 default policy records

Default policies match the permission matrix from the design spec.

Key: admin role always gets `allowed: true` for all actions. This is enforced at service level — PUT cannot set admin policies to `false`.

- [ ] **Step 3: Create controller**

`server/src/controllers/permissionController.ts`:

Pattern: `try { validate → service call → sendSuccess/sendPaginated } catch { next(error) }`

Three handlers:
- `getPolicies` — GET, admin only
- `updatePolicies` — PUT, admin only, validates no admin downgrade
- `resetPolicies` — POST, admin only

- [ ] **Step 4: Create routes**

`server/src/routes/permissionRoutes.ts`:

```typescript
import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { authorize } from '../middleware/authMiddleware.js'
import * as ctrl from '../controllers/permissionController.js'

const router = Router()
router.use(authMiddleware)
router.use(authorize('admin'))

router.get('/policies', ctrl.getPolicies)
router.put('/policies', ctrl.updatePolicies)
router.post('/policies/reset', ctrl.resetPolicies)

export default router
```

- [ ] **Step 5: Mount routes in app.ts**

Add to `server/src/app.ts`:
```typescript
import permissionRoutes from './routes/permissionRoutes.js'
// ... after other route mounts:
app.use('/api/permissions', permissionRoutes)
```

- [ ] **Step 6: Seed default policies**

Add to `server/prisma/seed.ts` a function that calls `permissionService.seedDefaults()`. Run: `npm run db:seed`

- [ ] **Step 7: Commit**

```bash
git add server/src/schemas/permissionSchemas.ts server/src/services/permissionService.ts server/src/controllers/permissionController.ts server/src/routes/permissionRoutes.ts server/src/app.ts server/prisma/seed.ts
git commit -m "feat(permissions): add permission policies CRUD backend (schema, service, controller, routes)"
```

---

### Task 15: Create frontend permission engine and hooks

**Files:**
- Create: `client/src/lib/permissions.ts`
- Create: `client/src/hooks/ui/usePermissions.ts`
- Create: `client/src/hooks/api/usePermissionPolicies.ts`

- [ ] **Step 1: Create TanStack Query hooks for policies**

`client/src/hooks/api/usePermissionPolicies.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

const KEYS = {
  all: ['permission-policies'] as const,
}

export function usePermissionPoliciesQuery() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: () => api.get('/permissions/policies').then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

export function useUpdatePolicies() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (policies: Array<{ role: string; domain: string; action: string; allowed: boolean }>) =>
      api.put('/permissions/policies', { policies }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useResetPolicies() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/permissions/policies/reset'),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}
```

- [ ] **Step 2: Create permission engine (pure logic)**

`client/src/lib/permissions.ts`:

Implements `resolvePermissions(ctx: PermissionContext, policies: PermissionPolicy[]): ResolvedPermissions`

Logic:
1. Admin → ALL_PERMISSIONS (always)
2. Look up policies for `ctx.user.role` + `ctx.domain` for each action
3. Apply automatic overrides: creator gets canEdit/canDelete/canAdvancePhase, assignee gets canEdit/canAdvancePhase/canBlock
4. Return merged result

Export `ALL_PERMISSIONS` constant and `resolvePermissions` function.

- [ ] **Step 3: Create usePermissions hook**

`client/src/hooks/ui/usePermissions.ts`:

```typescript
import { useMemo } from 'react'
import { usePermissionPoliciesQuery } from '@/hooks/api/usePermissionPolicies'
import { resolvePermissions } from '@/lib/permissions'
import { usePageContext, type Domain } from '@/hooks/ui/usePageContext'
// Import user from auth hook

interface EntityRef {
  creatorId?: string
  assigneeId?: string
  responsibleId?: string
}

export function usePermissions(domain?: Domain, entity?: EntityRef) {
  const ctx = usePageContext()
  const { data: policies } = usePermissionPoliciesQuery()
  // const { data: user } = useAuthQuery() — get current user

  const resolvedDomain = domain ?? ctx?.domain

  return useMemo(() => {
    if (!policies || !resolvedDomain) {
      // Return safe defaults (all false) while loading
      return { canView: false, canCreate: false, canEdit: false, canDelete: false,
        canAdvancePhase: false, canBlock: false, canAssign: false, canLogTime: false,
        canExport: false, canManageTeam: false, canEvaluate: false, canConvert: false,
        canApprove: false }
    }

    return resolvePermissions(
      { user: { id: 'TODO', role: 'dipendente' }, entity: entity ? { type: resolvedDomain, ...entity } : undefined },
      policies
    )
  }, [policies, resolvedDomain, entity])
}
```

Note: The `user` integration depends on the existing auth hook pattern. Read `hooks/api/useAuth.ts` to find how the current user is exposed, then use that.

- [ ] **Step 4: Commit**

```bash
git add client/src/lib/permissions.ts client/src/hooks/ui/usePermissions.ts client/src/hooks/api/usePermissionPolicies.ts
git commit -m "feat(permissions): create frontend permission engine, usePermissions hook, and TanStack Query hooks"
```

---

### Task 16: Create PermissionsTab and PermissionsCompareDialog

**Files:**
- Create: `client/src/pages/admin/tabs/PermissionsTab.tsx`
- Create: `client/src/pages/admin/tabs/PermissionsCompareDialog.tsx`
- Modify: `client/src/pages/admin/AdminConfigPage.tsx`

- [ ] **Step 1: Read AdminConfigPage.tsx**

Understand current tab structure.

- [ ] **Step 2: Create PermissionsTab**

`client/src/pages/admin/tabs/PermissionsTab.tsx`:

UI:
- Select to choose role (default: dipendente)
- Two buttons: "Confronta ruoli" + "Ripristina default"
- For each domain: a Card with domain icon + color, checkboxes for each action
- Alert info for automatic rules (non-editable)
- Admin role shows all checked + disabled
- Save/Cancel buttons at bottom
- Uses React Hook Form or local state for dirty tracking

Uses:
- `usePermissionPoliciesQuery()` to load current policies
- `useUpdatePolicies()` to save
- `useResetPolicies()` to reset
- shadcn: Select, Card, Checkbox, Button, AlertDialog (for reset confirm)
- Icons from `useThemeConfig()`

- [ ] **Step 3: Create PermissionsCompareDialog**

`client/src/pages/admin/tabs/PermissionsCompareDialog.tsx`:

Dialog that shows all 4 roles side-by-side per domain in a table.
Uses shadcn Dialog + Table. Read-only view.

- [ ] **Step 4: Add Permissions tab to AdminConfigPage**

Import PermissionsTab and add as a new tab in AdminConfigPage.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/admin/tabs/PermissionsTab.tsx client/src/pages/admin/tabs/PermissionsCompareDialog.tsx client/src/pages/admin/AdminConfigPage.tsx
git commit -m "feat(permissions): add Permissions tab to AdminConfigPage with compare dialog"
```

---

## Chunk 4: Progress Visualization Components

### Task 17: Create ProgressRing component

**Files:**
- Create: `client/src/components/common/ProgressRing.tsx`

- [ ] **Step 1: Create ProgressRing**

SVG-based circular progress indicator. Props per spec: `value`, `size`, `showLabel`, `showValue`, `total`, `completed`, `animated`, `colorMode`.

Three sizes: sm (32px), md (48px), lg (72px). SVG with `<circle>` track and `<circle>` progress arc using `strokeDasharray`/`strokeDashoffset`.

Color auto-calculation: 0-33% destructive, 34-66% warning, 67-100% success. Colors from CSS variables.

Theme adaptation via `useThemeConfig()`:
- Office Classic: strokeWidth 3, round cap
- Asana Like: strokeWidth 4, round cap, soft shadow
- Tech HUD: strokeWidth 2, butt cap, glow filter

Animation: Framer Motion `useSpring` to animate `strokeDashoffset` on mount.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/ProgressRing.tsx
git commit -m "feat(progress): create ProgressRing SVG component with theme adaptation"
```

---

### Task 18: Create StatusDistribution component

**Files:**
- Create: `client/src/components/common/StatusDistribution.tsx`

- [ ] **Step 1: Create StatusDistribution**

Two variants:
- `bar`: Horizontal stacked bar using `<div>` segments with flex widths
- `donut`: SVG donut using `<circle>` segments with `strokeDasharray` offsets

Props per spec: `items`, `total`, `variant`, `size`, `showLegend`, `showCounts`, `animated`, `domain`.

Colors from `STATUS_COLORS` in `lib/constants.ts` (converted to inline HSL for SVG strokes).

Add `STATUS_COLORS_HSL` map to `lib/constants.ts` alongside existing `STATUS_COLORS` — raw HSL values for SVG/Recharts usage.

Legend below: colored dot + count + label.

Theme adaptation:
- Office Classic: square bar segments, gap 1px
- Asana Like: pill bar segments, gap 2px
- Tech HUD: no gap, glow on segments

- [ ] **Step 2: Add STATUS_COLORS_HSL to constants.ts**

```typescript
// In lib/constants.ts
export const STATUS_COLORS_HSL: Record<string, string> = {
  not_started: 'hsl(215, 20%, 65%)',
  in_progress: 'hsl(217, 91%, 60%)',
  in_review: 'hsl(38, 92%, 50%)',
  completed: 'hsl(142, 71%, 45%)',
  blocked: 'hsl(0, 84%, 60%)',
  // ... all statuses
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/common/StatusDistribution.tsx client/src/lib/constants.ts
git commit -m "feat(progress): create StatusDistribution component (bar + donut variants)"
```

---

### Task 19: Create TrendSparkline component

**Files:**
- Create: `client/src/components/common/TrendSparkline.tsx`

- [ ] **Step 1: Create TrendSparkline**

SVG-based mini line chart. Props per spec: `data`, `size`, `color`, `showDelta`, `showArea`, `showPoints`, `showTooltip`.

Two sizes: sm (80×24px), md (200×60px).

Renders:
- SVG `<polyline>` for the data line
- Optional `<polygon>` with gradient fill for area
- Optional `<circle>` points on md size
- Delta badge below: `TrendingUp`/`TrendingDown`/`Minus` icon with % change

Theme adaptation for line style/glow per spec.

Animation: draw line via `strokeDasharray` animation on mount.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/TrendSparkline.tsx
git commit -m "feat(progress): create TrendSparkline mini chart component"
```

---

### Task 20: Create ProgressSummary composition component

**Files:**
- Create: `client/src/components/common/ProgressSummary.tsx`

- [ ] **Step 1: Create ProgressSummary**

Composes ProgressRing + StatusDistribution + TrendSparkline in a vertical card:

```tsx
<div className="space-y-4">
  <div className="flex items-center gap-4">
    <ProgressRing value={progress} size="lg" showLabel />
    <div>
      <p className="text-sm text-muted-foreground">{completed} di {total} completati</p>
    </div>
  </div>
  <StatusDistribution items={statusBreakdown} total={total} variant="bar" size="sm" />
  {trend && <TrendSparkline data={trend} size="sm" showDelta />}
</div>
```

Props per spec: `progress`, `total`, `completed`, `statusBreakdown`, `trend`, `domain`.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/ProgressSummary.tsx
git commit -m "feat(progress): create ProgressSummary composition component"
```

---

## Chunk 5: Guided Workflows

### Task 21: Create workflow engine (pure logic)

**Files:**
- Create: `client/src/lib/workflow-engine.ts`

- [ ] **Step 1: Create workflow engine types and functions**

Types: `WorkflowDefinition`, `WorkflowPhase`, `Prerequisite`, `Suggestion`, `ValidationData`, `PhaseEvaluation`.

Functions:
- `evaluatePhase(workflow, currentPhase, data)` → `{ phase, prerequisites: EvaluatedPrerequisite[], allMet, suggestions }`
- `getAvailableTransitions(workflow, currentPhase, data)` → `string[]` (phases reachable from current)
- `getPhaseStatus(workflow, phase, currentPhase, data)` → `'completed' | 'current' | 'available' | 'locked' | 'blocked'`

Pure functions, no React dependency. Fully typed.

- [ ] **Step 2: Commit**

```bash
git add client/src/lib/workflow-engine.ts
git commit -m "feat(workflow): create workflow engine with phase evaluation and transitions"
```

---

### Task 22: Create workflow definitions

**Files:**
- Create: `client/src/lib/workflows/projectWorkflow.ts`
- Create: `client/src/lib/workflows/taskWorkflow.ts`
- Create: `client/src/lib/workflows/documentWorkflow.ts`
- Create: `client/src/lib/workflows/userInputWorkflow.ts`

- [ ] **Step 1: Create project workflow (5 phases)**

Define the 5-phase project lifecycle with prerequisites and suggestions per the spec. Each prerequisite has an `evaluate` function that checks `ValidationData` (task counts, milestone counts, team size, completion %).

- [ ] **Step 2: Create task workflow (4 phases + blocked)**

Define 4-phase task lifecycle. Blocked is a special state reachable from any phase.

- [ ] **Step 3: Create document workflow (3 phases)**

Define 3-phase document lifecycle.

- [ ] **Step 4: Create userInput workflow (4 phases)**

Define 4-phase request lifecycle with Nuova → In Valutazione → Accettata → Convertita/Rifiutata.

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/workflows/
git commit -m "feat(workflow): create 4 workflow definitions (project, task, document, userInput)"
```

---

### Task 23: Create WorkflowStepper, PhaseValidationPanel, NextActionSuggestion

**Files:**
- Create: `client/src/components/common/WorkflowStepper.tsx`
- Create: `client/src/components/common/PhaseValidationPanel.tsx`
- Create: `client/src/components/common/NextActionSuggestion.tsx`

- [ ] **Step 1: Create PhaseValidationPanel**

Card showing the current phase's prerequisite checklist:
- Each prerequisite: check/empty icon + label + detail text
- All met → green border
- Missing → amber border with count

- [ ] **Step 2: Create NextActionSuggestion**

Small banner below PhaseValidationPanel:
- Shows the highest priority suggestion
- CTA button (navigate or open dialog)
- Uses Framer Motion for entrance animation

- [ ] **Step 3: Create WorkflowStepper (unifying component)**

Combines StepperBar (existing) + PhaseValidationPanel + NextActionSuggestion.

Props per spec: `workflow`, `currentPhase`, `validationData`, `onAdvance`, `onBlock`, `collapsed`, `position`.

When `collapsed`, shows only StepperBar. When expanded, shows StepperBar + PhaseValidationPanel + NextActionSuggestion.

Advance button: enabled only when all blocking prerequisites met AND `canAdvancePhase` permission.

Block button: opens AlertDialog with textarea for block reason.

Theme adaptation via `useThemeConfig()` for stepper line style, animation type, pulse effects.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/common/WorkflowStepper.tsx client/src/components/common/PhaseValidationPanel.tsx client/src/components/common/NextActionSuggestion.tsx
git commit -m "feat(workflow): create WorkflowStepper with validation panel and action suggestions"
```

---

### Task 24: Integrate WorkflowStepper into detail pages

**Files:**
- Modify: `client/src/pages/projects/ProjectDetailPage.tsx`
- Modify: `client/src/pages/tasks/TaskDetailPage.tsx`
- Modify: `client/src/pages/documents/DocumentDetailPage.tsx`
- Modify: `client/src/pages/inputs/UserInputDetailPage.tsx`
- Delete: `client/src/components/domain/projects/MilestoneWorkflowStepper.tsx`
- Delete: `client/src/components/domain/projects/MilestoneValidationPanel.tsx`
- Delete: `client/src/components/domain/tasks/TaskStatusStepper.tsx`
- Delete: `client/src/components/domain/documents/DocumentStatusStepper.tsx`

- [ ] **Step 1: Read all 4 detail pages**

Understand current stepper usage.

- [ ] **Step 2: Replace old steppers with WorkflowStepper**

In each detail page:
1. Import the appropriate workflow definition
2. Build `validationData` from the entity's data (task counts, checklist progress, etc.)
3. Pass to `<WorkflowStepper>` in the `beforeContent` slot of EntityDetail
4. Wire `onAdvance` to the appropriate update mutation
5. Wire `onBlock` to update mutation with blocked status + reason

- [ ] **Step 3: Delete old stepper components**

Remove the 4 old stepper files.

- [ ] **Step 4: Verify build compiles**

Run: `cd client && npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/projects/ProjectDetailPage.tsx client/src/pages/tasks/TaskDetailPage.tsx client/src/pages/documents/DocumentDetailPage.tsx client/src/pages/inputs/UserInputDetailPage.tsx
git rm client/src/components/domain/projects/MilestoneWorkflowStepper.tsx client/src/components/domain/projects/MilestoneValidationPanel.tsx client/src/components/domain/tasks/TaskStatusStepper.tsx client/src/components/domain/documents/DocumentStatusStepper.tsx
git commit -m "feat(workflow): integrate WorkflowStepper into detail pages, remove old steppers"
```

---

## Chunk 6: Radial Menu

### Task 25: Create radial-actions registry

**Files:**
- Create: `client/src/lib/radial-actions.ts`

- [ ] **Step 1: Create action registry**

Define all radial actions per domain and scope from the spec. Each action:

```typescript
interface RadialAction {
  id: string
  label: string
  icon: string          // key into DOMAIN_ICONS or specific icon name
  domain: Domain
  scope: 'list' | 'detail' | 'global'
  permission: (perms: ResolvedPermissions) => boolean
  action: (ctx: { navigate: NavigateFunction; pageContext: PageContextValue }) => void
  shortcut?: string
  subActions?: RadialAction[]   // for sub-menus (e.g., "Cambia stato" → status list)
}
```

Create arrays: `PROJECT_LIST_ACTIONS`, `PROJECT_DETAIL_ACTIONS`, `TASK_LIST_ACTIONS`, `TASK_DETAIL_ACTIONS`, etc.

Export `getActionsForContext(domain, scope, permissions)` function that filters by domain + scope + permission.

- [ ] **Step 2: Commit**

```bash
git add client/src/lib/radial-actions.ts
git commit -m "feat(radial): create radial action registry with all domain/scope/permission configs"
```

---

### Task 26: Create useRadialMenu hook

**Files:**
- Create: `client/src/components/features/RadialMenu/useRadialMenu.ts`

- [ ] **Step 1: Create the hook**

Manages:
- `isOpen` state
- `position` (x, y) — where the menu center is
- `openMenu(x, y)` / `closeMenu()` functions
- `collisionDetect(x, y, itemCount)` — returns array of `{ x, y, angle }` positions for items after edge-aware adjustment

Collision detection logic:
1. Calculate distance from each viewport edge
2. If distance < radius + 40px padding, exclude that angular sector
3. Distribute items evenly in remaining sector
4. Ensure minimum 60 degrees between adjacent items

- [ ] **Step 2: Commit**

```bash
git add client/src/components/features/RadialMenu/useRadialMenu.ts
git commit -m "feat(radial): create useRadialMenu hook with collision detection"
```

---

### Task 27: Create RadialMenuItem and RadialSubMenu

**Files:**
- Create: `client/src/components/features/RadialMenu/RadialMenuItem.tsx`
- Create: `client/src/components/features/RadialMenu/RadialSubMenu.tsx`

- [ ] **Step 1: Create RadialMenuItem**

Single menu item: circle with icon + label below. Positioned absolutely via `style={{ left, top }}` (calculated from hook).

Props: `action: RadialAction`, `position: { x, y }`, `index: number`, `onActivate`, `disabled`.

Theme adaptation via `useThemeConfig()`:
- Office Classic: `bg-card border`, hover `bg-accent`
- Asana Like: `bg-card/90 backdrop-blur rounded-full`, hover scale 1.08
- Tech HUD: `bg-card/80 border-primary/20`, hover glow

Framer Motion entrance animation: different per theme (fade-in / spring stagger / glow trail).

Accessibility: `role="menuitem"`, `aria-label`, `tabIndex`, keyboard handlers.

- [ ] **Step 2: Create RadialSubMenu**

Same layout but appears from parent item position. Shows sub-actions (e.g., status options for "Cambia stato").

Props: `actions: RadialAction[]`, `parentPosition: { x, y }`, `onActivate`, `onBack`.

Escape or center click → close sub-menu.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/features/RadialMenu/RadialMenuItem.tsx client/src/components/features/RadialMenu/RadialSubMenu.tsx
git commit -m "feat(radial): create RadialMenuItem and RadialSubMenu with theme adaptation"
```

---

### Task 28: Create RadialMenu container

**Files:**
- Create: `client/src/components/features/RadialMenu/RadialMenu.tsx`
- Create: `client/src/components/features/RadialMenu/index.ts`

- [ ] **Step 1: Create RadialMenu**

Main container component. Renders as a portal (fixed positioned overlay).

Logic:
1. Reads `usePageContext()` for current domain
2. Reads `usePermissions()` for filtered actions
3. Calls `getActionsForContext()` with domain + scope + permissions
4. Renders `RadialMenuItem` for each action at calculated positions
5. Renders `RadialSubMenu` if a sub-menu action is activated
6. Handles keyboard navigation (arrow keys mapped to radial positions)
7. Focus trap while open

Overlay: transparent `fixed inset-0` div that closes on click.

Theme lines (Tech HUD only): SVG `<line>` elements from center to each item with glow effect.

- [ ] **Step 2: Create index.ts barrel export**

```typescript
export { RadialMenu } from './RadialMenu'
export { useRadialMenu } from './useRadialMenu'
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/features/RadialMenu/
git commit -m "feat(radial): create RadialMenu container with context integration"
```

---

### Task 29: Integrate RadialMenu into AppShell

**Files:**
- Modify: `client/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Mount RadialMenu in AppShell**

Add `<RadialMenu />` inside AppShell after `<main>`.

Wire desktop trigger: `onContextMenu` on `<main>` to call `openMenu(e.clientX, e.clientY)` and `e.preventDefault()`.

Wire keyboard trigger: `Ctrl+Space` in existing keyboard shortcut listener.

- [ ] **Step 2: Add mobile FAB**

On screens < 768px (`md:hidden`), render a FAB button (56×56px, `rounded-full`, `fixed bottom-6 right-6`).

FAB color: `bg-{ctx.color}-500` from PageContext. Icon: `Plus` when closed, `X` when open.

Tap opens radial menu centered 120px above FAB. Long-press anywhere opens at touch point.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/layout/AppShell.tsx
git commit -m "feat(radial): integrate RadialMenu into AppShell with desktop+mobile triggers"
```

---

## Chunk 7: Integration and Polish

### Task 30: Integrate permissions into EntityList/EntityDetail/EntityForm

**Files:**
- Modify: `client/src/components/common/EntityList.tsx`
- Modify: `client/src/components/common/EntityDetail.tsx`
- Modify: `client/src/components/common/EntityForm.tsx`

- [ ] **Step 1: Read all 3 template components**

- [ ] **Step 2: Add permission filtering to EntityList**

- Add optional `permissions` prop (or use `usePermissions()` internally)
- Hide "Create" button if `!canCreate`
- Filter row actions by permission
- Show disabled tooltip for restricted actions

- [ ] **Step 3: Add permission filtering to EntityDetail**

- Hide edit/delete header actions based on `canEdit`/`canDelete`
- Pass permissions to WorkflowStepper (if present in beforeContent)

- [ ] **Step 4: Add permission filtering to EntityForm**

- Hide delete button based on `canDelete`
- Disable form submission if `!canEdit` (for edit mode)

- [ ] **Step 5: Commit**

```bash
git add client/src/components/common/EntityList.tsx client/src/components/common/EntityDetail.tsx client/src/components/common/EntityForm.tsx
git commit -m "feat(permissions): integrate permission checks into EntityList/Detail/Form templates"
```

---

### Task 31: Integrate ProgressSummary into pages

**Files:**
- Modify: `client/src/pages/projects/ProjectDetailPage.tsx`
- Modify: `client/src/pages/home/ManagementDashboard.tsx` (or `HomePage.tsx`)
- Modify: `client/src/pages/analytics/AnalyticsPage.tsx`

- [ ] **Step 1: Add ProgressSummary to ProjectDetailPage sidebar**

Replace the basic progress bar in the sidebar with `<ProgressSummary>`. Wire data from project query (task counts by status, completion %).

- [ ] **Step 2: Add ProgressRing + StatusDistribution to HomePage KPIs**

Replace "—" placeholder KPI values with actual data:
- ProgressRing for project completion
- StatusDistribution donut for task distribution
- TrendSparkline for weekly trends

This requires wiring the TanStack Query hooks that already exist.

- [ ] **Step 3: Update AnalyticsPage charts**

Replace hardcoded hex chart colors with CSS variable-based colors from `STATUS_COLORS_HSL`.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/projects/ProjectDetailPage.tsx client/src/pages/home/ client/src/pages/analytics/AnalyticsPage.tsx
git commit -m "feat(progress): integrate ProgressSummary and themed charts into pages"
```

---

### Task 32: Update Sidebar navigation permissions

**Files:**
- Modify: `client/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Filter sidebar sections by permission**

Use `usePermissions()` to check visibility per domain:
- "Gestione" section: hidden if `!canView` for risk/document/input
- "Analisi" section: hidden if `!canView` for analytics
- "Admin" section: hidden for non-admin (already done, verify)

- [ ] **Step 2: Commit**

```bash
git add client/src/components/layout/Sidebar.tsx
git commit -m "feat(permissions): filter sidebar navigation sections by user permissions"
```

---

### Task 33: Add workflow actions to radial menu

**Files:**
- Modify: `client/src/lib/radial-actions.ts`

- [ ] **Step 1: Add workflow-aware actions**

For detail scopes, add actions that read workflow state:
- "Avanza a [next phase]" — shown if prerequisites met + canAdvancePhase
- "Vedi prerequisiti" — shown if prerequisites not met
- "Blocca [entity]" — shown if canBlock

These should appear as first items in the radial menu (highest priority positioning).

- [ ] **Step 2: Commit**

```bash
git add client/src/lib/radial-actions.ts
git commit -m "feat(radial): add workflow-aware actions (advance phase, block) to radial menu"
```

---

### Task 34: Final TypeScript verification and build check

**Files:**
- All modified files

- [ ] **Step 1: Run TypeScript check**

Run: `cd client && npx tsc --noEmit`

Fix any type errors.

- [ ] **Step 2: Run build**

Run: `cd client && npm run build`

Verify no build errors.

- [ ] **Step 3: Run linter**

Run: `cd client && npm run lint`

Fix any lint issues.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve TypeScript and lint issues from immersive context UX implementation"
```

---

## Dependency Graph

```
Chunk 1: Multi-Theme Foundation
  ├── Task 1: ThemeStore
  ├── Task 2: ThemeProvider
  ├── Task 3: CSS Variables (6 sets)
  ├── Task 4: theme-config.ts
  ├── Task 5: useThemeConfig hook
  └── Task 6: Header theme selector

Chunk 2: Context System (depends on Chunk 1)
  ├── Task 7: PageContext provider
  ├── Task 8: AppShell integration
  ├── Task 9: Sidebar context coloring
  ├── Task 10: Breadcrumbs domain icons
  ├── Task 11: EntityDetail/Form accent
  └── Task 12: Add context to all pages

Chunk 3: Permission System (independent of Chunk 1-2)
  ├── Task 13: Prisma schema + migration
  ├── Task 14: Backend CRUD (schemas, service, controller, routes)
  ├── Task 15: Frontend engine + hooks
  └── Task 16: Admin UI (PermissionsTab)

Chunk 4: Progress Visualization (depends on Chunk 1)
  ├── Task 17: ProgressRing
  ├── Task 18: StatusDistribution
  ├── Task 19: TrendSparkline
  └── Task 20: ProgressSummary

Chunk 5: Guided Workflows (depends on Chunk 1, 3)
  ├── Task 21: Workflow engine
  ├── Task 22: Workflow definitions
  ├── Task 23: WorkflowStepper UI
  └── Task 24: Integrate into detail pages

Chunk 6: Radial Menu (depends on Chunk 1, 2, 3)
  ├── Task 25: Action registry
  ├── Task 26: useRadialMenu hook
  ├── Task 27: RadialMenuItem + SubMenu
  ├── Task 28: RadialMenu container
  └── Task 29: AppShell integration

Chunk 7: Integration (depends on all above)
  ├── Task 30: Permission integration into templates
  ├── Task 31: Progress integration into pages
  ├── Task 32: Sidebar permission filtering
  ├── Task 33: Workflow actions in radial menu
  └── Task 34: Final verification
```

**Parallelizable:** Chunks 1, 3, and 4 can run in parallel (independent foundations). Chunks 2, 5, 6 depend on foundations. Chunk 7 is final integration.
