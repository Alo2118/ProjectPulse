# Multi-Theme System Design

**Date**: 2026-02-26
**Status**: Approved

## Overview

Implement a 3-theme system with independent dark/light mode for ProjectPulse:
- **TECH-HUD** (JARVIS) — dark-first, neon glow, HUD decorations, monospace data
- **BASIC** (Asana-like) — light-first, clean, rounded, soft shadows, pink/violet accent
- **CLASSIC** (Office 365/Teams) — light-first, professional, squared, blue accent, no effects

Each theme supports both light and dark mode = 6 visual combinations.
Content and components are identical across themes — only presentation changes.

## Architecture

### Approach: CSS Custom Properties + `data-theme` Attribute

Two independent axes on `<html>`:
- Theme: `data-theme="tech-hud" | "basic" | "classic"`
- Mode: class `dark` or `light` (existing Tailwind strategy)

```html
<html data-theme="tech-hud" class="dark">  <!-- JARVIS dark -->
<html data-theme="basic" class="light">    <!-- Asana light -->
<html data-theme="classic" class="dark">   <!-- Office dark -->
```

Components use CSS classes (`.card`, `.btn-primary`, `.input`) that reference CSS custom properties. Theme switching = changing `data-theme` attribute. Zero React component changes in most cases.

### Why This Approach

- Current codebase already abstracts styles into CSS classes in `index.css` (40+ component classes)
- Components use `.card`, `.btn-primary`, `.input` — NOT hardcoded colors
- Refactoring CSS classes to use variables is the smallest change surface
- Adding a 4th theme in the future = just adding variable definitions
- No HTML bloat (vs Tailwind variant approach)
- No React re-renders on theme switch (pure CSS)

## Design Tokens (~50 CSS Custom Properties)

### Token Categories

#### Surfaces (8 tokens)
| Token | Purpose |
|-------|---------|
| `--bg-app` | Main application background |
| `--bg-card` | Card/panel background |
| `--bg-card-hover` | Card hover state |
| `--bg-sidebar` | Sidebar background |
| `--bg-header` | Header background |
| `--bg-input` | Input field background |
| `--bg-modal-overlay` | Modal backdrop overlay |
| `--bg-tooltip` | Tooltip background |

#### Borders (6 tokens)
| Token | Purpose |
|-------|---------|
| `--border-default` | Standard element border |
| `--border-card` | Card border color |
| `--border-input` | Input field border |
| `--border-input-focus` | Input focus border |
| `--border-active` | Active/selected border |
| `--border-sidebar` | Sidebar edge border |

#### Text (5 tokens)
| Token | Purpose |
|-------|---------|
| `--text-primary` | Primary text |
| `--text-secondary` | Secondary/muted text |
| `--text-tertiary` | Tertiary/disabled text |
| `--text-accent` | Accent colored text |
| `--text-on-accent` | Text on accent-colored backgrounds |

#### Accent Colors (6 tokens)
| Token | Purpose |
|-------|---------|
| `--accent-primary` | Primary action color |
| `--accent-primary-hover` | Hover state |
| `--accent-primary-bg` | Light background tint |
| `--accent-secondary` | Secondary accent |
| `--accent-success` | Success states |
| `--accent-danger` | Danger/error states |

#### Shadows (5 tokens)
| Token | Purpose |
|-------|---------|
| `--shadow-card` | Card elevation shadow |
| `--shadow-card-hover` | Card hover shadow |
| `--shadow-button` | Button shadow |
| `--shadow-modal` | Modal elevation |
| `--shadow-input-focus` | Input focus glow/shadow |

#### Typography (3 tokens)
| Token | Purpose |
|-------|---------|
| `--font-ui` | UI text font family |
| `--font-mono` | Monospace/data font |
| `--font-heading` | Heading font (if different) |

#### Shape & Effects (7 tokens)
| Token | Purpose |
|-------|---------|
| `--radius-sm` | Small elements (badges, chips) |
| `--radius-md` | Medium elements (inputs, buttons) |
| `--radius-lg` | Large elements (cards, modals) |
| `--radius-xl` | Extra large (modal panels) |
| `--backdrop-blur` | Backdrop blur amount |
| `--transition-speed` | Default transition duration |
| `--border-width` | Default border width |

