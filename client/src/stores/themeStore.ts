import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeStyle, ThemeMode } from '@/types'

interface ThemeState {
  theme: ThemeStyle
  mode: ThemeMode
  setTheme: (theme: ThemeStyle) => void
  setMode: (mode: ThemeMode) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'office-classic',
      mode: 'system',
      setTheme: (theme) => set({ theme }),
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'pp-theme',
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        if (version < 2) {
          const old = persisted as Record<string, unknown>
          return {
            theme: 'office-classic' as ThemeStyle,
            mode: (old?.theme === 'dark' ? 'dark' : old?.theme === 'light' ? 'light' : 'system') as ThemeMode,
          }
        }
        return persisted as ThemeState
      },
    }
  )
)
