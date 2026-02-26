# Multi-Theme System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a 3-theme system (TECH-HUD, BASIC, CLASSIC) with independent dark/light mode, using CSS Custom Properties so React components need zero changes.

**Architecture:** CSS Custom Properties on `<html data-theme="...">` define all design tokens. The existing `index.css` component classes (`.card`, `.btn-primary`, `.input`, etc.) are refactored to reference `var(--token)` instead of hardcoded values. Theme store gains a `themeStyle` property. HUD decorations render conditionally via `[data-theme="tech-hud"]` CSS selectors.

**Tech Stack:** CSS Custom Properties, Tailwind CSS (class-based dark mode), Zustand (themeStore), React (ProfilePage theme selector)

**Design doc:** `docs/plans/2026-02-26-multi-theme-system-design.md`

---

## Phase 1: Foundation (Theme Store + CSS Variables)

### Task 1: Extend themeStore with themeStyle

**Files:**
- Modify: `client/src/stores/themeStore.ts`

**Step 1: Add ThemeStyle type and store properties**

Replace the entire file with:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@services/api'

type Theme = 'light' | 'dark' | 'system'
type ThemeStyle = 'tech-hud' | 'basic' | 'classic'

interface ThemeState {
  theme: Theme
  themeStyle: ThemeStyle
  setTheme: (theme: Theme, saveToBackend?: boolean) => void
  setThemeStyle: (style: ThemeStyle, saveToBackend?: boolean) => void
  initializeFromUser: (userTheme?: Theme, userThemeStyle?: ThemeStyle) => void
}

function applyTheme(theme: Theme) {
  const html = document.documentElement
  if (theme === 'dark') {
    html.classList.add('dark')
    html.classList.remove('light')
  } else if (theme === 'light') {
    html.classList.remove('dark')
    html.classList.add('light')
  } else {
    // System preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      html.classList.add('dark')
      html.classList.remove('light')
    } else {
      html.classList.remove('dark')
      html.classList.add('light')
    }
  }
}

function applyThemeStyle(style: ThemeStyle) {
  document.documentElement.setAttribute('data-theme', style)
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      themeStyle: 'tech-hud',

      setTheme: (theme, saveToBackend = true) => {
        set({ theme })
        applyTheme(theme)

        if (saveToBackend) {
          api.patch('/users/me/theme', { theme }).catch(() => {
            // silently ignore
          })
        }
      },

      setThemeStyle: (themeStyle, saveToBackend = true) => {
        set({ themeStyle })
        applyThemeStyle(themeStyle)

        if (saveToBackend) {
          api.patch('/users/me/theme', { themeStyle }).catch(() => {
            // silently ignore
          })
        }
      },

      initializeFromUser: (userTheme, userThemeStyle) => {
        const theme = userTheme || get().theme
        const themeStyle = userThemeStyle || get().themeStyle
        set({ theme, themeStyle })
        applyTheme(theme)
        applyThemeStyle(themeStyle)
      },
    }),
    {
      name: 'theme-storage',
      version: 2,
    }
  )
)
```

**Key changes:**
- `ThemeStyle` type: `'tech-hud' | 'basic' | 'classic'`
- `themeStyle` default: `'tech-hud'` (preserves current look)
- `applyTheme()` now also sets `light` class (needed for CSS variable selectors)
- `applyThemeStyle()` sets `data-theme` attribute
- `initializeFromUser()` accepts both theme and themeStyle
- `version: 2` on persist to handle migration

**Step 2: Verify store compiles**

Run: `cd client && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors in themeStore.ts

**Step 3: Commit**

```bash
git add client/src/stores/themeStore.ts
git commit -m "feat(theme): extend themeStore with themeStyle for multi-theme support"
```

---

### Task 2: Add `light` class to HTML and `data-theme` default

**Files:**
- Modify: `client/index.html`
- Modify: `client/src/App.tsx` (if theme initialization happens there)

**Step 1: Set default attributes in index.html**

In `client/index.html`, change the `<html>` tag:

```html
<html lang="it" data-theme="tech-hud" class="dark">
```

This ensures the correct theme is applied even before React hydrates.

**Step 2: Commit**

```bash
git add client/index.html
git commit -m "feat(theme): set default data-theme attribute on html element"
```

---

### Task 3: Create CSS Custom Property definitions for all 6 theme combinations

**Files:**
- Create: `client/src/styles/themes.css`

**Step 1: Create the theme variables file**

Create `client/src/styles/themes.css` with all 6 theme×mode combinations. This file defines ~45 CSS custom properties per combination.

