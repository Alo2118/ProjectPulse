import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@services/api'

type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme, saveToBackend?: boolean) => void
  initializeFromUser: (userTheme?: Theme) => void
}

function applyTheme(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else if (theme === 'light') {
    document.documentElement.classList.remove('dark')
  } else {
    // System preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',

      setTheme: (theme, saveToBackend = true) => {
        set({ theme })
        applyTheme(theme)

        // Save to backend if requested (default: true)
        if (saveToBackend) {
          api.patch('/users/me/theme', { theme }).catch(() => {
            // silently ignore
          })
        }
      },

      initializeFromUser: (userTheme) => {
        const theme = userTheme || get().theme
        set({ theme })
        applyTheme(theme)
      },
    }),
    {
      name: 'theme-storage',
    }
  )
)
