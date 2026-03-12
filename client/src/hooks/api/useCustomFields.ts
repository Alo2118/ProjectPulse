import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const KEYS = {
  all: ['customFields'] as const,
  definitions: () => [...KEYS.all, 'definitions'] as const,
  definition: (id: string) => [...KEYS.all, 'definition', id] as const,
  taskValues: (taskId: string) => [...KEYS.all, 'task-values', taskId] as const,
}

export function useCustomFieldDefinitionsQuery() {
  return useQuery({
    queryKey: KEYS.definitions(),
    queryFn: async () => {
      const { data } = await api.get('/custom-fields/definitions')
      return data.data
    },
  })
}

export function useCustomFieldDefinitionQuery(id: string) {
  return useQuery({
    queryKey: KEYS.definition(id),
    queryFn: async () => {
      const { data } = await api.get(`/custom-fields/definitions/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

export function useTaskCustomFieldValuesQuery(taskId: string) {
  return useQuery({
    queryKey: KEYS.taskValues(taskId),
    queryFn: async () => {
      const { data } = await api.get(`/custom-fields/tasks/${taskId}/values`)
      return data.data
    },
    enabled: !!taskId,
  })
}

export function useCreateCustomFieldDefinition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/custom-fields/definitions', payload)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.definitions() })
    },
  })
}

export function useUpdateCustomFieldDefinition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
      const { data } = await api.patch(`/custom-fields/definitions/${id}`, payload)
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.definitions() })
      qc.invalidateQueries({ queryKey: KEYS.definition(variables.id) })
    },
  })
}

export function useDeleteCustomFieldDefinition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/custom-fields/definitions/${id}`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.definitions() })
    },
  })
}

export function useSetCustomFieldValue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, definitionId, value }: { taskId: string; definitionId: string; value: unknown }) => {
      const { data } = await api.put(`/custom-fields/tasks/${taskId}/values`, { definitionId, value })
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.taskValues(variables.taskId) })
    },
  })
}

export function useDeleteCustomFieldValue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, definitionId }: { taskId: string; definitionId: string }) => {
      const { data } = await api.delete(`/custom-fields/tasks/${taskId}/values/${definitionId}`)
      return data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.taskValues(variables.taskId) })
    },
  })
}

export { KEYS as customFieldKeys }
