import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

const KEYS = {
  all: ['related'] as const,
  entity: (entityType: string, entityId: string, include: string[]) =>
    [...KEYS.all, entityType, entityId, include.sort().join(',')] as const,
}

export function useRelatedQuery(
  entityType: string,
  entityId: string,
  include: string[],
  limit = 10
) {
  return useQuery({
    queryKey: KEYS.entity(entityType, entityId, include),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: Record<string, unknown[]> }>(
        `/related/${entityType}/${entityId}`,
        { params: { include: include.join(','), limit } }
      )
      return data.data
    },
    enabled: !!entityId && include.length > 0,
    staleTime: 60_000,
  })
}

export { KEYS as relatedKeys }
