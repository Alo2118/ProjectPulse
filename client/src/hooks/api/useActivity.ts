import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ActivityItem } from '@/types'

const KEYS = {
  all: ['activity'] as const,
  entity: (entityType: string, entityId: string) =>
    [...KEYS.all, entityType, entityId] as const,
}

export function useActivityQuery(entityType: string, entityId: string, limit = 20) {
  return useQuery({
    queryKey: KEYS.entity(entityType, entityId),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: ActivityItem[] }>(
        `/activity/${entityType}/${entityId}`,
        { params: { limit } }
      )
      return data.data
    },
    enabled: !!entityId,
    staleTime: 30_000,
  })
}

export { KEYS as activityKeys }
