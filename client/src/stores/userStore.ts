/**
 * User Store - Zustand store for user management (admin)
 * @module stores/userStore
 */

import { create } from 'zustand'
import api from '@services/api'
import { User, UserRole, PaginatedResponse } from '@/types'

interface UserFilters {
  page?: number
  limit?: number
  role?: string
  isActive?: string
  search?: string
}

interface UserState {
  users: User[]
  currentUser: User | null
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  isLoading: boolean
  error: string | null

  fetchUsers: (filters?: UserFilters) => Promise<void>
  fetchUser: (id: string) => Promise<void>
  createUser: (data: {
    email: string
    password: string
    firstName: string
    lastName: string
    role: UserRole
  }) => Promise<User>
  updateUser: (id: string, data: Partial<{
    email: string
    firstName: string
    lastName: string
    role: UserRole
    isActive: boolean
    password: string
  }>) => Promise<void>
  updateProfile: (data: Partial<{
    email: string
    firstName: string
    lastName: string
    password: string
  }>) => Promise<User>
  deleteUser: (id: string) => Promise<void>
  hardDeleteUser: (id: string) => Promise<void>
  clearError: () => void
  clearCurrentUser: () => void
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  currentUser: null,
  pagination: { page: 1, limit: 10, total: 0, pages: 0 },
  isLoading: false,
  error: null,

  fetchUsers: async (filters = {}) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters.page) params.append('page', String(filters.page))
      if (filters.limit) params.append('limit', String(filters.limit))
      if (filters.role) params.append('role', filters.role)
      if (filters.isActive) params.append('isActive', filters.isActive)
      if (filters.search) params.append('search', filters.search)

      const response = await api.get<{ success: boolean } & PaginatedResponse<User>>(
        `/users?${params.toString()}`
      )

      if (response.data.success !== false) {
        set({
          users: response.data.data,
          pagination: response.data.pagination,
          isLoading: false,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore nel caricamento utenti'
      set({ error: message, isLoading: false })
    }
  },

  fetchUser: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get<{ success: boolean; data: User }>(`/users/${id}`)
      if (response.data.success) {
        set({ currentUser: response.data.data, isLoading: false })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore nel caricamento utente'
      set({ error: message, isLoading: false })
    }
  },

  createUser: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post<{ success: boolean; data: User }>('/users', data)
      if (response.data.success && response.data.data) {
        set((state) => ({
          users: [response.data.data, ...state.users],
          isLoading: false,
        }))
        return response.data.data
      }
      throw new Error('Errore nella creazione utente')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore nella creazione utente'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  updateUser: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.put<{ success: boolean; data: User }>(`/users/${id}`, data)
      if (response.data.success && response.data.data) {
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? response.data.data : u)),
          currentUser: state.currentUser?.id === id ? response.data.data : state.currentUser,
          isLoading: false,
        }))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore nell\'aggiornamento utente'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.put<{ success: boolean; data: User }>('/users/me', data)
      if (response.data.success && response.data.data) {
        set({ isLoading: false })
        return response.data.data
      }
      throw new Error('Errore nell\'aggiornamento profilo')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore nell\'aggiornamento profilo'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  deleteUser: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.delete(`/users/${id}`)
      set((state) => ({
        users: state.users.filter((u) => u.id !== id),
        currentUser: state.currentUser?.id === id ? null : state.currentUser,
        isLoading: false,
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore nell\'eliminazione utente'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  hardDeleteUser: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.delete(`/users/${id}/hard`)
      set((state) => ({
        users: state.users.filter((u) => u.id !== id),
        currentUser: state.currentUser?.id === id ? null : state.currentUser,
        isLoading: false,
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore nell\'eliminazione permanente'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  clearError: () => set({ error: null }),
  clearCurrentUser: () => set({ currentUser: null }),
}))
