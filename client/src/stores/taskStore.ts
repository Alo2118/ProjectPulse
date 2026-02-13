/**
 * Task Store - Zustand store for task management
 * @module stores/taskStore
 */

import { create } from 'zustand'
import api from '@services/api'
import { Task, PaginatedResponse, TaskStats, TaskStatus } from '@/types'

// Helper function to parse recurrencePattern from JSON string to object
function parseTaskRecurrence(task: any): Task {
  if (task.recurrencePattern && typeof task.recurrencePattern === 'string') {
    try {
      task.recurrencePattern = JSON.parse(task.recurrencePattern)
    } catch (e) {
      console.error('Failed to parse recurrencePattern for task', task.code, e)
      task.recurrencePattern = null
    }
  }
  return task
}

interface TaskFilters {
  page?: number
  limit?: number
  projectId?: string
  status?: string
  priority?: string
  assigneeId?: string
  search?: string
  standalone?: boolean
  parentTaskId?: string
}

interface KanbanTasks {
  todo: Task[]
  in_progress: Task[]
  review: Task[]
  blocked: Task[]
  done: Task[]
}

interface TaskState {
  tasks: Task[]
  myTasks: Task[]
  currentTask: Task | null
  kanbanTasks: KanbanTasks | null
  taskStats: TaskStats | null
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  isLoading: boolean
  error: string | null

  // Actions
  fetchTasks: (filters?: TaskFilters) => Promise<void>
  fetchMyTasks: (filters?: TaskFilters) => Promise<void>
  fetchTask: (id: string) => Promise<void>
  fetchKanbanTasks: (projectId: string) => Promise<void>
  fetchTaskStats: () => Promise<void>
  createTask: (data: Partial<Task>) => Promise<Task>
  updateTask: (id: string, data: Partial<Task>) => Promise<void>
  changeTaskStatus: (id: string, status: TaskStatus, blockedReason?: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  reorderMyTasks: (taskPositions: Array<{ taskId: string; position: number }>) => Promise<void>
  clearError: () => void
  clearCurrentTask: () => void
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  myTasks: [],
  currentTask: null,
  kanbanTasks: null,
  taskStats: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  isLoading: false,
  error: null,

  fetchTasks: async (filters = {}) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters.page) params.append('page', String(filters.page))
      if (filters.limit) params.append('limit', String(filters.limit))
      if (filters.projectId) params.append('projectId', filters.projectId)
      if (filters.status) params.append('status', filters.status)
      if (filters.priority) params.append('priority', filters.priority)
      if (filters.assigneeId) params.append('assigneeId', filters.assigneeId)
      if (filters.search) params.append('search', filters.search)
      if (filters.standalone) params.append('standalone', 'true')
      if (filters.parentTaskId) params.append('parentTaskId', filters.parentTaskId)

      const response = await api.get<{ success: boolean } & PaginatedResponse<Task>>(
        `/tasks?${params.toString()}`
      )

      if (response.data.success !== false) {
        // Parse recurrencePattern from JSON strings to objects
        const tasks = response.data.data.map(parseTaskRecurrence)
        set({
          tasks,
          pagination: response.data.pagination,
          isLoading: false,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch tasks'
      set({ error: message, isLoading: false })
    }
  },

  fetchMyTasks: async (filters = {}) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters.page) params.append('page', String(filters.page))
      if (filters.limit) params.append('limit', String(filters.limit))
      if (filters.status) params.append('status', filters.status)
      if (filters.priority) params.append('priority', filters.priority)
      // Always include subtasks for "my tasks" view
      params.append('includeSubtasks', 'true')

      const response = await api.get<{ success: boolean } & PaginatedResponse<Task>>(
        `/tasks/my?${params.toString()}`
      )

