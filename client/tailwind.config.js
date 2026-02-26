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
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        surface: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          800: '#1e1e2e',
          850: '#181825',
          900: '#11111b',
          950: '#0a0a14',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite linear',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'glow-red': 'glowRed 2s ease-in-out infinite alternate',
        'glow-amber': 'glowAmber 2s ease-in-out infinite alternate',
        'progress-fill': 'progressFill 0.8s ease-out forwards',
        'slide-up-in': 'slideUpIn 0.25s ease-out',
        'expand': 'expand 0.3s ease-out forwards',
        'collapse': 'collapse 0.2s ease-in forwards',
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
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.5)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(59,130,246,0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(59,130,246,0.6)' },
        },
        glowRed: {
          '0%': { boxShadow: '0 0 5px rgba(239,68,68,0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(239,68,68,0.6)' },
        },
        glowAmber: {
          '0%': { boxShadow: '0 0 5px rgba(245,158,11,0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(245,158,11,0.6)' },
        },
        progressFill: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--progress-value)' },
        },
        slideUpIn: {
          '0%': { opacity: '0', transform: 'translateY(100%) translateX(-50%)' },
          '100%': { opacity: '1', transform: 'translateY(0) translateX(-50%)' },
        },
        expand: {
          '0%': { opacity: '0', maxHeight: '0' },
          '100%': { opacity: '1', maxHeight: '500px' },
        },
        collapse: {
          '0%': { opacity: '1', maxHeight: '500px' },
          '100%': { opacity: '0', maxHeight: '0' },
        },
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0,0,0,0.08)',
        'glass-dark': '0 8px 32px rgba(0,0,0,0.3)',
        'glow-primary': '0 0 15px rgba(59,130,246,0.3)',
        'glow-green': '0 0 15px rgba(34,197,94,0.3)',
        'glow-red': '0 0 15px rgba(239,68,68,0.3)',
        'glow-amber': '0 0 15px rgba(245,158,11,0.3)',
      },
    },
  },
  plugins: [],
}