```css
/* ============================================================
   MULTI-THEME SYSTEM — CSS Custom Properties
   3 themes × 2 modes = 6 combinations
   ============================================================ */

/* ----------------------------------------------------------
   TECH-HUD (JARVIS) — Dark (default)
   ---------------------------------------------------------- */
[data-theme="tech-hud"].dark {
  /* Surfaces */
  --bg-app: #0a0f1a;
  --bg-card: rgba(15, 23, 42, 0.7);
  --bg-card-hover: rgba(15, 23, 42, 0.85);
  --bg-sidebar: rgba(2, 6, 23, 0.9);
  --bg-header: rgba(2, 6, 23, 0.8);
  --bg-input: rgba(30, 41, 59, 0.5);
  --bg-modal-overlay: rgba(0, 0, 0, 0.7);
  --bg-tooltip: #1e293b;
  --bg-hover: rgba(6, 182, 212, 0.05);
  --bg-selected: rgba(6, 182, 212, 0.1);
  --bg-disabled: rgba(30, 41, 59, 0.3);

  /* Borders */
  --border-default: rgba(6, 182, 212, 0.15);
  --border-card: rgba(6, 182, 212, 0.25);
  --border-input: rgba(6, 182, 212, 0.2);
  --border-input-focus: rgba(6, 182, 212, 0.5);
  --border-active: #06b6d4;
  --border-sidebar: rgba(6, 182, 212, 0.15);

  /* Text */
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-tertiary: #64748b;
  --text-accent: #06b6d4;
  --text-on-accent: #ffffff;
  --text-heading: #f8fafc;
  --text-label: #94a3b8;

  /* Accent */
  --accent-primary: #06b6d4;
  --accent-primary-hover: #0891b2;
  --accent-primary-bg: rgba(6, 182, 212, 0.1);
  --accent-secondary: #8b5cf6;
  --accent-success: #10b981;
  --accent-warning: #f59e0b;
  --accent-danger: #ef4444;

  /* Shadows */
  --shadow-card: 0 0 20px rgba(6, 182, 212, 0.12), 0 0 40px rgba(6, 182, 212, 0.04);
  --shadow-card-hover: 0 0 5px rgba(6,182,212,0.4), 0 0 15px rgba(6,182,212,0.25), 0 0 40px rgba(6,182,212,0.15), inset 0 0 15px rgba(6,182,212,0.05);
  --shadow-button: 0 0 5px rgba(6,182,212,0.3), 0 0 15px rgba(6,182,212,0.2), 0 0 30px rgba(6,182,212,0.1);
  --shadow-button-hover: 0 0 5px rgba(6,182,212,0.4), 0 0 15px rgba(6,182,212,0.25), 0 0 40px rgba(6,182,212,0.15), inset 0 0 15px rgba(6,182,212,0.05);
  --shadow-modal: 0 0 30px rgba(6,182,212,0.15), 0 0 60px rgba(6,182,212,0.05), 0 25px 50px rgba(0,0,0,0.5);
  --shadow-input-focus: 0 0 5px rgba(6,182,212,0.3), 0 0 15px rgba(6,182,212,0.2), inset 0 0 10px rgba(6,182,212,0.05);
  --shadow-glow: 0 0 12px rgba(6, 182, 212, 0.08);
  --shadow-float: 0 0 5px rgba(6,182,212,0.4), 0 0 15px rgba(6,182,212,0.25), 0 0 40px rgba(6,182,212,0.15);

  /* Typography */
  --font-ui: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
  --font-heading: 'Inter', system-ui, sans-serif;

  /* Shape */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;
  --backdrop-blur: 12px;
  --transition-speed: 200ms;
  --border-width: 1px;

  /* Navigation */
  --nav-item-hover-bg: rgba(6, 182, 212, 0.05);
  --nav-item-active-bg: rgba(6, 182, 212, 0.1);
  --nav-item-active-border: #06b6d4;
  --nav-item-active-shadow: inset 3px 0 12px rgba(6,182,212,0.15), 0 0 12px rgba(6,182,212,0.06);
  --nav-group-label: #64748b;
  --sidebar-logo-effect: 0 0 20px rgba(6,182,212,0.3);

  /* Decorative (TECH-HUD specific) */
  --accent-line-gradient: linear-gradient(90deg, transparent, rgba(6,182,212,0.4), transparent);
  --sidebar-gradient: linear-gradient(180deg, rgba(6,182,212,0.03) 0%, transparent 30%, transparent 70%, rgba(6,182,212,0.02) 100%);
  --sidebar-edge-gradient: linear-gradient(180deg, rgba(6,182,212,0.4), rgba(6,182,212,0.1) 30%, rgba(6,182,212,0.05) 70%, rgba(6,182,212,0.3));
  --header-edge-gradient: linear-gradient(90deg, transparent, rgba(6,182,212,0.3) 20%, rgba(6,182,212,0.5) 50%, rgba(6,182,212,0.3) 80%, transparent);
  --table-header-color: rgba(6,182,212,0.45);
  --tree-connector-color: rgba(6, 182, 212, 0.1);
  --skeleton-scan-color: rgba(6, 182, 212, 0.05);
}

/* ----------------------------------------------------------
   TECH-HUD (JARVIS) — Light
   ---------------------------------------------------------- */
[data-theme="tech-hud"].light {
  --bg-app: #f8fafc;
  --bg-card: #ffffff;
  --bg-card-hover: #f1f5f9;
  --bg-sidebar: #f8fafc;
  --bg-header: rgba(248, 250, 252, 0.9);
  --bg-input: #ffffff;
  --bg-modal-overlay: rgba(0, 0, 0, 0.4);
  --bg-tooltip: #1e293b;
  --bg-hover: #f1f5f9;
  --bg-selected: rgba(6, 182, 212, 0.08);
  --bg-disabled: #f1f5f9;

  --border-default: #e2e8f0;
  --border-card: #e2e8f0;
  --border-input: #cbd5e1;
  --border-input-focus: #06b6d4;
  --border-active: #06b6d4;
  --border-sidebar: #e2e8f0;

  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-tertiary: #94a3b8;
  --text-accent: #0891b2;
  --text-on-accent: #ffffff;
  --text-heading: #0f172a;
  --text-label: #64748b;

  --accent-primary: #0891b2;
  --accent-primary-hover: #0e7490;
  --accent-primary-bg: rgba(6, 182, 212, 0.08);
  --accent-secondary: #7c3aed;
  --accent-success: #059669;
  --accent-warning: #d97706;
  --accent-danger: #dc2626;

  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-card-hover: 0 4px 12px rgba(0, 0, 0, 0.1);
  --shadow-button: 0 1px 2px rgba(0, 0, 0, 0.1);
  --shadow-button-hover: 0 2px 4px rgba(0, 0, 0, 0.12);
  --shadow-modal: 0 20px 60px rgba(0, 0, 0, 0.15);
  --shadow-input-focus: 0 0 0 3px rgba(6, 182, 212, 0.15);
  --shadow-glow: none;
  --shadow-float: 0 4px 12px rgba(0, 0, 0, 0.12);

  --font-ui: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
  --font-heading: 'Inter', system-ui, sans-serif;

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;
  --backdrop-blur: 8px;
  --transition-speed: 200ms;
  --border-width: 1px;

  --nav-item-hover-bg: #f1f5f9;
  --nav-item-active-bg: rgba(6, 182, 212, 0.08);
  --nav-item-active-border: #06b6d4;
  --nav-item-active-shadow: none;
  --nav-group-label: #94a3b8;
  --sidebar-logo-effect: none;

  --accent-line-gradient: linear-gradient(90deg, transparent, rgba(6,182,212,0.2), transparent);
  --sidebar-gradient: none;
  --sidebar-edge-gradient: none;
  --header-edge-gradient: linear-gradient(90deg, transparent, rgba(6,182,212,0.15) 20%, rgba(6,182,212,0.25) 50%, rgba(6,182,212,0.15) 80%, transparent);
  --table-header-color: #64748b;
  --tree-connector-color: #e2e8f0;
  --skeleton-scan-color: rgba(0, 0, 0, 0.05);
}

/* ----------------------------------------------------------
   BASIC (Asana-like) — Light (default)
   ---------------------------------------------------------- */
[data-theme="basic"].light {
  --bg-app: #f9fafb;
  --bg-card: #ffffff;
  --bg-card-hover: #f3f4f6;
  --bg-sidebar: #ffffff;
  --bg-header: rgba(255, 255, 255, 0.95);
  --bg-input: #ffffff;
  --bg-modal-overlay: rgba(0, 0, 0, 0.5);
  --bg-tooltip: #1f2937;
  --bg-hover: #f3f4f6;
  --bg-selected: rgba(240, 106, 106, 0.08);
  --bg-disabled: #f9fafb;

  --border-default: #e5e7eb;
  --border-card: #e5e7eb;
  --border-input: #d1d5db;
  --border-input-focus: #f06a6a;
  --border-active: #f06a6a;
  --border-sidebar: #f3f4f6;

  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  --text-accent: #f06a6a;
  --text-on-accent: #ffffff;
  --text-heading: #111827;
  --text-label: #6b7280;

  --accent-primary: #f06a6a;
  --accent-primary-hover: #e85555;
  --accent-primary-bg: rgba(240, 106, 106, 0.08);
  --accent-secondary: #7c3aed;
  --accent-success: #16a34a;
  --accent-warning: #ea580c;
  --accent-danger: #dc2626;

  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.03);
  --shadow-card-hover: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-button: 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-button-hover: 0 2px 4px rgba(0, 0, 0, 0.08);
  --shadow-modal: 0 20px 60px rgba(0, 0, 0, 0.12);
  --shadow-input-focus: 0 0 0 3px rgba(240, 106, 106, 0.15);
  --shadow-glow: none;
  --shadow-float: 0 4px 12px rgba(0, 0, 0, 0.1);

  --font-ui: 'Inter', system-ui, sans-serif;
  --font-mono: 'Inter', system-ui, sans-serif;
  --font-heading: 'Inter', system-ui, sans-serif;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
  --backdrop-blur: 0px;
  --transition-speed: 150ms;
  --border-width: 1px;

  --nav-item-hover-bg: #f3f4f6;
  --nav-item-active-bg: rgba(240, 106, 106, 0.08);
  --nav-item-active-border: #f06a6a;
  --nav-item-active-shadow: none;
  --nav-group-label: #9ca3af;
  --sidebar-logo-effect: none;

  --accent-line-gradient: none;
  --sidebar-gradient: none;
  --sidebar-edge-gradient: none;
  --header-edge-gradient: none;
  --table-header-color: #6b7280;
  --tree-connector-color: #e5e7eb;
  --skeleton-scan-color: rgba(0, 0, 0, 0.04);
}

/* ----------------------------------------------------------
   BASIC (Asana-like) — Dark
   ---------------------------------------------------------- */
[data-theme="basic"].dark {
  --bg-app: #111827;
  --bg-card: #1f2937;
  --bg-card-hover: #374151;
  --bg-sidebar: #1f2937;
  --bg-header: rgba(31, 41, 55, 0.95);
  --bg-input: #374151;
  --bg-modal-overlay: rgba(0, 0, 0, 0.7);
  --bg-tooltip: #374151;
  --bg-hover: #374151;
  --bg-selected: rgba(248, 113, 113, 0.1);
  --bg-disabled: rgba(55, 65, 81, 0.5);

  --border-default: #374151;
  --border-card: #374151;
  --border-input: #4b5563;
  --border-input-focus: #f87171;
  --border-active: #f87171;
  --border-sidebar: #374151;

  --text-primary: #f9fafb;
  --text-secondary: #9ca3af;
  --text-tertiary: #6b7280;
  --text-accent: #f87171;
  --text-on-accent: #ffffff;
  --text-heading: #f9fafb;
  --text-label: #9ca3af;

  --accent-primary: #f87171;
  --accent-primary-hover: #f06a6a;
  --accent-primary-bg: rgba(248, 113, 113, 0.1);
  --accent-secondary: #a78bfa;
  --accent-success: #34d399;
  --accent-warning: #fbbf24;
  --accent-danger: #f87171;

  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1);
  --shadow-card-hover: 0 4px 12px rgba(0, 0, 0, 0.3);
  --shadow-button: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-button-hover: 0 2px 4px rgba(0, 0, 0, 0.25);
  --shadow-modal: 0 20px 60px rgba(0, 0, 0, 0.4);
  --shadow-input-focus: 0 0 0 3px rgba(248, 113, 113, 0.2);
  --shadow-glow: none;
  --shadow-float: 0 4px 12px rgba(0, 0, 0, 0.3);

  --font-ui: 'Inter', system-ui, sans-serif;
  --font-mono: 'Inter', system-ui, sans-serif;
  --font-heading: 'Inter', system-ui, sans-serif;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
  --backdrop-blur: 0px;
  --transition-speed: 150ms;
  --border-width: 1px;

  --nav-item-hover-bg: #374151;
  --nav-item-active-bg: rgba(248, 113, 113, 0.1);
  --nav-item-active-border: #f87171;
  --nav-item-active-shadow: none;
  --nav-group-label: #6b7280;
  --sidebar-logo-effect: none;

  --accent-line-gradient: none;
  --sidebar-gradient: none;
  --sidebar-edge-gradient: none;
  --header-edge-gradient: none;
  --table-header-color: #9ca3af;
  --tree-connector-color: #374151;
  --skeleton-scan-color: rgba(255, 255, 255, 0.03);
}

/* ----------------------------------------------------------
   CLASSIC (Office 365/Teams) — Light (default)
   ---------------------------------------------------------- */
[data-theme="classic"].light {
  --bg-app: #f3f2f1;
  --bg-card: #ffffff;
  --bg-card-hover: #f3f2f1;
  --bg-sidebar: #faf9f8;
  --bg-header: #ffffff;
  --bg-input: #ffffff;
  --bg-modal-overlay: rgba(0, 0, 0, 0.4);
  --bg-tooltip: #323130;
  --bg-hover: #f3f2f1;
  --bg-selected: rgba(0, 120, 212, 0.06);
  --bg-disabled: #f3f2f1;

  --border-default: #edebe9;
  --border-card: #edebe9;
  --border-input: #8a8886;
  --border-input-focus: #0078d4;
  --border-active: #0078d4;
  --border-sidebar: #edebe9;

  --text-primary: #323130;
  --text-secondary: #605e5c;
  --text-tertiary: #a19f9d;
  --text-accent: #0078d4;
  --text-on-accent: #ffffff;
  --text-heading: #201f1e;
  --text-label: #605e5c;

  --accent-primary: #0078d4;
  --accent-primary-hover: #106ebe;
  --accent-primary-bg: rgba(0, 120, 212, 0.06);
  --accent-secondary: #8764b8;
  --accent-success: #107c10;
  --accent-warning: #ffb900;
  --accent-danger: #d13438;

  --shadow-card: 0 1.6px 3.6px rgba(0, 0, 0, 0.06), 0 0.3px 0.9px rgba(0, 0, 0, 0.04);
  --shadow-card-hover: 0 3.2px 7.2px rgba(0, 0, 0, 0.08);
  --shadow-button: none;
  --shadow-button-hover: 0 1px 2px rgba(0, 0, 0, 0.08);
  --shadow-modal: 0 6.4px 14.4px rgba(0, 0, 0, 0.13), 0 1.2px 3.6px rgba(0, 0, 0, 0.1);
  --shadow-input-focus: 0 0 0 2px rgba(0, 120, 212, 0.3);
  --shadow-glow: none;
  --shadow-float: 0 6.4px 14.4px rgba(0, 0, 0, 0.13);

  --font-ui: 'Segoe UI', -apple-system, system-ui, sans-serif;
  --font-mono: 'Consolas', 'Courier New', monospace;
  --font-heading: 'Segoe UI', -apple-system, system-ui, sans-serif;

  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 4px;
  --radius-xl: 8px;
  --radius-full: 9999px;
  --backdrop-blur: 0px;
  --transition-speed: 100ms;
  --border-width: 1px;

  --nav-item-hover-bg: #f3f2f1;
  --nav-item-active-bg: rgba(0, 120, 212, 0.06);
  --nav-item-active-border: #0078d4;
  --nav-item-active-shadow: none;
  --nav-group-label: #a19f9d;
  --sidebar-logo-effect: none;

  --accent-line-gradient: none;
  --sidebar-gradient: none;
  --sidebar-edge-gradient: none;
  --header-edge-gradient: none;
  --table-header-color: #605e5c;
  --tree-connector-color: #edebe9;
  --skeleton-scan-color: rgba(0, 0, 0, 0.04);
}

/* ----------------------------------------------------------
   CLASSIC (Office 365/Teams) — Dark
   ---------------------------------------------------------- */
[data-theme="classic"].dark {
  --bg-app: #1b1a19;
  --bg-card: #292827;
  --bg-card-hover: #323130;
  --bg-sidebar: #201f1e;
  --bg-header: #201f1e;
  --bg-input: #323130;
  --bg-modal-overlay: rgba(0, 0, 0, 0.7);
  --bg-tooltip: #484644;
  --bg-hover: #323130;
  --bg-selected: rgba(43, 136, 216, 0.1);
  --bg-disabled: rgba(50, 49, 48, 0.5);

  --border-default: #484644;
  --border-card: #3b3a39;
  --border-input: #605e5c;
  --border-input-focus: #2b88d8;
  --border-active: #2b88d8;
  --border-sidebar: #3b3a39;

  --text-primary: #f3f2f1;
  --text-secondary: #c8c6c4;
  --text-tertiary: #8a8886;
  --text-accent: #2b88d8;
  --text-on-accent: #ffffff;
  --text-heading: #f3f2f1;
  --text-label: #c8c6c4;

  --accent-primary: #2b88d8;
  --accent-primary-hover: #3c96df;
  --accent-primary-bg: rgba(43, 136, 216, 0.1);
  --accent-secondary: #a78bfa;
  --accent-success: #54b054;
  --accent-warning: #fce100;
  --accent-danger: #f1707b;

  --shadow-card: 0 1.6px 3.6px rgba(0, 0, 0, 0.2), 0 0.3px 0.9px rgba(0, 0, 0, 0.15);
  --shadow-card-hover: 0 3.2px 7.2px rgba(0, 0, 0, 0.3);
  --shadow-button: none;
  --shadow-button-hover: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-modal: 0 6.4px 14.4px rgba(0, 0, 0, 0.4), 0 1.2px 3.6px rgba(0, 0, 0, 0.3);
  --shadow-input-focus: 0 0 0 2px rgba(43, 136, 216, 0.4);
  --shadow-glow: none;
  --shadow-float: 0 6.4px 14.4px rgba(0, 0, 0, 0.4);

  --font-ui: 'Segoe UI', -apple-system, system-ui, sans-serif;
  --font-mono: 'Consolas', 'Courier New', monospace;
  --font-heading: 'Segoe UI', -apple-system, system-ui, sans-serif;

  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 4px;
  --radius-xl: 8px;
  --radius-full: 9999px;
  --backdrop-blur: 0px;
  --transition-speed: 100ms;
  --border-width: 1px;

  --nav-item-hover-bg: #323130;
  --nav-item-active-bg: rgba(43, 136, 216, 0.1);
  --nav-item-active-border: #2b88d8;
  --nav-item-active-shadow: none;
  --nav-group-label: #8a8886;
  --sidebar-logo-effect: none;

  --accent-line-gradient: none;
  --sidebar-gradient: none;
  --sidebar-edge-gradient: none;
  --header-edge-gradient: none;
  --table-header-color: #c8c6c4;
  --tree-connector-color: #484644;
  --skeleton-scan-color: rgba(255, 255, 255, 0.03);
}
```

