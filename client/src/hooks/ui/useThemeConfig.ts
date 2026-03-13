import { useMemo } from 'react'
import { useThemeStore } from '@/stores/themeStore'
import {
  DOMAIN_ICONS, DOMAIN_LABELS, ICON_STYLES,
  THEME_EMOJIS, THEME_ANIMATIONS, THEME_EFFECTS, getIconWrapperClass,
} from '@/lib/theme-config'

export function useThemeConfig() {
  const theme = useThemeStore((s) => s.theme)

  return useMemo(() => ({
    theme,
    icons: DOMAIN_ICONS,
    labels: DOMAIN_LABELS,
    iconStyles: ICON_STYLES[theme],
    emojis: THEME_EMOJIS[theme],
    animations: THEME_ANIMATIONS[theme],
    effects: THEME_EFFECTS[theme],
    getIconWrapper: (domainColor: string) => getIconWrapperClass(theme, domainColor),
  }), [theme])
}
