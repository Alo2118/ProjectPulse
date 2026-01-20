/**
 * ============================================
 * CYBER HOLOGRAPHIC DESIGN SYSTEM - IRON MAN
 * ============================================
 *
 * Ispirato ai film di Iron Man - interfacce futuristiche,
 * effetti olografici, colori neon, glassmorphism
 */

export const theme = {
  // ==================== COLORS ====================
  colors: {
    // Primary Cyber Colors
    cyber: {
      blue: '#00D9FF',      // Cyan brillante principale
      blueGlow: '#0AF',     // Blu elettrico
      gold: '#FFD700',      // Oro Arc Reactor
      purple: '#AA00FF',    // Viola accento
      pink: '#FF00FF',      // Rosa neon
    },

    // Backgrounds
    bg: {
      primary: 'bg-black',
      secondary: 'bg-gray-950',
      tertiary: 'bg-gray-900',
      glass: 'bg-black/40 backdrop-blur-xl',
      glassLight: 'bg-black/20 backdrop-blur-lg',
      gradient: 'bg-gradient-to-br from-black via-gray-950 to-cyan-950/20',
    },

    // Text colors
    text: {
      primary: 'text-cyan-300',
      secondary: 'text-cyan-400',
      muted: 'text-cyan-500',
      gold: 'text-yellow-400',
      white: 'text-white',
      glow: 'text-cyan-300 drop-shadow-[0_0_10px_rgba(0,217,255,0.8)]',
      goldGlow: 'text-yellow-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]',
    },

    // Border colors
    border: {
      cyber: 'border-cyan-500/50',
      cyberBright: 'border-cyan-400/70',
      gold: 'border-yellow-500/50',
      glow: 'border-cyan-500 shadow-[0_0_10px_rgba(0,217,255,0.5)]',
    },

    // Status colors
    status: {
      success: {
        bg: 'bg-green-500/10',
        text: 'text-green-400',
        border: 'border-green-500/50',
        glow: 'shadow-[0_0_15px_rgba(34,197,94,0.5)]',
      },
      error: {
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        border: 'border-red-500/50',
        glow: 'shadow-[0_0_15px_rgba(239,68,68,0.5)]',
      },
      warning: {
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-400',
        border: 'border-yellow-500/50',
        glow: 'shadow-[0_0_15px_rgba(234,179,8,0.5)]',
      },
      info: {
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
        border: 'border-blue-500/50',
        glow: 'shadow-[0_0_15px_rgba(59,130,246,0.5)]',
      },
    },
  },

  // ==================== COMPONENTS ====================
  card: {
    // Glass morphism card con glow
    glass: 'relative bg-black/40 backdrop-blur-xl border-2 border-cyan-500/30 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(0,217,255,0.2)] hover:shadow-[0_0_50px_rgba(0,217,255,0.4)] transition-all duration-300',

    // Card solida con effetto cyber
    solid: 'relative bg-gray-950 border-2 border-cyan-500/50 rounded-lg shadow-[0_0_20px_rgba(0,217,255,0.3)] hover:border-cyan-400/70 transition-all duration-300',

    // Card con bordo animato
    animated: 'relative bg-black/60 backdrop-blur-lg border-2 border-cyan-500/40 rounded-lg overflow-hidden animate-glow-pulse',

    // Card piatta minimal
    flat: 'bg-gray-900/50 border border-cyan-500/20 rounded-lg backdrop-blur-sm',

    // Arc Reactor style (importante)
    reactor: 'relative bg-gradient-to-br from-cyan-950/30 to-black border-2 border-cyan-500/60 rounded-full shadow-[0_0_50px_rgba(0,217,255,0.6)] animate-glow-pulse',

    // Padding variants
    padding: {
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
      xl: 'p-8',
    },
  },

  button: {
    // Base
    base: 'relative inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden',

    // Primary - Cyber Glow
    primary: 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white border-2 border-cyan-400/50 shadow-[0_0_20px_rgba(0,217,255,0.5)] hover:shadow-[0_0_40px_rgba(0,217,255,0.8)] hover:scale-105 focus:ring-cyan-500',

    // Secondary - Glass
    secondary: 'bg-black/40 backdrop-blur-lg text-cyan-300 border-2 border-cyan-500/40 hover:bg-black/60 hover:border-cyan-400/60 hover:shadow-[0_0_20px_rgba(0,217,255,0.4)] focus:ring-cyan-500',

    // Gold - Arc Reactor style
    gold: 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-black border-2 border-yellow-400/50 shadow-[0_0_20px_rgba(255,215,0,0.5)] hover:shadow-[0_0_40px_rgba(255,215,0,0.8)] hover:scale-105 focus:ring-yellow-500',

    // Danger
    danger: 'bg-red-500/20 text-red-400 border-2 border-red-500/50 hover:bg-red-500/30 hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] focus:ring-red-500',

    // Success
    success: 'bg-green-500/20 text-green-400 border-2 border-green-500/50 hover:bg-green-500/30 hover:shadow-[0_0_20px_rgba(34,197,94,0.5)] focus:ring-green-500',

    // Ghost
    ghost: 'text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 focus:ring-cyan-500',

    // Sizes
    size: {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-5 py-2.5 text-base gap-2',
      lg: 'px-7 py-3.5 text-lg gap-3',
      xl: 'px-10 py-4 text-xl gap-3',
    },
  },

  input: {
    // Base input con effetto cyber
    base: 'bg-black/40 backdrop-blur-lg border-2 border-cyan-500/30 text-cyan-100 placeholder-cyan-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]',

    // Sizes
    size: {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2.5 text-base',
      lg: 'px-5 py-3 text-lg',
    },

    // States
    error: 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500',
    success: 'border-green-500/50 focus:ring-green-500/50 focus:border-green-500',
  },

  badge: {
    base: 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border-2 backdrop-blur-lg uppercase tracking-wider',

    // Task status
    status: {
      todo: 'bg-gray-700/30 text-gray-300 border-gray-500/50 shadow-[0_0_10px_rgba(107,114,128,0.3)]',
      in_progress: 'bg-cyan-900/30 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(0,217,255,0.4)] animate-glow-pulse',
      blocked: 'bg-red-900/30 text-red-300 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.4)]',
      waiting_clarification: 'bg-yellow-900/30 text-yellow-300 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.4)]',
      completed: 'bg-green-900/30 text-green-300 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.4)]',
    },

    // Priority
    priority: {
      low: 'bg-gray-700/30 text-gray-300 border-gray-500/50',
      medium: 'bg-yellow-700/30 text-yellow-300 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.3)]',
      high: 'bg-red-700/30 text-red-300 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-glow-pulse',
    },

    // Semantic
    cyber: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/60 shadow-[0_0_15px_rgba(0,217,255,0.5)]',
    gold: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/60 shadow-[0_0_15px_rgba(255,215,0,0.5)]',
  },

  // ==================== LAYOUT ====================
  layout: {
    // Page con background cyber
    page: 'min-h-screen bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-black to-black relative overflow-hidden',

    // Container
    container: {
      sm: 'max-w-screen-sm mx-auto',
      md: 'max-w-screen-md mx-auto',
      lg: 'max-w-screen-lg mx-auto',
      xl: 'max-w-screen-xl mx-auto',
      '2xl': 'max-w-screen-2xl mx-auto',
      full: 'w-full',
    },

    // Section spacing
    section: {
      base: 'space-y-4',
      lg: 'space-y-6',
      xl: 'space-y-8',
    },

    // Grid
    grid: {
      cols1: 'grid grid-cols-1 gap-4',
      cols2: 'grid grid-cols-1 md:grid-cols-2 gap-4',
      cols3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
      cols4: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4',
    },

    // Flex
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
    // Headings con effetto glow
    h1: 'text-5xl md:text-6xl font-bold text-cyan-300 drop-shadow-[0_0_20px_rgba(0,217,255,0.8)] uppercase tracking-wider animate-text-glow',
    h2: 'text-4xl md:text-5xl font-bold text-cyan-300 drop-shadow-[0_0_15px_rgba(0,217,255,0.7)] uppercase tracking-wide',
    h3: 'text-3xl md:text-4xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(0,217,255,0.6)] uppercase',
    h4: 'text-2xl md:text-3xl font-semibold text-cyan-400 drop-shadow-[0_0_8px_rgba(0,217,255,0.5)]',
    h5: 'text-xl md:text-2xl font-semibold text-cyan-400 drop-shadow-[0_0_5px_rgba(0,217,255,0.4)]',
    h6: 'text-lg md:text-xl font-medium text-cyan-500',

    // Body text
    body: 'text-base text-cyan-100',
    bodySmall: 'text-sm text-cyan-200',
    caption: 'text-xs text-cyan-300',

    // Labels
    label: 'text-sm font-bold text-cyan-400 uppercase tracking-wider',

    // Special
    mono: 'font-mono text-cyan-400 bg-black/50 px-2 py-1 rounded border border-cyan-500/30',
  },

  // ==================== EFFECTS ====================
  effects: {
    // Glow effects
    glow: {
      sm: 'shadow-[0_0_10px_rgba(0,217,255,0.3)]',
      md: 'shadow-[0_0_20px_rgba(0,217,255,0.4)]',
      lg: 'shadow-[0_0_30px_rgba(0,217,255,0.5)]',
      xl: 'shadow-[0_0_50px_rgba(0,217,255,0.6)]',
      gold: 'shadow-[0_0_30px_rgba(255,215,0,0.5)]',
    },

    // Glass morphism
    glass: {
      light: 'bg-black/20 backdrop-blur-lg',
      medium: 'bg-black/40 backdrop-blur-xl',
      heavy: 'bg-black/60 backdrop-blur-2xl',
    },

    // Gradients
    gradient: {
      cyber: 'bg-gradient-to-r from-cyan-600 via-cyan-500 to-cyan-600',
      gold: 'bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600',
      rainbow: 'bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500',
    },

    // Ring/Focus
    ring: {
      cyber: 'ring-2 ring-cyan-500/50 ring-offset-2 ring-offset-black',
      gold: 'ring-2 ring-yellow-500/50 ring-offset-2 ring-offset-black',
    },

    // Backdrop
    backdrop: 'fixed inset-0 bg-black/80 backdrop-blur-sm',

    // Scanlines overlay
    scanlines: 'relative before:absolute before:inset-0 before:bg-[linear-gradient(transparent_50%,rgba(0,217,255,0.03)_50%)] before:bg-[length:100%_4px] before:pointer-events-none',
  },

  // ==================== ANIMATIONS ====================
  animation: {
    fadeIn: 'animate-fade-in',
    slideBottom: 'animate-slide-bottom',
    slideRight: 'animate-slide-right',
    scaleIn: 'animate-scale-in',
    hologram: 'animate-hologram',
    glowPulse: 'animate-glow-pulse',
    textGlow: 'animate-text-glow',
    dataStream: 'animate-data-stream',
    shimmer: 'animate-shimmer',
    glitch: 'animate-glitch',
  },

  // ==================== UTILITIES ====================
  utils: {
    // Truncate
    truncate: 'truncate',
    lineClamp: {
      1: 'line-clamp-1',
      2: 'line-clamp-2',
      3: 'line-clamp-3',
    },

    // Scrollbar custom
    scrollbar: 'scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-black',

    // Transitions
    transition: {
      default: 'transition-all duration-300 ease-out',
      fast: 'transition-all duration-150 ease-out',
      slow: 'transition-all duration-500 ease-out',
    },

    // Dividers
    divider: {
      horizontal: 'h-px w-full bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent',
      vertical: 'w-px h-full bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent',
    },
  },

  // ==================== SPECIAL COMPONENTS ====================
  special: {
    // HUD (Heads Up Display) style
    hud: 'relative bg-black/60 backdrop-blur-xl border-2 border-cyan-500/40 rounded-none clip-path-[polygon(0_0,100%_0,100%_calc(100%-12px),calc(100%-12px)_100%,0_100%)] shadow-[0_0_30px_rgba(0,217,255,0.3)]',

    // Hexagon shape
    hexagon: 'clip-path-[polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]',

    // Corner accent (per HUD)
    cornerAccent: 'absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 border-yellow-500 shadow-[0_0_10px_rgba(255,215,0,0.6)]',

    // Data grid background
    dataGrid: 'bg-[linear-gradient(rgba(0,217,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,217,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]',
  },
};

/**
 * Utility per combinare classi del theme
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Hook per usare il theme nei componenti
 */
export function useDesignSystem() {
  return theme;
}

export default theme;
