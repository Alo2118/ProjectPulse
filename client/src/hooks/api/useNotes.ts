import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const KEYS = {
  all: ['notes'] as const,
  byEntity: (entityType: string, entityId: string) => [...KEYS.all, entityType, entityId] as const,
  count: (entityType: string, entityId: string) => [...KEYS.all, 'count', entityType, entityId] as const,
}

export function useNoteListQuery(entityType: string, entityId: string) {
  return useQuery({
    queryKey: KEYS.byEntity(entityType, entityId),
    queryFn: async () => {
      const { data } = await api.get(`/notes/${entityType}/${entityId}`)
      return data.data
    },
    enabled: !!entityType && !!entityId,
  })
}

export function useNoteCountQuery(entityType: string, entityId: string) {
  return useQuery({
    queryKey: KEYS.count(entityType, entityId),
    queryFn: async () => {
      const { data } = await api.get(`/notes/${entityType}/${entityId}/count`)
      return data.data
    },
    enabled: !!entityType && !!entityId,
  })
}

export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { entityType: string; entityId: string; content: string }) => {
      const { data } = await api.post('/notes', payload)
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.byEntity(variables.entityType, variables.entityId) })
      qc.invalidateQueries({ queryKey: KEYS.count(variables.entityType, variables.entityId) })
    },
  })
}

export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { id: string; content: string; entityType: string; entityId: string }) => {
      const { data } = await api.put(`/notes/${vars.id}`, { content: vars.content })
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.byEntity(variables.entityType, variables.entityId) })
    },
  })
}

export function useDeleteNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { id: string; entityType: string; entityId: string }) => {
      const { data } = await api.delete(`/notes/${vars.id}`)
      return data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.byEntity(variables.entityType, variables.entityId) })
      qc.invalidateQueries({ queryKey: KEYS.count(variables.entityType, variables.entityId) })
    },
  })
}

export { KEYS as noteKeys }
