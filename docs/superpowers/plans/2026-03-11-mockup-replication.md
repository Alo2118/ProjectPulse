# Mockup Replication Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replicate the 11 HTML mockups pixel-accurate into the ProjectPulse React codebase, updating design tokens, creating 12 centralized components, extending templates, and rebuilding 10 pages.

**Architecture:** 5-layer progressive approach — tokens first, then components, template extensions, backend APIs, and finally pages. Each layer builds on the previous. All new components use shadcn/ui primitives, semantic CSS tokens, and `cn()` for styling.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui (Radix), Framer Motion, TanStack Query 5, Zustand (UI-only), Recharts, Lucide Icons

**Spec:** `docs/superpowers/specs/2026-03-11-mockup-replication-design.md`

---

## Chunk 1: Layer 0 — Design Tokens

### Task 1: Update Tech HUD CSS variables in globals.css

**Files:**
- Modify: `client/src/styles/globals.css` (tech-hud light + dark sections)

- [ ] **Step 1: Update tech-hud light mode variables**

Find the `:root[data-theme="tech-hud"]` section and replace ALL variables with:

```css
:root[data-theme="tech-hud"] {
  --background: 210 20% 98%;
  --foreground: 215 25% 12%;
  --card: 210 15% 96%;
  --card-foreground: 215 25% 12%;
  --popover: 210 15% 96%;
  --popover-foreground: 215 25% 12%;
  --primary: 211 89% 56%;
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
  --radius: 0.5rem;
  --font-data: 'JetBrains Mono', monospace;
  --font-heading: 'Syne', sans-serif;
  --font-body: 'DM Sans', sans-serif;
  --shadow-theme: 0 1px 4px 0 rgb(0 0 0 / 0.08);
  --sidebar-width: 260px;
  --header-height: 56px;
}
```

- [ ] **Step 2: Update tech-hud dark mode variables**

Find the `:root[data-theme="tech-hud"].dark` section and replace ALL variables with:

```css
:root[data-theme="tech-hud"].dark {
  --background: 216 35% 4%;
  --foreground: 212 40% 92%;
  --card: 215 28% 9%;
  --card-foreground: 212 40% 92%;
  --popover: 214 22% 13%;
  --popover-foreground: 212 40% 92%;
  --primary: 211 89% 56%;
  --primary-foreground: 0 0% 100%;
  --secondary: 214 22% 13%;
  --secondary-foreground: 212 25% 55%;
  --muted: 213 20% 18%;
  --muted-foreground: 213 17% 44%;
  --accent: 211 89% 56%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;
  --border: 213 20% 16%;
  --input: 215 25% 11%;
  --ring: 211 89% 56%;
  --success: 142 71% 45%;
  --success-foreground: 0 0% 100%;
  --warning: 25 95% 53%;
  --warning-foreground: 0 0% 100%;
  --info: 211 89% 56%;
  --info-foreground: 0 0% 100%;
  --radius: 0.5rem;
  --font-data: 'JetBrains Mono', monospace;
  --font-heading: 'Syne', sans-serif;
  --font-body: 'DM Sans', sans-serif;
  --shadow-theme: 0 0 8px 0 rgba(45, 140, 240, 0.18);
  --sidebar-width: 260px;
  --header-height: 56px;
}
```

- [ ] **Step 3: Add shared gradient variables to all themes**

At the end of `globals.css`, before the `@layer base` block, add:

```css
/* Context gradients — shared across all themes */
:root {
  --gradient-project: linear-gradient(90deg, #1d4ed8, #3b82f6);
  --gradient-milestone: linear-gradient(90deg, #7e22ce, #a855f7);
  --gradient-task: linear-gradient(90deg, #0e7490, #22d3ee);
  --gradient-success: linear-gradient(90deg, #15803d, #22c55e);
  --gradient-warning: linear-gradient(90deg, #c2410c, #f97316);
  --gradient-danger: linear-gradient(90deg, #b91c1c, #ef4444);
  --gradient-indigo: linear-gradient(90deg, #3730a3, #6366f1);
}
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `cd client && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 5: Commit**

```bash
git add client/src/styles/globals.css
git commit -m "style(tokens): update tech-hud CSS variables from mockup

Update tech-hud light/dark tokens: accent from cyan to blue (#2d8cf0),
darker backgrounds, radius 8px, add shared gradient variables."
```

---

### Task 2: Import fonts and update Tailwind config

**Files:**
- Modify: `client/index.html`
- Modify: `client/tailwind.config.js`

- [ ] **Step 1: Add Syne and DM Sans font imports to index.html**

In `<head>`, after the existing Inter font link, add:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Update tailwind.config.js fontFamily**

Replace the `fontFamily` section in `theme.extend`:

```javascript
fontFamily: {
  sans: ['var(--font-body, Inter)', 'system-ui', 'sans-serif'],
  heading: ['var(--font-heading, Inter)', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
  data: ['var(--font-data, inherit)'],
},
```

- [ ] **Step 3: Add boxShadow and update borderRadius in tailwind.config.js**

In `theme.extend`, add/update:

```javascript
borderRadius: {
  lg: "var(--radius)",
  md: "calc(var(--radius) - 2px)",
  sm: "calc(var(--radius) - 4px)",
},
boxShadow: {
  'glow': '0 0 16px rgba(45, 140, 240, 0.18)',
  'glow-sm': '0 0 8px rgba(45, 140, 240, 0.12)',
  'glow-lg': '0 0 24px rgba(45, 140, 240, 0.25)',
},
```

- [ ] **Step 4: Verify build**

