/**
 * Automation Store - Zustand store for automation rules and execution logs
 * @module stores/automationStore
 */

import { create } from 'zustand'
import api from '@services/api'

// ============================================================
// TYPES
// ============================================================

export type AutomationDomain = 'task' | 'risk' | 'document' | 'project'

export type TriggerType =
  // Task triggers
  | 'task_status_changed'
  | 'task_created'
  | 'task_assigned'
  | 'all_subtasks_completed'
  | 'task_overdue'
  | 'task_deadline_approaching'
  | 'task_updated'
  | 'task_commented'
  | 'task_idle'
  // Risk triggers
  | 'risk_created'
  | 'risk_status_changed'
  | 'risk_level_changed'
  // Document triggers
  | 'document_created'
  | 'document_status_changed'
  | 'document_review_due'
  // Project triggers
  | 'project_status_changed'
  | 'project_deadline_approaching'

export type ActionType =
  | 'notify_user'
  | 'notify_assignee'
  | 'notify_project_owner'
  | 'update_parent_status'
  | 'set_task_field'
  | 'create_comment'
  | 'assign_to_user'
  | 'set_risk_field'
  | 'set_document_field'
  | 'set_project_field'
  | 'create_task'
  | 'send_email'

export type ConditionType =
  | 'task_priority_is'
  | 'task_type_is'
  | 'task_has_assignee'
  | 'task_in_project'
  | 'task_has_subtasks'
  | 'task_field_equals'
  | 'risk_probability_is'
  | 'risk_impact_is'
  | 'risk_category_is'
  | 'document_type_is'
  | 'project_status_is'
  | 'project_priority_is'

export interface TriggerConfig {
  type: TriggerType
  params: Record<string, unknown>
}

export interface ConditionConfig {
  type: ConditionType
  params: Record<string, unknown>
}

export interface ActionConfig {
  type: ActionType
  params: Record<string, unknown>
}

export interface AutomationRule {
  id: string
  name: string
  description: string | null
  domain: AutomationDomain
  projectId: string | null
  trigger: TriggerConfig
  conditions: ConditionConfig[]
  conditionLogic: 'AND' | 'OR'
  actions: ActionConfig[]
  isActive: boolean
  priority: number
  cooldownMinutes: number
  createdById: string
  lastTriggeredAt: string | null
  triggerCount: number
  createdAt: string
  updatedAt: string
  project?: { id: string; code: string; name: string } | null
  createdBy?: { id: string; firstName: string; lastName: string } | null
}

export interface AutomationRecommendation {
  id: string
  projectId: string | null
  pattern: string
  evidence: Record<string, unknown>
  suggestedRule: Record<string, unknown>
  impact: 'high' | 'medium' | 'low'
  status: 'pending' | 'applied' | 'dismissed'
  project?: { id: string; name: string } | null
  createdAt: string
}

export interface AutomationPackage {
  key: string
  name: string
  description: string
  templates: string[]
}

export interface AutomationLog {
  id: string
  ruleId: string
  triggerId: string | null
  status: 'success' | 'error' | 'skipped'
  details: Record<string, unknown> | null
  createdAt: string
}

export interface AutomationTemplate {
  key: string
  name: string
  description: string
  category: 'produttivita' | 'notifiche' | 'gestione'
  trigger: TriggerConfig
  conditions: ConditionConfig[]
  actions: ActionConfig[]
}

interface CreateAutomationInput {
  name: string
  description?: string
  domain?: AutomationDomain
  projectId?: string
  trigger: TriggerConfig
  conditions?: ConditionConfig[]
  conditionLogic?: 'AND' | 'OR'
  actions: ActionConfig[]
  isActive?: boolean
  priority?: number
  cooldownMinutes?: number
}

