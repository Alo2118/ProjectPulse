/**
 * Task Tree Store - Zustand store for hierarchical task view
 * @module stores/taskTreeStore
 */

import { create } from 'zustand'
import api from '@services/api'
import type { TaskTreeResponse } from '../types'

interface FetchOptions {
  projectId?: string
  parentTaskId?: string
  myTasksOnly?: boolean
  filterUserId?: string
  excludeCompleted?: boolean
}

interface TaskTreeState {
  // Data
  treeData: TaskTreeResponse | null

  // Filters
  selectedProjectId: string | null
  myTasksOnly: boolean
  filterUserId: string | null
  excludeCompleted: boolean

  // UI State
  expandedProjects: Set<string>
  expandedMilestones: Set<string>
  expandedTasks: Set<string>

  // Loading states
  isLoading: boolean
  error: string | null

  // Actions
  fetchTaskTree: (options?: FetchOptions) => Promise<void>
  setSelectedProject: (projectId: string | null) => void
  setMyTasksOnly: (value: boolean) => void
  setFilterUserId: (userId: string | null) => void
  setExcludeCompleted: (value: boolean) => void
  toggleProject: (projectId: string) => void
  toggleMilestone: (milestoneId: string) => void
  toggleTask: (taskId: string) => void
  expandAll: () => void
  collapseAll: () => void
  clearError: () => void
}

export const useTaskTreeStore = create<TaskTreeState>((set, get) => ({
  treeData: null,
  selectedProjectId: null,
  myTasksOnly: false,
  filterUserId: null,
  excludeCompleted: false,
  expandedProjects: new Set(),
  expandedMilestones: new Set(),
  expandedTasks: new Set(),
  isLoading: false,
  error: null,

  fetchTaskTree: async (options?: FetchOptions) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()

      const projectId = options?.projectId ?? get().selectedProjectId
      const parentTaskId = options?.parentTaskId
      const myTasksOnly = options?.myTasksOnly ?? get().myTasksOnly
      const filterUserId = options?.filterUserId ?? get().filterUserId
      const excludeCompleted = options?.excludeCompleted ?? get().excludeCompleted

      if (projectId) params.set('projectId', projectId)
      if (parentTaskId) params.set('parentTaskId', parentTaskId)
      if (myTasksOnly) params.set('myTasksOnly', 'true')
      if (filterUserId) params.set('filterUserId', filterUserId)
      if (excludeCompleted) params.set('excludeCompleted', 'true')

      const url = `/task-tree${params.toString() ? `?${params.toString()}` : ''}`
      const res = await api.get<{ success: boolean; data: TaskTreeResponse }>(url)

      if (res.data.success) {
        set({
          treeData: res.data.data,
          selectedProjectId: projectId || null,
          myTasksOnly,
          filterUserId: filterUserId || null,
          excludeCompleted,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore nel caricamento dati'
      set({ error: message })
      console.error('Failed to fetch task tree:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  setSelectedProject: (projectId: string | null) => {
    set({ selectedProjectId: projectId })
    get().fetchTaskTree({ projectId: projectId || undefined })
  },

  setMyTasksOnly: (value: boolean) => {
    set({ myTasksOnly: value })
    get().fetchTaskTree({ myTasksOnly: value })
  },

  setFilterUserId: (userId: string | null) => {
    set({ filterUserId: userId })
    get().fetchTaskTree({ filterUserId: userId || undefined })
  },

  setExcludeCompleted: (value: boolean) => {
    set({ excludeCompleted: value })
    get().fetchTaskTree({ excludeCompleted: value })
  },

  toggleProject: (projectId: string) => {
    set((state) => {
      const newExpanded = new Set(state.expandedProjects)
      if (newExpanded.has(projectId)) {
        newExpanded.delete(projectId)
      } else {
        newExpanded.add(projectId)
      }
      return { expandedProjects: newExpanded }
    })
  },

  toggleMilestone: (milestoneId: string) => {
    set((state) => {
      const newExpanded = new Set(state.expandedMilestones)
      if (newExpanded.has(milestoneId)) {
        newExpanded.delete(milestoneId)
      } else {
        newExpanded.add(milestoneId)
      }
      return { expandedMilestones: newExpanded }
    })
  },

  toggleTask: (taskId: string) => {
    set((state) => {
      const newExpanded = new Set(state.expandedTasks)
      if (newExpanded.has(taskId)) {
        newExpanded.delete(taskId)
      } else {
        newExpanded.add(taskId)
      }
      return { expandedTasks: newExpanded }
    })
  },

  expandAll: () => {
    const { treeData } = get()
    if (!treeData) return

    const projectIds = new Set(treeData.projects.map((p) => p.id))
    const milestoneIds = new Set<string>()
    const taskIds = new Set<string>()

    const collectTaskIds = (tasks: { id: string; subtasks: { id: string; subtasks: unknown[] }[] }[]) => {
      for (const task of tasks) {
        taskIds.add(task.id)
        if (task.subtasks && task.subtasks.length > 0) {
          collectTaskIds(task.subtasks as typeof tasks)
        }
      }
    }

    for (const project of treeData.projects) {
      if (project.milestones) {
        for (const milestone of project.milestones) {
          milestoneIds.add(milestone.id)
          if (milestone.tasks) {
            collectTaskIds(milestone.tasks)
          }
        }
      }
      if (project.tasks) {
        collectTaskIds(project.tasks)
      }
    }

    // Also collect subtask IDs when in parentTaskId mode
    if (treeData.subtasks) {
      collectTaskIds(treeData.subtasks)
    }

    set({ expandedProjects: projectIds, expandedMilestones: milestoneIds, expandedTasks: taskIds })
  },

  collapseAll: () => {
    set({ expandedProjects: new Set(), expandedMilestones: new Set(), expandedTasks: new Set() })
  },

  clearError: () => {
    set({ error: null })
  },
}))
