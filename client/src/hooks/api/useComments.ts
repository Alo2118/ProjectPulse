import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const KEYS = {
  all: ['comments'] as const,
  byTask: (taskId: string) => [...KEYS.all, 'task', taskId] as const,
  recent: () => [...KEYS.all, 'recent'] as const,
}

export function useTaskCommentsQuery(taskId: string) {
  return useQuery({
    queryKey: KEYS.byTask(taskId),
    queryFn: async () => {
      const { data } = await api.get(`/comments/task/${taskId}`)
      return data.data
    },
    enabled: !!taskId,
  })
}

export function useRecentCommentsQuery() {
  return useQuery({
    queryKey: KEYS.recent(),
    queryFn: async () => {
      const { data } = await api.get('/comments/recent')
      return data.data
    },
  })
}

export function useCreateComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { content: string; taskId: string; isInternal?: boolean; parentId?: string }) => {
      const { data } = await api.post('/comments', payload)
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.byTask(variables.taskId) })
      qc.invalidateQueries({ queryKey: KEYS.recent() })
    },
  })
}

export function useUpdateComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { id: string; content: string; taskId: string }) => {
      const { data } = await api.put(`/comments/${vars.id}`, { content: vars.content })
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.byTask(variables.taskId) })
    },
  })
}

export function useDeleteComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { id: string; taskId: string }) => {
      const { data } = await api.delete(`/comments/${vars.id}`)
      return data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.byTask(variables.taskId) })
    },
  })
}

export { KEYS as commentKeys }