**Step 2: Import themes.css in main entry point**

In `client/src/styles/index.css`, add at line 1 (before `@tailwind base`):

```css
@import './themes.css';
```

**Step 3: Commit**

```bash
git add client/src/styles/themes.css client/src/styles/index.css
git commit -m "feat(theme): add CSS Custom Property definitions for 6 theme combinations"
```

---

## Phase 2: Refactor index.css to use CSS Variables

### Task 4: Refactor core component classes (card, button, input, modal)

**Files:**
- Modify: `client/src/styles/index.css`

**Step 1: Refactor .card, .card-hover, .modal-panel**

Replace lines 19-75 of `index.css` with variable-based versions:

```css
  /* Card — themed with variables */
  .card {
    background: var(--bg-card);
    border: var(--border-width) solid var(--border-card);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card);
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(var(--backdrop-blur));
  }
  .card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: var(--accent-line-gradient);
    pointer-events: none;
  }
  .card-hover {
    background: var(--bg-card);
    border: var(--border-width) solid var(--border-card);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card);
    transition: all var(--transition-speed) ease;
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(var(--backdrop-blur));
  }
  .card-hover::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: var(--accent-line-gradient);
    pointer-events: none;
  }
  .card-hover:hover {
    background: var(--bg-card-hover);
    box-shadow: var(--shadow-card-hover);
    border-color: var(--border-active);
  }

  /* Modal — themed */
  .modal-panel {
    background: var(--bg-card);
    border: var(--border-width) solid var(--border-card);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-modal);
    animation: tooltip-origin 0.15s ease-out;
    position: relative;
    overflow: hidden;
  }
  .modal-panel::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: var(--accent-line-gradient);
    pointer-events: none;
  }
```

