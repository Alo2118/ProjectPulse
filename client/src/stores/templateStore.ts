/**
 * Template Store - Zustand store for project templates
 * @module stores/templateStore
 */

import { create } from 'zustand'
import api from '@services/api'
import { ProjectTemplate } from '@/types'
import { toast } from '@stores/toastStore'

interface TemplateState {
  templates: ProjectTemplate[]
  currentTemplate: ProjectTemplate | null
  isLoading: boolean
  error: string | null

  fetchTemplates: (includeInactive?: boolean) => Promise<void>
  fetchTemplate: (id: string) => Promise<void>
  createTemplate: (data: Partial<ProjectTemplate>) => Promise<ProjectTemplate>
  updateTemplate: (id: string, data: Partial<ProjectTemplate>) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>
  clearError: () => void
  clearCurrentTemplate: () => void
}

export const useTemplateStore = create<TemplateState>((set) => ({
  templates: [],
  currentTemplate: null,
  isLoading: false,
  error: null,

  fetchTemplates: async (includeInactive = false) => {
    set({ isLoading: true, error: null })
    try {
      const params = includeInactive ? '?includeInactive=true' : ''
      const response = await api.get<{ success: boolean; data: ProjectTemplate[] }>(
        `/templates${params}`
      )
      if (response.data.success) {
        set({ templates: response.data.data, isLoading: false })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore nel caricamento template'
      set({ error: message, isLoading: false })
    }
  },

  fetchTemplate: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get<{ success: boolean; data: ProjectTemplate }>(`/templates/${id}`)
      if (response.data.success) {
        set({ currentTemplate: response.data.data, isLoading: false })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore nel caricamento template'
      set({ error: message, isLoading: false })
    }
  },

  createTemplate: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post<{ success: boolean; data: ProjectTemplate }>('/templates', data)
      if (response.data.success && response.data.data) {
        set((state) => ({
          templates: [...state.templates, response.data.data],
          isLoading: false,
        }))
        toast.success('Template creato', response.data.data.name)
        return response.data.data
      }
      throw new Error('Impossibile creare il template')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossibile creare il template'
      set({ error: message, isLoading: false })
      toast.error('Errore', message)
      throw error
    }
  },

  updateTemplate: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.put<{ success: boolean; data: ProjectTemplate }>(
        `/templates/${id}`,
        data
      )
      if (response.data.success && response.data.data) {
        const updated = response.data.data
        set((state) => ({
          templates: state.templates.map((t) => (t.id === id ? updated : t)),
          currentTemplate: state.currentTemplate?.id === id ? updated : state.currentTemplate,
          isLoading: false,
        }))
        toast.success('Template aggiornato')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossibile aggiornare il template'
      set({ error: message, isLoading: false })
      toast.error('Errore', message)
      throw error
    }
  },

  deleteTemplate: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.delete(`/templates/${id}`)
      set((state) => ({
        templates: state.templates.filter((t) => t.id !== id),
        currentTemplate: state.currentTemplate?.id === id ? null : state.currentTemplate,
        isLoading: false,
      }))
      toast.success('Template eliminato')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossibile eliminare il template'
      set({ error: message, isLoading: false })
      toast.error('Errore', message)
      throw error
    }
  },

  clearError: () => set({ error: null }),
  clearCurrentTemplate: () => set({ currentTemplate: null }),
}))
