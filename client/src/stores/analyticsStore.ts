/**
 * Analytics Store - Zustand store for analytics dashboard
 * @module stores/analyticsStore
 */

import { create } from 'zustand'
import api from '@services/api'
import type { DeliveryForecast, ProjectBudgetData } from '@/types'

interface OverviewStats {
  totalProjects: number
  activeProjects: number
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  blockedTasks: number
  overdueTasks: number
  totalMinutesLogged: number
  openRisks: number
  activeUsers: number
}

interface TasksByStatus {
  status: string
  count: number
}

interface HoursByProject {
  projectId: string
  projectName: string
  projectCode: string
  totalMinutes: number
}

interface TaskCompletionTrend {
  date: string
  completed: number
  created: number
}

interface TopContributor {
  userId: string
  firstName: string
  lastName: string
  minutesLogged: number
  tasksCompleted: number
}

interface ProjectHealth {
  projectId: string
  projectCode: string
  projectName: string
  status: string
  priority: string
  progress: number
  tasksTotal: number
  tasksCompleted: number
  tasksBlocked: number
  tasksInProgress: number
  openRisks: number
  highRisks: number
  targetEndDate: string | null
  daysRemaining: number | null
  healthStatus: 'healthy' | 'at_risk' | 'critical'
}

interface PreviousWeekOverview {
  totalMinutesLogged: number
  completedTasks: number
  blockedTasks: number
  activeProjects: number
}

interface TeamWorkloadEntry {
  userId: string
  firstName: string
  lastName: string
  minutesLogged: number
  weeklyHoursTarget: number
  utilizationPercent: number
}

interface AnalyticsState {
  overview: OverviewStats | null
  tasksByStatus: TasksByStatus[]
  hoursByProject: HoursByProject[]
  completionTrend: TaskCompletionTrend[]
  topContributors: TopContributor[]
  projectHealth: ProjectHealth[]
  previousWeekOverview: PreviousWeekOverview | null
  teamWorkload: TeamWorkloadEntry[]
  deliveryForecast: DeliveryForecast[]
  budgetOverview: ProjectBudgetData[]
  trendPeriodDays: number
  isLoading: boolean
  error: string | null

  fetchOverview: () => Promise<void>
  fetchOverviewWithDelta: () => Promise<void>
  fetchTasksByStatus: () => Promise<void>
  fetchHoursByProject: () => Promise<void>
  fetchCompletionTrend: (days?: number) => Promise<void>
  fetchTopContributors: () => Promise<void>
  fetchProjectHealth: () => Promise<void>
  fetchTeamWorkload: () => Promise<void>
  fetchDeliveryForecast: () => Promise<void>
  fetchBudgetOverview: () => Promise<void>
  setTrendPeriodDays: (days: number) => void
  fetchAll: () => Promise<void>
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  overview: null,
  tasksByStatus: [],
  hoursByProject: [],
  completionTrend: [],
  topContributors: [],
  projectHealth: [],
  previousWeekOverview: null,
  teamWorkload: [],
  deliveryForecast: [],
  budgetOverview: [],
  trendPeriodDays: 30,
  isLoading: false,
  error: null,

  fetchOverview: async () => {
    try {
      const res = await api.get<{ success: boolean; data: OverviewStats }>('/analytics/overview')
      if (res.data.success) set({ overview: res.data.data })
    } catch {
      // Fetch failed silently overview:', error)
    }
  },

  fetchOverviewWithDelta: async () => {
    try {
      const res = await api.get<{ success: boolean; data: OverviewStats & { previousWeek: PreviousWeekOverview } }>('/analytics/overview-with-delta')
      if (res.data.success) {
        const { previousWeek, ...overview } = res.data.data
        set({ overview, previousWeekOverview: previousWeek })
      }
    } catch {
      // Fetch failed silently
    }
  },

  fetchTasksByStatus: async () => {
    try {
      const res = await api.get<{ success: boolean; data: TasksByStatus[] }>('/analytics/tasks-by-status')
      if (res.data.success) set({ tasksByStatus: res.data.data })
    } catch {
      // Fetch failed silently tasks by status:', error)
    }
  },

  fetchHoursByProject: async () => {
    try {
      const res = await api.get<{ success: boolean; data: HoursByProject[] }>('/analytics/hours-by-project')
      if (res.data.success) set({ hoursByProject: res.data.data })
    } catch {
      // Fetch failed silently hours by project:', error)
    }
  },

  fetchCompletionTrend: async (days?: number) => {
    try {
      const effectiveDays = days ?? get().trendPeriodDays ?? 28
      const res = await api.get<{ success: boolean; data: TaskCompletionTrend[] }>(`/analytics/task-completion-trend?days=${effectiveDays}`)
      if (res.data.success) set({ completionTrend: res.data.data })
    } catch {
      // Fetch failed silently completion trend:', error)
    }
  },

  fetchTopContributors: async () => {
    try {
      const res = await api.get<{ success: boolean; data: TopContributor[] }>('/analytics/top-contributors')
      if (res.data.success) set({ topContributors: res.data.data })
    } catch {
      // Fetch failed silently top contributors:', error)
    }
  },

  fetchProjectHealth: async () => {
    try {
      const res = await api.get<{ success: boolean; data: ProjectHealth[] }>('/analytics/project-health')
      if (res.data.success) set({ projectHealth: res.data.data })
    } catch {
      // Fetch failed silently project health:', error)
    }
  },

  fetchTeamWorkload: async () => {
    try {
      const res = await api.get<{ success: boolean; data: TeamWorkloadEntry[] }>('/analytics/team-workload')
      if (res.data.success) set({ teamWorkload: res.data.data })
    } catch {
      // Fetch failed silently
    }
  },

  fetchDeliveryForecast: async () => {
    try {
      const res = await api.get<{ success: boolean; data: DeliveryForecast[] }>('/analytics/delivery-forecast')
      set({ deliveryForecast: res.data.data })
    } catch {
      // Non-critical, don't block dashboard
    }
  },

  fetchBudgetOverview: async () => {
    try {
      const res = await api.get<{ success: boolean; data: ProjectBudgetData[] }>('/analytics/budget-overview')
      if (res.data.success) set({ budgetOverview: res.data.data })
    } catch {
      // Non-critical, don't block dashboard
    }
  },

  setTrendPeriodDays: (days: number) => {
    set({ trendPeriodDays: days })
    get().fetchCompletionTrend(days)
  },

  fetchAll: async () => {
    set({ isLoading: true, error: null })
    try {
      const store = get()
      await Promise.all([
        store.fetchOverviewWithDelta(),
        store.fetchTasksByStatus(),
        store.fetchHoursByProject(),
        store.fetchCompletionTrend(),
        store.fetchTopContributors(),
        store.fetchProjectHealth(),
        store.fetchTeamWorkload(),
        store.fetchDeliveryForecast(),
        store.fetchBudgetOverview(),
      ])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore nel caricamento analytics'
      set({ error: message })
    } finally {
      set({ isLoading: false })
    }
  },
}))
