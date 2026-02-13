/**
 * Tag Store - Zustand store for tag management
 * @module stores/tagStore
 */

import { create } from 'zustand'
import api from '@services/api'
import { Tag, TaggableEntityType } from '@/types'

interface TagState {
  tags: Tag[]
  isLoading: boolean
  error: string | null

  fetchTags: (search?: string) => Promise<void>
  createTag: (data: { name: string; color?: string }) => Promise<Tag>
  updateTag: (id: string, data: { name?: string; color?: string }) => Promise<void>
  deleteTag: (id: string) => Promise<void>
  assignTag: (tagId: string, entityType: TaggableEntityType, entityId: string) => Promise<void>
  unassignTag: (tagId: string, entityType: TaggableEntityType, entityId: string) => Promise<void>
  fetchEntityTags: (entityType: TaggableEntityType, entityId: string) => Promise<Tag[]>
  clearError: () => void
}

export const useTagStore = create<TagState>((set) => ({
  tags: [],
  isLoading: false,
  error: null,

  fetchTags: async (search?: string) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (search) params.set('search', search)
      const response = await api.get<{ success: boolean; data: Tag[] }>(`/tags?${params}`)
      set({ tags: response.data.data, isLoading: false })
    } catch (error) {
      set({ error: 'Errore nel caricamento dei tag', isLoading: false })
    }
  },

  createTag: async (data) => {
    try {
      const response = await api.post<{ success: boolean; data: Tag }>('/tags', data)
      const newTag = response.data.data
      set((state) => ({ tags: [...state.tags, newTag].sort((a, b) => a.name.localeCompare(b.name)) }))
      return newTag
    } catch (error) {
      throw error
    }
  },

  updateTag: async (id, data) => {
    try {
      const response = await api.put<{ success: boolean; data: Tag }>(`/tags/${id}`, data)
      const updated = response.data.data
      set((state) => ({
        tags: state.tags.map((t) => (t.id === id ? updated : t)),
      }))
    } catch (error) {
      throw error
    }
  },

  deleteTag: async (id) => {
    try {
      await api.delete(`/tags/${id}`)
      set((state) => ({
        tags: state.tags.filter((t) => t.id !== id),
      }))
    } catch (error) {
      throw error
    }
  },

  assignTag: async (tagId, entityType, entityId) => {
    try {
      await api.post('/tags/assign', { tagId, entityType, entityId })
    } catch (error) {
      throw error
    }
  },

  unassignTag: async (tagId, entityType, entityId) => {
    try {
      await api.delete('/tags/assign', { data: { tagId, entityType, entityId } })
    } catch (error) {
      throw error
    }
  },

  fetchEntityTags: async (entityType, entityId) => {
    try {
      const response = await api.get<{ success: boolean; data: Tag[] }>(`/tags/entity/${entityType}/${entityId}`)
      return response.data.data
    } catch (error) {
      return []
    }
  },

  clearError: () => set({ error: null }),
}))
