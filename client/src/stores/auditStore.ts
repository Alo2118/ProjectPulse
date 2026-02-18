/**
 * Audit Store - Zustand store for audit trail log viewing
 * @module stores/auditStore
 */

import { create } from 'zustand'
import api from '@services/api'

// ============================================================
// TYPES
// ============================================================

export type AuditEntityType =
  | 'user'
  | 'project'
  | 'task'
  | 'risk'
  | 'document'
  | 'comment'
  | 'time_entry'
  | 'user_input'
  | 'note'
  | 'attachment'
  | 'tag'

export type AuditActionType =
  | 'create'
  | 'update'
  | 'delete'
  | 'status_change'
  | 'login'
  | 'logout'

export interface AuditLogUser {
  id: string
  firstName: string
  lastName: string
  email: string
}

export interface AuditLog {
  id: string
  entityType: AuditEntityType
  entityId: string
  action: AuditActionType
  userId: string
  oldData: string | null
  newData: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user: AuditLogUser | null
}

export interface AuditFilters {
  page?: number
  limit?: number
  entityType?: AuditEntityType | ''
  entityId?: string
  action?: AuditActionType | ''
  userId?: string
  startDate?: string
  endDate?: string
}

interface AuditPagination {
  page: number
  limit: number
  total: number
  pages: number
}

interface AuditState {
  logs: AuditLog[]
  pagination: AuditPagination
  isLoading: boolean
  error: string | null
  filters: AuditFilters

  // Actions
  fetchAuditLogs: (filters?: AuditFilters) => Promise<void>
  setFilters: (filters: AuditFilters) => void
  clearFilters: () => void
  clearError: () => void
}

const DEFAULT_PAGINATION: AuditPagination = {
  page: 1,
  limit: 50,
  total: 0,
  pages: 0,
}

// ============================================================
// STORE
// ============================================================

export const useAuditStore = create<AuditState>((set) => ({
  logs: [],
  pagination: DEFAULT_PAGINATION,
  isLoading: false,
  error: null,
  filters: {},

  fetchAuditLogs: async (filters = {}) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()

      if (filters.page) params.append('page', String(filters.page))
      if (filters.limit) params.append('limit', String(filters.limit))
      if (filters.entityType) params.append('entityType', filters.entityType)
      if (filters.entityId) params.append('entityId', filters.entityId)
      if (filters.action) params.append('action', filters.action)
      if (filters.userId) params.append('userId', filters.userId)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)

      const response = await api.get<{
        success: boolean
        data: AuditLog[]
        pagination: AuditPagination
      }>(`/audit?${params.toString()}`)

      if (response.data.success) {
        set({
          logs: response.data.data,
          pagination: response.data.pagination,
          filters,
          isLoading: false,
        })
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Impossibile caricare i log di audit'
      set({ error: message, isLoading: false })
    }
  },

  setFilters: (filters) => set({ filters }),

  clearFilters: () => set({ filters: {} }),

  clearError: () => set({ error: null }),
}))