**Remove** all corresponding `:root:not(.dark)` overrides for these classes (they're no longer needed — variables handle both modes).

**Step 2: Refactor .btn-primary, .btn-secondary, .btn-tertiary, .btn-icon**

Replace lines 77-111:

```css
  /* Buttons — themed */
  .btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 1rem;
    border-radius: var(--radius-md);
    font-weight: 500;
    font-size: 0.875rem;
    font-family: var(--font-ui);
    background-color: var(--accent-primary);
    color: var(--text-on-accent);
    box-shadow: var(--shadow-button);
    transition: all var(--transition-speed) ease;
  }
  .btn-primary:hover {
    background-color: var(--accent-primary-hover);
    box-shadow: var(--shadow-button-hover);
  }
  .btn-primary:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--accent-primary-bg), var(--shadow-button);
  }
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn-primary:active {
    transform: scale(0.98);
  }

  .btn-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 1rem;
    border-radius: var(--radius-md);
    font-weight: 500;
    font-size: 0.875rem;
    font-family: var(--font-ui);
    background-color: transparent;
    border: var(--border-width) solid var(--border-default);
    color: var(--text-accent);
    transition: all var(--transition-speed) ease;
  }
  .btn-secondary:hover {
    border-color: var(--border-active);
    background-color: var(--accent-primary-bg);
  }
  .btn-secondary:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--accent-primary-bg);
  }
  .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-secondary:active { transform: scale(0.98); }

  .btn-tertiary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 1rem;
    border-radius: var(--radius-md);
    font-weight: 500;
    font-size: 0.875rem;
    font-family: var(--font-ui);
    color: var(--text-secondary);
    transition: all var(--transition-speed) ease;
  }
  .btn-tertiary:hover {
    color: var(--text-primary);
    background-color: var(--bg-hover);
  }
  .btn-tertiary:focus { outline: none; }

  .btn-icon {
    padding: 0.5rem;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    transition: all var(--transition-speed) ease;
  }
  .btn-icon:hover {
    color: var(--text-accent);
    background-color: var(--accent-primary-bg);
  }
  .btn-icon:focus { outline: none; }
```

**Remove** `:root:not(.dark)` overrides for `.btn-secondary`, `.btn-tertiary`, `.btn-icon`.

**Step 3: Refactor .input**

Replace lines 113-128:

```css
  /* Inputs — themed */
  .input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    font-family: var(--font-ui);
    background: var(--bg-input);
    border: var(--border-width) solid var(--border-input);
    color: var(--text-primary);
    transition: all var(--transition-speed) ease;
  }
  .input::placeholder { color: var(--text-tertiary); }
  .input:focus {
    outline: none;
    border-color: var(--border-input-focus);
    box-shadow: var(--shadow-input-focus);
  }
  .input:disabled { opacity: 0.5; cursor: not-allowed; }
  .input-error {
    border-color: var(--accent-danger) !important;
  }
```

**Remove** `:root:not(.dark) .input` override.

**Step 4: Verify build**

Run: `cd client && npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add client/src/styles/index.css
git commit -m "refactor(theme): convert card, button, input, modal to CSS variables"
```

---

### Task 5: Refactor navigation, sidebar, header classes

**Files:**
- Modify: `client/src/styles/index.css`

**Step 1: Refactor navigation classes**

Replace `.nav-item`, `.nav-item-active`, `.nav-group-label`, `.nav-group-chevron`, `.sidebar`, `.sidebar-border`, `.sidebar-search`, `.sidebar-logo`, `.header-bar` and all their `:root:not(.dark)` overrides with:

```css
  /* Navigation — themed */
  .nav-item {
    position: relative;
    display: flex;
    align-items: center;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    font-weight: 500;
    font-family: var(--font-ui);
    border-radius: var(--radius-md);
    border-left: 2px solid transparent;
    color: var(--text-secondary);
    transition: all var(--transition-speed) ease;
  }
  .nav-item:hover {
    background: var(--nav-item-hover-bg);
    color: var(--text-primary);
  }
  .nav-item-active {
    background: var(--nav-item-active-bg);
    border-left: 2px solid var(--nav-item-active-border);
    color: var(--text-primary);
    box-shadow: var(--nav-item-active-shadow);
  }
  .nav-group-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    font-weight: 500;
    font-family: var(--font-ui);
    color: var(--nav-group-label);
  }
  .nav-group-chevron {
    width: 0.875rem;
    height: 0.875rem;
    color: var(--text-tertiary);
    transition: transform var(--transition-speed) ease;
  }

  /* Sidebar — themed */
  .sidebar {
    background: var(--bg-sidebar);
    border-right: var(--border-width) solid var(--border-sidebar);
    position: relative;
    backdrop-filter: blur(var(--backdrop-blur));
    background-image: var(--sidebar-gradient);
  }
  .sidebar::after {
    content: '';
    position: absolute;
    top: 0; right: 0;
    width: 1px; height: 100%;
    background: var(--sidebar-edge-gradient);
    pointer-events: none;
  }
  .sidebar-border {
    border-color: var(--border-default);
  }
  .sidebar-search {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    font-family: var(--font-ui);
    color: var(--text-tertiary);
    background: var(--bg-input);
    border: var(--border-width) solid var(--border-default);
    border-radius: var(--radius-md);
    transition: all var(--transition-speed) ease;
  }
  .sidebar-search:hover {
    border-color: var(--border-input-focus);
    color: var(--text-secondary);
    box-shadow: var(--shadow-glow);
  }
  .sidebar-logo {
    font-size: 1.125rem;
    font-weight: 600;
    font-family: var(--font-ui);
    color: var(--text-heading);
    text-shadow: var(--sidebar-logo-effect);
  }

  /* Header — themed */
  .header-bar {
    background: var(--bg-header);
    border-bottom: var(--border-width) solid var(--border-default);
    position: relative;
    backdrop-filter: blur(var(--backdrop-blur));
  }
  .header-bar::after {
    content: '';
    position: absolute;
    bottom: -1px; left: 0; right: 0;
    height: 1px;
    background: var(--header-edge-gradient);
    pointer-events: none;
  }
```

**Remove** all `:root:not(.dark)` overrides for these classes.

**Step 2: Refactor remaining component classes**

Convert the rest of `index.css` component classes to use CSS variables. Key patterns:

- `.skeleton` → `background: var(--bg-disabled)`, scan overlay uses `var(--skeleton-scan-color)`
- `.status-dot-active/warning/danger` → keep semantic colors (these are status-specific, not theme-dependent)
- `.stat-pill` → `border-color: var(--border-default)`, `color: var(--text-secondary)`, hover uses `var(--accent-primary-bg)`
- `.stat-pill-active` → `background: var(--accent-primary-bg)`, `color: var(--text-accent)`, `border-color: var(--border-active)`
- `.segmented-control` → `background: var(--bg-input)`, `border-color: var(--border-default)`
- `.meta-row` → `border-color: var(--border-default)`
- `.meta-row-label` → `color: var(--text-label)`
- `.meta-row-value` → `color: var(--text-primary)`
- `.floating-bar` → `background: var(--bg-card)`, `border-color: var(--border-card)`, `box-shadow: var(--shadow-float)`
- `.tree-connector` → `var(--tree-connector-color)`
- `.form-section-header` → `color: var(--text-label)`, `border-color: var(--border-default)`
- `.page-title` → `color: var(--text-heading)`
- `.page-subtitle` → `color: var(--text-secondary)`
- `.section-heading` → `color: var(--text-secondary)`
- `.notification-badge` → `background: var(--accent-primary)`, `color: var(--text-on-accent)`
- `.table-header` → `color: var(--table-header-color)`

**Remove** ALL `:root:not(.dark)` overrides in the components layer — they're no longer needed.

**Step 3: Refactor utilities layer**

- `.bg-grid-pattern` → wrap in `[data-theme="tech-hud"]` selector
- `.bg-vignette` → wrap in `[data-theme="tech-hud"]` selector
- `.neon-text`, `.glow-text` → wrap in `[data-theme="tech-hud"]` selector
- `.glow-text-amber/red/emerald` → wrap in `[data-theme="tech-hud"]` selector
- `.table-row-hover:hover` → use `background: var(--bg-hover)`

**Step 4: Add HUD-only conditional display**

At the end of the `@layer components` section, add:

```css
  /* HUD decorative elements — visible only in TECH-HUD theme */
  :not([data-theme="tech-hud"]) .hud-corners::before,
  :not([data-theme="tech-hud"]) .hud-corners::after,
  :not([data-theme="tech-hud"]) .hud-brackets::before,
  :not([data-theme="tech-hud"]) .hud-brackets::after,
  :not([data-theme="tech-hud"]) .hud-brackets > .hud-brackets-inner::before,
  :not([data-theme="tech-hud"]) .hud-brackets > .hud-brackets-inner::after,
  :not([data-theme="tech-hud"]) .hud-scan::after,
  :not([data-theme="tech-hud"]) .hud-target::before,
  :not([data-theme="tech-hud"]) .hud-target::after {
    display: none !important;
  }

  /* HUD panel header — simplified in non-tech themes */
  :not([data-theme="tech-hud"]) .hud-panel-header {
    border-bottom-color: var(--border-default);
  }
  :not([data-theme="tech-hud"]) .hud-panel-header::before { display: none; }
  :not([data-theme="tech-hud"]) .hud-panel-header::after { display: none; }
  :not([data-theme="tech-hud"]) .hud-panel-header span {
    font-family: var(--font-ui);
    font-size: 0.75rem;
    color: var(--text-label);
  }

  /* HUD dividers — simplified in non-tech themes */
  :not([data-theme="tech-hud"]) .hud-divider {
    background: var(--border-default);
  }
  :not([data-theme="tech-hud"]) .hud-divider-label {
    font-family: var(--font-ui);
    color: var(--text-tertiary);
  }
  :not([data-theme="tech-hud"]) .hud-divider-label::before,
  :not([data-theme="tech-hud"]) .hud-divider-label::after {
    background: var(--border-default);
  }
```

**Step 5: Verify build**

Run: `cd client && npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add client/src/styles/index.css
git commit -m "refactor(theme): convert all CSS classes to variables, add HUD-conditional display"
```

---

### Task 6: Add theme-conditional animations

**Files:**
- Modify: `client/src/styles/index.css`

**Step 1: Add theme-conditional animation overrides**

At the end of `index.css`, before the `@media (prefers-reduced-motion)` block, add:

```css
/* === Theme-conditional animations === */

/* TECH-HUD: full animations (already defined in tailwind.config.js) */

/* BASIC: softer card animation, no HUD effects */
[data-theme="basic"] .animate-card-power-on {
  animation: fadeIn 0.2s ease-out;
}
[data-theme="basic"] .animate-glow-pulse,
[data-theme="basic"] .animate-border-trace,
[data-theme="basic"] .animate-sidebar-glow,
[data-theme="basic"] .animate-ambient-pulse,
[data-theme="basic"] .animate-glow-line,
[data-theme="basic"] .animate-scan-line {
  animation: none;
}

/* CLASSIC: no decorative animations at all */
[data-theme="classic"] .animate-card-power-on,
[data-theme="classic"] .animate-glow-pulse,
[data-theme="classic"] .animate-border-trace,
[data-theme="classic"] .animate-sidebar-glow,
[data-theme="classic"] .animate-ambient-pulse,
[data-theme="classic"] .animate-glow-line,
[data-theme="classic"] .animate-scan-line,
[data-theme="classic"] .animate-data-reveal {
  animation: none;
}
```

**Step 2: Commit**

```bash
git add client/src/styles/index.css
git commit -m "feat(theme): add conditional animation overrides per theme"
```

---

## Phase 3: Update Tailwind Config and Fonts

### Task 7: Update tailwind.config.js for font variables

**Files:**
- Modify: `client/tailwind.config.js`

**Step 1: Reference CSS variables in font config**

Update the `fontFamily` section to include CSS variable fallbacks:

```javascript
fontFamily: {
  sans: ['var(--font-ui)', 'Inter', 'system-ui', 'sans-serif'],
  mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
},
```

This ensures Tailwind's `font-sans` and `font-mono` classes use the theme's font.

**Step 2: Commit**

```bash
git add client/tailwind.config.js
git commit -m "feat(theme): update Tailwind font config to use CSS variables"
```

---

### Task 8: Add Segoe UI font to index.html

**Files:**
- Modify: `client/index.html`

**Step 1: Segoe UI is a system font — no external loading needed**

Segoe UI is pre-installed on Windows and available as a system font. The CSS variable fallback `'Segoe UI', -apple-system, system-ui, sans-serif` handles this automatically. No changes needed to `index.html` for font loading.

However, ensure `index.html` has the `data-theme` and class attributes:

```html
<html lang="it" data-theme="tech-hud" class="dark">
```

This was already done in Task 2.

**Step 2: Commit (if needed)**

Only commit if changes were made.

---

## Phase 4: Layout Component Updates

### Task 9: Update DashboardLayout background

**Files:**
- Modify: `client/src/components/layout/DashboardLayout.tsx`

**Step 1: Replace hardcoded background classes**

Find the root div (around line 136):

```tsx
<div className="min-h-screen bg-slate-50 dark:bg-slate-950 dark:bg-grid-pattern dark:bg-vignette">
```

Replace with:

```tsx
<div className="min-h-screen" style={{ backgroundColor: 'var(--bg-app)' }}>
```

The `bg-grid-pattern` and `bg-vignette` utilities are already wrapped in `[data-theme="tech-hud"]` selectors (done in Task 5), so they can stay as additional classes:

```tsx
<div className="min-h-screen bg-grid-pattern bg-vignette" style={{ backgroundColor: 'var(--bg-app)' }}>
```

**Step 2: Apply font-family to root**

In `client/src/styles/index.css`, update the base layer:

```css
@layer base {
  html {
    font-family: var(--font-ui);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
```

**Step 3: Commit**

```bash
git add client/src/components/layout/DashboardLayout.tsx client/src/styles/index.css
git commit -m "feat(theme): update DashboardLayout and base font to use CSS variables"
```

---

### Task 10: Update AuthLayout background

**Files:**
- Modify: `client/src/components/layout/AuthLayout.tsx`

**Step 1: Replace hardcoded background**

Find the root div:
```tsx
<div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 px-4">
```

Replace with:
```tsx
<div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg-app)' }}>
```

**Step 2: Commit**

```bash
git add client/src/components/layout/AuthLayout.tsx
git commit -m "feat(theme): update AuthLayout background to use CSS variable"
```

---

### Task 11: Update App.tsx loading/error backgrounds

**Files:**
- Modify: `client/src/App.tsx`

**Step 1: Find and replace hardcoded backgrounds**

Find all `bg-slate-50 dark:bg-slate-900` or similar patterns in App.tsx and replace with `style={{ backgroundColor: 'var(--bg-app)' }}`.

**Step 2: Commit**

```bash
git add client/src/App.tsx
git commit -m "feat(theme): update App.tsx backgrounds to use CSS variable"
```

---

## Phase 5: Profile Page Theme Selector

### Task 12: Add theme selector to ProfilePage

**Files:**
- Modify: `client/src/pages/profile/ProfilePage.tsx`

**Step 1: Add theme selector section**

Add the following section BEFORE the `<form>` element (around line 110). Import `useThemeStore` and add the theme selector UI:

```tsx
import { useThemeStore } from '@stores/themeStore'
import { Monitor, Palette, Building2 } from 'lucide-react'
```

Add inside the component:

```tsx
const { themeStyle, setThemeStyle } = useThemeStore()

const themes = [
  {
    id: 'tech-hud' as const,
    name: 'TECH-HUD',
    description: 'Stile JARVIS — neon, glow, HUD decorations',
    icon: Monitor,
    colors: ['#06b6d4', '#0f172a', '#8b5cf6', '#10b981'],
  },
  {
    id: 'basic' as const,
    name: 'BASIC',
    description: 'Pulito e moderno — ispirato ad Asana',
    icon: Palette,
    colors: ['#f06a6a', '#ffffff', '#7c3aed', '#16a34a'],
  },
  {
    id: 'classic' as const,
    name: 'CLASSIC',
    description: 'Professionale — stile Office 365 / Teams',
    icon: Building2,
    colors: ['#0078d4', '#f3f2f1', '#8764b8', '#107c10'],
  },
]
```

Add the JSX after the success message and before the form:

```tsx
{/* Theme selector */}
<div className="card p-6 space-y-4">
  <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-label)' }}>
    Tema interfaccia
  </h2>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {themes.map((t) => {
      const isSelected = themeStyle === t.id
      const Icon = t.icon
      return (
        <button
          key={t.id}
          type="button"
          onClick={() => setThemeStyle(t.id)}
          className={`relative p-4 rounded-lg border-2 text-left transition-all duration-200 ${
            isSelected
              ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-bg)]'
              : 'border-[var(--border-default)] hover:border-[var(--border-active)]'
          }`}
          style={{ borderRadius: 'var(--radius-lg)' }}
        >
          {isSelected && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-primary)' }}>
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          <Icon className="w-6 h-6 mb-2" style={{ color: t.colors[0] }} />
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>
            {t.name}
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {t.description}
          </p>
          <div className="flex gap-1.5 mt-3">
            {t.colors.map((color, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full border"
                style={{
                  backgroundColor: color,
                  borderColor: color === '#ffffff' || color === '#f3f2f1' ? '#e5e7eb' : color,
                }}
              />
            ))}
          </div>
        </button>
      )
    })}
  </div>
</div>
```

