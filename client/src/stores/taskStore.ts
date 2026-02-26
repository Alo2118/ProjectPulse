/**
 * Task Store - Zustand store for task management
 * @module stores/taskStore
 */

import { create } from 'zustand'
import api from '@services/api'
import { toast } from '@stores/toastStore'
import { Task, PaginatedResponse, TaskStats, TaskStatus } from '@/types'

// ─── Socket payload types (mirrors the backend emit shapes) ──────────────────

export interface TaskSocketPayload {
  task: Task
  projectId: string | null
}

export interface TaskStatusChangedSocketPayload {
  taskId: string
  projectId: string | null
  oldStatus: TaskStatus
  newStatus: TaskStatus
  updatedBy: string
}

export interface TaskDeletedSocketPayload {
  taskId: string
  projectId: string | null
}

// Helper function to parse recurrencePattern from JSON string to object
function parseTaskRecurrence(task: Task): Task {
  const raw = task.recurrencePattern as unknown
  if (raw && typeof raw === 'string') {
    try {
      task.recurrencePattern = JSON.parse(raw)
    } catch {
      task.recurrencePattern = undefined
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
  departmentId?: string
  includeSubtasks?: boolean
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
  bulkUpdateTasks: (ids: string[], update: { status?: string; priority?: string; assigneeId?: string }) => Promise<void>
  bulkDeleteTasks: (ids: string[]) => Promise<void>
  cloneTask: (id: string, includeSubtasks?: boolean) => Promise<Task>

  // Real-time helpers — update local state only, no API calls
  addTaskToStore: (task: Task) => void
  updateTaskInStore: (task: Task) => void
  updateTaskStatusInStore: (taskId: string, newStatus: TaskStatus) => void
  removeTaskFromStore: (taskId: string) => void
}

export const useTaskStore = create<TaskState>((set, get) => ({
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
      if (filters.departmentId) params.append('departmentId', filters.departmentId)
      if (filters.includeSubtasks) params.append('includeSubtasks', 'true')

      const response = await api.get<{ success: boolean } & PaginatedResponse<Task>>(
        `/tasks?${params.toString()}`
      )

      if (response.data.success) {
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

      if (response.data.success) {
        // Parse recurrencePattern from JSON strings to objects
        const myTasks = response.data.data.map(parseTaskRecurrence)
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
    } catch {
      // Stats are non-critical, silently ignore
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
        toast.success('Task creato', task.title)
        return task
      }
      throw new Error('Failed to create task')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create task'
      set({ error: message, isLoading: false })
      toast.error('Errore', 'Impossibile creare il task')
      throw error
    }
  },

  updateTask: async (id, data) => {
    // 1. Save previous state for rollback
    const previousTasks = get().tasks
    const previousMyTasks = get().myTasks
    const previousCurrentTask = get().currentTask

    // 2. Optimistically apply the partial update immediately (no isLoading flag — keeps UI responsive)
    const applyPatch = (tasks: Task[]) =>
      tasks.map((t) => (t.id === id ? { ...t, ...data } : t))

    set({
      tasks: applyPatch(get().tasks),
      myTasks: applyPatch(get().myTasks),
      currentTask:
        get().currentTask?.id === id
          ? { ...get().currentTask!, ...data }
          : get().currentTask,
    })

    try {
      const response = await api.put<{ success: boolean; data: Task }>(`/tasks/${id}`, data)

      if (response.data.success && response.data.data) {
        // 3. Replace with authoritative server response
        const updatedTask = parseTaskRecurrence(response.data.data)
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
          myTasks: state.myTasks.map((t) => (t.id === id ? updatedTask : t)),
          currentTask: state.currentTask?.id === id ? updatedTask : state.currentTask,
        }))
        toast.success('Task aggiornato')
      }
    } catch (error) {
      // 4. Rollback on error
      set({
        tasks: previousTasks,
        myTasks: previousMyTasks,
        currentTask: previousCurrentTask,
        error: error instanceof Error ? error.message : 'Failed to update task',
      })
      toast.error('Errore', 'Impossibile aggiornare il task')
      throw error
    }
  },

  changeTaskStatus: async (id, status, blockedReason) => {
    // 1. Save previous state for rollback
    const previousTasks = get().tasks
    const previousMyTasks = get().myTasks
    const previousCurrentTask = get().currentTask

    // 2. Optimistically update status immediately
    const applyStatus = (tasks: Task[]) =>
      tasks.map((t) => (t.id === id ? { ...t, status } : t))

    set({
      tasks: applyStatus(get().tasks),
      myTasks: applyStatus(get().myTasks),
      currentTask:
        get().currentTask?.id === id
          ? { ...get().currentTask!, status }
          : get().currentTask,
    })

    try {
      const response = await api.patch<{ success: boolean; data: Task }>(`/tasks/${id}/status`, {
        status,
        blockedReason: status === 'blocked' ? blockedReason : undefined,
      })

      if (response.data.success && response.data.data) {
        // 3. Replace with authoritative server response (may carry extra computed fields)
        const updatedTask = parseTaskRecurrence(response.data.data)
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
          myTasks: state.myTasks.map((t) => (t.id === id ? updatedTask : t)),
          currentTask: state.currentTask?.id === id ? updatedTask : state.currentTask,
        }))
        toast.success('Stato aggiornato')
      }
    } catch (error) {
      // 4. Rollback on error
      set({
        tasks: previousTasks,
        myTasks: previousMyTasks,
        currentTask: previousCurrentTask,
        error: error instanceof Error ? error.message : 'Failed to change task status',
      })
      toast.error('Errore', 'Impossibile cambiare lo stato')
      throw error
    }
  },

  deleteTask: async (id) => {
    // Snapshot affected items for potential undo restore
    const state = get()
    const removedFromTasks = state.tasks.find((t) => t.id === id)
    const removedFromMyTasks = state.myTasks.find((t) => t.id === id)
    const previousCurrentTask = state.currentTask?.id === id ? state.currentTask : null

    // Optimistically remove from UI immediately
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== id),
      myTasks: s.myTasks.filter((t) => t.id !== id),
      currentTask: s.currentTask?.id === id ? null : s.currentTask,
    }))

    toast.withUndo(
      'Task eliminato',
      async () => {
        try {
          await api.delete(`/tasks/${id}`)
        } catch (error) {
          // Restore on API failure
          set((s) => ({
            tasks: removedFromTasks ? [removedFromTasks, ...s.tasks] : s.tasks,
            myTasks: removedFromMyTasks ? [removedFromMyTasks, ...s.myTasks] : s.myTasks,
            currentTask: previousCurrentTask ?? s.currentTask,
            error: error instanceof Error ? error.message : 'Failed to delete task',
          }))
          toast.error('Errore', 'Impossibile eliminare il task')
          throw error
        }
      },
      () => {
        // Undo: restore the items back into the store
        set((s) => ({
          tasks: removedFromTasks
            ? [removedFromTasks, ...s.tasks.filter((t) => t.id !== id)]
            : s.tasks,
          myTasks: removedFromMyTasks
            ? [removedFromMyTasks, ...s.myTasks.filter((t) => t.id !== id)]
            : s.myTasks,
          currentTask: previousCurrentTask ?? s.currentTask,
        }))
      }
    )
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

  clearCurrentTask: () => set({ currentTask: null }),

  bulkUpdateTasks: async (ids: string[], update: { status?: string; priority?: string; assigneeId?: string }) => {
    set({ isLoading: true, error: null })
    try {
      await api.patch('/tasks/bulk', { ids, update })
      toast.success('Aggiornamento', `${ids.length} task aggiornati`)
      // Refetch to get updated data
      await get().fetchMyTasks()
      await get().fetchTasks()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bulk update failed'
      set({ error: message, isLoading: false })
      toast.error('Errore', 'Impossibile aggiornare i task')
      throw error
    }
  },

  bulkDeleteTasks: async (ids: string[]) => {
    // Snapshot items for potential undo
    const state = get()
    const removedTasks = state.tasks.filter((t) => ids.includes(t.id))
    const removedMyTasks = state.myTasks.filter((t) => ids.includes(t.id))

    // Optimistically remove from UI
    set((s) => ({
      tasks: s.tasks.filter((t) => !ids.includes(t.id)),
      myTasks: s.myTasks.filter((t) => !ids.includes(t.id)),
    }))

    toast.withUndo(
      `${ids.length} task eliminati`,
      async () => {
        try {
          await api.delete('/tasks/bulk', { data: { ids } })
        } catch (error) {
          // Restore on API failure
          set((s) => ({
            tasks: [...removedTasks, ...s.tasks],
            myTasks: [...removedMyTasks, ...s.myTasks],
            error: error instanceof Error ? error.message : 'Bulk delete failed',
          }))
          toast.error('Errore', 'Impossibile eliminare i task')
          throw error
        }
      },
      () => {
        // Undo: put tasks back
        set((s) => ({
          tasks: [...removedTasks, ...s.tasks.filter((t) => !ids.includes(t.id))],
          myTasks: [...removedMyTasks, ...s.myTasks.filter((t) => !ids.includes(t.id))],
        }))
      }
    )
  },

  cloneTask: async (id: string, includeSubtasks = false) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post(`/tasks/${id}/clone`, { includeSubtasks })
      const cloned = parseTaskRecurrence(response.data.data)
      set((state) => ({
        tasks: [cloned, ...state.tasks],
        isLoading: false,
      }))
      toast.success('Duplicazione', 'Task duplicato con successo')
      return cloned
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Clone failed'
      set({ error: message, isLoading: false })
      toast.error('Errore', 'Impossibile duplicare il task')
      throw error
    }
  },

  // ── Real-time helpers: update local state without API calls ──────────────

  addTaskToStore: (task: Task) => {
    const parsed = parseTaskRecurrence(task)
    set((state) => {
      // Avoid duplicate if the task was already added by the creator's own action
      const alreadyInTasks = state.tasks.some((t) => t.id === parsed.id)
      const alreadyInMyTasks = state.myTasks.some((t) => t.id === parsed.id)
      return {
        tasks: alreadyInTasks ? state.tasks : [parsed, ...state.tasks],
        myTasks: alreadyInMyTasks ? state.myTasks : state.myTasks,
      }
    })
  },

  updateTaskInStore: (task: Task) => {
    const parsed = parseTaskRecurrence(task)
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === parsed.id ? parsed : t)),
      myTasks: state.myTasks.map((t) => (t.id === parsed.id ? parsed : t)),
      currentTask:
        state.currentTask?.id === parsed.id ? parsed : state.currentTask,
    }))
  },

  updateTaskStatusInStore: (taskId: string, newStatus: TaskStatus) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      ),
      myTasks: state.myTasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      ),
      currentTask:
        state.currentTask?.id === taskId
          ? { ...state.currentTask, status: newStatus }
          : state.currentTask,
    }))
  },

  removeTaskFromStore: (taskId: string) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
      myTasks: state.myTasks.filter((t) => t.id !== taskId),
      currentTask:
        state.currentTask?.id === taskId ? null : state.currentTask,
    }))
  },
}))
