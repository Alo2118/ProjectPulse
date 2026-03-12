import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

const KEYS = {
  all: ['audit'] as const,
  lists: () => [...KEYS.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...KEYS.lists(), filters] as const,
  entityHistory: (entityType: string, entityId: string) => [...KEYS.all, 'entity', entityType, entityId] as const,
  timeline: (entityId: string) => [...KEYS.all, 'timeline', entityId] as const,
  projectActivity: (projectId: string) => [...KEYS.all, 'project', projectId] as const,
}

export function useAuditListQuery(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: async () => {
      const { data } = await api.get('/audit', { params: filters })
      return data
    },
  })
}

export function useEntityHistoryQuery(entityType: string, entityId: string) {
  return useQuery({
    queryKey: KEYS.entityHistory(entityType, entityId),
    queryFn: async () => {
      const { data } = await api.get(`/audit/entity/${entityType}/${entityId}`)
      return data.data
    },
    enabled: !!entityType && !!entityId,
  })
}

export function useStatusTimelineQuery(entityId: string) {
  return useQuery({
    queryKey: KEYS.timeline(entityId),
    queryFn: async () => {
      const { data } = await api.get(`/audit/timeline/${entityId}`)
      return data.data
    },
    enabled: !!entityId,
  })
}

export function useProjectActivityQuery(projectId: string) {
  return useQuery({
    queryKey: KEYS.projectActivity(projectId),
    queryFn: async () => {
      const { data } = await api.get(`/audit/project/${projectId}`)
      return data.data
    },
    enabled: !!projectId,
  })
}

export { KEYS as auditKeys }