**Step 2: Verify it renders**

Run: `cd client && npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add client/src/pages/profile/ProfilePage.tsx
git commit -m "feat(theme): add theme selector to ProfilePage with 3 theme cards"
```

---

## Phase 6: Hardcoded Color Sweep

### Task 13: Fix remaining hardcoded colors in components

**Files:**
- Multiple files across `client/src/components/` and `client/src/pages/`

**Step 1: Search for hardcoded dark mode colors that should use variables**

Search for these patterns and evaluate which should use CSS variables:

```bash
cd client && grep -rn "bg-slate-950\|bg-slate-900\|bg-slate-50\|dark:bg-" src/components/layout/ src/App.tsx --include="*.tsx" | head -30
```

Key areas to fix:
- `DashboardLayout.tsx` — root background (done in Task 9)
- `AuthLayout.tsx` — root background (done in Task 10)
- `App.tsx` — loading/error states (done in Task 11)
- `Header.tsx` — if it has hardcoded header colors beyond `.header-bar`
- `Sidebar.tsx` — if it has hardcoded sidebar colors beyond `.sidebar`

For each file, replace `dark:bg-slate-*` patterns with inline `style={{ color: 'var(--text-*)' }}` or `style={{ backgroundColor: 'var(--bg-*)' }}` where the hardcoded values correspond to theme tokens.