Run: `cd client && npx vite build --mode development 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add client/index.html client/tailwind.config.js
git commit -m "style(fonts): add Syne + DM Sans for tech-hud, update Tailwind config

Import Syne (headings) and DM Sans (body) for tech-hud theme.
Add font-heading, font-data families. Add glow shadows. Keep Inter for
office-classic and asana-like via CSS var fallback."
```

---

### Task 3: Update constants with mockup color mappings

**Files:**
- Modify: `client/src/lib/constants.ts`

- [ ] **Step 1: Add gradient, action, and alert color constants**

At the end of the file (before final export if any), add:

```typescript
/** Gradient backgrounds per context domain — used by ProgressGradient */
export const CONTEXT_GRADIENTS = {
  project: 'bg-gradient-to-r from-blue-700 to-blue-500',
  milestone: 'bg-gradient-to-r from-purple-700 to-purple-500',
  task: 'bg-gradient-to-r from-cyan-700 to-cyan-400',
  success: 'bg-gradient-to-r from-green-700 to-green-500',
  warning: 'bg-gradient-to-r from-orange-700 to-orange-500',
  danger: 'bg-gradient-to-r from-red-700 to-red-500',
  indigo: 'bg-gradient-to-r from-indigo-700 to-indigo-500',
} as const

export type ContextGradient = keyof typeof CONTEXT_GRADIENTS

/** Colors for NextActionChip */
export const NEXT_ACTION_CONFIG = {
  advance: { label: 'Avanza', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: 'ArrowRight' },
  unblock: { label: 'Sblocca', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: 'Unlock' },
  approve: { label: 'Approva', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: 'Check' },
  report: { label: 'Report', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: 'BarChart3' },
  review: { label: 'Revisione', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: 'Eye' },
} as const

export type NextAction = keyof typeof NEXT_ACTION_CONFIG

/** Alert severity styling */
export const ALERT_SEVERITY = {
  critical: { label: 'Critico', dot: 'bg-red-500', border: 'border-l-red-500', bg: 'bg-red-500/5' },
  warning: { label: 'Attenzione', dot: 'bg-orange-500', border: 'border-l-orange-500', bg: 'bg-orange-500/5' },
  info: { label: 'Info', dot: 'bg-blue-500', border: 'border-l-blue-500', bg: 'bg-blue-500/5' },
} as const

export type AlertSeverity = keyof typeof ALERT_SEVERITY
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd client && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add client/src/lib/constants.ts
git commit -m "feat(constants): add gradient, action chip, and alert severity mappings

New constants for mockup replication: CONTEXT_GRADIENTS (7 domain gradients),
NEXT_ACTION_CONFIG (5 action types with labels/colors/icons),
ALERT_SEVERITY (3 levels with styling)."
```

---

### Task 4: Update theme-config animations

**Files:**
- Modify: `client/src/lib/theme-config.ts`

- [ ] **Step 1: Update tech-hud animation config**

In the `tech-hud` theme config, update the animations section to match mockup timings:

```typescript
// Change from:
// pageTransition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] }
// stagger: 0.02
// To:
pageTransition: { duration: 0.22, ease: [0, 0, 0.2, 1] },
stagger: 0.05,
```

- [ ] **Step 2: Commit**

```bash
git add client/src/lib/theme-config.ts
git commit -m "style(theme): update tech-hud animation timings from mockup

Duration 220ms (was 250ms), stagger 50ms (was 20ms) to match mockup."
```

---

## Chunk 2: Layer 1a — Simple Components

### Task 5: Create ProgressGradient component

**Files:**
- Create: `client/src/components/common/ProgressGradient.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { cn } from '@/lib/utils'
import { CONTEXT_GRADIENTS, type ContextGradient } from '@/lib/constants'

interface ProgressGradientProps {
  value: number
  context?: ContextGradient
  height?: 'sm' | 'md'
  showLabel?: boolean
  className?: string
}

export function ProgressGradient({
  value,
  context = 'project',
  height = 'sm',
  showLabel = false,
  className,
}: ProgressGradientProps) {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-muted',
          height === 'sm' ? 'h-[3px]' : 'h-1.5'
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500 ease-out',
            CONTEXT_GRADIENTS[context]
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
          {clamped}%
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add client/src/components/common/ProgressGradient.tsx
git commit -m "feat(ui): add ProgressGradient component

Gradient progress bar with 7 context colors (project, milestone, task,
success, warning, danger, indigo). Sizes: sm (3px), md (6px)."
```

---

### Task 6: Create DotRating component

**Files:**
- Create: `client/src/components/common/DotRating.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { cn } from '@/lib/utils'

interface DotRatingProps {
  value: number
  max?: number
  color?: string
  size?: 'sm' | 'md'
  className?: string
}

export function DotRating({
  value,
  max = 3,
  color = 'bg-foreground',
  size = 'sm',
  className,
}: DotRatingProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-full',
            size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2',
            i < value ? color : 'border border-muted-foreground/30'
          )}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/DotRating.tsx
git commit -m "feat(ui): add DotRating component for probability/impact display"
```

---

### Task 7: Create AvatarStack component