#### Navigation (5 tokens)
| Token | Purpose |
|-------|---------|
| `--nav-item-hover-bg` | Nav item hover background |
| `--nav-item-active-bg` | Nav item active background |
| `--nav-item-active-border` | Active indicator color |
| `--nav-group-label` | Group label text color |
| `--sidebar-logo-effect` | Logo special effect (glow/none) |

## Theme Definitions

### TECH-HUD (JARVIS)

#### Dark Mode (default)
```css
[data-theme="tech-hud"].dark {
  --bg-app: #0a0f1a;
  --bg-card: rgba(15, 23, 42, 0.7);
  --bg-card-hover: rgba(15, 23, 42, 0.85);
  --bg-sidebar: rgba(2, 6, 23, 0.9);
  --bg-header: rgba(2, 6, 23, 0.8);
  --bg-input: rgba(30, 41, 59, 0.5);
  --bg-modal-overlay: rgba(0, 0, 0, 0.7);
  --bg-tooltip: #1e293b;

  --border-default: rgba(6, 182, 212, 0.15);
  --border-card: rgba(6, 182, 212, 0.25);
  --border-input: rgba(6, 182, 212, 0.2);
  --border-input-focus: rgba(6, 182, 212, 0.5);
  --border-active: #06b6d4;
  --border-sidebar: rgba(6, 182, 212, 0.15);

  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-tertiary: #64748b;
  --text-accent: #06b6d4;
  --text-on-accent: #ffffff;

  --accent-primary: #06b6d4;
  --accent-primary-hover: #0891b2;
  --accent-primary-bg: rgba(6, 182, 212, 0.1);
  --accent-secondary: #8b5cf6;
  --accent-success: #10b981;
  --accent-danger: #ef4444;

  --shadow-card: 0 0 12px rgba(6, 182, 212, 0.08);
  --shadow-card-hover: 0 0 20px rgba(6, 182, 212, 0.15);
  --shadow-button: 0 0 15px rgba(6, 182, 212, 0.3), 0 0 30px rgba(6, 182, 212, 0.1);
  --shadow-modal: 0 0 30px rgba(6, 182, 212, 0.15), 0 0 60px rgba(6, 182, 212, 0.05);
  --shadow-input-focus: 0 0 0 3px rgba(6, 182, 212, 0.15), 0 0 12px rgba(6, 182, 212, 0.1);

  --font-ui: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --font-heading: 'Inter', system-ui, sans-serif;

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --backdrop-blur: 12px;
  --transition-speed: 200ms;
  --border-width: 1px;

  --nav-item-hover-bg: rgba(6, 182, 212, 0.05);
  --nav-item-active-bg: rgba(6, 182, 212, 0.1);
  --nav-item-active-border: #06b6d4;
  --nav-group-label: #64748b;
  --sidebar-logo-effect: 0 0 20px rgba(6, 182, 212, 0.3);
}
```

#### Light Mode
```css
[data-theme="tech-hud"].light {
  --bg-app: #f8fafc;
  --bg-card: #ffffff;
  --bg-card-hover: #f1f5f9;
  --bg-sidebar: #f8fafc;
  --bg-header: rgba(248, 250, 252, 0.9);
  --bg-input: #ffffff;
  --bg-modal-overlay: rgba(0, 0, 0, 0.4);
  --bg-tooltip: #1e293b;

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

  --accent-primary: #0891b2;
  --accent-primary-hover: #0e7490;
  --accent-primary-bg: rgba(6, 182, 212, 0.08);
  --accent-secondary: #7c3aed;
  --accent-success: #059669;
  --accent-danger: #dc2626;

  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-card-hover: 0 4px 12px rgba(0, 0, 0, 0.1);
  --shadow-button: 0 1px 2px rgba(0, 0, 0, 0.1);
  --shadow-modal: 0 20px 60px rgba(0, 0, 0, 0.15);
  --shadow-input-focus: 0 0 0 3px rgba(6, 182, 212, 0.15);

  --font-ui: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --font-heading: 'Inter', system-ui, sans-serif;

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --backdrop-blur: 8px;
  --transition-speed: 200ms;
  --border-width: 1px;

  --nav-item-hover-bg: #f1f5f9;
  --nav-item-active-bg: rgba(6, 182, 212, 0.08);
  --nav-item-active-border: #06b6d4;
  --nav-group-label: #94a3b8;
  --sidebar-logo-effect: none;
}
```

