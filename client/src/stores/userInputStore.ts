/**
 * User Input Store - Zustand store for user inputs (segnalazioni/suggerimenti)
 * @module stores/userInputStore
 */

import { create } from 'zustand'
import api from '@services/api'
import {
  UserInput,
  PaginatedResponse,
  UserInputStats,
  TaskPriority,
  Task,
  Project,
} from '@/types'
import { toast } from '@stores/toastStore'

interface UserInputFilters {
  page?: number
  limit?: number
  status?: string
  category?: string
  priority?: string
  createdById?: string
  search?: string
}

interface ConvertToTaskData {
  projectId?: string
  assigneeId?: string
  priority?: TaskPriority
  dueDate?: string
  estimatedHours?: number
}

interface ConvertToProjectData {
  name?: string
  description?: string
  ownerId: string
  templateId?: string
  priority?: string
}

interface UserInputState {
  inputs: UserInput[]
  myInputs: UserInput[]
  currentInput: UserInput | null
  stats: UserInputStats | null
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  isLoading: boolean
  error: string | null

  // Actions
  fetchInputs: (filters?: UserInputFilters) => Promise<void>
  fetchMyInputs: (filters?: UserInputFilters) => Promise<void>
  fetchInput: (id: string) => Promise<void>
  fetchStats: () => Promise<void>
  createInput: (data: Partial<UserInput>) => Promise<UserInput>
  updateInput: (id: string, data: Partial<UserInput>) => Promise<void>
  deleteInput: (id: string) => Promise<void>
  startProcessing: (id: string) => Promise<void>
  convertToTask: (id: string, data: ConvertToTaskData) => Promise<{ userInput: UserInput; task: Task }>
  convertToProject: (id: string, data: ConvertToProjectData) => Promise<{ userInput: UserInput; project: Project }>
  acknowledgeInput: (id: string, notes?: string) => Promise<void>
  rejectInput: (id: string, reason: string) => Promise<void>
  clearError: () => void
  clearCurrentInput: () => void
}

