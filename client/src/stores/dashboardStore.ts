/**
 * Dashboard Store - Zustand store for dashboard data
 * @module stores/dashboardStore
 */

import { create } from 'zustand'
import api from '@services/api'
import { toast } from '@stores/toastStore'
import { Task, Project, TimeEntry, Risk, TaskStats } from '@/types'

interface DashboardState {
  // Data
  myTasks: Task[]
  allTasks: Task[]
  recentProjects: Project[]
  recentTimeEntries: TimeEntry[]
  openRisks: Risk[]
  taskStats: TaskStats | null
  runningTimer: TimeEntry | null

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
        '/tasks/my?limit=20&includeSubtasks=true'
      )

      if (response.data.success !== false) {
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

      if (response.data.success !== false) {
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

      if (response.data.success !== false) {
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

      if (response.data.success !== false) {
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

      if (response.data.success !== false) {
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

  startTimer: async (taskId: string, description?: string) => {
    try {
      const response = await api.post<{ success: boolean; data: TimeEntry }>(
        '/time-entries/start',
        { taskId, description }
      )

      if (response.data.success) {
        set({ runningTimer: response.data.data })
        toast.success('Timer avviato')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start timer'
      set({ error: message })
      toast.error('Errore', 'Impossibile avviare il timer')
      throw error
    }
  },

  stopTimer: async () => {
    try {
      const response = await api.post<{ success: boolean; data: TimeEntry }>(
        '/time-entries/stop'
      )

      if (response.data.success) {
        set((state) => ({
          runningTimer: null,
          recentTimeEntries: [response.data.data, ...state.recentTimeEntries.slice(0, 4)],
        }))
        toast.success('Timer fermato')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to stop timer'
      set({ error: message })
      toast.error('Errore', 'Impossibile fermare il timer')
      throw error
    }
  },

  reorderMyTasks: async (taskPositions) => {
    // Optimistic update
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
      const message = error instanceof Error ? error.message : 'Failed to reorder tasks'
      set({ error: message })
      throw error
    }
  },

  clearError: () => set({ error: null }),
}))
