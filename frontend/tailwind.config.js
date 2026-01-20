/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // Cyber colors - dynamic classes
    {
      pattern: /bg-(cyan|blue|yellow|red|green|purple|pink|gray)-(50|100|200|300|400|500|600|700|800|900|950)/,
      variants: ['hover', 'focus', 'active', 'group-hover'],
    },
    {
      pattern: /text-(cyan|blue|yellow|red|green|purple|pink|gray)-(50|100|200|300|400|500|600|700|800|900|950)/,
      variants: ['hover', 'focus', 'active', 'group-hover'],
    },
    {
      pattern: /border-(cyan|blue|yellow|red|green|purple|pink|gray)-(50|100|200|300|400|500|600|700|800|900|950)/,
      variants: ['hover', 'focus', 'active'],
    },
    {
      pattern: /shadow-(cyan|blue|yellow|red|green|purple|pink)-(500)/,
    },
  ],
  theme: {
    extend: {
      colors: {
        // Cyber Holographic Color Palette
        cyber: {
          blue: '#00D9FF',
          blueGlow: '#00AAFF',
          gold: '#FFD700',
          purple: '#AA00FF',
          pink: '#FF00FF',
        },
      },
      fontFamily: {
        sans: ['Rajdhani', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Orbitron', 'Rajdhani', 'monospace'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.05em' }],
        sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.025em' }],
        base: ['1rem', { lineHeight: '1.5rem', letterSpacing: '0.025em' }],
        lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '0.025em' }],
        xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '0.05em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '0.05em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '0.075em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '0.075em' }],
        '5xl': ['3rem', { lineHeight: '1', letterSpacing: '0.1em' }],
        '6xl': ['3.75rem', { lineHeight: '1', letterSpacing: '0.1em' }],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 217, 255, 0.5)',
        'glow-cyan-lg': '0 0 40px rgba(0, 217, 255, 0.6)',
        'glow-gold': '0 0 20px rgba(255, 215, 0, 0.5)',
        'glow-gold-lg': '0 0 40px rgba(255, 215, 0, 0.6)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.5)',
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.5)',
        'cyber': '0 0 30px rgba(0, 217, 255, 0.3)',
        'cyber-lg': '0 0 50px rgba(0, 217, 255, 0.4)',
        'inner-cyber': 'inset 0 2px 10px rgba(0, 0, 0, 0.5)',
      },
      dropShadow: {
        'glow-cyan': '0 0 10px rgba(0, 217, 255, 0.8)',
        'glow-gold': '0 0 10px rgba(255, 215, 0, 0.8)',
      },
      animation: {
        // Cyber animations
        'hologram': 'hologramFlicker 3s infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'text-glow': 'textGlow 2s ease-in-out infinite',
        'data-stream': 'dataStream 3s linear infinite',
        'glitch': 'glitch 0.3s infinite',
        'scanline': 'scanline 4s linear infinite',
        // Standard animations
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-bottom': 'slideInBottom 0.5s ease-out',
        'slide-right': 'slideInRight 0.5s ease-out',
        'scale-in': 'scaleIn 0.4s ease-out',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        // Cyber keyframes
        hologramFlicker: {
          '0%, 100%': { opacity: '1' },
          '10%': { opacity: '0.95' },
          '20%': { opacity: '1' },
          '30%': { opacity: '0.9' },
          '40%': { opacity: '1' },
          '50%': { opacity: '0.92' },
          '60%': { opacity: '1' },
          '70%': { opacity: '0.88' },
          '80%': { opacity: '1' },
          '90%': { opacity: '0.95' },
        },
        glowPulse: {
          '0%, 100%': {
            boxShadow: '0 0 5px rgba(0, 217, 255, 0.5), 0 0 10px rgba(0, 217, 255, 0.3), 0 0 20px rgba(0, 217, 255, 0.2)',
          },
          '50%': {
            boxShadow: '0 0 10px rgba(0, 217, 255, 0.8), 0 0 20px rgba(0, 217, 255, 0.6), 0 0 40px rgba(0, 217, 255, 0.4)',
          },
        },
        textGlow: {
          '0%, 100%': {
            textShadow: '0 0 5px rgba(0, 217, 255, 0.8), 0 0 10px rgba(0, 217, 255, 0.6), 0 0 20px rgba(0, 217, 255, 0.4)',
          },
          '50%': {
            textShadow: '0 0 10px rgba(0, 217, 255, 1), 0 0 20px rgba(0, 217, 255, 0.8), 0 0 30px rgba(0, 217, 255, 0.6)',
          },
        },
        dataStream: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        glitch: {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInBottom: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
    },
  },
  plugins: [],
}