      if (response.data.success !== false) {
        console.log('[TaskStore] Raw API response - first task:', response.data.data[0])
        // Parse recurrencePattern from JSON strings to objects
        const myTasks = response.data.data.map(parseTaskRecurrence)
        console.log('[TaskStore] After parsing - first task:', myTasks[0])
        const recurringCount = myTasks.filter(t => t.isRecurring).length
        console.log('[TaskStore] Tasks with isRecurring=true:', recurringCount)
        if (recurringCount > 0) {
          console.log('[TaskStore] Recurring tasks:', myTasks.filter(t => t.isRecurring).map(t => ({
            code: t.code,
            title: t.title, 
            isRecurring: t.isRecurring,
            status: t.status
          })))
        }
        set({
          myTasks,
          isLoading: false,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch my tasks'
      set({ error: message, isLoading: false })
    }
  },

  fetchTask: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get<{ success: boolean; data: Task }>(`/tasks/${id}`)

      if (response.data.success) {
        const task = parseTaskRecurrence(response.data.data)
        set({ currentTask: task, isLoading: false })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch task'
      set({ error: message, isLoading: false })
    }
  },

  fetchKanbanTasks: async (projectId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get<{ success: boolean; data: KanbanTasks }>(
        `/tasks/kanban/${projectId}`
      )

      if (response.data.success) {
        // Parse recurrencePattern for all tasks in each status
        const kanbanTasks: KanbanTasks = {
          todo: response.data.data.todo.map(parseTaskRecurrence),
          in_progress: response.data.data.in_progress.map(parseTaskRecurrence),
          review: response.data.data.review.map(parseTaskRecurrence),
          blocked: response.data.data.blocked.map(parseTaskRecurrence),
          done: response.data.data.done.map(parseTaskRecurrence),
        }
        set({ kanbanTasks, isLoading: false })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch kanban tasks'
      set({ error: message, isLoading: false })
    }
  },

  fetchTaskStats: async () => {
    try {
      const response = await api.get<{ success: boolean; data: TaskStats }>('/tasks/stats')

      if (response.data.success) {
        set({ taskStats: response.data.data })
      }
    } catch (error) {
      console.error('Failed to fetch task stats:', error)
    }
  },

  createTask: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post<{ success: boolean; data: Task }>('/tasks', data)

      if (response.data.success && response.data.data) {
        const task = parseTaskRecurrence(response.data.data)
        set((state) => ({
          tasks: [task, ...state.tasks],
          isLoading: false,
        }))
        return task
      }
      throw new Error('Failed to create task')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create task'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  updateTask: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.put<{ success: boolean; data: Task }>(`/tasks/${id}`, data)

      if (response.data.success && response.data.data) {
        const updatedTask = parseTaskRecurrence(response.data.data)
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
          myTasks: state.myTasks.map((t) => (t.id === id ? updatedTask : t)),
          currentTask: state.currentTask?.id === id ? updatedTask : state.currentTask,
          isLoading: false,
        }))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update task'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  changeTaskStatus: async (id, status, blockedReason) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.patch<{ success: boolean; data: Task }>(`/tasks/${id}/status`, {
        status,
        blockedReason: status === 'blocked' ? blockedReason : undefined,
      })

      if (response.data.success && response.data.data) {
        const updatedTask = parseTaskRecurrence(response.data.data)
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
          myTasks: state.myTasks.map((t) => (t.id === id ? updatedTask : t)),
          currentTask: state.currentTask?.id === id ? updatedTask : state.currentTask,
          isLoading: false,
        }))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to change task status'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  deleteTask: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.delete(`/tasks/${id}`)
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        myTasks: state.myTasks.filter((t) => t.id !== id),
        currentTask: state.currentTask?.id === id ? null : state.currentTask,
        isLoading: false,
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete task'
      set({ error: message, isLoading: false })
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
      // Revert on error by refetching
      const message = error instanceof Error ? error.message : 'Failed to reorder tasks'
      set({ error: message })
      throw error
    }
  },

  clearError: () => set({ error: null }),

  clearCurrentTask: () => set({ currentTask: null }),
}))
