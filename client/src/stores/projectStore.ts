/**
 * Project Store - Zustand store for project management
 * @module stores/projectStore
 */

import { create } from 'zustand'
import api from '@services/api'
import { Project, PaginatedResponse, ProjectStats } from '@/types'

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

  // Actions
  fetchProjects: (filters?: ProjectFilters) => Promise<void>
  fetchProject: (id: string) => Promise<void>
  fetchProjectStats: (id: string) => Promise<void>
  createProject: (data: Partial<Project>) => Promise<Project>
  updateProject: (id: string, data: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  clearError: () => void
  clearCurrentProject: () => void
}

export const useProjectStore = create<ProjectState>((set) => ({
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

  fetchProjects: async (filters = {}) => {
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

      if (response.data.success !== false) {
        set({
          projects: response.data.data,
          pagination: response.data.pagination,
          isLoading: false,
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
    } catch (error) {
      console.error('Failed to fetch project stats:', error)
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
        }))
        return response.data.data
      }
      throw new Error('Failed to create project')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create project'
      set({ error: message, isLoading: false })
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
        }))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update project'
      set({ error: message, isLoading: false })
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
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete project'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  clearError: () => set({ error: null }),

  clearCurrentProject: () => set({ currentProject: null, projectStats: null }),
}))
