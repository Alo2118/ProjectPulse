import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { KpiCard } from '@/components/common/KpiStrip'

const KEYS = {
  all: ['stats'] as const,
  domain: (domain: string) => [...KEYS.all, domain] as const,
  summary: (type: string, id: string) => [...KEYS.all, 'summary', type, id] as const,
}

export function useStatsQuery(domain: string) {
  return useQuery({
    queryKey: KEYS.domain(domain),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: KpiCard[] }>(`/stats/${domain}`)
      return data.data
    },
    staleTime: 60_000,
  })
}

export function useSummaryQuery(type: 'project' | 'task', id: string) {
  return useQuery({
    queryKey: KEYS.summary(type, id),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: KpiCard[] }>(`/stats/${type}/${id}/summary`)
      return data.data
    },
    enabled: !!id,
    staleTime: 60_000,
  })
}

export { KEYS as statsKeys }
