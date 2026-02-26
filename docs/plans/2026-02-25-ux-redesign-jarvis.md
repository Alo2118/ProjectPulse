# UX Redesign "JARVIS" — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Radical UX redesign with JARVIS tech aesthetic — simplify readability, data discoverability for all user profiles.

**Architecture:** Frontend-only changes. Replace glassmorphism with JARVIS dark-first design (cyan/indigo, HUD effects, tech animations). Restructure navigation (compact sidebar), dashboards (fixed role layouts), list pages (unified filters), detail pages (2-column, no tabs). Integrate Kanban/Gantt as task list views.

**Tech Stack:** React 18, TypeScript, TailwindCSS, Framer Motion, Zustand, JetBrains Mono font, Lucide Icons

**Design doc:** `docs/plans/2026-02-25-ux-redesign-jarvis-design.md`

**Key constraint:** Show project **names** everywhere, never codes.

---

## Phase 1: Design System Foundation (tailwind + CSS + fonts)

### Task 1: Add JetBrains Mono font

**Files:**
- Modify: `client/index.html`

**Step 1:** Add Google Fonts link for JetBrains Mono in `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**Step 2:** Verify in browser that `font-family: 'JetBrains Mono'` works.

**Step 3:** Commit: `style: add JetBrains Mono font for JARVIS tech aesthetic`

---

### Task 2: Update Tailwind config — colors, fonts, shadows

**Files:**
- Modify: `client/tailwind.config.js` (117 lines)

**Step 1:** Replace the entire `theme.extend` section:

- **Colors**: Keep `primary` but remap to cyan scale (`primary-500: '#06b6d4'`, etc.). Keep `surface` for backward compat but add `jarvis` namespace for new tokens. The key values:
  - `primary-50: '#ecfeff'` through `primary-950: '#083344'` (Tailwind cyan scale)
  - `surface-900: '#0f172a'` (slate-900), `surface-950: '#020617'` (slate-950), `surface-800: '#1e293b'` (slate-800)
- **fontFamily**: Add `mono: ['JetBrains Mono', 'ui-monospace', 'monospace']`
- **boxShadow**: Replace existing glow shadows:
  - `'glow-cyan': '0 0 30px rgba(6,182,212,0.15)'`
  - `'glow-cyan-lg': '0 0 40px rgba(6,182,212,0.2)'`
  - `'glow-cyan-text': '0 0 20px rgba(6,182,212,0.4)'`
  - `'glow-cyan-btn': '0 0 20px rgba(6,182,212,0.25)'`
  - `'glow-cyan-input': '0 0 15px rgba(6,182,212,0.2)'`
  - `'glow-red': '0 0 20px rgba(239,68,68,0.3)'`
  - `'glow-amber': '0 0 15px rgba(251,191,36,0.25)'`

**Step 2:** Add all 19 JARVIS keyframes and animations (from design doc §3.1):

```js
keyframes: {
  'counter-up': { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
  'scan-line': { '0%': { transform: 'translateY(-100%)', opacity: '0.5' }, '50%': { opacity: '1' }, '100%': { transform: 'translateY(100%)', opacity: '0.5' } },
  'fade-in-stagger': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
  'glow-pulse': { '0%, 100%': { boxShadow: '0 0 15px rgba(6,182,212,0.2)' }, '50%': { boxShadow: '0 0 30px rgba(6,182,212,0.4)' } },
  'border-trace': { '0%': { borderColor: 'rgba(6,182,212,0.1)' }, '50%': { borderColor: 'rgba(6,182,212,0.4)' }, '100%': { borderColor: 'rgba(6,182,212,0.1)' } },
  'data-reveal': { '0%': { width: '0%' }, '100%': { width: 'var(--target-width)' } },
  'page-enter': { '0%': { opacity: '0', transform: 'translateX(20px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
  'section-reveal': { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
  'card-power-on': { '0%': { opacity: '0', transform: 'scale(0.95)', boxShadow: '0 0 0 rgba(6,182,212,0)' }, '100%': { opacity: '1', transform: 'scale(1)', boxShadow: '0 0 30px rgba(6,182,212,0.15)' } },
  'row-flash': { '0%': { backgroundColor: 'rgba(6,182,212,0.1)' }, '100%': { backgroundColor: 'transparent' } },
  'status-morph': { '0%': { transform: 'scale(1.15)' }, '100%': { transform: 'scale(1)' } },
  'timer-tick': { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.3' } },
  'badge-bounce': { '0%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.3)' }, '70%': { transform: 'scale(0.9)' }, '100%': { transform: 'scale(1)' } },
  'tooltip-origin': { '0%': { opacity: '0', transform: 'scale(0.9)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
  'breadcrumb-slide': { '0%': { opacity: '0', transform: 'translateX(-10px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
  'skeleton-dissolve': { '0%': { opacity: '1', filter: 'blur(2px)' }, '100%': { opacity: '1', filter: 'blur(0)' } },
  'alert-border-pulse': { '0%, 100%': { borderLeftColor: 'rgba(239,68,68,0.3)' }, '50%': { borderLeftColor: 'rgba(239,68,68,0.7)' } },
  'sidebar-glow': { '0%': { boxShadow: 'inset 2px 0 0 rgba(6,182,212,0)' }, '100%': { boxShadow: 'inset 2px 0 0 rgba(6,182,212,0.4)' } },
  'progress-update': { '0%': { width: 'var(--from-width)' }, '100%': { width: 'var(--to-width)' } },
},
animation: {
  'counter-up': 'counter-up 0.6s ease-out',
  'scan-line': 'scan-line 1.5s ease-in-out infinite',
  'fade-in-stagger': 'fade-in-stagger 0.2s ease-out forwards',
  'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
  'border-trace': 'border-trace 1.5s ease-in-out infinite',
  'data-reveal': 'data-reveal 0.8s ease-out forwards',
  'page-enter': 'page-enter 0.15s ease-out',
  'section-reveal': 'section-reveal 0.25s ease-out forwards',
  'card-power-on': 'card-power-on 0.3s ease-out forwards',
  'row-flash': 'row-flash 0.5s ease-out',
  'status-morph': 'status-morph 0.3s ease-out',
  'timer-tick': 'timer-tick 1s step-end infinite',
  'badge-bounce': 'badge-bounce 0.4s ease-out',
  'tooltip-origin': 'tooltip-origin 0.15s ease-out',
  'breadcrumb-slide': 'breadcrumb-slide 0.2s ease-out',
  'skeleton-dissolve': 'skeleton-dissolve 0.3s ease-out',
  'alert-border-pulse': 'alert-border-pulse 3s ease-in-out infinite',
  'sidebar-glow': 'sidebar-glow 0.2s ease-out forwards',
  'progress-update': 'progress-update 0.5s ease-out forwards',
}
```

**Step 3:** Remove old animations that are replaced: `glow`, `glow-red`, `glow-amber`, `shimmer`, `scale-in`, `slide-up-in`. Keep: `fade-in`, `slide-up`, `pulse-dot`, `progress-fill`, `expand`, `collapse`, `slide-in-right`.

**Step 4:** Verify Tailwind recompiles without errors: `cd client && npx tailwindcss --help` (or check vite dev output).

**Step 5:** Commit: `style: update tailwind config with JARVIS color system and tech animations`

---

### Task 3: Update global CSS — replace component classes

**Files:**
- Modify: `client/src/styles/index.css` (246 lines)

**Step 1:** Replace all `@layer components` classes:

```css
/* === JARVIS Design System === */

@layer components {
  /* Card */
  .card {
    @apply bg-slate-900/70 backdrop-blur-sm rounded-xl border border-cyan-500/10 shadow-sm;
  }
  .card:is(.dark *), .dark .card {
    /* dark is default — same styles */
  }
  .card-hover {
    @apply card transition-all duration-200;
  }
  .card-hover:hover {
    @apply bg-slate-800/60 border-cyan-500/20 shadow-glow-cyan;
  }

  /* Light mode overrides */
  :root:not(.dark) .card {
    @apply bg-white border-slate-200 shadow-sm;
  }
  :root:not(.dark) .card-hover:hover {
    @apply bg-slate-50 border-cyan-500/30;
  }

  /* Modal */
  .modal-panel {
    @apply bg-slate-900 border border-cyan-500/20 rounded-xl shadow-2xl animate-tooltip-origin;
  }
  :root:not(.dark) .modal-panel {
    @apply bg-white border-slate-200;
  }

  /* Buttons */
  .btn-primary {
    @apply inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium text-sm
           bg-cyan-600 text-white shadow-glow-cyan-btn
           hover:bg-cyan-500 hover:shadow-glow-cyan
           focus:outline-none focus:ring-2 focus:ring-cyan-500/50
           active:scale-[0.98] transition-all duration-150;
  }
  .btn-secondary {
    @apply inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium text-sm
           bg-transparent border border-cyan-500/30 text-cyan-400
           hover:border-cyan-500/60 hover:bg-cyan-500/5
           focus:outline-none focus:ring-2 focus:ring-cyan-500/30
           active:scale-[0.98] transition-all duration-150;
  }
  :root:not(.dark) .btn-secondary {
    @apply border-cyan-600/30 text-cyan-700 hover:border-cyan-600/60 hover:bg-cyan-50;
  }
  .btn-tertiary {
    @apply inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium text-sm
           text-slate-400 hover:text-slate-200 hover:bg-cyan-500/5
           focus:outline-none transition-all duration-150;
  }
  .btn-icon {
    @apply p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10
           focus:outline-none transition-all duration-150;
  }

  /* Inputs */
  .input {
    @apply w-full px-3 py-2 rounded-lg text-sm
           bg-slate-800/50 border border-cyan-500/20 text-slate-100
           placeholder:text-slate-500
           focus:outline-none focus:border-cyan-500/40 focus:shadow-glow-cyan-input
           transition-all duration-150;
  }
  :root:not(.dark) .input {
    @apply bg-white border-slate-300 text-slate-900 placeholder:text-slate-400
           focus:border-cyan-500 focus:shadow-glow-cyan-input;
  }
  .input-error {
    @apply border-red-500/50 focus:border-red-500 focus:shadow-glow-red;
  }

  /* Skeleton */
  .skeleton {
    @apply relative overflow-hidden bg-slate-800/50 rounded;
  }
  .skeleton::after {
    content: '';
    @apply absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent;
    animation: scan-line 1.5s ease-in-out infinite;
  }
  :root:not(.dark) .skeleton {
    @apply bg-slate-200;
  }

  /* Status dots */
  .status-dot { @apply w-2 h-2 rounded-full; }
  .status-dot-active { @apply bg-cyan-400 shadow-glow-cyan; }
  .status-dot-warning { @apply bg-amber-400 shadow-glow-amber; }
  .status-dot-danger { @apply bg-red-400 shadow-glow-red animate-glow-pulse; }

  /* Stat pill */
  .stat-pill {
    @apply px-3 py-1.5 rounded-full text-xs font-medium border border-cyan-500/20
           text-slate-300 cursor-pointer transition-all duration-150
           hover:border-cyan-500/40 hover:bg-cyan-500/5;
  }
  .stat-pill-active {
    @apply bg-cyan-500/10 border-cyan-500/40 text-cyan-400 ring-1 ring-cyan-500/30;
  }

  /* Segmented control */
  .segmented-control {
    @apply inline-flex rounded-lg bg-slate-800/50 border border-cyan-500/10 p-0.5;
  }
  .segmented-control-item {
    @apply px-3 py-1.5 text-xs font-medium rounded-md text-slate-400
           hover:text-slate-200 transition-all duration-150 cursor-pointer;
  }
  .segmented-control-item-active {
    @apply bg-cyan-500/15 text-cyan-400 shadow-sm;
  }

  /* Meta row */
  .meta-row {
    @apply flex items-center justify-between py-2 border-b border-cyan-500/5;
  }
  .meta-row-label {
    @apply text-xs uppercase tracking-widest text-cyan-500/50 font-medium;
  }
  .meta-row-value {
    @apply text-sm text-slate-200;
  }
  :root:not(.dark) .meta-row { @apply border-slate-100; }
  :root:not(.dark) .meta-row-label { @apply text-slate-500; }
  :root:not(.dark) .meta-row-value { @apply text-slate-800; }

  /* Floating bar */
  .floating-bar {
    @apply fixed bottom-6 left-1/2 -translate-x-1/2 z-50
           bg-slate-900/90 backdrop-blur-md border border-cyan-500/20
           rounded-xl shadow-glow-cyan px-6 py-3
           flex items-center gap-4;
  }

  /* Tree connectors */
  .tree-connector { @apply relative; }
  .tree-connector::before {
    content: '';
    @apply absolute left-4 top-0 bottom-0 w-px bg-cyan-500/10;
  }
  .tree-connector-row { @apply relative; }
  .tree-connector-row::before {
    content: '';
    @apply absolute left-4 top-1/2 w-4 h-px bg-cyan-500/10;
  }

  /* Form section header */
  .form-section-header {
    @apply text-xs uppercase tracking-widest text-cyan-500/50 font-medium
           border-b border-cyan-500/10 pb-2 mb-4;
  }

  /* HUD corners (for KPI cards) */
  .hud-corners {
    @apply relative;
  }
  .hud-corners::before,
  .hud-corners::after {
    content: '';
    @apply absolute w-3 h-3;
    border-color: rgba(6,182,212,0.3);
  }
  .hud-corners::before {
    @apply -top-px -left-px;
    border-top: 2px solid;
    border-left: 2px solid;
  }
  .hud-corners::after {
    @apply -bottom-px -right-px;
    border-bottom: 2px solid;
    border-right: 2px solid;
  }
}

@layer utilities {
  /* Text gradient */
  .text-gradient {
    @apply bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-400;
  }

  /* Background grid pattern */
  .bg-grid-pattern {
    background-image:
      linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(6,182,212,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
  }

  /* Glow text */
  .glow-text {
    text-shadow: 0 0 20px rgba(6,182,212,0.4);
  }

  /* Scrollbar */
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  .scrollbar-hide::-webkit-scrollbar { display: none; }

  /* Gantt SVG animation */
  .animate-draw-line { stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: draw-line 0.5s ease-out forwards; }
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Global styles */
body {
  @apply font-sans antialiased;
}
```

**Step 2:** Visually verify the dev server renders with new styles. Check that existing pages still load (may look broken with old component classes — expected, will be fixed in later tasks).

**Step 3:** Commit: `style: replace glassmorphism CSS with JARVIS design system classes`

---

## Phase 1B: HUD Component Library

### Task 3B: Upgrade neon glow system and add HUD CSS classes

**Files:**
- Modify: `client/tailwind.config.js`
- Modify: `client/src/styles/index.css`

**Step 1:** In tailwind.config.js, replace single-layer glow shadows with multi-layer neon:

```js
boxShadow: {
  'neon-cyan': '0 0 5px rgba(6,182,212,0.4), 0 0 15px rgba(6,182,212,0.25), 0 0 40px rgba(6,182,212,0.15), inset 0 0 15px rgba(6,182,212,0.05)',
  'neon-cyan-strong': '0 0 5px rgba(6,182,212,0.5), 0 0 20px rgba(6,182,212,0.35), 0 0 60px rgba(6,182,212,0.2), inset 0 0 20px rgba(6,182,212,0.08)',
  'neon-red': '0 0 5px rgba(239,68,68,0.4), 0 0 15px rgba(239,68,68,0.25), 0 0 40px rgba(239,68,68,0.15)',
  'neon-amber': '0 0 5px rgba(251,191,36,0.4), 0 0 15px rgba(251,191,36,0.25), 0 0 40px rgba(251,191,36,0.15)',
  'neon-btn': '0 0 5px rgba(6,182,212,0.3), 0 0 15px rgba(6,182,212,0.2), 0 0 30px rgba(6,182,212,0.1)',
  'neon-input': '0 0 5px rgba(6,182,212,0.3), 0 0 15px rgba(6,182,212,0.2), inset 0 0 10px rgba(6,182,212,0.05)',
  // Keep old names as aliases for backward compat during migration
  'glow-cyan': '0 0 5px rgba(6,182,212,0.4), 0 0 15px rgba(6,182,212,0.25), 0 0 40px rgba(6,182,212,0.15), inset 0 0 15px rgba(6,182,212,0.05)',
  'glow-cyan-lg': '0 0 5px rgba(6,182,212,0.5), 0 0 20px rgba(6,182,212,0.35), 0 0 60px rgba(6,182,212,0.2), inset 0 0 20px rgba(6,182,212,0.08)',
  'glow-red': '0 0 5px rgba(239,68,68,0.4), 0 0 15px rgba(239,68,68,0.25), 0 0 40px rgba(239,68,68,0.15)',
  'glow-amber': '0 0 5px rgba(251,191,36,0.4), 0 0 15px rgba(251,191,36,0.25), 0 0 40px rgba(251,191,36,0.15)',
  'glow-cyan-btn': '0 0 5px rgba(6,182,212,0.3), 0 0 15px rgba(6,182,212,0.2), 0 0 30px rgba(6,182,212,0.1)',
  'glow-cyan-input': '0 0 5px rgba(6,182,212,0.3), 0 0 15px rgba(6,182,212,0.2), inset 0 0 10px rgba(6,182,212,0.05)',
},
```

**Step 2:** Add new keyframe `ring-spin` for HudStatusRing:
```js
'ring-spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
```
And animation: `'ring-spin': 'ring-spin 8s linear infinite'`

**Step 3:** In index.css, add all HUD CSS classes from design doc §2.5 (clip-path frames, brackets, panel headers, dividers, scan overlay, targeting, neon-text):

Add after the existing `.hud-corners` block:
- `.hud-frame`, `.hud-frame-lg`, `.hud-frame-accent` (clip-path octagonal frames with inner border pseudo)
- `.hud-brackets`, `.hud-brackets-inner` (4-corner L-brackets)
- `.hud-panel-header` (angular header bar with extending line: ■ TITLE ─────)
- `.hud-divider`, `.hud-divider-label` (tick-mark separators)
- `.hud-scan` (ambient scan line overlay, 4s loop)
- `.hud-target` (targeting crosshair overlay on hover)
- `.neon-text` (multi-layer text-shadow)

See design doc §2.5 for exact CSS.

**Step 4:** Update `.btn-primary` to use `shadow-neon-btn` instead of `shadow-glow-cyan-btn`. Update `.card-hover:hover` to use `shadow-neon-cyan`. Update `.input:focus` to use `shadow-neon-input`.

**Step 5:** Verify dev server compiles, no CSS errors.

**Step 6:** Commit: `feat: add HUD frame system — clip-paths, neon glow, brackets, panel headers, dividers`

---

### Task 3C: Create HudGauge component (circular SVG gauge)

**Files:**
- Create: `client/src/components/ui/HudGauge.tsx`

**Step 1:** Build SVG circular gauge component:

```tsx
interface HudGaugeProps {
  value: number;        // 0-100
  size?: number;        // px, default 80
  strokeWidth?: number; // default 4
  color?: 'cyan' | 'amber' | 'red' | 'emerald';
  label?: string;
  showValue?: boolean;  // show number in center, default true
}
```

SVG structure:
- Background circle: dashed stroke (`stroke-dasharray: 4 2`), `rgba(6,182,212,0.1)`
- 12 tick marks: radial lines at 30° intervals around the circle
- Value arc: solid stroke with `stroke-dashoffset` calculated from value, cyan gradient via `<linearGradient>`, `filter: drop-shadow(0 0 6px rgba(6,182,212,0.4))`
- Center text: value in `font-mono font-bold` with neon-text shadow
- Label below: `text-xs uppercase tracking-widest`
- Animation: arc reveals via CSS transition on `stroke-dashoffset` (0.8s ease-out)

Color map: cyan=`#06b6d4`, amber=`#fbbf24`, red=`#f87171`, emerald=`#34d399`

**Step 2:** Verify renders correctly with various values (0, 50, 78, 100).

**Step 3:** Commit: `feat: add HudGauge circular SVG component`

---

### Task 3D: Create HudProgressBar component (segmented bar)

**Files:**
- Create: `client/src/components/ui/HudProgressBar.tsx`

**Step 1:** Build segmented progress bar:

```tsx
interface HudProgressBarProps {
  value: number;        // 0-100
  segments?: number;    // default 10
  color?: 'cyan' | 'amber' | 'red' | 'emerald';
  showLabel?: boolean;  // show % text, default false
  size?: 'sm' | 'md';  // sm=h-1.5, md=h-3
  animate?: boolean;    // stagger reveal on mount, default true
}
```

Renders N `<div>` segments in a flex row with `gap-[2px]`:
- Active segments: `bg-{color}-400` + individual `box-shadow: 0 0 6px rgba(color, 0.4)` glow
- Inactive segments: `bg-slate-700/30`
- Each segment: `rounded-sm flex-1 transition-all duration-200`
- Animation: if `animate`, each active segment fades in with stagger delay (50ms each) using inline `animationDelay`
- Label: optional `font-mono text-xs text-{color}-400` to the right

**Step 2:** Verify with values 0, 30, 65, 100.

**Step 3:** Commit: `feat: add HudProgressBar segmented component`

---

### Task 3E: Create HudStatusRing component (pulsing SVG ring)

**Files:**
- Create: `client/src/components/ui/HudStatusRing.tsx`

**Step 1:** Build SVG status ring:

```tsx
interface HudStatusRingProps {
  status: 'active' | 'warning' | 'danger' | 'idle';
  size?: number;  // default 14
  pulse?: boolean; // default true for active/danger
}
```

SVG structure:
- Center dot: `r=2`, filled with status color
- Outer ring: `r=5`, `stroke-dasharray="8 4"`, rotates via `animate-ring-spin` (8s)
- Pulse effect: ring opacity oscillates via `animate-glow-pulse` (2s)
- Glow filter: `drop-shadow` matching status color
- Status colors: active=cyan, warning=amber, danger=red, idle=slate

**Step 2:** Verify all 4 status states render correctly.

**Step 3:** Commit: `feat: add HudStatusRing pulsing SVG component`

---

### Task 3F: Create HudPanelHeader and HudDivider wrapper components

**Files:**
- Create: `client/src/components/ui/HudPanelHeader.tsx`
- Create: `client/src/components/ui/HudDivider.tsx`

**Step 1:** HudPanelHeader — thin React wrapper for the `.hud-panel-header` CSS class:

```tsx
interface HudPanelHeaderProps {
  title: string;
  action?: React.ReactNode; // optional right-side action (button, link)
}
// Renders: <div className="hud-panel-header"><span>{title}</span>{action}</div>
```

**Step 2:** HudDivider — wrapper for `.hud-divider` / `.hud-divider-label`:

```tsx
interface HudDividerProps {
  label?: string;
}
// If label: renders div.hud-divider-label with label text
// If no label: renders div.hud-divider
```

**Step 3:** Commit: `feat: add HudPanelHeader and HudDivider wrapper components`

---

### Task 3G: Create barrel export for HUD components

**Files:**
- Create: `client/src/components/ui/hud/index.ts`

**Step 1:** Re-export all HUD components from a single entry point:

```tsx
export { HudGauge } from '../HudGauge';
export { HudProgressBar } from '../HudProgressBar';
export { HudStatusRing } from '../HudStatusRing';
export { HudPanelHeader } from '../HudPanelHeader';
export { HudDivider } from '../HudDivider';
```

(Or move the HUD components into `client/src/components/ui/hud/` subfolder if preferred.)

**Step 2:** Commit: `feat: add HUD components barrel export`

---

## Phase 2: Layout Shell (Sidebar, Header, DashboardLayout)

### Task 4: Rewrite Sidebar — compact with collapsible groups

**Files:**
- Modify: `client/src/components/layout/Sidebar.tsx` (210 lines → ~280 lines)

**Step 1:** Restructure navigation items:

**Primary group** (always visible, no label): La Mia Giornata, Dashboard, Progetti, Task, Calendario, Tempo (single entry)

**Collapsible groups** (persisted to localStorage key `sidebar-collapsed`):
- "Gestione": Segnalazioni, Rischi, Documenti
- "Analisi": Pianificazione, Analytics, Report Settimanale
- "Amministrazione": all admin items (Utenti, Reparti, Template, etc.)

**Bottom section**: Notifiche (with badge counter) + User info

**Remove from nav items**: Kanban (`/kanban`), Gantt (`/gantt`) — these become task list views.

**Unify "Tempo"**: Single nav item. Route to `/time-tracking` for dipendente, `/team-time` for direzione/admin (or always `/time-tracking` and role-switch internally).

**Add search input**: Below the logo, `<input>` that opens the existing CommandPalette (call `useSearchStore().openSearch()`).

**Styling changes**:
- Container: `bg-slate-950/90 backdrop-blur-md border-r border-cyan-500/10` (remove glassmorphism)
- Logo: `text-cyan-400 font-semibold` (remove `text-gradient` for now, or keep but with cyan palette)
- Active: `bg-cyan-500/10 border-l-2 border-cyan-500 text-cyan-400`
- Hover: `bg-cyan-500/5 text-slate-200`
- Section headers: `text-xs uppercase tracking-widest text-cyan-500/50 font-medium`
- Collapsible chevron: rotate 90° on open, smooth transition
- Badge on Notifiche: `bg-cyan-500 text-white text-xs rounded-full px-1.5 animate-badge-bounce` (on change)

**Step 2:** Add localStorage persistence for collapsed groups:
```tsx
const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
  try {
    return JSON.parse(localStorage.getItem('sidebar-collapsed') || '{}');
  } catch { return {}; }
});
const toggleGroup = (group: string) => {
  setCollapsedGroups(prev => {
    const next = { ...prev, [group]: !prev[group] };
    localStorage.setItem('sidebar-collapsed', JSON.stringify(next));
    return next;
  });
};
```

**Step 3:** Import `useNotificationStore` for unread count badge.

**Step 4:** Verify: sidebar renders with new structure, collapsible groups work, active state correct, mobile drawer still works.

**Step 5:** Commit: `feat: redesign sidebar with collapsible groups and JARVIS styling`

---

### Task 5: Rewrite Header — minimal with breadcrumb

**Files:**
- Modify: `client/src/components/layout/Header.tsx` (119 lines → ~80 lines)

**Step 1:** Strip header to 3 zones:

- **Left**: Breadcrumb (mobile: hamburger + breadcrumb)
- **Center**: Running timer (if active) — compact pill
- **Right**: Dark/light toggle only

**Remove from header**: NotificationBell, SearchButton, Logout button (all moved to sidebar).

**Step 2:** Build breadcrumb from `useLocation()` + route config. Map path segments to human-readable names:
```tsx
const pathLabels: Record<string, string> = {
  'projects': 'Progetti',
  'tasks': 'Task',
  'time-tracking': 'Registra Tempo',
  'team-time': 'Tempo Team',
  'kanban': 'Kanban',
  'gantt': 'Gantt',
  'calendar': 'Calendario',
  'risks': 'Rischi',
  'documents': 'Documenti',
  'inputs': 'Segnalazioni',
  'planning': 'Pianificazione',
  'analytics': 'Analytics',
  'reports': 'Report',
  'weekly': 'Settimanale',
  'notifications': 'Notifiche',
  'users': 'Utenti',
  'admin': 'Amministrazione',
  'departments': 'Reparti',
  'templates': 'Template',
  'custom-fields': 'Campi Custom',
  'import': 'Import / Export',
  'workflows': 'Workflow',
  'automations': 'Automazioni',
  'audit': 'Registro Audit',
  'profile': 'Profilo',
  'my-day': 'La Mia Giornata',
  'dashboard': 'Dashboard',
  'new': 'Nuovo',
  'edit': 'Modifica',
};
```

For dynamic segments (`:id`), fetch the entity name. For project IDs, show the project name (from the store or a lightweight fetch). For task IDs, show the task title.

**Step 3:** Style header: `bg-slate-950/80 backdrop-blur-md border-b border-cyan-500/10 h-14`

**Step 4:** Timer indicator (if running): `bg-red-500/10 border border-red-500/30 rounded-full px-3 py-1 text-xs font-mono text-red-400` with pulse dot.

**Step 5:** Verify: header renders, breadcrumb updates on navigation, timer shows when running.

**Step 6:** Commit: `feat: redesign header with breadcrumb and minimal controls`

---

### Task 6: Update DashboardLayout — JARVIS background

**Files:**
- Modify: `client/src/components/layout/DashboardLayout.tsx` (155 lines)

**Step 1:** Change background classes:
- From: `min-h-screen bg-surface-100 dark:bg-surface-900`
- To: `min-h-screen bg-slate-50 dark:bg-slate-950 dark:bg-grid-pattern`

**Step 2:** Update sidebar width reference if changed (currently `lg:pl-64`, sidebar is `w-64`). Change to `lg:pl-60` if sidebar now 240px, or keep `lg:pl-64` if 256px.

**Step 3:** Keep all socket/notification/shortcut logic unchanged.

**Step 4:** Verify: pages render with new background, grid pattern visible in dark mode.

**Step 5:** Commit: `style: update DashboardLayout with JARVIS background`

---

### Task 7: Update PageTransition animation

**Files:**
- Find and modify the `PageTransition` component (likely in `client/src/components/layout/` or `client/src/components/common/`)

**Step 1:** Change animation from current fade/slide to `page-enter` (slide-in from right + fade):

```tsx
const variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.15, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};
```

**Step 2:** Verify: page transitions are smooth and fast (150ms).

**Step 3:** Commit: `style: update page transition to JARVIS slide-in animation`

---

## Phase 3: Dashboard Redesign

### Task 8: Create JARVIS KPI card component

**Files:**
- Create: `client/src/components/dashboard/KPICard.tsx`

**Step 1:** Build a reusable KPI card with:
- Props: `value: number`, `label: string`, `trend?: { value: number, direction: 'up'|'down' }`, `color: 'cyan'|'amber'|'red'|'indigo'`, `onClick?: () => void`, `delay?: number`
- Displays: number in `font-mono text-3xl font-bold` with `glow-text`, label in `text-xs uppercase tracking-widest`, optional trend arrow
- HUD corners (`hud-corners` class)
- `card-power-on` animation with `animation-delay: ${delay}ms`
- Click handler for filterable KPIs
- Color-coded: cyan default, amber for warning, red for critical with `glow-red` shadow

**Step 2:** Verify: renders correctly in isolation.

**Step 3:** Commit: `feat: add KPICard component with HUD corners and power-on animation`

---

### Task 9: Rewrite Dashboard — direzione layout

**Files:**
- Modify: `client/src/pages/dipendente/DashboardPage.tsx` (421 lines)

**Step 1:** For the `isDirezione` branch, replace the current widget system with fixed layout:

**Zone 1 — Greeting + KPI row**:
```tsx
<div className="animate-section-reveal">
  <p className="text-lg text-slate-400">Buongiorno, <span className="text-cyan-400 font-semibold">{user.firstName}</span>.</p>
  <p className="text-xs text-slate-500 mt-1">{format(new Date(), 'EEEE d MMMM yyyy', { locale: it })}</p>
</div>
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
  <KPICard value={activeProjects} label="Progetti attivi" color="cyan" delay={0} />
  <KPICard value={atRiskCount} label="A rischio" color="amber" delay={100} onClick={...} />
  <KPICard value={criticalCount} label="Critici" color="red" delay={200} onClick={...} />
  <KPICard value={teamUtilization} label="Utilizzo team" color="indigo" delay={300} />
</div>
```

**Zone 2 — Attention section** (reuse `AttentionSection` but with JARVIS styling):
- Add `alert-border-pulse` on each alert row
- Each row shows **project name** (not code) + problem description
- Auto-hides when empty

**Zone 3 — Projects table**:
```tsx
<div className="card mt-6 animate-section-reveal" style={{ animationDelay: '200ms' }}>
  <table className="w-full">
    <thead>
      <tr className="text-xs uppercase tracking-widest text-cyan-500/50 text-left">
        <th className="pb-3 font-medium">Progetto</th>
        <th className="pb-3 font-medium">Stato</th>
        <th className="pb-3 font-medium">Progresso</th>
        <th className="pb-3 font-medium">Scadenza</th>
      </tr>
    </thead>
    <tbody>
      {projects.map((p, i) => (
        <tr key={p.id} className="border-t border-cyan-500/5 hover:bg-cyan-500/5 cursor-pointer animate-fade-in-stagger"
            style={{ animationDelay: `${i * 30}ms` }}
            onClick={() => navigate(`/projects/${p.id}`)}>
          <td className="py-3 text-sm text-slate-200">{p.name}</td>
          <td className="py-3"><StatusBadge status={p.health} /></td>
          <td className="py-3"><ProgressBar value={p.progress} className="w-24" /></td>
          <td className="py-3 text-sm text-slate-400">{format(p.targetEndDate, 'dd MMM')}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**Remove**: DashboardCustomizer, `useDashboardLayoutStore`, DeliveryOutlookSection, TeamPerformanceSection, ProjectHealthSection (from dashboard — move to Analytics), recent_tasks section.

**Step 2:** Verify: direzione dashboard renders with 3 zones, KPI cards animate on load.

**Step 3:** Commit: `feat: redesign direzione dashboard with KPI cards and projects table`

---

### Task 10: Rewrite Dashboard — dipendente layout

**Files:**
- Modify: `client/src/pages/dipendente/DashboardPage.tsx` (same file)

**Step 1:** For the `!isDirezione` branch, replace with fixed layout:

**Zone 1 — Greeting + hours inline**:
```tsx
<div className="flex items-center justify-between animate-section-reveal">
  <div>
    <p className="text-lg text-slate-400">Buongiorno, <span className="text-cyan-400 font-semibold">{user.firstName}</span>.</p>
  </div>
  <div className="flex items-center gap-2 text-sm text-slate-400">
    <Clock className="w-4 h-4" />
    <span className="font-mono text-cyan-400">{hoursToday}</span>
    <span>/ {dailyTarget}h oggi</span>
  </div>
</div>
```

**Zone 2 — "Oggi"** (tasks due today or overdue):
```tsx
<div className="card mt-6 animate-section-reveal" style={{ animationDelay: '100ms' }}>
  <h3 className="text-xs uppercase tracking-widest text-cyan-500/50 font-medium mb-3">Oggi</h3>
  {todayTasks.map((task, i) => (
    <TaskRow key={task.id} task={task} delay={i * 30} showTimer />
  ))}
</div>
```

Each `TaskRow`: priority dot | 🔄 (if recurring) | task name (link) | project name (gray) | timer button

**Zone 3 — "Prossimi giorni"** (next 3-5 days):
- Same structure, but with due date instead of timer
- Task ricorrenti con icona 🔄

**Zone 4 — Timer attivo** (conditional):
```tsx
{runningTimer && (
  <div className="card mt-6 border-cyan-500/20 animate-glow-pulse">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-400">{runningTimer.task?.title}</p>
        <p className="font-mono text-2xl text-cyan-400 glow-text mt-1">
          {hours}<span className="animate-timer-tick">:</span>{minutes}<span className="animate-timer-tick">:</span>{seconds}
        </p>
      </div>
      <button onClick={stopTimer} className="btn-primary bg-red-600 hover:bg-red-500">Ferma</button>
    </div>
  </div>
)}
```

**Zone 5 — Weekly summary** (compact 1 row):
- Mini bar chart Mon-Fri + total/target

**Step 2:** Remove FocusTodaySection component usage (replace with inline code or a new simpler component).

**Step 3:** Verify: dipendente dashboard renders with all zones, timer animates.

**Step 4:** Commit: `feat: redesign dipendente dashboard with focused task layout`

---

### Task 11: Move analytics widgets to AnalyticsPage

**Files:**
- Modify: `client/src/pages/analytics/AnalyticsPage.tsx`

**Step 1:** Add DeliveryOutlookSection and TeamPerformanceSection to the AnalyticsPage (they were removed from dashboard).

**Step 2:** Import the components and add them as sections in the analytics page.

**Step 3:** Verify: DeliveryOutlook and TeamPerformance render on AnalyticsPage.

**Step 4:** Commit: `refactor: move delivery outlook and team performance to analytics page`

---

## Phase 4: List Pages

### Task 12: Restructure TaskListPage filters and add view modes

**Files:**
- Modify: `client/src/pages/tasks/TaskListPage.tsx` (842 lines)
- Modify: `client/src/components/tasks/TaskListViewFilters.tsx` (218 lines)

**Step 1:** In TaskListViewFilters, expand viewMode to `'list'|'tree'|'table'|'kanban'|'gantt'|'calendar'`. Add icons: LayoutGrid (kanban), GanttChartSquare (gantt), CalendarDays (calendar) to the segmented control.

**Step 2:** Add `?view=` URL query param sync in TaskListPage:
```tsx
const [searchParams, setSearchParams] = useSearchParams();
const viewFromUrl = searchParams.get('view') as ViewMode | null;
const [viewMode, setViewMode] = useState<ViewMode>(viewFromUrl || 'list');
useEffect(() => {
  if (viewFromUrl && viewFromUrl !== viewMode) setViewMode(viewFromUrl);
}, [viewFromUrl]);
const handleViewChange = (mode: ViewMode) => {
  setViewMode(mode);
  setSearchParams(prev => { prev.set('view', mode); return prev; });
};
```

**Step 3:** Remove stat pills entirely. Move the count into group section headers: `"In Corso (8)"`.

**Step 4:** Restructure filter bar:
- **Primary** (always visible): Search + Status dropdown + Project dropdown + Assignee dropdown
- **Secondary** (behind "Più filtri" popover/dropdown): Priority, Department, Advanced filter builder, Saved views
- Remove dedicated SavedViewsBar — add as dropdown in secondary area

**Step 5:** Add `fade-in-stagger` animation on task list items:
```tsx
<div
  className="animate-fade-in-stagger"
  style={{ animationDelay: `${index * 30}ms` }}
>
  <TaskListViewItem ... />
</div>
```

**Step 6:** Render Kanban view when `viewMode === 'kanban'`:
- Extract Kanban core logic from KanbanBoardPage into a `<KanbanView tasks={filteredTasks} />` component
- Pass filtered tasks from TaskListPage

**Step 7:** Render Gantt view when `viewMode === 'gantt'`:
- Import and render `<GanttChart />` + `<GanttZoomControls />` components
- Use `useGanttStore.fetchGanttTasks()` when gantt view is active

**Step 8:** Render Calendar view when `viewMode === 'calendar'`:
- Import CalendarGrid/WeekView from calendar components

**Step 9:** Verify: all 6 view modes work, filters apply across views, URL updates.

**Step 10:** Commit: `feat: integrate kanban/gantt/calendar as task list views with unified filters`

---

### Task 13: Add redirect routes for old kanban/gantt paths

**Files:**
- Modify: `client/src/App.tsx` (254 lines)

**Step 1:** Replace Kanban and Gantt route entries:
```tsx
// Old:
// <Route path="/kanban" element={<KanbanBoardPage />} />
// <Route path="/gantt" element={<GanttPage />} />

// New:
<Route path="/kanban" element={<Navigate to="/tasks?view=kanban" replace />} />
<Route path="/gantt" element={<Navigate to="/tasks?view=gantt" replace />} />
```

**Step 2:** Verify: navigating to `/kanban` redirects to `/tasks?view=kanban`.

**Step 3:** Commit: `refactor: redirect old kanban/gantt routes to task list views`

---

### Task 14: Redesign ProjectListPage — table layout

**Files:**
- Modify: `client/src/pages/projects/ProjectListPage.tsx` (330 lines)

**Step 1:** Replace card grid with table:

```tsx
<table className="w-full">
  <thead>
    <tr className="text-xs uppercase tracking-widest text-cyan-500/50 dark:text-cyan-500/50 text-left">
      <th className="pb-3 font-medium">Progetto</th>
      <th className="pb-3 font-medium">Stato</th>
      <th className="pb-3 font-medium">Progresso</th>
      <th className="pb-3 font-medium">Scadenza</th>
    </tr>
  </thead>
  <tbody>
    {projects.map((project, i) => (
      <tr
        key={project.id}
        onClick={() => navigate(`/projects/${project.id}`)}
        className="border-t border-cyan-500/5 dark:border-cyan-500/5 hover:bg-cyan-500/5
                   cursor-pointer transition-colors animate-fade-in-stagger"
        style={{ animationDelay: `${i * 30}ms` }}
      >
        <td className="py-3 text-sm font-medium text-slate-200 dark:text-slate-200">{project.name}</td>
        <td className="py-3"><HealthBadge health={project.health} /></td>
        <td className="py-3"><ProgressBar value={project.progress} className="w-24 h-1.5" /></td>
        <td className="py-3 text-sm text-slate-400">{formatDate(project.targetEndDate)}</td>
      </tr>
    ))}
  </tbody>
</table>
```

**Step 2:** Keep filters (Search + Status + Priority) in same bar pattern.

**Step 3:** Keep EmptyState for zero projects.

**Step 4:** Light mode: update text colors with `dark:` variants where needed.

**Step 5:** Verify: project list renders as table, rows are clickable, animations work.

**Step 6:** Commit: `feat: redesign project list as compact table with JARVIS styling`

---

### Task 15: Update remaining list pages (Risks, Documents, Inputs)

**Files:**
- Modify: `client/src/pages/risks/RiskListPage.tsx`
- Modify: `client/src/pages/documents/DocumentListPage.tsx`
- Modify: `client/src/pages/inputs/UserInputListPage.tsx` (find exact path)

**Step 1:** Apply same table pattern as ProjectListPage. Consistent header, row styling, hover, stagger animation.

**Step 2:** Ensure all show **project names** where applicable (not codes).

**Step 3:** Verify: all list pages render with JARVIS table styling.

**Step 4:** Commit: `style: apply JARVIS table styling to risk, document, and input list pages`

---

## Phase 5: Detail Pages

### Task 16: Rewrite TaskDetailPage — 2-column, no tabs

**Files:**
- Modify: `client/src/pages/tasks/TaskDetailPage.tsx` (961 lines)

**Step 1:** Replace the `TabSection` with vertically scrollable sections in left column:

**Left column (lg:col-span-2)**:
1. Title + priority badge (already inline-editable if using InlineTextInput)
2. WorkflowStepper (compact)
3. Description (collapsible if long)
4. ChecklistSection (if checklist exists)
5. Subtask section (TaskTreeView with parentTaskId)
6. CommentSection

**Right column (lg:col-span-1)**:
- All metadata as inline-editable fields using existing InlineSelect/InlineDatePicker/InlineUserSelect
- Stato, Priorità, Assegnato a, Progetto (**nome**), Scadenza, Ore, Ricorrenza (🔄), Tag, Reparto, Custom fields
- Timer button (▶ / ■)
- Collapsible sections: Allegati (AttachmentSection), Note (NoteSection), Attività (ActivityFeed)

**Step 2:** Remove `TabSection` import and usage. Import CollapsibleSection for sidebar sections.

**Step 3:** Add `section-reveal` animation to each section with stagger delay.

**Step 4:** Ensure breadcrumb shows: `Progetti > {projectName} > {taskTitle}` (project name, not code).

**Step 5:** Verify: all information previously in tabs is now visible by scrolling. Inline edits work. Comments section functional.

**Step 6:** Commit: `feat: redesign task detail with 2-column layout and no tabs`

---

### Task 17: Rewrite ProjectDetailPage — 2-column, no tabs

**Files:**
- Modify: `client/src/pages/projects/ProjectDetailPage.tsx` (443 lines)

**Step 1:** Replace vertical single-column with 2-column grid:

**Left column (lg:col-span-2)**:
1. Project name + description
2. Progress summary (bar + inline counts)
3. TaskTreeView (compact, for this project)
4. CommentSection (if available) or NoteSection

**Right column (lg:col-span-1)**:
- Stato, Priorità, Owner, Date (inizio → fine), Budget (barra), Membri (lista + Invita)
- Collapsible: Allegati, Note, Link rapidi (Rischi, Documenti, Tempo, Gantt)

**Step 2:** Remove `TabSection`, `InfoCard`, standalone `BudgetCard`, `QuickLinksGrid` as separate blocks — integrate into the 2-column layout.

**Step 3:** Ensure project name in breadcrumb and all references (never code).

**Step 4:** Verify: all info accessible by scrolling, members visible without clicking a tab.

**Step 5:** Commit: `feat: redesign project detail with 2-column layout and no tabs`

---

### Task 18: Update other detail pages (Risk, Document, Input)

**Files:**
- Modify: `client/src/pages/risks/RiskDetailPage.tsx`
- Modify: `client/src/pages/documents/DocumentDetailPage.tsx` (find exact path)
- Modify: `client/src/pages/inputs/UserInputDetailPage.tsx`

**Step 1:** Apply same 2-column pattern. Content left, metadata right.

**Step 2:** Apply JARVIS card and text styling.

**Step 3:** Commit: `style: apply JARVIS 2-column layout to risk, document, and input detail pages`

---

## Phase 6: Forms & Modals

### Task 19: Update BaseModal with JARVIS styling

**Files:**
- Modify: `client/src/components/ui/BaseModal.tsx` (179 lines)

**Step 1:** Update overlay: `bg-black/60 backdrop-blur-sm` (from `bg-black/50`).

**Step 2:** Update animation from `scale-in` to `tooltip-origin`:
```tsx
const panelVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.15, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.1 } },
};
```

**Step 3:** Panel class: already uses `.modal-panel` which we updated in Task 3. Verify it picks up the new styles.

**Step 4:** Verify: all existing modals (DeleteConfirmModal, ConfirmDialog, SaveViewModal, BlockedReasonModal, InviteMemberModal, KeyboardShortcutsModal) render with new styling.

**Step 5:** Commit: `style: update BaseModal with JARVIS overlay and animation`

---

### Task 20: Update form pages — progressive disclosure

**Files:**
- Modify: `client/src/pages/tasks/TaskFormPage.tsx`
- Modify: `client/src/pages/projects/ProjectFormPage.tsx`
- Modify: `client/src/pages/risks/RiskFormPage.tsx`

**Step 1:** Restructure TaskFormPage:
- Essential fields always visible: Nome, Progetto (name search), Tipo, Assegnato a, Priorità, Scadenza, Ore stimate, Descrizione
- "Opzioni avanzate" collapsible section: Tag, Reparto, Task padre, Custom fields, Ricorrenza
- 2-column layout for short fields

**Step 2:** Same pattern for ProjectFormPage and RiskFormPage.

**Step 3:** Project dropdown shows **names** with search (verify it doesn't show codes).

**Step 4:** Verify: forms render with JARVIS input styles, collapsible works.

**Step 5:** Commit: `feat: add progressive disclosure to form pages`

---

### Task 21: Update Toast component

**Files:**
- Modify: `client/src/components/ui/Toast.tsx`

**Step 1:** Update toast styling:
- Container: `bg-slate-800 dark:bg-slate-800 border border-cyan-500/20 rounded-lg shadow-glow-cyan`
- Light mode: `bg-white border-slate-200`
- Remove colored left borders
- Icons: use Lucide icons with semantic colors (CheckCircle green, XCircle red, Info cyan, AlertTriangle amber)
- Undo toast: thin `h-0.5 bg-cyan-500` progress bar at bottom

**Step 2:** Verify: toasts appear with new styling, undo countdown works.

**Step 3:** Commit: `style: update toast with JARVIS design`

---

## Phase 7: Component Styling Updates

### Task 22: Update TaskListViewItem colors

**Files:**
- Modify: `client/src/components/tasks/TaskListViewItem.tsx` (208 lines)

**Step 1:** Update color tokens:
- `bg-primary-50` → `bg-cyan-500/10` (selection)
- `text-primary-600` → `text-cyan-400`
- `ring-red-200` → `ring-red-400/30` (overdue)
- Priority border colors: keep semantic but use JARVIS palette

**Step 2:** Show project **name** in project badge (verify it's using `task.project?.name` not `task.project?.code`).

**Step 3:** Add `group` class for hover reveal animations.

**Step 4:** Commit: `style: update TaskListViewItem with JARVIS colors`

---

### Task 23: Update inline edit components

**Files:**
- Modify: `client/src/components/ui/InlineSelect.tsx`
- Modify: `client/src/components/ui/InlineDatePicker.tsx`
- Modify: `client/src/components/ui/InlineUserSelect.tsx`
- Modify: `client/src/components/ui/InlineTextInput.tsx`

**Step 1:** Update all inline components to use JARVIS `.input` styling for their dropdowns/popups.

**Step 2:** Focus states: cyan border + glow.

**Step 3:** Commit: `style: update inline edit components with JARVIS styling`

---

### Task 24: Update common components

**Files:**
- Modify: `client/src/components/common/DetailPageHeader.tsx`
- Modify: `client/src/components/common/CollapsibleSection.tsx`
- Modify: `client/src/components/common/NoteSection.tsx`
- Modify: `client/src/components/common/AttachmentSection.tsx`

**Step 1:** Update DetailPageHeader: `text-2xl font-semibold tracking-tight text-slate-100 dark:text-slate-100`

**Step 2:** Update CollapsibleSection: chevron styling, border colors to cyan/10.

**Step 3:** Update NoteSection and AttachmentSection: card styling, button colors.

**Step 4:** Commit: `style: update common components with JARVIS styling`

---

### Task 25: Update GanttChart and related components

**Files:**
- Modify: `client/src/components/gantt/GanttChart.tsx`
- Modify: `client/src/components/gantt/GanttZoomControls.tsx`
- Modify: `client/src/components/gantt/GanttTodayLine.tsx`
- Modify: `client/src/components/gantt/GanttDependencyLines.tsx`

**Step 1:** Update bar colors to JARVIS palette (cyan for in_progress, emerald for done, red for blocked).

**Step 2:** Update grid lines and header to `border-cyan-500/10`.

**Step 3:** Update zoom controls to use `btn-secondary` styling.

**Step 4:** Commit: `style: update Gantt chart with JARVIS colors`

---

### Task 26: Update calendar components

**Files:**
- Components in `client/src/components/calendar/`

**Step 1:** Update CalendarGrid/WeekView backgrounds, borders, event chip colors to JARVIS palette.

**Step 2:** Commit: `style: update calendar components with JARVIS colors`

---

### Task 27: Update KanbanBoardPage for embedded use

**Files:**
- Modify: `client/src/pages/kanban/KanbanBoardPage.tsx` (732 lines)

**Step 1:** Extract the core Kanban rendering logic into a reusable component that can be used both as standalone page (for backward compat) and as a view within TaskListPage.

**Step 2:** Update column headers, card styles, drag overlay to JARVIS palette.

**Step 3:** Commit: `refactor: extract kanban core as reusable view with JARVIS styling`

---

### Task 28: Update remaining pages with JARVIS styling

**Files:**
- Modify: `client/src/pages/time-tracking/TimeTrackingPage.tsx`
- Modify: `client/src/pages/time-tracking/TeamTimePage.tsx`
- Modify: `client/src/pages/time-tracking/TimeEntryFormModal.tsx`
- Modify: `client/src/pages/time-tracking/TimeEntryDetailModal.tsx`
- Modify: `client/src/pages/analytics/AnalyticsPage.tsx`
- Modify: `client/src/pages/reports/WeeklyReportPage.tsx`
- Modify: `client/src/pages/admin/` (all admin pages)
- Modify: `client/src/pages/notifications/NotificationCenterPage.tsx`
- Modify: `client/src/pages/auth/LoginPage.tsx` (if exists)

**Step 1:** Apply JARVIS card, table, input, button styling to all remaining pages. This is primarily class name updates.

**Step 2:** Ensure text colors use `text-slate-100 dark:text-slate-100` for primary, `text-slate-400` for secondary.

**Step 3:** Ensure all references to projects show **names**, never codes.

**Step 4:** Commit: `style: apply JARVIS styling to all remaining pages`

---

## Phase 8: Cleanup & Polish

### Task 29: Remove deprecated code

**Files:**
- Modify: `client/src/stores/dashboardLayoutStore.ts` — deprecate or keep minimal (remove widget customization logic, keep only as stub if imported elsewhere)
- Delete or stub: `DashboardCustomizer` component (find path)
- Remove stat pills rendering from TaskListPage (if not already done in Task 12)
- Remove old animation keyframes/classes not used anymore from tailwind config

**Step 1:** Search for all imports of `dashboardLayoutStore` and `DashboardCustomizer`. Remove or replace.

**Step 2:** Verify no runtime errors from removed imports.

**Step 3:** Commit: `refactor: remove deprecated dashboard customizer and layout store`

---

### Task 30: Final visual audit and polish

**Files:** All modified files

**Step 1:** Walk through every page in the app (both dark and light mode) and verify:
- [ ] JARVIS colors applied consistently
- [ ] No glassmorphism remnants (no `bg-white/70`, `backdrop-blur-xl` on cards)
- [ ] Typography hierarchy correct (titles large, labels small uppercase)
- [ ] Project names shown everywhere (never codes)
- [ ] Animations work (stagger, power-on, scan-line, timer-tick)
- [ ] Mobile responsive (sidebar collapses, 2-column → single column)
- [ ] Light mode looks like "JARVIS diurno" (cyan accents on white/slate-50)
- [ ] `prefers-reduced-motion` disables animations
- [ ] No console errors

**Step 2:** Fix any issues found.

**Step 3:** Commit: `style: final JARVIS visual polish and consistency fixes`

---

## Dependency Graph

```
Phase 1 (Tasks 1-3): Design System Foundation
  └─→ Phase 1B (Tasks 3B-3G): HUD Component Library
       └─→ Phase 2 (Tasks 4-7): Layout Shell
            └─→ Phase 3 (Tasks 8-11): Dashboard (uses HUD components)
            └─→ Phase 4 (Tasks 12-15): List Pages
            └─→ Phase 5 (Tasks 16-18): Detail Pages (uses HUD components)
            └─→ Phase 6 (Tasks 19-21): Forms & Modals
                 └─→ Phase 7 (Tasks 22-28): Component Updates
                      └─→ Phase 8 (Tasks 29-30): Cleanup
```

Phase 1 → Phase 1B must complete first (HUD components needed by dashboard and detail pages).
Phases 2-6 depend on Phase 1+1B but are largely independent of each other.
Phase 7 depends on all earlier phases. Phase 8 is final.

**HUD intensity per object type** (see design doc §13):
- Tasks 8-9 (Dashboard KPI): Level 1 — `hud-frame-lg` + `HudGauge` + `neon-cyan-strong` + `hud-scan` + `hud-brackets`
- Tasks 14 (Project list): Level 2 — `HudProgressBar` segmented + `hud-panel-header`
- Tasks 16-17 (Detail pages): Level 2/3 — `hud-frame` on sidebar cards + `HudProgressBar` + `HudStatusRing` + `hud-panel-header` + `hud-divider`
- Tasks 22 (Task list items): Level 4 — standard `rounded-lg` + glow on hover only

---

## Estimated scope

- **36 tasks** across 9 phases (8 original + 1B HUD library)
- **~25 files** with major changes
- **5 new HUD components** (HudGauge, HudProgressBar, HudStatusRing, HudPanelHeader, HudDivider)
- **~30 files** with styling updates
- **0 backend changes** required
- **0 database changes** required
