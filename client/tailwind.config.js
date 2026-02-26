/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        surface: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          800: '#1e293b',
          850: '#1a2332',
          900: '#0f172a',
          950: '#020617',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
        'progress-fill': 'progressFill 0.8s ease-out forwards',
        'expand': 'expand 0.3s ease-out forwards',
        'collapse': 'collapse 0.2s ease-in forwards',
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
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.5)' },
        },
        progressFill: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--progress-value)' },
        },
        expand: {
          '0%': { opacity: '0', maxHeight: '0' },
          '100%': { opacity: '1', maxHeight: '500px' },
        },
        collapse: {
          '0%': { opacity: '1', maxHeight: '500px' },
          '100%': { opacity: '0', maxHeight: '0' },
        },
        'counter-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)', opacity: '0.5' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateY(100%)', opacity: '0.5' },
        },
        'fade-in-stagger': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(6,182,212,0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(6,182,212,0.4)' },
        },
        'border-trace': {
          '0%': { borderColor: 'rgba(6,182,212,0.1)' },
          '50%': { borderColor: 'rgba(6,182,212,0.4)' },
          '100%': { borderColor: 'rgba(6,182,212,0.1)' },
        },
        'data-reveal': {
          '0%': { width: '0%' },
          '100%': { width: 'var(--target-width)' },
        },
        'page-enter': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'section-reveal': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'card-power-on': {
          '0%': { opacity: '0', transform: 'scale(0.95)', boxShadow: '0 0 0 rgba(6,182,212,0)' },
          '100%': { opacity: '1', transform: 'scale(1)', boxShadow: '0 0 30px rgba(6,182,212,0.15)' },
        },
        'row-flash': {
          '0%': { backgroundColor: 'rgba(6,182,212,0.1)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'status-morph': {
          '0%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
        'timer-tick': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        'badge-bounce': {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.3)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' },
        },
        'tooltip-origin': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'breadcrumb-slide': {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'skeleton-dissolve': {
          '0%': { opacity: '1', filter: 'blur(2px)' },
          '100%': { opacity: '1', filter: 'blur(0)' },
        },
        'alert-border-pulse': {
          '0%, 100%': { borderLeftColor: 'rgba(239,68,68,0.3)' },
          '50%': { borderLeftColor: 'rgba(239,68,68,0.7)' },
        },
        'sidebar-glow': {
          '0%': { boxShadow: 'inset 2px 0 0 rgba(6,182,212,0)' },
          '100%': { boxShadow: 'inset 2px 0 0 rgba(6,182,212,0.4)' },
        },
        'progress-update': {
          '0%': { width: 'var(--from-width)' },
          '100%': { width: 'var(--to-width)' },
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 30px rgba(6,182,212,0.15)',
        'glow-cyan-lg': '0 0 40px rgba(6,182,212,0.2)',
        'glow-cyan-text': '0 0 20px rgba(6,182,212,0.4)',
        'glow-cyan-btn': '0 0 20px rgba(6,182,212,0.25)',
        'glow-cyan-input': '0 0 15px rgba(6,182,212,0.2)',
        'glow-red': '0 0 20px rgba(239,68,68,0.3)',
        'glow-amber': '0 0 15px rgba(251,191,36,0.25)',
      },
    },
  },
  plugins: [],
}
