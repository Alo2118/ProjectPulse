import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

// --- Types ---

export interface DashboardStats {
  activeProjects: number
  activeProjectsDelta: number
  openTasks: number
  openTasksDelta: number
  weeklyHours: number
  weeklyHoursDelta: number
  openRisks: number
  criticalRisks: number
  completedTasksThisWeek: number
  teamMemberCount: number
  budgetUsedPercent: number | null
}

export interface AttentionItem {
  type: 'blocked_task' | 'due_soon' | 'critical_risk' | 'pending_review' | 'milestone_at_risk'
  entityId: string
  title: string
  projectName: string | null
  projectId: string | null
  dueDate: string | null
  extra: string | null
}

export interface TodayTotal {
  todayMinutes: number
  runningEntry: {
    id: string
    taskId: string
    taskTitle: string
    startedAt: string
  } | null
}

export interface MyTaskToday {
  id: string
  title: string
  status: string
  dueDate: string | null
  isRecurring: boolean
  recurrencePattern: string | null
  project: { id: string; name: string } | null
}

export interface RecentActivityItem {
  id: string
  action: string
  entityType: string
  entityId: string
  entityName: string | null
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string
  }
}

// --- Query Keys ---

const KEYS = {
  all: ['dashboard'] as const,
  stats: () => [...KEYS.all, 'stats'] as const,
  attention: (limit: number) => [...KEYS.all, 'attention', limit] as const,
  todayTotal: () => [...KEYS.all, 'today-total'] as const,
  myTasksToday: () => [...KEYS.all, 'my-tasks-today'] as const,
  recentActivity: (limit: number) => [...KEYS.all, 'recent-activity', limit] as const,
}

// --- Hooks ---

export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: KEYS.stats(),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: DashboardStats }>(
        '/dashboard/stats'
      )
      return data.data
    },
    staleTime: 60_000,
  })
}

export function useAttentionItemsQuery(limit = 5) {
  return useQuery({
    queryKey: KEYS.attention(limit),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: AttentionItem[] }>(
        '/dashboard/attention',
        { params: { limit } }
      )
      return data.data
    },
    staleTime: 60_000,
  })
}

export function useTodayTotalQuery() {
  return useQuery({
    queryKey: KEYS.todayTotal(),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: TodayTotal }>(
        '/dashboard/today-total'
      )
      return data.data
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function useMyTasksTodayQuery(days = 1) {
  return useQuery({
    queryKey: [...KEYS.myTasksToday(), days] as const,
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: MyTaskToday[] }>(
        '/dashboard/my-tasks-today',
        { params: { days } }
      )
      return data.data
    },
    staleTime: 60_000,
  })
}

export function useRecentActivityQuery(limit = 10) {
  return useQuery({
    queryKey: KEYS.recentActivity(limit),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: RecentActivityItem[] }>(
        '/dashboard/recent-activity',
        { params: { limit } }
      )
      return data.data
    },
    staleTime: 30_000,
  })
}

export { KEYS as dashboardKeys }
