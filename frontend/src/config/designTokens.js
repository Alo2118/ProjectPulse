/**
 * Design System Tokens - Colori & Spacing per Light/Dark Theme
 * Usa le varianti Tailwind dark: per il theme switching
 */

export const designTokens = {
  // Colori con varianti dark: integrate
  colors: {
    // Backgrounds
    bg: {
      primary: 'bg-white dark:bg-slate-900/70',
      secondary: 'bg-slate-50 dark:bg-slate-800',
      tertiary: 'bg-slate-100 dark:bg-slate-900/60',
      hover: 'hover:bg-slate-100 dark:hover:bg-slate-800/60',
    },
    // Testi
    text: {
      primary: 'text-slate-900 dark:text-white',
      secondary: 'text-slate-600 dark:text-slate-200',
      tertiary: 'text-slate-500 dark:text-slate-300',
      light: 'text-slate-400 dark:text-slate-400',
    },
    // Bordi
    border: 'border-slate-200 dark:border-slate-700/50',
    borderLight: 'border-slate-100 dark:border-slate-800/30',
    divider: 'divide-slate-200 dark:divide-slate-700/30',
    // Accenti
    accent: 'text-blue-600 dark:text-cyan-400',
    accentBg: 'bg-blue-50 dark:bg-cyan-500/10',
    
    // Semantic Colors - Success
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      bgHover: 'hover:bg-emerald-100 dark:hover:bg-emerald-500/20',
      text: 'text-emerald-700 dark:text-emerald-300',
      textLight: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-500/30',
      borderLight: 'border-emerald-100 dark:border-emerald-500/20',
      solid: 'bg-emerald-500',
      solidHover: 'hover:bg-emerald-600',
    },
    
    // Semantic Colors - Error/Danger
    error: {
      bg: 'bg-red-50 dark:bg-red-500/10',
      bgHover: 'hover:bg-red-100 dark:hover:bg-red-500/20',
      text: 'text-red-700 dark:text-red-300',
      textLight: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-500/30',
      borderLight: 'border-red-100 dark:border-red-500/20',
      solid: 'bg-red-500',
      solidHover: 'hover:bg-red-600',
    },
    
    // Semantic Colors - Warning
    warning: {
      bg: 'bg-orange-50 dark:bg-orange-500/10',
      bgHover: 'hover:bg-orange-100 dark:hover:bg-orange-500/20',
      text: 'text-orange-700 dark:text-orange-300',
      textLight: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-500/30',
      borderLight: 'border-orange-100 dark:border-orange-500/20',
      solid: 'bg-orange-500',
      solidHover: 'hover:bg-orange-600',
    },
    
    // Semantic Colors - Info/Primary
    info: {
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      bgHover: 'hover:bg-blue-100 dark:hover:bg-blue-500/20',
      text: 'text-blue-700 dark:text-blue-300',
      textLight: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-500/30',
      borderLight: 'border-blue-100 dark:border-blue-500/20',
      solid: 'bg-blue-500',
      solidHover: 'hover:bg-blue-600',
    },
    
    // Cyan (brand accent color - molto usato nell'app)
    cyan: {
      bg: 'bg-cyan-50 dark:bg-cyan-500/10',
      bgHover: 'hover:bg-cyan-100 dark:hover:bg-cyan-500/20',
      text: 'text-cyan-700 dark:text-cyan-300',
      textLight: 'text-cyan-600 dark:text-cyan-400',
      textBright: 'text-cyan-500 dark:text-cyan-200',
      border: 'border-cyan-200 dark:border-cyan-500/30',
      borderLight: 'border-cyan-100 dark:border-cyan-500/20',
      solid: 'bg-cyan-500',
      solidHover: 'hover:bg-cyan-600',
    },
    
    // Yellow (per stati pending/waiting)
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-500/10',
      bgHover: 'hover:bg-yellow-100 dark:hover:bg-yellow-500/20',
      text: 'text-yellow-700 dark:text-yellow-300',
      textLight: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-200 dark:border-yellow-500/30',
      borderLight: 'border-yellow-100 dark:border-yellow-500/20',
      solid: 'bg-yellow-500',
      solidHover: 'hover:bg-yellow-600',
    },
  },

  // Spacing
  spacing: {
    containerX: 'px-4 md:px-6 lg:px-8',
    containerY: 'py-4 md:py-6 lg:py-8',
    sectionY: 'py-6 md:py-8 lg:py-10',
    sectionX: 'px-4 md:px-6',
    cardP: 'p-4 md:p-6',
    cardPy: 'py-4 md:py-6',
    cardPx: 'px-4 md:px-6',
    gap: 'gap-4 md:gap-6',
    gapSm: 'gap-2 md:gap-3',
    gapLg: 'gap-6 md:gap-8',
    mb: 'mb-4 md:mb-6',
    mt: 'mt-4 md:mt-6',
  },

  // Layout utilities
  layouts: {
    pageHeader: 'flex items-center justify-between mb-6 md:mb-8',
    pageTitle: 'text-3xl md:text-4xl font-bold',
    pageSubtitle: 'text-lg text-opacity-75',
    grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6',
    gridWide: 'grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6',
    gridNarrow: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4',
    flexCenter: 'flex items-center justify-center',
    flexBetween: 'flex items-center justify-between',
    flexStart: 'flex items-center justify-start',
  },

  // Component styles
  components: {
    buttonSm: 'px-3 py-1.5 text-sm',
    buttonMd: 'px-4 py-2 text-base',
    buttonLg: 'px-6 py-3 text-lg',
    inputBase: 'rounded-lg px-3 py-2 text-base transition-all',
    inputBorder: 'border-2 focus:ring-2 focus:ring-offset-2',
    cardBorder: 'border rounded-lg',
    cardShadow: 'shadow-md hover:shadow-lg transition-shadow',
    badge: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold',
    backdrop: 'fixed inset-0 bg-black/50 backdrop-blur-sm',
  },

  // Gradients
  gradients: {
    primary: 'from-cyan-600 to-blue-700',
    success: 'from-emerald-600 to-green-700',
    danger: 'from-red-600 to-red-700',
    warning: 'from-orange-600 to-amber-700',
    info: 'from-blue-600 to-cyan-700',
  },
};

/**
 * Utility per ottenere tutti i token
 */
export const getThemeTokens = () => designTokens;
