/**
 * Workflow Store - Zustand store for workflow templates and project workflow assignment
 * @module stores/workflowStore
 */

import { create } from 'zustand'
import api from '@services/api'

// ============================================================
// TYPES
// ============================================================

export interface WorkflowStatus {
  key: string
  label: string
  color: string
  isFinal: boolean
  isInitial: boolean
  requiresComment: boolean
}

export interface WorkflowTemplate {
  id: string
  name: string
  description?: string
  statuses: WorkflowStatus[]
  transitions: Record<string, string[]>
  isSystem: boolean
  isDefault?: boolean
  isActive?: boolean
  createdAt?: string
}

interface CreateWorkflowInput {
  name: string
  description?: string
  statuses: WorkflowStatus[]
  transitions: Record<string, string[]>
}

// ============================================================
// FALLBACK DEFAULTS
// ============================================================

const DEFAULT_STATUSES: WorkflowStatus[] = [
  { key: 'todo', label: 'Da fare', color: 'gray', isInitial: true, isFinal: false, requiresComment: false },
  { key: 'in_progress', label: 'In corso', color: 'blue', isInitial: false, isFinal: false, requiresComment: false },
  { key: 'review', label: 'In revisione', color: 'yellow', isInitial: false, isFinal: false, requiresComment: false },
  { key: 'blocked', label: 'Bloccato', color: 'red', isInitial: false, isFinal: false, requiresComment: true },
  { key: 'done', label: 'Completato', color: 'green', isInitial: false, isFinal: true, requiresComment: false },
  { key: 'cancelled', label: 'Annullato', color: 'gray', isInitial: false, isFinal: true, requiresComment: false },
]

const DEFAULT_TRANSITIONS: Record<string, string[]> = {
  todo: ['in_progress', 'blocked', 'cancelled'],
  in_progress: ['todo', 'review', 'blocked', 'done'],
  review: ['in_progress', 'done', 'blocked'],
  blocked: ['todo', 'in_progress'],
  done: ['in_progress'],
  cancelled: ['todo'],
}

// ============================================================
// STORE INTERFACE
// ============================================================

interface WorkflowStore {
  // State
  templates: WorkflowTemplate[]
  projectWorkflows: Record<string, WorkflowTemplate>
  isLoading: boolean
  error: string | null

  // Actions
  fetchTemplates: () => Promise<void>
  fetchProjectWorkflow: (projectId: string) => Promise<void>
  createTemplate: (data: CreateWorkflowInput) => Promise<void>
  updateTemplate: (id: string, data: Partial<WorkflowTemplate>) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>
  assignWorkflow: (projectId: string, workflowTemplateId: string | null) => Promise<void>

  // Helpers
  getWorkflowStatuses: (projectId: string | null) => WorkflowStatus[]
  getAvailableTransitions: (projectId: string, currentStatus: string) => string[]
  getStatusLabel: (projectId: string, statusKey: string) => string
  getStatusColor: (projectId: string, statusKey: string) => string
}

// ============================================================
// STORE
// ============================================================

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  templates: [],
  projectWorkflows: {},
  isLoading: false,
  error: null,

  fetchTemplates: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get<{ success: boolean; data: WorkflowTemplate[] }>(
        '/workflows'
      )
      if (response.data.success) {
        set({ templates: response.data.data, isLoading: false })
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  fetchProjectWorkflow: async (projectId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get<{ success: boolean; data: WorkflowTemplate }>(
        `/projects/${projectId}/workflow`
      )
      if (response.data.success) {
        set((state) => ({
          projectWorkflows: {
            ...state.projectWorkflows,
            [projectId]: response.data.data,
          },
          isLoading: false,
        }))
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  createTemplate: async (data: CreateWorkflowInput) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post<{ success: boolean; data: WorkflowTemplate }>(
        '/workflows',
        data
      )
      if (response.data.success) {
        set((state) => ({
          templates: [...state.templates, response.data.data],
          isLoading: false,
        }))
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      throw err
    }
  },

  updateTemplate: async (id: string, data: Partial<WorkflowTemplate>) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.put<{ success: boolean; data: WorkflowTemplate }>(
        `/workflows/${id}`,
        data
      )
      if (response.data.success) {
        const updated = response.data.data
        set((state) => ({
          templates: state.templates.map((t) => (t.id === id ? updated : t)),
          isLoading: false,
        }))
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      throw err
    }
  },

  deleteTemplate: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await api.delete(`/workflows/${id}`)
      set((state) => ({
        templates: state.templates.filter((t) => t.id !== id),
        isLoading: false,
      }))
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      throw err
    }
  },

  assignWorkflow: async (projectId: string, workflowTemplateId: string | null) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.put<{ success: boolean; data: WorkflowTemplate | null }>(
        `/projects/${projectId}/workflow`,
        { workflowTemplateId }
      )
      if (response.data.success) {
        set((state) => {
          if (workflowTemplateId === null) {
            const updated = { ...state.projectWorkflows }
            delete updated[projectId]
            return { projectWorkflows: updated, isLoading: false }
          }
          return {
            projectWorkflows: {
              ...state.projectWorkflows,
              ...(response.data.data ? { [projectId]: response.data.data } : {}),
            },
            isLoading: false,
          }
        })
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      throw err
    }
  },

  getWorkflowStatuses: (projectId: string | null): WorkflowStatus[] => {
    if (!projectId) return DEFAULT_STATUSES
    const workflow = get().projectWorkflows[projectId]
    return workflow ? workflow.statuses : DEFAULT_STATUSES
  },

  getAvailableTransitions: (projectId: string, currentStatus: string): string[] => {
    const workflow = get().projectWorkflows[projectId]
    const transitions = workflow ? workflow.transitions : DEFAULT_TRANSITIONS
    return transitions[currentStatus] ?? []
  },

  getStatusLabel: (projectId: string, statusKey: string): string => {
    const workflow = get().projectWorkflows[projectId]
    const statuses = workflow ? workflow.statuses : DEFAULT_STATUSES
    const found = statuses.find((s) => s.key === statusKey)
    return found ? found.label : statusKey
  },

  getStatusColor: (projectId: string, statusKey: string): string => {
    const workflow = get().projectWorkflows[projectId]
    const statuses = workflow ? workflow.statuses : DEFAULT_STATUSES
    const found = statuses.find((s) => s.key === statusKey)
    return found ? found.color : 'gray'
  },
}))