### BASIC (Asana-like)

#### Light Mode (default)
```css
[data-theme="basic"].light {
  --bg-app: #f9fafb;
  --bg-card: #ffffff;
  --bg-card-hover: #f3f4f6;
  --bg-sidebar: #ffffff;
  --bg-header: rgba(255, 255, 255, 0.95);
  --bg-input: #ffffff;
  --bg-modal-overlay: rgba(0, 0, 0, 0.5);
  --bg-tooltip: #1f2937;

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

  --accent-primary: #f06a6a;
  --accent-primary-hover: #e85555;
  --accent-primary-bg: rgba(240, 106, 106, 0.08);
  --accent-secondary: #7c3aed;
  --accent-success: #16a34a;
  --accent-danger: #dc2626;

  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.06);
  --shadow-card-hover: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-button: 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-modal: 0 20px 60px rgba(0, 0, 0, 0.12);
  --shadow-input-focus: 0 0 0 3px rgba(240, 106, 106, 0.15);

  --font-ui: 'Inter', system-ui, sans-serif;
  --font-mono: 'Inter', system-ui, sans-serif;
  --font-heading: 'Inter', system-ui, sans-serif;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --backdrop-blur: 0px;
  --transition-speed: 150ms;
  --border-width: 1px;

  --nav-item-hover-bg: #f3f4f6;
  --nav-item-active-bg: rgba(240, 106, 106, 0.08);
  --nav-item-active-border: #f06a6a;
  --nav-group-label: #9ca3af;
  --sidebar-logo-effect: none;
}
```

#### Dark Mode
```css
[data-theme="basic"].dark {
  --bg-app: #111827;
  --bg-card: #1f2937;
  --bg-card-hover: #374151;
  --bg-sidebar: #1f2937;
  --bg-header: rgba(31, 41, 55, 0.95);
  --bg-input: #374151;
  --bg-modal-overlay: rgba(0, 0, 0, 0.7);
  --bg-tooltip: #374151;

  --border-default: #374151;
  --border-card: #374151;
  --border-input: #4b5563;
  --border-input-focus: #f06a6a;
  --border-active: #f06a6a;
  --border-sidebar: #374151;

  --text-primary: #f9fafb;
  --text-secondary: #9ca3af;
  --text-tertiary: #6b7280;
  --text-accent: #f87171;
  --text-on-accent: #ffffff;

  --accent-primary: #f87171;
  --accent-primary-hover: #f06a6a;
  --accent-primary-bg: rgba(248, 113, 113, 0.1);
  --accent-secondary: #a78bfa;
  --accent-success: #34d399;
  --accent-danger: #f87171;

  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.2);
  --shadow-card-hover: 0 4px 12px rgba(0, 0, 0, 0.3);
  --shadow-button: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-modal: 0 20px 60px rgba(0, 0, 0, 0.4);
  --shadow-input-focus: 0 0 0 3px rgba(248, 113, 113, 0.2);

  --font-ui: 'Inter', system-ui, sans-serif;
  --font-mono: 'Inter', system-ui, sans-serif;
  --font-heading: 'Inter', system-ui, sans-serif;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --backdrop-blur: 0px;
  --transition-speed: 150ms;
  --border-width: 1px;

  --nav-item-hover-bg: #374151;
  --nav-item-active-bg: rgba(248, 113, 113, 0.1);
  --nav-item-active-border: #f87171;
  --nav-group-label: #6b7280;
  --sidebar-logo-effect: none;
}
```

### CLASSIC (Office 365/Teams)

