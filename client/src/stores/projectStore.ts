/**
 * Project Store - Zustand store for project management
 * @module stores/projectStore
 */

import { create } from 'zustand'
import api from '@services/api'
import { toast } from '@stores/toastStore'
import { Project, PaginatedResponse, ProjectStats } from '@/types'

const CACHE_TTL_MS = 2 * 60 * 1000 // 2 minutes

interface ProjectFilters {
  page?: number
  limit?: number
  status?: string
  priority?: string
  search?: string
}

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  projectStats: ProjectStats | null
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  isLoading: boolean
  error: string | null
  _lastFetchedAt: number | null

  // Actions
  fetchProjects: (filters?: ProjectFilters) => Promise<void>
  fetchProject: (id: string) => Promise<void>
  fetchProjectStats: (id: string) => Promise<void>
  createProject: (data: Partial<Project>) => Promise<Project>
  updateProject: (id: string, data: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  invalidateCache: () => void
  clearError: () => void
  clearCurrentProject: () => void
}

function hasFilters(filters: ProjectFilters): boolean {
  return !!(filters.page || filters.limit || filters.status || filters.priority || filters.search)
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  projectStats: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  },
  isLoading: false,
  error: null,
  _lastFetchedAt: null,

  fetchProjects: async (filters = {}) => {
    // Use cache for unfiltered requests if data is fresh
    if (!hasFilters(filters)) {
      const { _lastFetchedAt, projects } = get()
      if (_lastFetchedAt && projects.length > 0 && Date.now() - _lastFetchedAt < CACHE_TTL_MS) {
        return
      }
    }

    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters.page) params.append('page', String(filters.page))
      if (filters.limit) params.append('limit', String(filters.limit))
      if (filters.status) params.append('status', filters.status)
      if (filters.priority) params.append('priority', filters.priority)
      if (filters.search) params.append('search', filters.search)

      const response = await api.get<{ success: boolean } & PaginatedResponse<Project>>(
        `/projects?${params.toString()}`
      )

      if (response.data.success) {
        set({
          projects: response.data.data,
          pagination: response.data.pagination,
          isLoading: false,
          _lastFetchedAt: Date.now(),
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch projects'
      set({ error: message, isLoading: false })
    }
  },

  fetchProject: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get<{ success: boolean; data: Project }>(`/projects/${id}`)

      if (response.data.success) {
        set({ currentProject: response.data.data, isLoading: false })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch project'
      set({ error: message, isLoading: false })
    }
  },

  fetchProjectStats: async (id: string) => {
    try {
      const response = await api.get<{ success: boolean; data: ProjectStats }>(
        `/projects/${id}/stats`
      )

      if (response.data.success) {
        set({ projectStats: response.data.data })
      }
    } catch {
      // Stats fetch failed silently
    }
  },

  createProject: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post<{ success: boolean; data: Project }>('/projects', data)

      if (response.data.success && response.data.data) {
        set((state) => ({
          projects: [response.data.data, ...state.projects],
          isLoading: false,
          _lastFetchedAt: null, // invalidate cache
        }))
        toast.success('Progetto creato', response.data.data.name)
        return response.data.data
      }
      throw new Error('Failed to create project')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create project'
      set({ error: message, isLoading: false })
      toast.error('Errore', 'Impossibile creare il progetto')
      throw error
    }
  },

  updateProject: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.put<{ success: boolean; data: Project }>(`/projects/${id}`, data)

      if (response.data.success && response.data.data) {
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? response.data.data : p)),
          currentProject:
            state.currentProject?.id === id ? response.data.data : state.currentProject,
          isLoading: false,
          _lastFetchedAt: null, // invalidate cache
        }))
        toast.success('Progetto aggiornato')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update project'
      set({ error: message, isLoading: false })
      toast.error('Errore', 'Impossibile aggiornare il progetto')
      throw error
    }
  },

  deleteProject: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.delete(`/projects/${id}`)
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
        isLoading: false,
        _lastFetchedAt: null, // invalidate cache
      }))
      toast.success('Progetto eliminato')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete project'
      set({ error: message, isLoading: false })
      toast.error('Errore', 'Impossibile eliminare il progetto')
      throw error
    }
  },

  invalidateCache: () => set({ _lastFetchedAt: null }),

  clearError: () => set({ error: null }),

  clearCurrentProject: () => set({ currentProject: null, projectStats: null }),
}))
