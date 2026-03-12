import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const KEYS = {
  all: ['checklist'] as const,
  byTask: (taskId: string) => [...KEYS.all, taskId] as const,
}

export function useChecklistQuery(taskId: string) {
  return useQuery({
    queryKey: KEYS.byTask(taskId),
    queryFn: async () => {
      const { data } = await api.get(`/checklist/${taskId}`)
      return data.data
    },
    enabled: !!taskId,
  })
}

export function useAddChecklistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, title }: { taskId: string; title: string }) => {
      const { data } = await api.post(`/checklist/${taskId}`, { title })
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.byTask(variables.taskId) })
    },
  })
}

export function useToggleChecklistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, itemId }: { taskId: string; itemId: string }) => {
      const { data } = await api.patch(`/checklist/${taskId}/${itemId}/toggle`)
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.byTask(variables.taskId) })
    },
  })
}

export function useUpdateChecklistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, itemId, ...payload }: { taskId: string; itemId: string } & Record<string, unknown>) => {
      const { data } = await api.patch(`/checklist/${taskId}/${itemId}`, payload)
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.byTask(variables.taskId) })
    },
  })
}

export function useReorderChecklist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, itemIds }: { taskId: string; itemIds: string[] }) => {
      const { data } = await api.patch(`/checklist/${taskId}/reorder`, { itemIds })
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.byTask(variables.taskId) })
    },
  })
}

export function useDeleteChecklistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, itemId }: { taskId: string; itemId: string }) => {
      const { data } = await api.delete(`/checklist/${taskId}/${itemId}`)
      return data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.byTask(variables.taskId) })
    },
  })
}

export { KEYS as checklistKeys }
