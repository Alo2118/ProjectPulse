/**
 * Dashboard Store - Zustand store for dashboard data
 * @module stores/dashboardStore
 */

import { create } from 'zustand'
import api from '@services/api'
import { toast } from '@stores/toastStore'
import { Task, Project, TimeEntry, Risk, TaskStats, UserWeeklyHours } from '@/types'

interface DashboardState {
  // Data
  myTasks: Task[]
  allTasks: Task[]
  recentProjects: Project[]
  recentTimeEntries: TimeEntry[]
  openRisks: Risk[]
  taskStats: TaskStats | null
  runningTimer: TimeEntry | null
  weeklyHours: UserWeeklyHours | null
  isLoadingWeeklyHours: boolean

  // UI
  mobileSidebarOpen: boolean
  setMobileSidebarOpen: (open: boolean) => void

  // Loading states
  isLoading: boolean
  isLoadingTasks: boolean
  isLoadingProjects: boolean
  isLoadingTimeEntries: boolean
  isLoadingRisks: boolean
  error: string | null

  // Actions
  fetchDashboardData: () => Promise<void>
  fetchMyTasks: () => Promise<void>
  fetchAllTasks: () => Promise<void>
  fetchRecentProjects: () => Promise<void>
  fetchRecentTimeEntries: () => Promise<void>
  fetchOpenRisks: () => Promise<void>
  fetchTaskStats: () => Promise<void>
  fetchRunningTimer: () => Promise<void>
  fetchWeeklyHours: () => Promise<void>
  startTimer: (taskId: string, description?: string) => Promise<void>
  stopTimer: () => Promise<void>
  reorderMyTasks: (taskPositions: Array<{ taskId: string; position: number }>) => Promise<void>
  clearError: () => void
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  myTasks: [],
  allTasks: [],
  recentProjects: [],
  recentTimeEntries: [],
  openRisks: [],
  taskStats: null,
  runningTimer: null,
  weeklyHours: null,
  isLoadingWeeklyHours: false,
  mobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  isLoading: false,
  isLoadingTasks: false,
  isLoadingProjects: false,
  isLoadingTimeEntries: false,
  isLoadingRisks: false,
  error: null,

