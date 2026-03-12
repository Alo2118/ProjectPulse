import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const KEYS = {
  all: ['tasks'] as const,
  lists: () => [...KEYS.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...KEYS.lists(), filters] as const,
  details: () => [...KEYS.all, 'detail'] as const,
  detail: (id: string) => [...KEYS.details(), id] as const,
  myTasks: () => [...KEYS.all, 'my'] as const,
  myStats: () => [...KEYS.all, 'my-stats'] as const,
  subtasks: (taskId: string) => [...KEYS.all, 'subtasks', taskId] as const,
  gantt: (filters: Record<string, unknown>) => [...KEYS.all, 'gantt', filters] as const,
  calendar: (filters: Record<string, unknown>) => [...KEYS.all, 'calendar', filters] as const,
}

export function useTaskListQuery(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: async () => {
      const { data } = await api.get('/tasks', { params: filters })
      return data
    },
  })
}

export function useTaskQuery(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/tasks/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

export function useMyTasksQuery() {
  return useQuery({
    queryKey: KEYS.myTasks(),
    queryFn: async () => {
      const { data } = await api.get('/tasks/my')
      return data
    },
  })
}

export function useMyTaskStatsQuery() {
  return useQuery({
    queryKey: KEYS.myStats(),
    queryFn: async () => {
      const { data } = await api.get('/tasks/my/stats')
      return data.data
    },
  })
}

export function useSubtasksQuery(taskId: string) {
  return useQuery({
    queryKey: KEYS.subtasks(taskId),
    queryFn: async () => {
      const { data } = await api.get(`/tasks/${taskId}/subtasks`)
      return data.data
    },
    enabled: !!taskId,
  })
}

export function useGanttTasksQuery(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: KEYS.gantt(filters),
    queryFn: async () => {
      const { data } = await api.get('/tasks/gantt', { params: filters })
      return data.data
    },
  })
}

export function useCalendarTasksQuery(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: KEYS.calendar(filters),
    queryFn: async () => {
      const { data } = await api.get('/tasks/calendar', { params: filters })
      return data.data
    },
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/tasks', payload)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.myTasks() })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
      const { data } = await api.put(`/tasks/${id}`, payload)
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) })
      qc.invalidateQueries({ queryKey: KEYS.myTasks() })
    },
  })
}

export function useChangeTaskStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, blockedReason }: { id: string; status: string; blockedReason?: string }) => {
      const { data } = await api.patch(`/tasks/${id}/status`, { status, blockedReason })
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) })
      qc.invalidateQueries({ queryKey: KEYS.myTasks() })
      qc.invalidateQueries({ queryKey: KEYS.myStats() })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/tasks/${id}`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.myTasks() })
    },
  })
}

export function useBulkUpdateTasks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { taskIds: string[]; updates: Record<string, unknown> }) => {
      const { data } = await api.patch('/tasks/bulk', payload)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}

export function useBulkDeleteTasks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { taskIds: string[] }) => {
      const { data } = await api.delete('/tasks/bulk', { data: payload })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}

export function useCloneTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/tasks/${id}/clone`)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
    },
  })
}

export function useReorderTasks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { taskIds: string[] }) => {
      const { data } = await api.patch('/tasks/reorder', payload)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
    },
  })
}

export function useCreateTaskDependency() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { predecessorId: string; successorId: string; type: string }) => {
      const { data } = await api.post('/tasks/dependencies', payload)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}

export function useDeleteTaskDependency() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dependencyId: string) => {
      const { data } = await api.delete(`/tasks/dependencies/${dependencyId}`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}

export { KEYS as taskKeys }