interface AutomationStore {
  // State
  rules: AutomationRule[]
  currentRule: AutomationRule | null
  logs: AutomationLog[]
  templates: AutomationTemplate[]
  recommendations: AutomationRecommendation[]
  packages: AutomationPackage[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchRules: (projectId?: string) => Promise<void>
  fetchRule: (id: string) => Promise<void>
  createRule: (data: CreateAutomationInput) => Promise<void>
  updateRule: (id: string, data: Partial<CreateAutomationInput>) => Promise<void>
  deleteRule: (id: string) => Promise<void>
  toggleRule: (id: string, isActive: boolean) => Promise<void>
  fetchLogs: (ruleId: string) => Promise<void>
  fetchTemplates: () => Promise<void>
  createFromTemplate: (templateKey: string, projectId?: string, overrides?: Record<string, unknown>) => Promise<void>
  fetchRecommendations: (projectId?: string) => Promise<void>
  applyRecommendation: (id: string) => Promise<void>
  dismissRecommendation: (id: string) => Promise<void>
  generateRecommendations: () => Promise<void>
  fetchPackages: () => Promise<void>
  activatePackage: (key: string, projectId?: string) => Promise<void>
}

// ============================================================
// STORE
// ============================================================

export const useAutomationStore = create<AutomationStore>((set) => ({
  rules: [],
  currentRule: null,
  logs: [],
  templates: [],
  recommendations: [],
  packages: [],
  isLoading: false,
  error: null,

  fetchRules: async (projectId?: string) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (projectId) params.set('projectId', projectId)
      const qs = params.toString()

      const response = await api.get<{ success: boolean; data: AutomationRule[] }>(
        `/automations${qs ? `?${qs}` : ''}`
      )
      if (response.data.success) {
        set({ rules: response.data.data, isLoading: false })
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  fetchRule: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get<{ success: boolean; data: AutomationRule }>(
        `/automations/${id}`
      )
      if (response.data.success) {
        set({ currentRule: response.data.data, isLoading: false })
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  createRule: async (data: CreateAutomationInput) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post<{ success: boolean; data: AutomationRule }>(
        '/automations',
        data
      )
      if (response.data.success) {
        set((state) => ({
          rules: [...state.rules, response.data.data],
          isLoading: false,
        }))
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      throw err
    }
  },

  updateRule: async (id: string, data: Partial<CreateAutomationInput>) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.patch<{ success: boolean; data: AutomationRule }>(
        `/automations/${id}`,
        data
      )
      if (response.data.success) {
        const updated = response.data.data
        set((state) => ({
          rules: state.rules.map((r) => (r.id === id ? updated : r)),
          currentRule: state.currentRule?.id === id ? updated : state.currentRule,
          isLoading: false,
        }))
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      throw err
    }
  },

  deleteRule: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await api.delete(`/automations/${id}`)
      set((state) => ({
        rules: state.rules.filter((r) => r.id !== id),
        currentRule: state.currentRule?.id === id ? null : state.currentRule,
        isLoading: false,
      }))
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      throw err
    }
  },

  toggleRule: async (id: string, isActive: boolean) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.patch<{ success: boolean; data: AutomationRule }>(
        `/automations/${id}/toggle`,
        { isActive }
      )
      if (response.data.success) {
        const updated = response.data.data
        set((state) => ({
          rules: state.rules.map((r) => (r.id === id ? updated : r)),
          currentRule: state.currentRule?.id === id ? updated : state.currentRule,
          isLoading: false,
        }))
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      throw err
    }
  },

  fetchLogs: async (ruleId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get<{ success: boolean; data: AutomationLog[] }>(
        `/automations/${ruleId}/logs`
      )
      if (response.data.success) {
        set({ logs: response.data.data, isLoading: false })
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  fetchTemplates: async () => {
    try {
      const response = await api.get<{ success: boolean; data: AutomationTemplate[] }>(
        '/automations/templates'
      )
      if (response.data.success) {
        set({ templates: response.data.data })
      }
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  createFromTemplate: async (templateKey: string, projectId?: string, overrides?: Record<string, unknown>) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post<{ success: boolean; data: AutomationRule }>(
        '/automations/from-template',
        { templateKey, projectId, overrides }
      )
      if (response.data.success) {
        set((state) => ({
          rules: [...state.rules, response.data.data],
          isLoading: false,
        }))
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      throw err
    }
  },

  fetchRecommendations: async (projectId?: string) => {
    try {
      const params = new URLSearchParams()
      if (projectId) params.set('projectId', projectId)
      const qs = params.toString()

      const response = await api.get<{ success: boolean; data: AutomationRecommendation[] }>(
        `/automations/recommendations${qs ? `?${qs}` : ''}`
      )
      if (response.data.success) {
        set({ recommendations: response.data.data })
      }
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  applyRecommendation: async (id: string) => {
    try {
      const response = await api.post<{ success: boolean; data: AutomationRule }>(
        `/automations/recommendations/${id}/apply`
      )
      if (response.data.success) {
        set((state) => ({
          recommendations: state.recommendations.filter((r) => r.id !== id),
          rules: [...state.rules, response.data.data],
        }))
      }
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  dismissRecommendation: async (id: string) => {
    try {
      await api.post(`/automations/recommendations/${id}/dismiss`)
      set((state) => ({
        recommendations: state.recommendations.filter((r) => r.id !== id),
      }))
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  generateRecommendations: async () => {
    try {
      const response = await api.post<{ success: boolean; data: AutomationRecommendation[] }>(
        '/automations/recommendations/generate'
      )
      if (response.data.success) {
        set({ recommendations: response.data.data })
      }
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  fetchPackages: async () => {
    try {
      const response = await api.get<{ success: boolean; data: AutomationPackage[] }>(
        '/automations/packages'
      )
      if (response.data.success) {
        set({ packages: response.data.data })
      }
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  activatePackage: async (key: string, projectId?: string) => {
    try {
      const params = new URLSearchParams()
      if (projectId) params.set('projectId', projectId)
      const qs = params.toString()

      const response = await api.post<{ success: boolean; data: AutomationRule[] }>(
        `/automations/packages/${key}/activate${qs ? `?${qs}` : ''}`
      )
      if (response.data.success) {
        set((state) => ({
          rules: [...state.rules, ...response.data.data],
        }))
      }
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },
}))