  fetchDashboardData: async () => {
    set({ isLoading: true, error: null })
    try {
      await Promise.all([
        get().fetchMyTasks(),
        get().fetchRecentProjects(),
        get().fetchRecentTimeEntries(),
        get().fetchTaskStats(),
        get().fetchRunningTimer(),
        get().fetchWeeklyHours(),
      ])
      set({ isLoading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch dashboard data'
      set({ error: message, isLoading: false })
    }
  },

  fetchMyTasks: async () => {
    set({ isLoadingTasks: true })
    try {
      // Include subtasks for hierarchy display
      const response = await api.get<{ success: boolean; data: Task[] }>(
        '/tasks/my?limit=50&includeSubtasks=true'
      )

      if (response.data.success) {
        set({ myTasks: response.data.data || [], isLoadingTasks: false })
      }
    } catch {
      set({ isLoadingTasks: false })
    }
  },

  fetchAllTasks: async () => {
    set({ isLoadingTasks: true })
    try {
      const response = await api.get<{ success: boolean; data: Task[] }>(
        '/tasks?limit=100&includeSubtasks=true'
      )

      if (response.data.success) {
        set({ allTasks: response.data.data || [], isLoadingTasks: false })
      }
    } catch {
      set({ isLoadingTasks: false })
    }
  },

  fetchRecentProjects: async () => {
    set({ isLoadingProjects: true })
    try {
      const response = await api.get<{ success: boolean; data: Project[] }>('/projects?limit=5')

      if (response.data.success) {
        set({ recentProjects: response.data.data || [], isLoadingProjects: false })
      }
    } catch {
      set({ isLoadingProjects: false })
    }
  },

  fetchRecentTimeEntries: async () => {
    set({ isLoadingTimeEntries: true })
    try {
      // Filter to entries from the last 3 days
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      const fromDate = threeDaysAgo.toISOString().split('T')[0]

      const response = await api.get<{ success: boolean; data: TimeEntry[] }>(
        `/time-entries?limit=50&fromDate=${fromDate}`
      )

      if (response.data.success) {
        // Filter client-side in case backend doesn't support fromDate
        const filtered = (response.data.data || []).filter((e) => {
          const entryDate = new Date(e.startTime)
          return entryDate >= threeDaysAgo
        })
        set({ recentTimeEntries: filtered, isLoadingTimeEntries: false })
      }
    } catch {
      set({ isLoadingTimeEntries: false })
    }
  },

  fetchOpenRisks: async () => {
    set({ isLoadingRisks: true })
    try {
      const response = await api.get<{ success: boolean; data: Risk[] }>('/risks?status=open')

      if (response.data.success) {
        set({ openRisks: response.data.data || [], isLoadingRisks: false })
      }
    } catch {
      set({ isLoadingRisks: false })
    }
  },

  fetchTaskStats: async () => {
    try {
      const response = await api.get<{ success: boolean; data: TaskStats }>('/tasks/my/stats')

      if (response.data.success) {
        set({ taskStats: response.data.data })
      }
    } catch {
      // silently ignore
    }
  },

  fetchRunningTimer: async () => {
    try {
      const response = await api.get<{ success: boolean; data: TimeEntry | null }>(
        '/time-entries/running'
      )

      if (response.data.success) {
        set({ runningTimer: response.data.data })
      }
    } catch (error) {
      // Running timer fetch failed silently
    }
  },

  fetchWeeklyHours: async () => {
    set({ isLoadingWeeklyHours: true })
    try {
      const response = await api.get<{ success: boolean; data: UserWeeklyHours }>(
        '/analytics/my-weekly-hours'
      )
      if (response.data.success) {
        set({ weeklyHours: response.data.data, isLoadingWeeklyHours: false })
      }
    } catch {
      set({ isLoadingWeeklyHours: false })
    }
  },

  startTimer: async (taskId: string, description?: string) => {
    // 1. Save previous running timer for rollback
    const previousRunningTimer = get().runningTimer

    // 2. Optimistically set a provisional timer entry so the UI reacts instantly.
    //    We create a minimal placeholder — the server response will replace it with the real entry.
    const optimisticTimer: TimeEntry = {
      id: `optimistic-${Date.now()}`,
      taskId,
      description: description ?? null,
      startTime: new Date().toISOString(),
      endTime: null,
      duration: null,
      isRunning: true,
      userId: '',
      approvalStatus: 'pending',
      approvedById: null,
      approvedAt: null,
      rejectionNote: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    set({ runningTimer: optimisticTimer })

    try {
      const response = await api.post<{ success: boolean; data: TimeEntry }>(
        '/time-entries/start',
        { taskId, description }
      )

      if (response.data.success) {
        // 3. Replace optimistic entry with authoritative server data
        set({ runningTimer: response.data.data })
        toast.success('Timer avviato')
      }
    } catch (error) {
      // 4. Rollback on error
      const message = error instanceof Error ? error.message : 'Failed to start timer'
      set({ error: message, runningTimer: previousRunningTimer })
      toast.error('Errore', 'Impossibile avviare il timer')
      throw error
    }
  },

  stopTimer: async () => {
    // 1. Save previous state for rollback
    const previousRunningTimer = get().runningTimer
    const previousRecentTimeEntries = get().recentTimeEntries

    // 2. Optimistically clear the running timer immediately
    set({ runningTimer: null })

    try {
      const response = await api.post<{ success: boolean; data: TimeEntry }>(
        '/time-entries/stop'
      )

      if (response.data.success) {
        // 3. Add completed entry to recent list with server data
        set((state) => ({
          recentTimeEntries: [response.data.data, ...state.recentTimeEntries.slice(0, 4)],
        }))
        toast.success('Timer fermato')
      }
    } catch (error) {
      // 4. Rollback — restore running timer and recent entries
      const message = error instanceof Error ? error.message : 'Failed to stop timer'
      set({
        error: message,
        runningTimer: previousRunningTimer,
        recentTimeEntries: previousRecentTimeEntries,
      })
      toast.error('Errore', 'Impossibile fermare il timer')
      throw error
    }
  },

  reorderMyTasks: async (taskPositions) => {
    // 1. Save previous state for rollback
    const previousMyTasks = get().myTasks

    // 2. Optimistic update — apply new positions and re-sort immediately
    set((state) => ({
      myTasks: state.myTasks
        .map((task) => {
          const newPos = taskPositions.find((p) => p.taskId === task.id)
          return newPos ? { ...task, position: newPos.position } : task
        })
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    }))

    try {
      await api.patch('/tasks/reorder', { tasks: taskPositions })
    } catch (error) {
      // 3. Rollback to previous order on error
      const message = error instanceof Error ? error.message : 'Failed to reorder tasks'
      set({ error: message, myTasks: previousMyTasks })
      toast.error('Errore', 'Impossibile riordinare i task')
      throw error
    }
  },

  clearError: () => set({ error: null }),
}))