**Important**: Do NOT touch files where colors are semantic (status colors like red for danger, green for success) — those stay as-is.

**Step 2: Fix ProfilePage avatar gradient**

The avatar uses `from-cyan-500 to-purple-500` which is accent-specific. Replace with:

```tsx
style={{ background: `linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))` }}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor(theme): sweep remaining hardcoded colors to CSS variables"
```

---

### Task 14: Fix text color patterns using Tailwind dark: prefix

**Files:**
- Search across all `.tsx` files

**Step 1: Identify patterns to fix**

Many components use `text-slate-700 dark:text-slate-300` (or similar) for text colors. These should ideally use CSS variables too. However, for pragmatism, only fix the patterns that appear in:
- Layout components (Header, Sidebar, DashboardLayout)
- Common components (DetailPageHeader, InfoCard, etc.)
- Profile page

Leave page-specific components for a follow-up pass — the CSS variable system handles the main chrome, and individual pages will inherit correct colors from the component classes they use (`.card`, `.btn-*`, `.input`, etc.).

**Step 2: Add utility classes for theme-aware text**

In `index.css` utilities layer, add:

```css
  .text-themed-primary { color: var(--text-primary); }
  .text-themed-secondary { color: var(--text-secondary); }
  .text-themed-tertiary { color: var(--text-tertiary); }
  .text-themed-accent { color: var(--text-accent); }
  .text-themed-heading { color: var(--text-heading); }
  .text-themed-label { color: var(--text-label); }
```

