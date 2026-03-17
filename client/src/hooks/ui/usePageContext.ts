import { createContext, useContext, useEffect, useMemo } from 'react'
import { DOMAIN_COLORS_LEGACY, DOMAIN_LABELS } from '@/lib/constants'
import { DOMAIN_ICONS } from '@/lib/theme-config'
import {
  FolderKanban, CheckSquare, Users, MessageSquarePlus, CalendarRange, BarChart2, Settings, Home,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'

// Extended icon map for page context (includes non-domain-entity icons)
const PAGE_ICONS: Record<string, LucideIcon> = {
  ...DOMAIN_ICONS,
  user: Users,
  input: MessageSquarePlus,
  time_entry: CheckSquare,
  analytics: BarChart2,
  planning: CalendarRange,
  admin: Settings,
  home: Home,
  // Fallback aliases
  project: FolderKanban,
  task: CheckSquare,
}

export type Domain = 'project' | 'task' | 'risk' | 'document' | 'input' | 'time_entry' | 'user' | 'analytics' | 'planning' | 'admin' | 'home'

export interface PageContextValue {
  domain: Domain
  entityId?: string
  parentDomain?: Domain
  parentId?: string
  color: string
  colorClasses: string
  icon: LucideIcon
  label: string
}

export const PageContext = createContext<PageContextValue | null>(null)

export const PageContextSetterContext = createContext<Dispatch<SetStateAction<PageContextValue | null>> | null>(null)

export function useSetPageContext(config: {
  domain: Domain
  entityId?: string
  parentDomain?: Domain
  parentId?: string
}) {
  const setContext = useContext(PageContextSetterContext)

  const value = useMemo((): PageContextValue => {
    const domainColorMap: Record<string, string> = {
      project: 'blue',
      task: 'amber',
      risk: 'red',
      document: 'purple',
      input: 'amber',
      time_entry: 'emerald',
      user: 'green',
      analytics: 'indigo',
      planning: 'indigo',
      admin: 'slate',
      home: 'blue',
    }

    return {
      ...config,
      color: domainColorMap[config.domain] ?? 'slate',
      colorClasses: DOMAIN_COLORS_LEGACY[config.domain] ?? '',
      icon: PAGE_ICONS[config.domain] ?? PAGE_ICONS.task,
      label: DOMAIN_LABELS[config.domain] ?? config.domain,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.domain, config.entityId, config.parentDomain, config.parentId])

  useEffect(() => {
    setContext?.(value)
    return () => setContext?.(null)
  }, [value, setContext])
}

export function usePageContext(): PageContextValue | null {
  return useContext(PageContext)
}
