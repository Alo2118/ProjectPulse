import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

const KEYS = {
  all: ['analytics'] as const,
  overview: () => [...KEYS.all, 'overview'] as const,
  overviewWithDelta: () => [...KEYS.all, 'overview-with-delta'] as const,
  teamWorkload: (filters: Record<string, unknown>) => [...KEYS.all, 'team-workload', filters] as const,
  tasksByStatus: () => [...KEYS.all, 'tasks-by-status'] as const,
  hoursByProject: () => [...KEYS.all, 'hours-by-project'] as const,
  completionTrend: (days: number) => [...KEYS.all, 'completion-trend', days] as const,
  topContributors: () => [...KEYS.all, 'top-contributors'] as const,
  projectHealth: () => [...KEYS.all, 'project-health'] as const,
  deliveryForecast: () => [...KEYS.all, 'delivery-forecast'] as const,
  budgetOverview: () => [...KEYS.all, 'budget-overview'] as const,
  myWeeklyHours: () => [...KEYS.all, 'my-weekly-hours'] as const,
  burndown: (projectId: string | null, days: number) => [...KEYS.all, 'burndown', projectId, days] as const,
}

export function useAnalyticsOverviewQuery() {
  return useQuery({
    queryKey: KEYS.overview(),
    queryFn: async () => {
      const { data } = await api.get('/analytics/overview')
      return data.data
    },
  })
}

export function useAnalyticsOverviewWithDeltaQuery() {
  return useQuery({
    queryKey: KEYS.overviewWithDelta(),
    queryFn: async () => {
      const { data } = await api.get('/analytics/overview-with-delta')
      return data.data
    },
  })
}

export function useTeamWorkloadQuery(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: KEYS.teamWorkload(filters),
    queryFn: async () => {
      const { data } = await api.get('/analytics/team-workload', { params: filters })
      return data.data
    },
  })
}

export function useTasksByStatusQuery() {
  return useQuery({
    queryKey: KEYS.tasksByStatus(),
    queryFn: async () => {
      const { data } = await api.get('/analytics/tasks-by-status')
      return data.data
    },
  })
}

export function useHoursByProjectQuery() {
  return useQuery({
    queryKey: KEYS.hoursByProject(),
    queryFn: async () => {
      const { data } = await api.get('/analytics/hours-by-project')
      return data.data
    },
  })
}

export function useTaskCompletionTrendQuery(days: number = 30) {
  return useQuery({
    queryKey: KEYS.completionTrend(days),
    queryFn: async () => {
      const { data } = await api.get('/analytics/task-completion-trend', { params: { days } })
      return data.data
    },
  })
}

export function useTopContributorsQuery() {
  return useQuery({
    queryKey: KEYS.topContributors(),
    queryFn: async () => {
      const { data } = await api.get('/analytics/top-contributors')
      return data.data
    },
  })
}

export function useProjectHealthQuery() {
  return useQuery({
    queryKey: KEYS.projectHealth(),
    queryFn: async () => {
      const { data } = await api.get('/analytics/project-health')
      return data.data
    },
  })
}

export function useDeliveryForecastQuery() {
  return useQuery({
    queryKey: KEYS.deliveryForecast(),
    queryFn: async () => {
      const { data } = await api.get('/analytics/delivery-forecast')
      return data.data
    },
  })
}

export function useBudgetOverviewQuery() {
  return useQuery({
    queryKey: KEYS.budgetOverview(),
    queryFn: async () => {
      const { data } = await api.get('/analytics/budget-overview')
      return data.data
    },
  })
}

export function useMyWeeklyHoursQuery() {
  return useQuery({
    queryKey: KEYS.myWeeklyHours(),
    queryFn: async () => {
      const { data } = await api.get('/analytics/my-weekly-hours')
      return data.data
    },
  })
}

export function useBurndownQuery(projectId: string | null, days = 30) {
  return useQuery({
    queryKey: KEYS.burndown(projectId, days),
    queryFn: async () => {
      const { data } = await api.get(`/analytics/burndown/${projectId}`, { params: { days } })
      return data.data as {
        totalTasks: number
        series: Array<{ date: string; remaining: number; ideal: number }>
      }
    },
    enabled: !!projectId,
  })
}

export { KEYS as analyticsKeys }