**Files:**
- Create: `client/src/components/common/AvatarStack.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getAvatarColor, getUserInitials } from '@/lib/utils'

interface AvatarUser {
  id: string
  name: string
}

interface AvatarStackProps {
  users: AvatarUser[]
  max?: number
  size?: 'sm' | 'md'
  className?: string
}

export function AvatarStack({
  users,
  max = 3,
  size = 'sm',
  className,
}: AvatarStackProps) {
  const visible = users.slice(0, max)
  const overflow = users.length - max

  return (
    <div className={cn('flex items-center', className)}>
      {visible.map((user, i) => (
        <Avatar
          key={user.id}
          className={cn(
            'border-2 border-background',
            size === 'sm' ? 'h-6 w-6 text-[9px]' : 'h-7 w-7 text-[10px]',
            i > 0 && '-ml-2'
          )}
        >
          <AvatarFallback
            className="font-heading font-bold"
            style={{ backgroundColor: getAvatarColor(user.name) }}
          >
            {getUserInitials(user.name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            '-ml-2 flex items-center justify-center rounded-full border-2 border-background bg-muted text-muted-foreground',
            size === 'sm' ? 'h-6 w-6 text-[9px]' : 'h-7 w-7 text-[10px]',
            'font-medium'
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/AvatarStack.tsx
git commit -m "feat(ui): add AvatarStack component with overflow count"
```

---

### Task 8: Create ViewToggle component

**Files:**
- Create: `client/src/components/common/ViewToggle.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { LayoutList, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ViewToggleProps {
  value: 'list' | 'grid'
  onChange: (view: 'list' | 'grid') => void
  className?: string
}

export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  return (
    <div className={cn('flex items-center rounded-md border border-border', className)}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-8 rounded-r-none px-2',
          value === 'list' && 'bg-primary/10 text-primary'
        )}
        onClick={() => onChange('list')}
      >
        <LayoutList className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-8 rounded-l-none px-2',
          value === 'grid' && 'bg-primary/10 text-primary'
        )}
        onClick={() => onChange('grid')}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/ViewToggle.tsx
git commit -m "feat(ui): add ViewToggle component (list/grid switch)"
```

---

### Task 9: Create RoleSwitcher component

**Files:**
- Create: `client/src/components/common/RoleSwitcher.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Shield, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type ViewRole = 'direzione' | 'dipendente'

interface RoleSwitcherProps {
  value: ViewRole
  onChange: (role: ViewRole) => void
  className?: string
}

export function RoleSwitcher({ value, onChange, className }: RoleSwitcherProps) {
  return (
    <div className={cn('flex items-center gap-1 rounded-md border border-border p-0.5', className)}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-7 gap-1.5 px-3 text-xs',
          value === 'direzione' && 'bg-primary/10 text-primary border border-primary/20'
        )}
        onClick={() => onChange('direzione')}
      >
        <Shield className="h-3.5 w-3.5" />
        Direzione
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-7 gap-1.5 px-3 text-xs',
          value === 'dipendente' && 'bg-primary/10 text-primary border border-primary/20'
        )}
        onClick={() => onChange('dipendente')}
      >
        <User className="h-3.5 w-3.5" />
        Dipendente
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/RoleSwitcher.tsx
git commit -m "feat(ui): add RoleSwitcher component (direzione/dipendente toggle)"
```

---

### Task 10: Create NextActionChip component

**Files:**
- Create: `client/src/components/common/NextActionChip.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { ArrowRight, Unlock, Check, BarChart3, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NEXT_ACTION_CONFIG, type NextAction } from '@/lib/constants'

const ACTION_ICONS = {
  advance: ArrowRight,
  unblock: Unlock,
  approve: Check,
  report: BarChart3,
  review: Eye,
} as const

interface NextActionChipProps {
  action: NextAction
  onClick: () => void
  size?: 'sm' | 'md'
  className?: string
}

export function NextActionChip({
  action,
  onClick,
  size = 'sm',
  className,
}: NextActionChipProps) {
  const config = NEXT_ACTION_CONFIG[action]
  const Icon = ACTION_ICONS[action]

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-medium transition-colors hover:opacity-80',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        config.color,
        className
      )}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {config.label}
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/NextActionChip.tsx
git commit -m "feat(ui): add NextActionChip component (advance/unblock/approve/report/review)"
```

---

## Chunk 3: Layer 1b — Complex Components

### Task 11: Create KpiStrip component

**Files:**
- Create: `client/src/components/common/KpiStrip.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { CONTEXT_GRADIENTS, type ContextGradient } from '@/lib/constants'
import { motion } from 'framer-motion'

export interface KpiCard {
  label: string
  value: string | number
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' }
  subtitle?: string
  color: ContextGradient
  icon?: LucideIcon
}

interface KpiStripProps {
  cards: KpiCard[]
  className?: string
}

const trendIcons = { up: TrendingUp, down: TrendingDown, neutral: Minus }
const trendColors = {
  up: 'text-green-500',
  down: 'text-red-500',
  neutral: 'text-muted-foreground',
}

export function KpiStrip({ cards, className }: KpiStripProps) {
  return (
    <div
      className={cn(
        'grid gap-3',
        cards.length <= 4 ? `grid-cols-2 md:grid-cols-${cards.length}` : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
        className
      )}
    >
      {cards.map((card, i) => {
        const TrendIcon = card.trend ? trendIcons[card.trend.direction] : null
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.22 }}
          >
            <Card className="relative overflow-hidden p-4 transition-all hover:-translate-y-px hover:border-primary/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </span>
                {card.icon && <card.icon className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="mt-2 font-heading text-2xl font-extrabold tracking-tight">
                {card.value}
              </div>
              {(card.trend || card.subtitle) && (
                <div className="mt-1 flex items-center gap-1.5">
                  {card.trend && TrendIcon && (
                    <span className={cn('flex items-center gap-0.5 text-[11px] font-medium', trendColors[card.trend.direction])}>
                      <TrendIcon className="h-3 w-3" />
                      {card.trend.value}
                    </span>
                  )}
                  {card.subtitle && (
                    <span className="text-[11px] text-muted-foreground">{card.subtitle}</span>
                  )}
                </div>
              )}
              {/* Bottom accent bar */}
              <div className={cn('absolute bottom-0 left-0 h-0.5 w-full', CONTEXT_GRADIENTS[card.color])} />
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `cd client && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add client/src/components/common/KpiStrip.tsx
git commit -m "feat(ui): add KpiStrip component with trend indicators and accent bars"
```

---

### Task 12: Create PhasePips component

**Files:**
- Create: `client/src/components/common/PhasePips.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type PipStatus = 'done' | 'current' | 'upcoming' | 'late'