#### Light Mode (default)
```css
[data-theme="classic"].light {
  --bg-app: #f3f2f1;
  --bg-card: #ffffff;
  --bg-card-hover: #f3f2f1;
  --bg-sidebar: #faf9f8;
  --bg-header: #ffffff;
  --bg-input: #ffffff;
  --bg-modal-overlay: rgba(0, 0, 0, 0.4);
  --bg-tooltip: #323130;

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

  --accent-primary: #0078d4;
  --accent-primary-hover: #106ebe;
  --accent-primary-bg: rgba(0, 120, 212, 0.06);
  --accent-secondary: #8764b8;
  --accent-success: #107c10;
  --accent-danger: #d13438;

  --shadow-card: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-card-hover: 0 2px 4px rgba(0, 0, 0, 0.08);
  --shadow-button: none;
  --shadow-modal: 0 8px 32px rgba(0, 0, 0, 0.14);
  --shadow-input-focus: 0 0 0 2px rgba(0, 120, 212, 0.3);

  --font-ui: 'Segoe UI', -apple-system, system-ui, sans-serif;
  --font-mono: 'Consolas', 'Courier New', monospace;
  --font-heading: 'Segoe UI', -apple-system, system-ui, sans-serif;

  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 4px;
  --radius-xl: 8px;
  --backdrop-blur: 0px;
  --transition-speed: 100ms;
  --border-width: 1px;

  --nav-item-hover-bg: #f3f2f1;
  --nav-item-active-bg: rgba(0, 120, 212, 0.06);
  --nav-item-active-border: #0078d4;
  --nav-group-label: #a19f9d;
  --sidebar-logo-effect: none;
}
```

#### Dark Mode
```css
[data-theme="classic"].dark {
  --bg-app: #1b1a19;
  --bg-card: #292827;
  --bg-card-hover: #323130;
  --bg-sidebar: #201f1e;
  --bg-header: #201f1e;
  --bg-input: #323130;
  --bg-modal-overlay: rgba(0, 0, 0, 0.7);
  --bg-tooltip: #484644;

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

  --accent-primary: #2b88d8;
  --accent-primary-hover: #3c96df;
  --accent-primary-bg: rgba(43, 136, 216, 0.1);
  --accent-secondary: #a78bfa;
  --accent-success: #54b054;
  --accent-danger: #f1707b;

  --shadow-card: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-card-hover: 0 2px 4px rgba(0, 0, 0, 0.3);
  --shadow-button: none;
  --shadow-modal: 0 8px 32px rgba(0, 0, 0, 0.4);
  --shadow-input-focus: 0 0 0 2px rgba(43, 136, 216, 0.4);

  --font-ui: 'Segoe UI', -apple-system, system-ui, sans-serif;
  --font-mono: 'Consolas', 'Courier New', monospace;
  --font-heading: 'Segoe UI', -apple-system, system-ui, sans-serif;

  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 4px;
  --radius-xl: 8px;
  --backdrop-blur: 0px;
  --transition-speed: 100ms;
  --border-width: 1px;

  --nav-item-hover-bg: #323130;
  --nav-item-active-bg: rgba(43, 136, 216, 0.1);
  --nav-item-active-border: #2b88d8;
  --nav-group-label: #8a8886;
  --sidebar-logo-effect: none;
}
```

## Animation System

### Group 1: Universal Animations (all themes)
- `fade-in`, `slide-up`, `slide-in-right`, `page-enter` — page transitions
- `section-reveal` — section entrance
- `badge-bounce`, `tooltip-origin`, `breadcrumb-slide` — micro-interactions
- `row-flash`, `progress-update` — state feedback
- `skeleton-dissolve` — loading states

### Group 2: TECH-HUD Exclusive
Active ONLY when `[data-theme="tech-hud"]`:
- `scan-line` — vertical sweep every 4s
- `glow-pulse` — neon pulsation
- `border-trace` — luminous border tracing
- `data-reveal` — terminal-style data appearance
- `sidebar-glow` — sidebar lateral glow
- `ring-spin` — HudStatusRing rotation (8s loop)
- `card-power-on` — card power-on with glow
- `ambient-pulse` — subtle ambient pulsation
- `glow-line` — animated luminous line
- `alert-border-pulse` — alert border pulse

### Group 3: Theme-Specific Card Animations
- **TECH-HUD**: `card-power-on` (0.5s, glow + scale)
- **BASIC**: `fade-in` + `scale(0.98→1)` (0.2s, subtle)
- **CLASSIC**: None (instant, professional)

