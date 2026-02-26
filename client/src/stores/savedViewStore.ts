/**
 * SavedView Store - Manages saved filter views per entity
 * @module stores/savedViewStore
 */

import { create } from 'zustand'
import api from '@services/api'
import type { SavedView, SavedViewEntity } from '@/types'

interface CreateSavedViewInput {
  name: string
  entity: SavedViewEntity
  filters: Record<string, unknown>
  columns?: string[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  isShared?: boolean
  isDefault?: boolean
}

interface UpdateSavedViewInput {
  name?: string
  filters?: Record<string, unknown>
  columns?: string[] | null
  sortBy?: string | null
  sortOrder?: 'asc' | 'desc' | null
  isShared?: boolean
  isDefault?: boolean
}

interface SavedViewState {
  views: SavedView[]
  activeViewId: string | null
  isLoading: boolean
  error: string | null

  fetchViews: (entity: SavedViewEntity) => Promise<void>
  createView: (input: CreateSavedViewInput) => Promise<SavedView>
  updateView: (id: string, input: UpdateSavedViewInput) => Promise<void>
  deleteView: (id: string) => Promise<void>
  setActiveView: (id: string | null) => void
  getActiveView: () => SavedView | null
  clearError: () => void
}

export const useSavedViewStore = create<SavedViewState>((set, get) => ({
  views: [],
  activeViewId: null,
  isLoading: false,
  error: null,

  fetchViews: async (entity: SavedViewEntity) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get<{ success: boolean; data: SavedView[] }>(
        `/views?entity=${entity}&includeShared=true`
      )
      set({ views: response.data.data, isLoading: false })
    } catch {
      set({ error: 'Errore nel caricamento delle viste', isLoading: false })
    }
  },

  createView: async (input: CreateSavedViewInput) => {
    const response = await api.post<{ success: boolean; data: SavedView }>('/views', input)
    const created = response.data.data
    set((state) => ({
      views: [...state.views, created].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    return created
  },

  updateView: async (id: string, input: UpdateSavedViewInput) => {
    const response = await api.patch<{ success: boolean; data: SavedView }>(`/views/${id}`, input)
    const updated = response.data.data

    set((state) => {
      let views = state.views.map((v) => (v.id === id ? updated : v))

      // If the updated view was set as default, clear other defaults for same entity
      if (updated.isDefault) {
        views = views.map((v) =>
          v.entity === updated.entity && v.id !== id ? { ...v, isDefault: false } : v
        )
      }

      return { views: views.sort((a, b) => a.name.localeCompare(b.name)) }
    })
  },

  deleteView: async (id: string) => {
    await api.delete(`/views/${id}`)
    set((state) => ({
      views: state.views.filter((v) => v.id !== id),
      activeViewId: state.activeViewId === id ? null : state.activeViewId,
    }))
  },

  setActiveView: (id: string | null) => {
    set({ activeViewId: id })
  },

  getActiveView: () => {
    const { views, activeViewId } = get()
    if (!activeViewId) return null
    return views.find((v) => v.id === activeViewId) ?? null
  },

  clearError: () => set({ error: null }),
}))