export interface PhasePip {
  key: string
  label: string
  status: PipStatus
}

interface PhasePipsProps {
  phases: PhasePip[]
  currentLabel?: string
  compact?: boolean
  className?: string
}

const pipColors: Record<PipStatus, string> = {
  done: 'bg-green-500',
  current: 'bg-primary shadow-glow-sm',
  upcoming: 'border border-muted-foreground/30 bg-transparent',
  late: 'bg-orange-500',
}

const pillColors: Record<PipStatus, string> = {
  done: 'bg-green-500/10 text-green-500 border-green-500/25',
  current: 'bg-primary/10 text-primary border-primary/25',
  upcoming: 'bg-muted text-muted-foreground border-border',
  late: 'bg-orange-500/10 text-orange-500 border-orange-500/25',
}

const connectorColors: Record<string, string> = {
  done: 'bg-green-500',
  mid: 'bg-gradient-to-r from-green-500 to-border',
  off: 'bg-border',
}

export function PhasePips({ phases, currentLabel, compact = true, className }: PhasePipsProps) {
  if (compact) {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <div className="flex items-center gap-1">
          {phases.map((p) => (
            <div key={p.key} className={cn('h-1 w-3 rounded-full', pipColors[p.status])} />
          ))}
        </div>
        {currentLabel && (
          <span className="text-[10px] text-muted-foreground">{currentLabel}</span>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-0', className)}>
      {phases.map((p, i) => (
        <div key={p.key} className="flex items-center">
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-md border px-3 py-1 text-[11px] font-medium',
              pillColors[p.status]
            )}
          >
            {p.status === 'done' && <Check className="h-3 w-3" />}
            {p.status === 'current' && <div className="h-2 w-2 rounded-full bg-current" />}
            {p.label}
          </div>
          {i < phases.length - 1 && (
            <div
              className={cn(
                'h-px w-6',
                p.status === 'done' && phases[i + 1]?.status === 'done'
                  ? connectorColors.done
                  : p.status === 'done'
                    ? connectorColors.mid
                    : connectorColors.off
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/PhasePips.tsx
git commit -m "feat(ui): add PhasePips component (compact pips + full pills with connectors)"
```

---

### Task 13: Create AlertStrip component

**Files:**
- Create: `client/src/components/common/AlertStrip.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState } from 'react'
import { AlertTriangle, AlertCircle, Info, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ALERT_SEVERITY, type AlertSeverity } from '@/lib/constants'
import { motion, AnimatePresence } from 'framer-motion'

export interface AlertItem {
  id: string
  severity: AlertSeverity
  title: string
  subtitle?: string
  projectName?: string
  time: string
}

interface AlertStripProps {
  alerts: AlertItem[]
  className?: string
}

const severityIcons = { critical: AlertTriangle, warning: AlertCircle, info: Info }

export function AlertStrip({ alerts, className }: AlertStripProps) {
  const [collapsed, setCollapsed] = useState(false)

  const counts = {
    critical: alerts.filter((a) => a.severity === 'critical').length,
    warning: alerts.filter((a) => a.severity === 'warning').length,
    info: alerts.filter((a) => a.severity === 'info').length,
  }

  if (alerts.length === 0) return null

  return (
    <Card className={cn('overflow-hidden', className)}>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between p-3 text-left hover:bg-accent/5"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span className="text-sm font-medium">Attenzione</span>
          <div className="flex items-center gap-1.5">
            {counts.critical > 0 && (
              <Badge variant="outline" className="h-5 gap-1 border-red-500/30 px-1.5 text-[10px] text-red-500">
                {counts.critical}
              </Badge>
            )}
            {counts.warning > 0 && (
              <Badge variant="outline" className="h-5 gap-1 border-orange-500/30 px-1.5 text-[10px] text-orange-500">
                {counts.warning}
              </Badge>
            )}
            {counts.info > 0 && (
              <Badge variant="outline" className="h-5 gap-1 border-blue-500/30 px-1.5 text-[10px] text-blue-500">
                {counts.info}
              </Badge>
            )}
          </div>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', !collapsed && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-0 border-t border-border">
              {alerts.map((alert) => {
                const config = ALERT_SEVERITY[alert.severity]
                const Icon = severityIcons[alert.severity]
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      'flex items-start gap-3 border-l-[3px] px-3 py-2.5',
                      config.border, config.bg
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium">{alert.title}</div>
                      {alert.subtitle && (
                        <div className="text-[11px] text-muted-foreground">{alert.subtitle}</div>
                      )}
                    </div>
                    {alert.projectName && (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {alert.projectName}
                      </Badge>
                    )}
                    <span className="shrink-0 text-[10px] text-muted-foreground">{alert.time}</span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/AlertStrip.tsx
git commit -m "feat(ui): add AlertStrip component with collapsible severity alerts"
```

---

### Task 14: Create EditableBadge component

**Files:**
- Create: `client/src/components/common/EditableBadge.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command'

interface EditableOption {
  value: string
  label: string
  dot?: string       // Tailwind bg-* class for color dot
  icon?: React.ReactNode
}

interface EditableBadgeProps {
  value: string
  options: EditableOption[]
  onChange: (value: string) => void
  displayLabel?: string
  displayDot?: string
  displayIcon?: React.ReactNode
  searchable?: boolean
  disabled?: boolean
  className?: string
}

export function EditableBadge({
  value,
  options,
  onChange,
  displayLabel,
  displayDot,
  displayIcon,
  searchable = false,
  disabled = false,
  className,
}: EditableBadgeProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)
  const label = displayLabel ?? selected?.label ?? value
  const dot = displayDot ?? selected?.dot
  const icon = displayIcon ?? selected?.icon

  if (disabled) {
    return (
      <Badge variant="outline" className={cn('gap-1.5', className)}>
        {dot && <span className={cn('h-2 w-2 rounded-full', dot)} />}
        {icon}
        {label}
      </Badge>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            'cursor-pointer gap-1.5 transition-colors hover:border-primary/40 hover:bg-primary/5',
            className
          )}
        >
          {dot && <span className={cn('h-2 w-2 rounded-full', dot)} />}
          {icon}
          {label}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
        <Command>
          {searchable && <CommandInput placeholder="Cerca..." />}
          <CommandList>
            <CommandEmpty>Nessun risultato</CommandEmpty>
            {options.map((opt) => (
              <CommandItem
                key={opt.value}
                value={opt.value}
                onSelect={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className="gap-2"
              >
                {opt.dot && <span className={cn('h-2 w-2 rounded-full', opt.dot)} />}
                {opt.icon}
                <span>{opt.label}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/EditableBadge.tsx
git commit -m "feat(ui): add EditableBadge component with inline dropdown editing"
```

---

### Task 15: Create ActivityFeed component

**Files:**
- Create: `client/src/components/common/ActivityFeed.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getUserInitials, getAvatarColor } from '@/lib/utils'

export interface ActivityItem {
  id: string
  type: 'comment' | 'system'
  userName?: string
  action: string
  target?: string
  content?: string
  time: string
  dotColor?: string
}

interface ActivityFeedProps {
  items: ActivityItem[]
  maxItems?: number
  className?: string
}

export function ActivityFeed({ items, maxItems, className }: ActivityFeedProps) {
  const visible = maxItems ? items.slice(0, maxItems) : items

  return (
    <div className={cn('space-y-3', className)}>
      {visible.map((item) => (
        <div key={item.id} className="flex gap-3">
          {item.type === 'comment' && item.userName ? (
            <Avatar className="h-7 w-7 shrink-0 text-[10px]">
              <AvatarFallback
                className="font-heading font-bold"
                style={{ backgroundColor: getAvatarColor(item.userName) }}
              >
                {getUserInitials(item.userName)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center">
              <div className={cn('h-2 w-2 rounded-full', item.dotColor ?? 'bg-primary')} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs">
              {item.userName && <span className="font-semibold">{item.userName}</span>}{' '}
              <span className="text-muted-foreground">{item.action}</span>
              {item.target && <span className="font-medium"> {item.target}</span>}
              <span className="ml-2 text-[10px] text-muted-foreground">{item.time}</span>
            </div>
            {item.content && (
              <div className="mt-1 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                {item.content}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/ActivityFeed.tsx
git commit -m "feat(ui): add ActivityFeed component (comments + system events)"
```

---

### Task 16: Create DrawerDetail component

**Files:**
- Create: `client/src/components/common/DrawerDetail.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

interface InfoGridItem {
  label: string
  value: React.ReactNode
}

interface DrawerDetailProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  badges?: React.ReactNode
  infoGrid?: InfoGridItem[]
  children?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function DrawerDetail({
  open,
  onClose,
  title,
  subtitle,
  badges,
  infoGrid,
  children,
  footer,
  className,
}: DrawerDetailProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className={cn('flex w-[420px] flex-col p-0 sm:max-w-[420px]', className)}>
        <SheetHeader className="space-y-1 px-5 pt-5">
          <SheetTitle className="text-base">{title}</SheetTitle>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {badges && <div className="flex flex-wrap gap-1.5 pt-1">{badges}</div>}
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-4 px-5 py-4">
            {infoGrid && infoGrid.length > 0 && (
              <>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {infoGrid.map((item) => (
                    <div key={item.label}>
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {item.label}
                      </div>
                      <div className="mt-0.5 text-sm">{item.value}</div>
                    </div>
                  ))}
                </div>
                <Separator />
              </>
            )}
            {children}
          </div>
        </ScrollArea>

        {footer && (
          <div className="border-t border-border px-5 py-3">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/DrawerDetail.tsx
git commit -m "feat(ui): add DrawerDetail component (Sheet with info grid and scroll)"
```

---

### Task 17: Batch commit all Layer 1 components

- [ ] **Step 1: Verify all new components compile**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Verify Vite dev build**

Run: `cd client && npx vite build --mode development 2>&1 | tail -3`
Expected: Build succeeds

---

## Chunk 4: Layer 2 — Template Extensions

### Task 18: Extend EntityList with new props

**Files:**
- Modify: `client/src/components/common/EntityList.tsx`

- [ ] **Step 1: Add new prop types to EntityListProps interface**

Add these properties to the existing `EntityListProps<T>` interface:

```typescript
  /** KPI cards displayed above filters */
  kpiStrip?: import('./KpiStrip').KpiCard[]

  /** Current view mode */
  viewMode?: 'list' | 'grid'
  /** Called when view mode changes */
  onViewModeChange?: (mode: 'list' | 'grid') => void
  /** Card renderer for grid view */
  gridRenderItem?: (item: T) => React.ReactNode

  /** Role switcher in toolbar */
  roleSwitcher?: {
    value: 'direzione' | 'dipendente'
    onChange: (role: 'direzione' | 'dipendente') => void
  }

  /** Left accent color per row (3px colored border) */
  rowAccentColor?: (item: T) => string | undefined

  /** Next action chip per row */
  rowAction?: (item: T) => React.ReactNode
```

- [ ] **Step 2: Import new components and render them**

At the top of the file, add imports:

```typescript
import { KpiStrip } from './KpiStrip'
import { ViewToggle } from './ViewToggle'
import { RoleSwitcher } from './RoleSwitcher'
```

In the component body:
- Render `<KpiStrip cards={kpiStrip} />` before the filter toolbar if `kpiStrip` is provided
- Add `<ViewToggle>` and `<RoleSwitcher>` to the toolbar area (next to headerExtra)
- When `viewMode === 'grid'` and `gridRenderItem` is provided, render a grid instead of DataTable:

```tsx
{viewMode === 'grid' && gridRenderItem ? (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {data.map((item) => (
      <div key={getId(item)}>{gridRenderItem(item)}</div>
    ))}
  </div>
) : (
  <DataTable ... />
)}
```

- [ ] **Step 3: Update DataTable row to support accent color**

If `rowAccentColor` is provided, add a 3px left border to each row:

```tsx
className={cn(
  'cursor-pointer',
  rowAccentColor?.(item) && `border-l-[3px] border-l-${rowAccentColor(item)}-500`
)}
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `cd client && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add client/src/components/common/EntityList.tsx
git commit -m "feat(EntityList): add kpiStrip, viewMode, roleSwitcher, rowAccentColor props

Extend EntityList template with optional KPI strip, list/grid toggle,
role switcher, and row accent color support. All props are optional
for backward compatibility."
```

---

### Task 19: Extend EntityDetail with new props

**Files:**
- Modify: `client/src/components/common/EntityDetail.tsx`

- [ ] **Step 1: Add new prop types**

Add to `EntityDetailProps`:

```typescript
  /** Editable badges in header (replaces static badges when interactive editing is needed) */
  editableBadges?: React.ReactNode

  /** KPI mini-cards row below header */
  kpiRow?: React.ReactNode

  /** Color bar above title (gradient CSS) */
  colorBar?: string
```

- [ ] **Step 2: Render new elements**

In the header section:
- If `colorBar` is provided, render a 4px gradient bar above the title:
  ```tsx
  {colorBar && <div className="h-1 w-full rounded-full" style={{ background: colorBar }} />}
  ```
- Render `editableBadges` in the same area as `badges` (they're mutually exclusive in practice)
- Render `kpiRow` between the header and tabs/beforeContent

- [ ] **Step 3: Commit**

```bash
git add client/src/components/common/EntityDetail.tsx
git commit -m "feat(EntityDetail): add editableBadges, kpiRow, colorBar props"
```

---

### Task 20: Update DataTable hover styling

**Files:**
- Modify: `client/src/components/common/DataTable.tsx`

- [ ] **Step 1: Enhance row hover**

Update the table row hover class to include primary border hint:

```tsx
// In the row element, update the hover classes:
className={cn(
  'transition-colors hover:bg-accent/5 hover:border-primary/20',
  // existing classes...
)}
```

- [ ] **Step 2: Add stagger animation support**

Wrap rows in `motion.tr` with staggered delay (only if data has ≤20 items for performance):

```tsx
import { motion } from 'framer-motion'

// In the row render:
const Row = data.length <= 20 ? motion.tr : 'tr'

<Row
  key={getId(item)}
  {...(data.length <= 20 && {
    initial: { opacity: 0, x: -4 },
    animate: { opacity: 1, x: 0 },
    transition: { delay: index * 0.03, duration: 0.15 },
  })}
>
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/common/DataTable.tsx
git commit -m "style(DataTable): add primary border hover and stagger animation"
```

---

## Chunk 5: Layer 3 — Backend API Extensions

### Task 21: Extend dashboard service with full KPI data

**Files:**
- Modify: `server/src/services/dashboardService.ts`
- Modify: `server/src/controllers/dashboardController.ts`
- Modify: `client/src/hooks/api/useDashboard.ts`

- [ ] **Step 1: Review current dashboardService.ts stats method**

Read the file to understand the current `getStats()` method signature and response shape.

- [ ] **Step 2: Extend getStats to include mockup KPI fields**

Ensure the stats response includes all fields needed by the mockup:
- For direzione: activeProjects, openTeamTasks, weeklyTeamHours, activeRisks, budgetUsedPercent (with deltas)
- For dipendente: myOpenTasks, myWeeklyHours, myClosedThisWeek, myProjects (with deltas)

Add any missing Prisma queries. Use `$transaction` for aggregated counts.

- [ ] **Step 3: Update the TanStack Query hook types**

In `client/src/hooks/api/useDashboard.ts`, update the response type interface to match the extended backend response.

- [ ] **Step 4: Verify backend compiles**

Run: `cd server && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add server/src/services/dashboardService.ts server/src/controllers/dashboardController.ts client/src/hooks/api/useDashboard.ts
git commit -m "feat(api): extend dashboard stats with full KPI data for mockup

Add missing fields: budgetUsedPercent, criticalProjects, activeResources,
weeklyHoursDelta, etc. Both direzione and dipendente views covered."
```

---

## Chunk 6: Layer 4a — Dashboard + Lista Progetti

### Task 22: Rebuild HomePage (Dashboard) pixel-accurate

**Files:**
- Modify: `client/src/pages/home/HomePage.tsx`

- [ ] **Step 1: Read the current HomePage.tsx**

Understand the current structure before rewriting.

- [ ] **Step 2: Rebuild with mockup structure**

The page should render:
1. Breadcrumb: "Workspace > Dashboard"
2. Header: title "Dashboard operativa" + date + "Nuovo task" button
3. `<RoleSwitcher>` with date chip
4. `<KpiStrip>` — 5 cards for direzione, 4 for dipendente (data from useDashboardStats hook)
5. `<AlertStrip>` — from useDashboardAttention hook
6. Domain tabs (4): Milestone, Calendario, Task, Progetti
   - Each tab content uses existing hooks (useProjects, useTasks, etc.)
   - Milestone tab: grid of milestone cards with ProgressGradient + deadline
   - Calendar tab: existing CalendarGrid or simplified view
   - Task tab: 3-column layout (urgent, upcoming, blocked)
   - Projects tab: grid of project cards

Use `EntityDetail` as container with `beforeContent` for KPI strip and `tabs` for domain tabs. Or use custom layout if EntityDetail doesn't fit the dashboard pattern.

- [ ] **Step 3: Verify TypeScript and visual rendering**

Run: `cd client && npx tsc --noEmit`
Then start dev server and verify visually.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/home/HomePage.tsx
git commit -m "feat(page): rebuild HomePage dashboard pixel-accurate from mockup

KPI strip, alert strip, role switcher, 4 domain tabs (milestone, calendar,
task, projects). Dual view for direzione/dipendente."
```

---

### Task 23: Rebuild ProjectListPage pixel-accurate

**Files:**
- Modify: `client/src/pages/projects/ProjectListPage.tsx`

- [ ] **Step 1: Read current ProjectListPage.tsx**

- [ ] **Step 2: Update columns to match mockup**

Define new columns array matching mockup's 8-column layout:

```typescript
const columns: Column<Project>[] = [
  {
    key: 'name',
    label: 'Progetto',
    sortable: true,
    render: (p) => (
      <div>
        <div className="font-medium">{p.name}</div>
        <div className="text-[11px] text-muted-foreground">
          {p._count?.milestones ?? 0} milestone · {p._count?.tasks ?? 0} task · {p._count?.risks ?? 0} rischi
        </div>
      </div>
    ),
  },
  {
    key: 'status',
    label: 'Stato',
    render: (p) => <StatusBadge status={p.status} labels={PROJECT_STATUS_LABELS} />,
  },
  {
    key: 'progress',
    label: 'Avanzamento',
    render: (p) => (
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <span>{p.completionPercentage ?? 0}%</span>
        </div>
        <ProgressGradient value={p.completionPercentage ?? 0} context="project" />
      </div>
    ),
  },
  {
    key: 'phases',
    label: 'Fasi',
    render: (p) => <PhasePips phases={mapProjectPhases(p)} compact />,
  },
  {
    key: 'team',
    label: 'Team',
    render: (p) => <AvatarStack users={p.members ?? []} />,
  },
  {
    key: 'deadline',
    label: 'Scadenza',
    render: (p) => <DeadlineCell date={p.targetEndDate} />,
  },
  {
    key: 'action',
    label: '',
    render: (p) => <NextActionChip action={getNextAction(p)} onClick={() => handleAction(p)} />,
  },
]
```

- [ ] **Step 3: Add KPI strip, view toggle, grid view**

Use the extended EntityList props:

```tsx
<EntityList
  kpiStrip={projectKpis}
  viewMode={viewMode}
  onViewModeChange={setViewMode}
  gridRenderItem={(p) => <ProjectGridCard project={p} />}
  // ... existing props
/>
```

Create a `ProjectGridCard` local component matching the mockup's card layout.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/projects/ProjectListPage.tsx
git commit -m "feat(page): rebuild ProjectListPage with mockup columns, KPI strip, grid view

8-column layout: name+meta, status badge, progress gradient, phase pips,
avatar stack, deadline, next action. KPI strip with 5 project metrics.
List/grid toggle with responsive card view."
```

---

## Chunk 7: Layer 4b — Detail Pages

### Task 24: Rebuild ProjectDetailPage pixel-accurate

**Files:**
- Modify: `client/src/pages/projects/ProjectDetailPage.tsx`

- [ ] **Step 1: Read current file**

- [ ] **Step 2: Update header with mockup structure**

Add:
- Color bar (4px gradient from project color)
- Domain badge "Progetto"
- Status badge + milestone count + deadline + time remaining
- Action buttons: "Log ore", "Aggiungi task", "Avanza fase"
- KPI row: 5 mini cards (avanzamento, task count, ore, rischi, team)

- [ ] **Step 3: Update tabs**

4 tabs matching mockup:
1. **Panoramica**: Phase timeline (full PhasePips), progress chart (Recharts Area), ActivityFeed, team cards
2. **Task**: Milestones collapsibili con task list e subtask espandibili
3. **Rischi**: Risk items con level box e severity badges
4. **Documenti**: Document grid con file cards e upload zone

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/projects/ProjectDetailPage.tsx
git commit -m "feat(page): rebuild ProjectDetailPage with mockup layout

Color bar, domain badge, KPI row, 4 tabs (panoramica, task, rischi, documenti).
Phase timeline, collapsible milestones, activity feed, document grid."
```

---

### Task 25: Rebuild TaskDetailPage pixel-accurate

**Files:**
- Modify: `client/src/pages/tasks/TaskDetailPage.tsx`

- [ ] **Step 1: Read current file**

- [ ] **Step 2: Update header with editable badges**

Replace static badges with `<EditableBadge>` for:
- Status (todo/in_progress/review/blocked/done)
- Priority (low/medium/high/critical)
- Assignee (user list, searchable)
- Project (project list)
- Milestone (milestone list)
- Deadline (date picker variant)

Connect each to the appropriate mutation hook (useUpdateTask).

- [ ] **Step 3: Update tabs**

5 tabs matching mockup:
1. **Dettagli**: Description + related tasks with relationship badges
2. **Subtask**: Progress bar + checklist items with checkbox/deadline/avatar + add row
3. **Log ore**: Summary grid (logged/estimated/remaining) + time entries list
4. **Allegati**: File cards with type icon + upload zone
5. **Attività**: Comment input + ActivityFeed (comments + system events)

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/tasks/TaskDetailPage.tsx
git commit -m "feat(page): rebuild TaskDetailPage with inline editable badges

6 editable badges (status, priority, assignee, project, milestone, deadline).
5 tabs (dettagli, subtask, log ore, allegati, attività) pixel-accurate."
```

---

## Chunk 8: Layer 4c — Kanban + Documenti + Rischi

### Task 26: Update KanbanBoardPage

**Files:**
- Modify: `client/src/pages/kanban/KanbanBoardPage.tsx` (or equivalent path)

- [ ] **Step 1: Read current file and update**

Update kanban card design:
- 5 columns (Idle, Active, Review, Done, Blocked) with colored header dots
- Card: task name, phase badge, deadline, subtask progress, avatar
- Quick actions on hover: Advance, Log, Assign
- List view toggle fallback

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(page): update KanbanBoardPage with mockup card design and list toggle"
```

---

### Task 27: Update DocumentListPage

**Files:**
- Modify: `client/src/pages/documents/DocumentListPage.tsx`

- [ ] **Step 1: Update with mockup structure**

- KPI strip: 4 cards (Total, Approved, Review, Draft)
- View toggle: list/project grouping
- Table: status badge, type pill (IFU/DHF/Risk/Audit/Spec/Other), revision, author
- DrawerDetail for document detail with info grid + version history

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(page): rebuild DocumentListPage with KPI strip, drawer detail, type pills"
```

---

### Task 28: Update RiskListPage

**Files:**
- Modify: `client/src/pages/risks/RiskListPage.tsx` (or equivalent)

- [ ] **Step 1: Update with mockup structure**

- Role switcher
- KPI strip: 4 cards (Total, Critical, Medium, Low)
- Severity chip filters
- Table: severity left border, DotRating for probability/impact, risk score badge
- DrawerDetail with description, mitigation, linked tasks, history timeline

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(page): rebuild RiskListPage with severity filters, DotRating, drawer detail"
```

---

## Chunk 9: Layer 4d — Utenti + Report + Gantt

### Task 29: Update UserListPage

**Files:**
- Modify: `client/src/pages/admin/UserListPage.tsx`

- [ ] **Step 1: Update with mockup structure**

3 tabs:
1. **Utenti**: KPI + table (name, email, role badge, status dot, projects, last access)
2. **Matrice permessi**: Features × roles matrix with yes/no/partial icons
3. **Log accessi**: Filter bar + log items with colored action icons

DrawerDetail for user form (create/edit).

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(page): rebuild UserListPage with permissions matrix and access log tabs"
```

---

### Task 30: Update WeeklyReportPage

**Files:**
- Modify: `client/src/pages/reports/WeeklyReportPage.tsx`

- [ ] **Step 1: Update with mockup structure**

- Week selector (prev/next + label)
- KPI strip: 5 cards with delta indicators
- 2-column grid: task performance table (left 2/3) + team capacity (right 1/3)

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(page): rebuild WeeklyReportPage with week selector and KPI strip"
```

---

### Task 31: Update Gantt view

**Files:**
- Modify: `client/src/components/domain/gantt/GanttChart.tsx` (or equivalent)

- [ ] **Step 1: Update with mockup patterns**

- Hierarchical rows (project → milestone → task)
- Bars with progress fill
- Today line
- Zoom controls (Week/Month/Quarter)
- Dependency arrows (SVG overlay)

This is the most complex component. Follow existing GanttChart structure and update styling.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(page): update GanttChart with mockup styling and zoom controls"
```

---

## Chunk 10: Finalization

### Task 32: Update CLAUDE.md with new component documentation

**Files:**
- Modify: `.claude/CLAUDE.md`

- [ ] **Step 1: Update design system section**

Update the radius documentation for tech-hud from 2px to 8px/5px. Add font info (Syne + DM Sans for tech-hud). Document new components in the Project Structure section.

- [ ] **Step 2: Add new components to anti-patterns**

Add: "NON creare progress bar manuali — usare `<ProgressGradient>` da `common/`"

- [ ] **Step 3: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs: update CLAUDE.md with new mockup components and tech-hud tokens"
```

---

### Task 33: Final verification

- [ ] **Step 1: TypeScript check**

Run: `cd client && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 2: Build check**

Run: `cd client && npx vite build`
Expected: Build succeeds

- [ ] **Step 3: Visual verification**

Start dev server (`cd client && npx vite`) and verify each page matches mockup:
- [ ] Dashboard
- [ ] Lista Progetti
- [ ] Dettaglio Progetto
- [ ] Dettaglio Task
- [ ] Kanban
- [ ] Documenti
- [ ] Rischi
- [ ] Utenti
- [ ] Report
- [ ] Gantt

Compare side-by-side with mockup HTML files opened in browser.
