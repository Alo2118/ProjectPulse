/**
 * DESIGN SYSTEM UNIFICATO - ProjectPulse
 *
 * Questo è l'UNICA fonte di verità per il design system.
 * Usa questi token invece di classi hardcoded!
 *
 * Esempio:
 * ❌ SBAGLIATO: className="bg-slate-800/50 border-2 border-cyan-500/30"
 * ✅ CORRETTO: className={theme.card.base}
 */

export const theme = {
  // ==================== COLORS ====================
  colors: {
    // Backgrounds
    bg: {
      primary: 'bg-slate-900',
      secondary: 'bg-slate-800',
      tertiary: 'bg-slate-700',
      // Con opacity
      primaryAlpha: 'bg-slate-900/70',
      secondaryAlpha: 'bg-slate-800/50',
      tertiaryAlpha: 'bg-slate-700/30',
      // Hover states
      hover: 'hover:bg-slate-800',
      hoverAlpha: 'hover:bg-slate-800/60',
    },

    // Text colors
    text: {
      primary: 'text-white',
      secondary: 'text-slate-200',
      tertiary: 'text-slate-300',
      muted: 'text-slate-400',
      disabled: 'text-slate-500',
      // Brand colors
      accent: 'text-cyan-300',
      accentBright: 'text-cyan-400',
      accentDim: 'text-cyan-500',
    },

    // Border colors
    border: {
      default: 'border-slate-700',
      light: 'border-slate-600',
      lighter: 'border-slate-500',
      // Con opacity
      defaultAlpha: 'border-slate-700/50',
      lightAlpha: 'border-slate-600/30',
      // Brand colors
      accent: 'border-cyan-500',
      accentAlpha: 'border-cyan-500/30',
    },

    // Semantic colors
    status: {
      success: {
        bg: 'bg-emerald-500/10',
        bgHover: 'hover:bg-emerald-500/20',
        text: 'text-emerald-300',
        textDark: 'text-emerald-400',
        border: 'border-emerald-500/30',
        solid: 'bg-emerald-600',
      },
      error: {
        bg: 'bg-red-500/10',
        bgHover: 'hover:bg-red-500/20',
        text: 'text-red-300',
        textDark: 'text-red-400',
        border: 'border-red-500/30',
        solid: 'bg-red-600',
      },
      warning: {
        bg: 'bg-yellow-500/10',
        bgHover: 'hover:bg-yellow-500/20',
        text: 'text-yellow-300',
        textDark: 'text-yellow-400',
        border: 'border-yellow-500/30',
        solid: 'bg-yellow-600',
      },
      info: {
        bg: 'bg-blue-500/10',
        bgHover: 'hover:bg-blue-500/20',
        text: 'text-blue-300',
        textDark: 'text-blue-400',
        border: 'border-blue-500/30',
        solid: 'bg-blue-600',
      },
    },
  },

  // ==================== SPACING ====================
  spacing: {
    // Padding
    p: {
      xs: 'p-2',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
      xl: 'p-8',
    },
    px: {
      xs: 'px-2',
      sm: 'px-3',
      md: 'px-4',
      lg: 'px-6',
      xl: 'px-8',
    },
    py: {
      xs: 'py-2',
      sm: 'py-3',
      md: 'py-4',
      lg: 'py-6',
      xl: 'py-8',
    },
    // Gaps
    gap: {
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    },
    // Margins
    mb: {
      xs: 'mb-2',
      sm: 'mb-3',
      md: 'mb-4',
      lg: 'mb-6',
      xl: 'mb-8',
    },
    mt: {
      xs: 'mt-2',
      sm: 'mt-3',
      md: 'mt-4',
      lg: 'mt-6',
      xl: 'mt-8',
    },
  },

  // ==================== COMPONENTS ====================
  card: {
    // Base card (usalo come default)
    base: 'bg-slate-800/50 border-2 border-cyan-500/30 rounded-lg shadow-lg shadow-cyan-500/10 transition-all',
    // Varianti
    hover: 'bg-slate-800/50 border-2 border-cyan-500/30 rounded-lg shadow-lg shadow-cyan-500/10 hover:shadow-xl hover:shadow-cyan-500/20 transition-all',
    flat: 'bg-slate-800 border border-slate-700 rounded-lg',
    elevated: 'bg-slate-800/70 border-2 border-cyan-500/40 rounded-xl shadow-2xl shadow-cyan-500/20',
    // Padding variants
    padding: {
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    },
  },

  button: {
    // Base
    base: 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
    // Variants
    primary: 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 focus:ring-cyan-500',
    secondary: 'bg-slate-700/50 text-cyan-300 border-2 border-cyan-500/30 hover:bg-slate-700 focus:ring-cyan-500',
    danger: 'bg-red-600/20 text-red-400 border-2 border-red-500/30 hover:bg-red-600/30 focus:ring-red-500',
    success: 'bg-green-600/20 text-green-400 border-2 border-green-500/30 hover:bg-green-600/30 focus:ring-green-500',
    ghost: 'text-cyan-400 hover:bg-slate-800/50 hover:text-cyan-300 focus:ring-cyan-500',
    // Sizes
    size: {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2.5',
    },
  },

  input: {
    base: 'bg-slate-800/30 border-2 border-cyan-500/20 text-slate-100 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed',
    // Sizes
    size: {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-5 py-3 text-lg',
    },
    // States
    error: 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500',
    success: 'border-green-500/50 focus:ring-green-500/50 focus:border-green-500',
  },

  badge: {
    base: 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
    // Task status variants
    status: {
      todo: 'bg-slate-700/50 text-slate-200 border-slate-600',
      in_progress: 'bg-blue-900/50 text-blue-300 border-blue-700',
      blocked: 'bg-red-900/50 text-red-300 border-red-700',
      waiting_clarification: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
      completed: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
    },
    // Priority variants
    priority: {
      low: 'bg-slate-700/50 text-slate-300 border-slate-600',
      medium: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
      high: 'bg-red-900/50 text-red-300 border-red-700',
    },
    // User role variants
    role: {
      amministratore: 'bg-slate-700/50 text-slate-200 border-slate-600',
      direzione: 'bg-purple-900/50 text-purple-300 border-purple-700',
      dipendente: 'bg-blue-900/50 text-blue-300 border-blue-700',
    },
    // Generic semantic
    success: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40',
    error: 'bg-red-600/20 text-red-300 border-red-500/40',
    warning: 'bg-yellow-600/20 text-yellow-300 border-yellow-500/40',
    info: 'bg-cyan-600/20 text-cyan-300 border-cyan-500/40',
  },

  // ==================== LAYOUT ====================
  layout: {
    page: 'min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950',
    container: {
      sm: 'max-w-screen-sm mx-auto',
      md: 'max-w-screen-md mx-auto',
      lg: 'max-w-screen-lg mx-auto',
      xl: 'max-w-screen-xl mx-auto',
      full: 'w-full',
    },
    section: {
      base: 'space-y-4',
      lg: 'space-y-6',
      xl: 'space-y-8',
    },
    grid: {
      cols1: 'grid grid-cols-1 gap-4',
      cols2: 'grid grid-cols-1 md:grid-cols-2 gap-4',
      cols3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
      cols4: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4',
    },
    flex: {
      center: 'flex items-center justify-center',
      between: 'flex items-center justify-between',
      start: 'flex items-center justify-start',
      end: 'flex items-center justify-end',
      col: 'flex flex-col',
      colCenter: 'flex flex-col items-center justify-center',
    },
  },

  // ==================== TYPOGRAPHY ====================
  typography: {
    h1: 'text-4xl md:text-5xl font-bold text-cyan-300',
    h2: 'text-3xl md:text-4xl font-bold text-cyan-300',
    h3: 'text-2xl md:text-3xl font-semibold text-cyan-300',
    h4: 'text-xl md:text-2xl font-semibold text-cyan-300',
    h5: 'text-lg md:text-xl font-semibold text-cyan-400',
    h6: 'text-base md:text-lg font-medium text-cyan-400',
    body: 'text-base text-slate-200',
    bodySmall: 'text-sm text-slate-300',
    caption: 'text-xs text-slate-400',
    label: 'text-sm font-medium text-cyan-400',
  },

  // ==================== EFFECTS ====================
  effects: {
    shadow: {
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg shadow-cyan-500/10',
      xl: 'shadow-xl shadow-cyan-500/20',
      '2xl': 'shadow-2xl shadow-cyan-500/30',
    },
    ring: {
      default: 'ring-2 ring-cyan-500/50',
      focus: 'focus:ring-2 focus:ring-cyan-500/50',
      error: 'ring-2 ring-red-500/50',
      success: 'ring-2 ring-green-500/50',
    },
    gradient: {
      primary: 'bg-gradient-to-r from-cyan-600 to-blue-600',
      secondary: 'bg-gradient-to-r from-slate-700 to-slate-800',
      success: 'bg-gradient-to-r from-emerald-600 to-green-700',
      danger: 'bg-gradient-to-r from-red-600 to-red-700',
      warning: 'bg-gradient-to-r from-orange-600 to-amber-700',
    },
    backdrop: 'fixed inset-0 bg-black/50 backdrop-blur-sm',
  },

  // ==================== ANIMATIONS ====================
  animation: {
    fadeIn: 'animate-fade-in',
    slideUp: 'animate-slide-up',
    pulse: 'animate-pulse',
    spin: 'animate-spin',
  },

  // ==================== UTILITIES ====================
  utils: {
    // Truncate text
    truncate: 'truncate',
    lineClamp: {
      1: 'line-clamp-1',
      2: 'line-clamp-2',
      3: 'line-clamp-3',
    },
    // Scrollbar
    scrollbar: 'scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900',
    // Transitions
    transition: {
      default: 'transition-all duration-200',
      fast: 'transition-all duration-100',
      slow: 'transition-all duration-300',
    },
  },
};

/**
 * Utility per combinare classi del theme
 * @param {...string} classes - Classi da combinare
 * @returns {string} Classi combinate
 *
 * @example
 * cn(theme.card.base, theme.spacing.p.md, 'custom-class')
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Hook per usare il theme nei componenti
 * @returns {object} Theme object
 */
export function useDesignSystem() {
  return theme;
}

export default theme;
