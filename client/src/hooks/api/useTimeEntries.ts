import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const KEYS = {
  all: ['timeEntries'] as const,
  lists: () => [...KEYS.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...KEYS.lists(), filters] as const,
  running: () => [...KEYS.all, 'running'] as const,
  myReport: (filters: Record<string, unknown>) => [...KEYS.all, 'my-report', filters] as const,
  myDaily: () => [...KEYS.all, 'my-daily'] as const,
  team: (filters: Record<string, unknown>) => [...KEYS.all, 'team', filters] as const,
  pending: () => [...KEYS.all, 'pending'] as const,
}

export function useTimeEntryListQuery(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: async () => {
      const { data } = await api.get('/time-entries', { params: filters })
      return data
    },
  })
}

export function useRunningTimerQuery() {
  return useQuery({
    queryKey: KEYS.running(),
    queryFn: async () => {
      const { data } = await api.get('/time-entries/running')
      return data.data
    },
    refetchInterval: 30_000,
  })
}

export function useMyTimeReportQuery(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: KEYS.myReport(filters),
    queryFn: async () => {
      const { data } = await api.get('/time-entries/my/report', { params: filters })
      return data.data
    },
  })
}

export function useMyDailySummaryQuery() {
  return useQuery({
    queryKey: KEYS.myDaily(),
    queryFn: async () => {
      const { data } = await api.get('/time-entries/my/daily')
      return data.data
    },
  })
}

export function useTeamTimeReportQuery(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: KEYS.team(filters),
    queryFn: async () => {
      const { data } = await api.get('/time-entries/team', { params: filters })
      return data.data
    },
  })
}

export function usePendingTimeEntriesQuery() {
  return useQuery({
    queryKey: KEYS.pending(),
    queryFn: async () => {
      const { data } = await api.get('/time-entries/pending')
      return data.data
    },
  })
}

export function useCreateTimeEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/time-entries', payload)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.myDaily() })
    },
  })
}

export function useUpdateTimeEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
      const { data } = await api.put(`/time-entries/${id}`, payload)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.myDaily() })
    },
  })
}

export function useDeleteTimeEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/time-entries/${id}`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.myDaily() })
    },
  })
}

export function useStartTimer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { taskId: string; description?: string }) => {
      const { data } = await api.post('/time-entries/start', payload)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.running() })
      qc.invalidateQueries({ queryKey: KEYS.myDaily() })
    },
  })
}

export function useStopTimer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/time-entries/stop')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.running() })
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.myDaily() })
    },
  })
}

export function useApproveTimeEntries() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { ids: string[] }) => {
      const { data } = await api.patch('/time-entries/approve', payload)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.pending() })
      qc.invalidateQueries({ queryKey: KEYS.lists() })
    },
  })
}

export function useRejectTimeEntries() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { ids: string[]; reason: string }) => {
      const { data } = await api.patch('/time-entries/reject', payload)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.pending() })
      qc.invalidateQueries({ queryKey: KEYS.lists() })
    },
  })
}

export { KEYS as timeEntryKeys }
