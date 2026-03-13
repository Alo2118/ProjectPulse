import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'
import type { ThemeStyle, ThemeMode } from '@/types'

/** Map backend themeStyle values to frontend ThemeStyle */
const BACKEND_STYLE_MAP: Record<string, ThemeStyle> = {
  'classic': 'office-classic',
  'basic': 'asana-like',
  'tech-hud': 'tech-hud',
}

/** Map frontend ThemeStyle to backend themeStyle values */
const FRONTEND_STYLE_MAP: Record<ThemeStyle, string> = {
  'office-classic': 'classic',
  'asana-like': 'basic',
  'tech-hud': 'tech-hud',
}

const VALID_THEMES: ThemeStyle[] = ['office-classic', 'asana-like', 'tech-hud']
const VALID_MODES: ThemeMode[] = ['light', 'dark', 'system']

interface ThemeState {
  theme: ThemeStyle
  mode: ThemeMode
  setTheme: (theme: ThemeStyle) => void
  setMode: (mode: ThemeMode) => void
  /** Initialize from server user data (handles backend field name mapping) */
  initFromServer: (serverTheme?: string | null, serverThemeStyle?: string | null) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'office-classic',
      mode: 'system',
      setTheme: (theme) => {
        set({ theme })
        // Fire-and-forget sync to backend — send theme as themeStyle (swapped naming)
        api.patch('/users/me/preferences', { themeStyle: FRONTEND_STYLE_MAP[theme] ?? theme }).catch(() => {})
      },
      setMode: (mode) => {
        set({ mode })
        // Fire-and-forget sync to backend — send mode as theme (swapped naming)
        api.patch('/users/me/preferences', { theme: mode }).catch(() => {})
      },
      initFromServer: (serverTheme, serverThemeStyle) => {
        const updates: Partial<Pick<ThemeState, 'theme' | 'mode'>> = {}

        // Backend `theme` = light/dark/system → frontend `mode`
        if (serverTheme && VALID_MODES.includes(serverTheme as ThemeMode)) {
          updates.mode = serverTheme as ThemeMode
        }

        // Backend `themeStyle` = tech-hud/basic/classic → frontend `theme`
        if (serverThemeStyle) {
          const mapped = BACKEND_STYLE_MAP[serverThemeStyle]
          if (mapped) {
            updates.theme = mapped
          } else if (VALID_THEMES.includes(serverThemeStyle as ThemeStyle)) {
            // Direct match (e.g. already uses frontend naming)
            updates.theme = serverThemeStyle as ThemeStyle
          }
        }

        if (Object.keys(updates).length > 0) {
          set(updates)
        }
      },
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