These can be used as drop-in replacements for `text-slate-700 dark:text-slate-300` patterns.

**Step 3: Commit**

```bash
git add client/src/styles/index.css
git commit -m "feat(theme): add themed text utility classes"
```

---

## Phase 7: HUD Component Theme Adaptation

### Task 15: Make HUD React components theme-aware

**Files:**
- Modify: `client/src/components/ui/HudGauge.tsx`
- Modify: `client/src/components/ui/HudProgressBar.tsx`
- Modify: `client/src/components/ui/HudStatusRing.tsx`

**Step 1: Add themeStyle awareness to HudGauge**

The HudGauge currently uses hardcoded cyan colors for strokes and glows. In non-tech themes, simplify the visual:

Add a `useThemeStore` import and conditional rendering:

```tsx
import { useThemeStore } from '@stores/themeStore'

// Inside component:
const { themeStyle } = useThemeStore()
const isHud = themeStyle === 'tech-hud'
```

Then conditionally:
- In TECH-HUD: full SVG gauge with glow filter, tick marks, gradient
- In BASIC/CLASSIC: simple circular progress (remove tick marks, remove glow filter, use accent color from CSS variable)

The simplest approach: keep the SVG structure but conditionally skip the filter (glow), tick marks, and gradient. Replace hardcoded cyan rgba values with `var(--accent-primary)` where possible.

