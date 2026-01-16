/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // Status colors - dynamic classes used in reports and tasks
    {
      pattern: /bg-(emerald|blue|cyan|slate|red|orange|yellow|purple|pink|green|sky|rose|indigo|violet)-(50|100|200|300|400|500|600|700|800|900)/,
      variants: ['hover', 'focus', 'active', 'group-hover'],
    },
    {
      pattern: /text-(emerald|blue|cyan|slate|red|orange|yellow|purple|pink|green|sky|rose|indigo|violet)-(50|100|200|300|400|500|600|700|800|900)/,
      variants: ['hover', 'focus', 'active', 'group-hover'],
    },
    {
      pattern: /border-(emerald|blue|cyan|slate|red|orange|yellow|purple|pink|green|sky|rose|indigo|violet)-(50|100|200|300|400|500|600|700|800|900)/,
      variants: ['hover', 'focus', 'active'],
    },
    {
      pattern: /from-(emerald|blue|cyan|slate|red|orange|yellow|purple|pink|green|sky|rose|indigo|violet)-(50|100|200|300|400|500|600|700|800|900)/,
    },
    {
      pattern: /to-(emerald|blue|cyan|slate|red|orange|yellow|purple|pink|green|sky|rose|indigo|violet)-(50|100|200|300|400|500|600|700|800|900)/,
    },
    {
      pattern: /via-(emerald|blue|cyan|slate|red|orange|yellow|purple|pink|green|sky|rose|indigo|violet)-(50|100|200|300|400|500|600|700|800|900)/,
    },
    {
      pattern: /shadow-(emerald|blue|cyan|slate|red|orange|yellow|purple|pink|green|sky|rose|indigo|violet)-(50|100|200|300|400|500|600|700|800|900)/,
    },
    {
      pattern: /ring-(emerald|blue|cyan|slate|red|orange|yellow|purple|pink|green|sky|rose|indigo|violet)-(50|100|200|300|400|500|600|700|800|900)/,
    },
  ],
  theme: {
    extend: {
      colors: {
        // Primary: Blu Mikai
        primary: {
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#64b5f6',
          400: '#42a5f5',
          500: '#3296dc',
          600: '#1e88e5',
          700: '#1976d2',
          800: '#1565c0',
          900: '#0d47a1',
        },
        // Secondary: Grigio freddo
        secondary: {
          50: '#eceff1',
          100: '#cfd8dc',
          200: '#b0bec5',
          300: '#90a4ae',
          400: '#78909c',
          500: '#607d8b',
          600: '#546e7a',
          700: '#455a64',
          800: '#37474f',
          900: '#263238',
        },
        // Accent: Azzurro vivace
        accent: {
          50: '#e1f5fe',
          100: '#b3e5fc',
          200: '#81d4fa',
          300: '#4fc3f7',
          400: '#29b6f6',
          500: '#03a9f4',
          600: '#039be5',
          700: '#0288d1',
        },
        // Success
        success: {
          50: '#f0fdf4',
          600: '#16a34a',
          700: '#15803d',
        },
        // Warning
        warning: {
          50: '#fefce8',
          600: '#eab308',
        },
        // Danger
        danger: {
          50: '#fef2f2',
          600: '#dc2626',
          700: '#b91c1c',
        },
        // Neutral grays
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },
      spacing: {
        '0.5': '0.125rem',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        'inner-sm': 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.7' },
        },
      },
    },
  },
  plugins: [
    function ({ addComponents, theme }) {
      addComponents({
        // ===== DARK THEME COMPONENTS =====
        
        // Cards & Containers
        '.card': {
          '@apply bg-slate-800/50 border-2 border-cyan-500/30 rounded-lg p-4 shadow-lg shadow-cyan-500/10': {},
        },
        '.card-lg': {
          '@apply bg-slate-800/50 border-2 border-cyan-500/30 rounded-xl p-6 shadow-lg shadow-cyan-500/10 hover:shadow-xl hover:shadow-cyan-500/20 transition-all': {},
        },
        '.card-header': {
          '@apply text-lg font-bold text-cyan-300': {},
        },
        '.card-subheader': {
          '@apply text-sm font-semibold text-cyan-400/70': {},
        },
        '.card-body': {
          '@apply text-slate-200': {},
        },
        '.card-footer': {
          '@apply border-t-2 border-cyan-500/20 pt-4 mt-4': {},
        },
        
        // Inputs & Forms
        '.input-dark': {
          '@apply bg-slate-800/30 border-2 border-cyan-500/20 text-slate-100 placeholder-slate-500 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all': {},
        },
        '.input-small': {
          '@apply bg-slate-800/30 border-2 border-cyan-500/20 text-slate-100 placeholder-slate-500 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500': {},
        },
        '.textarea-dark': {
          '@apply bg-slate-800/30 border-2 border-cyan-500/20 text-slate-100 placeholder-slate-500 rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500': {},
        },
        
        // Buttons
        '.btn': {
          '@apply inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2': {},
        },
        '.btn-primary': {
          '@apply btn bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50': {},
        },
        '.btn-secondary': {
          '@apply btn bg-slate-700/50 text-cyan-300 border-2 border-cyan-500/30 hover:bg-slate-700': {},
        },
        '.btn-danger': {
          '@apply btn bg-red-600/20 text-red-400 border-2 border-red-500/30 hover:bg-red-600/30': {},
        },
        '.btn-ghost': {
          '@apply btn text-cyan-400 hover:bg-slate-800/50 hover:text-cyan-300': {},
        },
        
        // Text & Typography
        '.text-title': {
          '@apply text-3xl font-bold text-cyan-300': {},
        },
        '.text-subtitle': {
          '@apply text-lg font-semibold text-cyan-300': {},
        },
        '.text-label': {
          '@apply text-sm font-medium text-cyan-400': {},
        },
        '.text-muted': {
          '@apply text-slate-400': {},
        },
        '.text-highlight': {
          '@apply text-cyan-300': {},
        },
        
        // Badges & Pills
        '.badge': {
          '@apply inline-block px-3 py-1 rounded-full text-xs font-semibold border': {},
        },
        '.badge-primary': {
          '@apply badge bg-cyan-600/20 text-cyan-300 border-cyan-500/40': {},
        },
        '.badge-success': {
          '@apply badge bg-emerald-600/20 text-emerald-300 border-emerald-500/40': {},
        },
        '.badge-danger': {
          '@apply badge bg-red-600/20 text-red-300 border-red-500/40': {},
        },
        '.badge-warning': {
          '@apply badge bg-yellow-600/20 text-yellow-300 border-yellow-500/40': {},
        },
        
        // Dividers & Separators
        '.divider': {
          '@apply border-t-2 border-cyan-500/20': {},
        },
        
        // Page & Layout
        '.page-container': {
          '@apply min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6': {},
        },
        '.section': {
          '@apply space-y-4': {},
        },
        '.section-lg': {
          '@apply space-y-6': {},
        },
        
        // Links & Navigation
        '.link-primary': {
          '@apply text-cyan-400 hover:text-cyan-300 transition-colors': {},
        },
        '.link-muted': {
          '@apply text-slate-400 hover:text-slate-300 transition-colors': {},
        },
      });
    }
  ],
}

