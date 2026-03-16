import { createContext, useContext, useEffect, useMemo } from 'react'
import { DOMAIN_COLORS } from '@/lib/constants'
import { DOMAIN_ICONS, DOMAIN_LABELS } from '@/lib/theme-config'
import type { LucideIcon } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'

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
      colorClasses: DOMAIN_COLORS[config.domain] ?? '',
      icon: DOMAIN_ICONS[config.domain] ?? DOMAIN_ICONS.task,
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
