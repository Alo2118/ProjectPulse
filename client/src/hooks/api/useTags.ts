import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const KEYS = {
  all: ['tags'] as const,
  lists: () => [...KEYS.all, 'list'] as const,
  entityTags: (entityType: string, entityId: string) => [...KEYS.all, 'entity', entityType, entityId] as const,
}

export function useTagListQuery() {
  return useQuery({
    queryKey: KEYS.lists(),
    queryFn: async () => {
      const { data } = await api.get('/tags')
      return data.data
    },
  })
}

export function useEntityTagsQuery(entityType: string, entityId: string) {
  return useQuery({
    queryKey: KEYS.entityTags(entityType, entityId),
    queryFn: async () => {
      const { data } = await api.get(`/tags/entity/${entityType}/${entityId}`)
      return data.data
    },
    enabled: !!entityType && !!entityId,
  })
}

export function useCreateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/tags', payload)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
    },
  })
}

export function useUpdateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
      const { data } = await api.put(`/tags/${id}`, payload)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
    },
  })
}

export function useDeleteTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/tags/${id}`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
    },
  })
}

export function useAssignTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { tagId: string; entityType: string; entityId: string }) => {
      const { data } = await api.post('/tags/assign', payload)
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.entityTags(variables.entityType, variables.entityId) })
    },
  })
}

export function useUnassignTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { tagId: string; entityType: string; entityId: string }) => {
      const { data } = await api.delete('/tags/assign', { data: payload })
      return data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.entityTags(variables.entityType, variables.entityId) })
    },
  })
}

export { KEYS as tagKeys }