**Step 2: Simplify HudProgressBar for non-tech themes**

In BASIC/CLASSIC: render as a simple continuous progress bar instead of segmented. Same component, conditional rendering based on `themeStyle`.

**Step 3: Simplify HudStatusRing for non-tech themes**

In BASIC/CLASSIC: render as a simple colored dot (no rotating ring, no glow filter).

**Step 4: Commit**

```bash
git add client/src/components/ui/HudGauge.tsx client/src/components/ui/HudProgressBar.tsx client/src/components/ui/HudStatusRing.tsx
git commit -m "feat(theme): make HUD components adapt visually per theme"
```

---

## Phase 8: Badge Color Adaptation

### Task 16: Make badge colors theme-aware

**Files:**
- Modify: `client/src/styles/index.css`

**Step 1: Update badge classes**

The badge classes (`.badge-cyan`, `.badge-emerald`, etc.) use semantic colors that should stay consistent across themes. However, the `.badge-cyan` specifically uses the accent color, which should adapt per theme.

Replace `.badge-cyan` with a new `.badge-accent` class that uses CSS variables:

```css
  .badge-accent {
    background: var(--accent-primary-bg);
    color: var(--text-accent);
    ring: 1px solid var(--border-active);
  }
```

The other badge colors (emerald, amber, red, indigo, slate) are semantic and stay unchanged across themes.

**Remove** the `:root:not(.dark)` overrides for badges — they're semantic, not theme-dependent.

**Step 2: Commit**

```bash
git add client/src/styles/index.css
git commit -m "feat(theme): add theme-aware badge-accent class"
```

---

## Phase 9: Final Integration & Testing

### Task 17: Integration test — verify all 6 theme combinations

**Step 1: Manual testing checklist**

Open the app and test each combination:

1. **TECH-HUD Dark**: Should look identical to current app
2. **TECH-HUD Light**: Current light mode with cyan accent
3. **BASIC Light**: Asana-like — white, rounded, pink/coral accent, no glow
4. **BASIC Dark**: Dark gray, pink accent, no glow effects
5. **CLASSIC Light**: Office-like — gray background, blue accent, squared corners
6. **CLASSIC Dark**: Dark Office theme, blue accent

For each, verify:
- [ ] Cards render correctly (background, border, shadow)
- [ ] Buttons display properly (primary, secondary, tertiary)
- [ ] Inputs have correct styling and focus state
- [ ] Sidebar navigation renders with correct colors
- [ ] Header displays properly
- [ ] HUD decorations (corners, scan lines) only show in TECH-HUD
- [ ] Modals render with correct backdrop and styling
- [ ] Text is readable (contrast ratios)
- [ ] Animations appropriate for theme (glow only in TECH-HUD)

**Step 2: Final commit**

```bash
git add -A
git commit -m "feat(theme): multi-theme system complete — 3 themes × 2 modes"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-3 | Foundation: store + CSS variables definitions |
| 2 | 4-6 | Refactor all `index.css` classes to use variables |
| 3 | 7-8 | Update Tailwind config and fonts |
| 4 | 9-11 | Update layout component backgrounds |
| 5 | 12 | Profile page theme selector |
| 6 | 13-14 | Hardcoded color sweep |
| 7 | 15 | HUD component theme adaptation |
| 8 | 16 | Badge color adaptation |
| 9 | 17 | Integration testing |

**Total**: 17 tasks, ~9 commits
**Risk areas**: The CSS refactoring (Phase 2) is the largest effort. Each class must be carefully converted without breaking the existing TECH-HUD look.
**Rollback strategy**: Each phase has its own commit. Any phase can be reverted independently.
