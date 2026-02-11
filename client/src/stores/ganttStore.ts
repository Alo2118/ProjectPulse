/**
 * Gantt Store - Zustand store for Gantt chart management
 * @module stores/ganttStore
 */

import { create } from 'zustand'
import api from '@services/api'
import { GanttTask, GanttZoomLevel, GanttFilters, TaskDependency } from '@/types'
import { addDays, subDays, startOfMonth, endOfMonth } from 'date-fns'

interface GanttState {
  tasks: GanttTask[]
  isLoading: boolean
  error: string | null

  // View state
  zoomLevel: GanttZoomLevel
  viewStartDate: Date
  viewEndDate: Date
  expandedGroups: Set<string>

  // Filters
  filters: GanttFilters

  // Actions
  fetchGanttTasks: (filters?: GanttFilters) => Promise<void>
  setZoomLevel: (level: GanttZoomLevel) => void
  setViewRange: (start: Date, end: Date) => void
  navigateView: (direction: 'prev' | 'next') => void
  toggleGroupExpanded: (groupId: string) => void
  setFilters: (filters: GanttFilters) => void
  clearError: () => void

  // Dependencies
  createDependency: (predecessorId: string, successorId: string) => Promise<TaskDependency>
  deleteDependency: (dependencyId: string) => Promise<void>
}

// Calculate default view range (current month)
const getDefaultViewRange = (): { start: Date; end: Date } => {
  const now = new Date()
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
  }
}

export const useGanttStore = create<GanttState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,
  zoomLevel: 'week',
  viewStartDate: getDefaultViewRange().start,
  viewEndDate: getDefaultViewRange().end,
  expandedGroups: new Set<string>(),
  filters: {},

  fetchGanttTasks: async (filters = {}) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()

      const currentFilters = { ...get().filters, ...filters }
      if (currentFilters.projectId) params.append('projectId', currentFilters.projectId)
      if (currentFilters.assigneeId) params.append('assigneeId', currentFilters.assigneeId)
      if (currentFilters.startDateFrom) params.append('startDateFrom', currentFilters.startDateFrom)
      if (currentFilters.startDateTo) params.append('startDateTo', currentFilters.startDateTo)

      const response = await api.get<{ success: boolean; data: GanttTask[] }>(
        `/tasks/gantt?${params.toString()}`
      )

      set({
        tasks: response.data.data,
        isLoading: false,
        filters: currentFilters
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch Gantt tasks',
        isLoading: false,
      })
    }
  },

  setZoomLevel: (level: GanttZoomLevel) => {
    const { viewStartDate } = get()
    let newEnd: Date

    switch (level) {
      case 'day':
        newEnd = addDays(viewStartDate, 14) // 2 weeks view
        break
      case 'week':
        newEnd = addDays(viewStartDate, 28) // 4 weeks view
        break
      case 'month':
        newEnd = addDays(viewStartDate, 90) // ~3 months view
        break
    }

    set({ zoomLevel: level, viewEndDate: newEnd })
  },

  setViewRange: (start: Date, end: Date) => {
    set({ viewStartDate: start, viewEndDate: end })
  },

  navigateView: (direction: 'prev' | 'next') => {
    const { zoomLevel, viewStartDate, viewEndDate } = get()

    let daysToMove: number
    switch (zoomLevel) {
      case 'day':
        daysToMove = 7 // Move by 1 week
        break
      case 'week':
        daysToMove = 14 // Move by 2 weeks
        break
      case 'month':
        daysToMove = 30 // Move by ~1 month
        break
    }

    if (direction === 'prev') {
      set({
        viewStartDate: subDays(viewStartDate, daysToMove),
        viewEndDate: subDays(viewEndDate, daysToMove),
      })
    } else {
      set({
        viewStartDate: addDays(viewStartDate, daysToMove),
        viewEndDate: addDays(viewEndDate, daysToMove),
      })
    }
  },

  toggleGroupExpanded: (groupId: string) => {
    const { expandedGroups } = get()
    const newSet = new Set(expandedGroups)

    if (newSet.has(groupId)) {
      newSet.delete(groupId)
    } else {
      newSet.add(groupId)
    }

    set({ expandedGroups: newSet })
  },

  setFilters: (filters: GanttFilters) => {
    set({ filters })
  },

  clearError: () => {
    set({ error: null })
  },

  createDependency: async (predecessorId: string, successorId: string) => {
    try {
      const response = await api.post<{ success: boolean; data: TaskDependency }>(
        '/tasks/dependencies',
        { predecessorId, successorId, dependencyType: 'finish_to_start' }
      )

      // Refresh tasks to get updated dependencies
      await get().fetchGanttTasks()

      return response.data.data
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create dependency',
      })
      throw error
    }
  },

  deleteDependency: async (dependencyId: string) => {
    try {
      await api.delete(`/tasks/dependencies/${dependencyId}`)

      // Refresh tasks to get updated dependencies
      await get().fetchGanttTasks()
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete dependency',
      })
      throw error
    }
  },
}))
