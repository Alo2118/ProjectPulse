/**
 * Risk Store - Zustand store for risk management
 * @module stores/riskStore
 */

import { create } from 'zustand'
import api from '@services/api'
import { toast } from '@stores/toastStore'
import { Risk, PaginatedResponse, RiskStats, RiskMatrix, RiskStatus } from '@/types'

interface RiskFilters {
  page?: number
  limit?: number
  projectId?: string
  category?: string
  status?: string
  probability?: string
  impact?: string
  ownerId?: string
  search?: string
}

interface RiskState {
  risks: Risk[]
  projectRisks: Risk[]
  currentRisk: Risk | null
  riskStats: RiskStats | null
  riskMatrix: RiskMatrix | null
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  isLoading: boolean
  error: string | null

  // Actions
  fetchRisks: (filters?: RiskFilters) => Promise<void>
  fetchProjectRisks: (projectId: string) => Promise<void>
  fetchRisk: (id: string) => Promise<void>
  fetchRiskStats: (projectId: string) => Promise<void>
  fetchRiskMatrix: (projectId: string) => Promise<void>
  createRisk: (data: Partial<Risk>) => Promise<Risk>
  updateRisk: (id: string, data: Partial<Risk>) => Promise<void>
  changeRiskStatus: (id: string, status: RiskStatus) => Promise<void>
  deleteRisk: (id: string) => Promise<void>
  clearError: () => void
  clearCurrentRisk: () => void
}

export const useRiskStore = create<RiskState>((set) => ({
  risks: [],
  projectRisks: [],
  currentRisk: null,
  riskStats: null,
  riskMatrix: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  isLoading: false,
  error: null,

  fetchRisks: async (filters = {}) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters.page) params.append('page', String(filters.page))
      if (filters.limit) params.append('limit', String(filters.limit))
      if (filters.projectId) params.append('projectId', filters.projectId)
      if (filters.category) params.append('category', filters.category)
      if (filters.status) params.append('status', filters.status)
      if (filters.probability) params.append('probability', filters.probability)
      if (filters.impact) params.append('impact', filters.impact)
      if (filters.ownerId) params.append('ownerId', filters.ownerId)
      if (filters.search) params.append('search', filters.search)

      const response = await api.get<{ success: boolean } & PaginatedResponse<Risk>>(
        `/risks?${params.toString()}`
      )

      if (response.data.success) {
        set({
          risks: response.data.data,
          pagination: response.data.pagination,
          isLoading: false,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch risks'
      set({ error: message, isLoading: false })
    }
  },

  fetchProjectRisks: async (projectId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get<{ success: boolean; data: Risk[] }>(
        `/risks/project/${projectId}`
      )

      if (response.data.success) {
        set({ projectRisks: response.data.data, isLoading: false })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch project risks'
      set({ error: message, isLoading: false })
    }
  },

  fetchRisk: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get<{ success: boolean; data: Risk }>(`/risks/${id}`)

      if (response.data.success) {
        set({ currentRisk: response.data.data, isLoading: false })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch risk'
      set({ error: message, isLoading: false })
    }
  },

  fetchRiskStats: async (projectId: string) => {
    try {
      const response = await api.get<{ success: boolean; data: RiskStats }>(
        `/risks/project/${projectId}/stats`
      )

      if (response.data.success) {
        set({ riskStats: response.data.data })
      }
    } catch {
      // Stats fetch failed silently
    }
  },

  fetchRiskMatrix: async (projectId: string) => {
    try {
      const response = await api.get<{ success: boolean; data: RiskMatrix }>(
        `/risks/project/${projectId}/matrix`
      )

      if (response.data.success) {
        set({ riskMatrix: response.data.data })
      }
    } catch {
      // Matrix fetch failed silently
    }
  },

  createRisk: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post<{ success: boolean; data: Risk }>('/risks', data)

      if (response.data.success && response.data.data) {
        set((state) => ({
          risks: [response.data.data, ...state.risks],
          projectRisks: data.projectId
            ? [response.data.data, ...state.projectRisks]
            : state.projectRisks,
          isLoading: false,
        }))
        toast.success('Rischio creato', response.data.data.title)
        return response.data.data
      }
      throw new Error('Failed to create risk')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create risk'
      set({ error: message, isLoading: false })
      toast.error('Errore', 'Impossibile creare il rischio')
      throw error
    }
  },

  updateRisk: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.put<{ success: boolean; data: Risk }>(`/risks/${id}`, data)

      if (response.data.success && response.data.data) {
        const updatedRisk = response.data.data
        set((state) => ({
          risks: state.risks.map((r) => (r.id === id ? updatedRisk : r)),
          projectRisks: state.projectRisks.map((r) => (r.id === id ? updatedRisk : r)),
          currentRisk: state.currentRisk?.id === id ? updatedRisk : state.currentRisk,
          isLoading: false,
        }))
        toast.success('Rischio aggiornato')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update risk'
      set({ error: message, isLoading: false })
      toast.error('Errore', 'Impossibile aggiornare il rischio')
      throw error
    }
  },

  changeRiskStatus: async (id, status) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.patch<{ success: boolean; data: Risk }>(`/risks/${id}/status`, {
        status,
      })

      if (response.data.success && response.data.data) {
        const updatedRisk = response.data.data
        set((state) => ({
          risks: state.risks.map((r) => (r.id === id ? updatedRisk : r)),
          projectRisks: state.projectRisks.map((r) => (r.id === id ? updatedRisk : r)),
          currentRisk: state.currentRisk?.id === id ? updatedRisk : state.currentRisk,
          isLoading: false,
        }))
        toast.success('Stato rischio aggiornato')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to change risk status'
      set({ error: message, isLoading: false })
      toast.error('Errore', 'Impossibile cambiare lo stato')
      throw error
    }
  },

  deleteRisk: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.delete(`/risks/${id}`)
      set((state) => ({
        risks: state.risks.filter((r) => r.id !== id),
        projectRisks: state.projectRisks.filter((r) => r.id !== id),
        currentRisk: state.currentRisk?.id === id ? null : state.currentRisk,
        isLoading: false,
      }))
      toast.success('Rischio eliminato')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete risk'
      set({ error: message, isLoading: false })
      toast.error('Errore', 'Impossibile eliminare il rischio')
      throw error
    }
  },

  clearError: () => set({ error: null }),

  clearCurrentRisk: () => set({ currentRisk: null }),
}))
