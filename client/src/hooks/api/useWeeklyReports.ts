import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const KEYS = {
  all: ['weeklyReports'] as const,
  lists: () => [...KEYS.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...KEYS.lists(), filters] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
  currentWeek: () => [...KEYS.all, 'current-week'] as const,
  preview: () => [...KEYS.all, 'preview'] as const,
  team: () => [...KEYS.all, 'team'] as const,
}

export function useCurrentWeekReportQuery() {
  return useQuery({
    queryKey: KEYS.currentWeek(),
    queryFn: async () => {
      const { data } = await api.get('/reports/weekly/current-week')
      return data.data
    },
  })
}

export function useWeeklyReportPreviewQuery() {
  return useQuery({
    queryKey: KEYS.preview(),
    queryFn: async () => {
      const { data } = await api.get('/reports/weekly/preview')
      return data.data
    },
  })
}

export function useTeamWeeklyReportsQuery() {
  return useQuery({
    queryKey: KEYS.team(),
    queryFn: async () => {
      const { data } = await api.get('/reports/weekly/team')
      return data.data
    },
  })
}

export function useWeeklyReportHistoryQuery(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: async () => {
      const { data } = await api.get('/reports/weekly', { params: filters })
      return data
    },
  })
}

export function useWeeklyReportQuery(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/reports/weekly/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

export function useGenerateWeeklyReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/reports/weekly/generate')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}

export { KEYS as weeklyReportKeys }
