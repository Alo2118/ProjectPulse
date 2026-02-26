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
