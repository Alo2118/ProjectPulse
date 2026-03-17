import { DOMAIN_ICONS, THEME_EMOJIS, type ThemeName } from '@/lib/theme-config'
import { useThemeStore } from '@/stores/themeStore'

export function useThemeConfig() {
  const theme = useThemeStore((s) => s.theme) as ThemeName

  return {
    icons: DOMAIN_ICONS,
    emojis: THEME_EMOJIS[theme] ?? THEME_EMOJIS['tech-hud'],
    theme,
  }
}