export const useUserInputStore = create<UserInputState>((set) => ({
  inputs: [],
  myInputs: [],
  currentInput: null,
  stats: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  isLoading: false,
  error: null,

  fetchInputs: async (filters = {}) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters.page) params.append('page', String(filters.page))
      if (filters.limit) params.append('limit', String(filters.limit))
      if (filters.status) params.append('status', filters.status)
      if (filters.category) params.append('category', filters.category)
      if (filters.priority) params.append('priority', filters.priority)
      if (filters.createdById) params.append('createdById', filters.createdById)
      if (filters.search) params.append('search', filters.search)

      const response = await api.get<{ success: boolean } & PaginatedResponse<UserInput>>(
        `/inputs?${params.toString()}`
      )

      if (response.data.success !== false) {
        set({
          inputs: response.data.data,
          pagination: response.data.pagination,
          isLoading: false,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch inputs'
      set({ error: message, isLoading: false })
    }
  },

  fetchMyInputs: async (filters = {}) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters.page) params.append('page', String(filters.page))
      if (filters.limit) params.append('limit', String(filters.limit))
      if (filters.status) params.append('status', filters.status)
      if (filters.category) params.append('category', filters.category)
      if (filters.priority) params.append('priority', filters.priority)
      if (filters.search) params.append('search', filters.search)

      const response = await api.get<{ success: boolean } & PaginatedResponse<UserInput>>(
        `/inputs/my?${params.toString()}`
      )

      if (response.data.success !== false) {
        set({
          myInputs: response.data.data,
          pagination: response.data.pagination,
          isLoading: false,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch my inputs'
      set({ error: message, isLoading: false })
    }
  },

  fetchInput: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get<{ success: boolean; data: UserInput }>(`/inputs/${id}`)

      if (response.data.success) {
        set({ currentInput: response.data.data, isLoading: false })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch input'
      set({ error: message, isLoading: false })
    }
  },

  fetchStats: async () => {
    try {
      const response = await api.get<{ success: boolean; data: UserInputStats }>('/inputs/stats')

      if (response.data.success) {
        set({ stats: response.data.data })
      }
    } catch {
      // silently ignore
    }
  },

  createInput: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post<{ success: boolean; data: UserInput }>('/inputs', data)

      if (response.data.success && response.data.data) {
        set((state) => ({
          inputs: [response.data.data, ...state.inputs],
          myInputs: [response.data.data, ...state.myInputs],
          isLoading: false,
        }))
        toast.success('Segnalazione creata')
        return response.data.data
      }
      throw new Error('Impossibile creare la segnalazione')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossibile creare la segnalazione'
      set({ error: message, isLoading: false })
      toast.error('Errore', message)
      throw error
    }
  },

  updateInput: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.put<{ success: boolean; data: UserInput }>(`/inputs/${id}`, data)

      if (response.data.success && response.data.data) {
        const updatedInput = response.data.data
        set((state) => ({
          inputs: state.inputs.map((i) => (i.id === id ? updatedInput : i)),
          myInputs: state.myInputs.map((i) => (i.id === id ? updatedInput : i)),
          currentInput: state.currentInput?.id === id ? updatedInput : state.currentInput,
          isLoading: false,
        }))
      }
      toast.success('Segnalazione aggiornata')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossibile aggiornare la segnalazione'
      set({ error: message, isLoading: false })
      toast.error('Errore', message)
      throw error
    }
  },

  deleteInput: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.delete(`/inputs/${id}`)
      set((state) => ({
        inputs: state.inputs.filter((i) => i.id !== id),
        myInputs: state.myInputs.filter((i) => i.id !== id),
        currentInput: state.currentInput?.id === id ? null : state.currentInput,
        isLoading: false,
      }))
      toast.success('Segnalazione eliminata')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossibile eliminare la segnalazione'
      set({ error: message, isLoading: false })
      toast.error('Errore', message)
      throw error
    }
  },

  startProcessing: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post<{ success: boolean; data: UserInput }>(`/inputs/${id}/process`)

      if (response.data.success && response.data.data) {
        const updatedInput = response.data.data
        set((state) => ({
          inputs: state.inputs.map((i) => (i.id === id ? updatedInput : i)),
          myInputs: state.myInputs.map((i) => (i.id === id ? updatedInput : i)),
          currentInput: state.currentInput?.id === id ? updatedInput : state.currentInput,
          isLoading: false,
        }))
        toast.success('Lavorazione avviata')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossibile avviare la lavorazione'
      set({ error: message, isLoading: false })
      toast.error('Errore', message)
      throw error
    }
  },

  convertToTask: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post<{ success: boolean; data: { userInput: UserInput; task: Task } }>(
        `/inputs/${id}/convert-to-task`,
        data
      )

      if (response.data.success && response.data.data) {
        const { userInput: updatedInput, task } = response.data.data
        set((state) => ({
          inputs: state.inputs.map((i) => (i.id === id ? updatedInput : i)),
          myInputs: state.myInputs.map((i) => (i.id === id ? updatedInput : i)),
          currentInput: state.currentInput?.id === id ? updatedInput : state.currentInput,
          isLoading: false,
        }))
        toast.success('Convertito in task')
        return { userInput: updatedInput, task }
      }
      throw new Error('Impossibile convertire in task')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossibile convertire in task'
      set({ error: message, isLoading: false })
      toast.error('Errore', message)
      throw error
    }
  },

  convertToProject: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post<{ success: boolean; data: { userInput: UserInput; project: Project } }>(
        `/inputs/${id}/convert-to-project`,
        data
      )

      if (response.data.success && response.data.data) {
        const { userInput: updatedInput, project } = response.data.data
        set((state) => ({
          inputs: state.inputs.map((i) => (i.id === id ? updatedInput : i)),
          myInputs: state.myInputs.map((i) => (i.id === id ? updatedInput : i)),
          currentInput: state.currentInput?.id === id ? updatedInput : state.currentInput,
          isLoading: false,
        }))
        toast.success('Convertito in progetto')
        return { userInput: updatedInput, project }
      }
      throw new Error('Impossibile convertire in progetto')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossibile convertire in progetto'
      set({ error: message, isLoading: false })
      toast.error('Errore', message)
      throw error
    }
  },

  acknowledgeInput: async (id, notes) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post<{ success: boolean; data: UserInput }>(`/inputs/${id}/acknowledge`, {
        notes,
      })

      if (response.data.success && response.data.data) {
        const updatedInput = response.data.data
        set((state) => ({
          inputs: state.inputs.map((i) => (i.id === id ? updatedInput : i)),
          myInputs: state.myInputs.map((i) => (i.id === id ? updatedInput : i)),
          currentInput: state.currentInput?.id === id ? updatedInput : state.currentInput,
          isLoading: false,
        }))
        toast.success('Segnalazione presa in carico')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossibile prendere in carico la segnalazione'
      set({ error: message, isLoading: false })
      toast.error('Errore', message)
      throw error
    }
  },

  rejectInput: async (id, reason) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post<{ success: boolean; data: UserInput }>(`/inputs/${id}/reject`, {
        reason,
      })

      if (response.data.success && response.data.data) {
        const updatedInput = response.data.data
        set((state) => ({
          inputs: state.inputs.map((i) => (i.id === id ? updatedInput : i)),
          myInputs: state.myInputs.map((i) => (i.id === id ? updatedInput : i)),
          currentInput: state.currentInput?.id === id ? updatedInput : state.currentInput,
          isLoading: false,
        }))
        toast.success('Segnalazione rifiutata')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossibile rifiutare la segnalazione'
      set({ error: message, isLoading: false })
      toast.error('Errore', message)
      throw error
    }
  },

  clearError: () => set({ error: null }),

  clearCurrentInput: () => set({ currentInput: null }),
}))
