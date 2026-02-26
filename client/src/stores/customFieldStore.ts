/**
 * Custom Field Store - Zustand store for custom field definitions and task values
 * @module stores/customFieldStore
 */

import { create } from 'zustand'
import api from '@services/api'
import { CustomFieldDefinition, CustomFieldWithValue } from '@/types'

// ============================================================
// TYPES
// ============================================================

interface CreateDefinitionInput {
  name: string
  fieldType: string
  options?: string[]
  projectId?: string
  isRequired?: boolean
  position?: number
}

interface UpdateDefinitionInput {
  name?: string
  fieldType?: string
  options?: string[]
  isRequired?: boolean
  position?: number
  isActive?: boolean
}

interface CustomFieldState {
  definitions: CustomFieldDefinition[]
  taskFieldValues: Map<string, CustomFieldWithValue[]>
  isLoading: boolean
  error: string | null

  fetchDefinitions: (projectId?: string, includeInactive?: boolean) => Promise<void>
  fetchTaskFieldValues: (taskId: string, projectId?: string | null) => Promise<void>
  createDefinition: (data: CreateDefinitionInput) => Promise<CustomFieldDefinition>
  updateDefinition: (id: string, data: UpdateDefinitionInput) => Promise<void>
  deleteDefinition: (id: string) => Promise<void>
  setFieldValue: (taskId: string, definitionId: string, value: string | null) => Promise<void>
  clearError: () => void
}

// ============================================================
// STORE
// ============================================================

export const useCustomFieldStore = create<CustomFieldState>((set) => ({
  definitions: [],
  taskFieldValues: new Map(),
  isLoading: false,
  error: null,

  fetchDefinitions: async (projectId?: string, includeInactive = false) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (projectId) params.set('projectId', projectId)
      if (includeInactive) params.set('includeInactive', 'true')
      params.set('includeGlobal', 'true')

      const response = await api.get<{ success: boolean; data: CustomFieldDefinition[] }>(
        `/custom-fields/definitions?${params.toString()}`
      )
      set({ definitions: response.data.data, isLoading: false })
    } catch {
      set({ error: 'Errore nel caricamento dei campi personalizzati', isLoading: false })
    }
  },

  fetchTaskFieldValues: async (taskId: string, projectId?: string | null) => {
    try {
      const params = new URLSearchParams()
      if (projectId) params.set('projectId', projectId)
      const qs = params.toString()

      const response = await api.get<{ success: boolean; data: CustomFieldWithValue[] }>(
        `/custom-fields/tasks/${taskId}/values${qs ? `?${qs}` : ''}`
      )
      if (response.data.success) {
        set((state) => {
          const updated = new Map(state.taskFieldValues)
          updated.set(taskId, response.data.data)
          return { taskFieldValues: updated }
        })
      }
    } catch {
      // silently ignore — values section will show empty state
    }
  },

  createDefinition: async (data) => {
    const response = await api.post<{ success: boolean; data: CustomFieldDefinition }>(
      '/custom-fields/definitions',
      data
    )
    const def = response.data.data
    set((state) => ({
      definitions: [...state.definitions, def].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
    }))
    return def
  },

  updateDefinition: async (id, data) => {
    const response = await api.patch<{ success: boolean; data: CustomFieldDefinition }>(
      `/custom-fields/definitions/${id}`,
      data
    )
    const updated = response.data.data
    set((state) => ({
      definitions: state.definitions.map((d) => (d.id === id ? updated : d)),
    }))
  },

  deleteDefinition: async (id) => {
    await api.delete(`/custom-fields/definitions/${id}`)
    set((state) => ({
      definitions: state.definitions.filter((d) => d.id !== id),
    }))
  },

  setFieldValue: async (taskId, definitionId, value) => {
    const response = await api.put<{
      success: boolean
      data: { id: string; definitionId: string; taskId: string; value: string | null; createdAt: string; updatedAt: string }
    }>(`/custom-fields/tasks/${taskId}/values`, { definitionId, value })

    if (response.data.success) {
      const updatedValue = response.data.data
      set((state) => {
        const updated = new Map(state.taskFieldValues)
        const current = updated.get(taskId) ?? []
        const newList = current.map((item) =>
          item.definition.id === definitionId
            ? { ...item, value: updatedValue }
            : item
        )
        updated.set(taskId, newList)
        return { taskFieldValues: updated }
      })
    }
  },

  clearError: () => set({ error: null }),
}))

// ============================================================
// SELECTOR HELPERS
// ============================================================

export function selectTaskFieldValues(state: CustomFieldState, taskId: string): CustomFieldWithValue[] {
  return state.taskFieldValues.get(taskId) ?? []
}