### HUD Decorative Elements Conditional Rendering
```css
/* Only show in TECH-HUD theme */
[data-theme="tech-hud"] .hud-corners,
[data-theme="tech-hud"] .hud-frame,
[data-theme="tech-hud"] .hud-scan,
[data-theme="tech-hud"] .hud-brackets,
[data-theme="tech-hud"] .hud-target { display: block; }

:not([data-theme="tech-hud"]) .hud-corners,
:not([data-theme="tech-hud"]) .hud-frame,
:not([data-theme="tech-hud"]) .hud-scan,
:not([data-theme="tech-hud"]) .hud-brackets,
:not([data-theme="tech-hud"]) .hud-target { display: none; }
```

## File Changes

### Files to Modify

| File | Change | Effort |
|------|--------|--------|
| `stores/themeStore.ts` | Add `themeStyle` property, `data-theme` DOM sync | Small |
| `styles/index.css` | Refactor all component classes to use CSS variables, add 6 theme blocks | Large |
| `tailwind.config.js` | Reference CSS variables for key colors, add Segoe UI font | Medium |
| `index.html` | Preload Segoe UI font | Tiny |
| `pages/profile/ProfilePage.tsx` | Add theme selector section with preview cards | Medium |
| HUD components (5 files) | No changes needed — CSS conditional rendering handles visibility | None |
| Layout components | No changes — CSS classes adapt automatically | None |
| Page components | No changes — CSS classes adapt automatically | None |

### Files NOT Changed
- All React components using `.card`, `.btn-*`, `.input`, `.badge-*`, `.nav-*` classes
- All page components
- All layout components (Sidebar, Header, DashboardLayout)
- Backend (no changes needed)

## Theme Store Changes

```typescript
// themeStore.ts additions
interface ThemeState {
  theme: 'light' | 'dark' | 'system';       // existing
  themeStyle: 'tech-hud' | 'basic' | 'classic'; // new
  setThemeStyle: (style: ThemeStyle) => void;    // new
}

// Apply theme style via data-theme attribute on <html>
const applyThemeStyle = (style: ThemeStyle) => {
  document.documentElement.setAttribute('data-theme', style);
};
```

## Profile Page Theme Selector

Add a "Tema" section in ProfilePage with 3 cards showing:
- Theme name + description
- Mini color palette preview (4-5 color swatches)
- Selected state indicator (checkmark + accent border)
- Click to switch theme instantly

The dark/light toggle remains separate (existing in header).

## CSS Refactoring Strategy

### Step 1: Define CSS Variables
Add 6 theme definition blocks at the top of `index.css` (before `@layer base`).

### Step 2: Refactor Component Classes
Replace hardcoded values with `var(--token-name)`:

```css
/* BEFORE */
.card {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(6, 182, 212, 0.25);
  box-shadow: 0 0 12px rgba(6, 182, 212, 0.08);
}

/* AFTER */
.card {
  background: var(--bg-card);
  border: var(--border-width) solid var(--border-card);
  box-shadow: var(--shadow-card);
  border-radius: var(--radius-lg);
}
```

### Step 3: Conditional Decorations
Wrap HUD-specific pseudo-elements in `[data-theme="tech-hud"]` selectors.

### Step 4: Remove `:root:not(.dark)` overrides
The 45+ light mode override rules become unnecessary — variables handle both modes.

## Background Patterns

### TECH-HUD
- `.bg-grid-pattern`: 40px cells, cyan lines at 0.05 opacity
- `.bg-vignette`: Radial gradient overlay

### BASIC
- No background pattern (clean white/gray)

### CLASSIC
- No background pattern (solid Office background)

```css
[data-theme="tech-hud"] .bg-grid-pattern { display: block; }
:not([data-theme="tech-hud"]) .bg-grid-pattern { display: none; }
```

## Accessibility

- All themes maintain WCAG AA contrast ratios
- `prefers-reduced-motion` respected across all themes
- Focus indicators visible in all themes (ring or outline based)
- Keyboard navigation works identically across themes
- Screen readers unaffected (semantic HTML unchanged)

## Future Extensibility

Adding a 4th theme requires:
1. Add theme definition block (CSS variables for light + dark)
2. Add option to ProfilePage selector
3. Add type to ThemeStyle union
4. No component changes needed
