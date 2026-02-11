/**
 * Weekly Report Store - Zustand store for weekly reports
 * @module stores/weeklyReportStore
 */

import { create } from 'zustand'
import api from '@services/api'
import type {
  WeeklyReport,
  WeeklyReportData,
  WeekInfo,
  PaginatedResponse,
} from '../types'

interface WeeklyReportState {
  // Current week preview (live data, not saved)
  currentWeekPreview: WeeklyReportData | null

  // Historical reports
  reports: WeeklyReport[]
  teamReports: WeeklyReport[]
  selectedReport: WeeklyReport | null

  // Week info
  currentWeekInfo: WeekInfo | null

  // Loading states
  isLoading: boolean
  isGenerating: boolean
  isLoadingPreview: boolean
  error: string | null

  // Pagination
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  } | null
  teamPagination: {
    page: number
    limit: number
    total: number
    pages: number
  } | null

  // Actions
  fetchCurrentWeekInfo: () => Promise<void>
  fetchWeeklyPreview: (allUsers?: boolean) => Promise<void>
  fetchMyReports: (page?: number) => Promise<void>
  fetchTeamReports: (page?: number) => Promise<void>
  fetchReportById: (id: string) => Promise<void>
  generateReport: () => Promise<WeeklyReport>
  clearSelectedReport: () => void
  clearError: () => void
}

export const useWeeklyReportStore = create<WeeklyReportState>((set, get) => ({
  currentWeekPreview: null,
  reports: [],
  teamReports: [],
  selectedReport: null,
  currentWeekInfo: null,
  isLoading: false,
  isGenerating: false,
  isLoadingPreview: false,
  error: null,
  pagination: null,
  teamPagination: null,

  fetchCurrentWeekInfo: async () => {
    try {
      const res = await api.get<{ success: boolean; data: WeekInfo }>('/reports/weekly/current-week')
      if (res.data.success) {
        set({ currentWeekInfo: res.data.data })
      }
    } catch (error) {
      console.error('Failed to fetch current week info:', error)
    }
  },

  fetchWeeklyPreview: async (allUsers?: boolean) => {
    set({ isLoadingPreview: true, error: null })
    try {
      const url = allUsers ? '/reports/weekly/preview?allUsers=true' : '/reports/weekly/preview'
      const res = await api.get<{ success: boolean; data: WeeklyReportData }>(url)
      if (res.data.success) {
        set({ currentWeekPreview: res.data.data })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore nel caricamento preview'
      set({ error: message })
      console.error('Failed to fetch weekly preview:', error)
    } finally {
      set({ isLoadingPreview: false })
    }
  },

  fetchMyReports: async (page = 1) => {
    set({ isLoading: true, error: null })
    try {
      const res = await api.get<PaginatedResponse<WeeklyReport> & { success: boolean }>(
        `/reports/weekly?page=${page}&limit=10`
      )
      if (res.data.success) {
        set({
          reports: res.data.data,
          pagination: res.data.pagination,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore nel caricamento report'
      set({ error: message })
      console.error('Failed to fetch my reports:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  fetchTeamReports: async (page = 1) => {
    set({ isLoading: true, error: null })
    try {
      const res = await api.get<PaginatedResponse<WeeklyReport> & { success: boolean }>(
        `/reports/weekly/team?page=${page}&limit=10`
      )
      if (res.data.success) {
        set({
          teamReports: res.data.data,
          teamPagination: res.data.pagination,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore nel caricamento report team'
      set({ error: message })
      console.error('Failed to fetch team reports:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  fetchReportById: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const res = await api.get<{ success: boolean; data: WeeklyReport }>(`/reports/weekly/${id}`)
      if (res.data.success) {
        set({ selectedReport: res.data.data })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Report non trovato'
      set({ error: message })
      console.error('Failed to fetch report by id:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  generateReport: async () => {
    set({ isGenerating: true, error: null })
    try {
      const res = await api.post<{ success: boolean; data: WeeklyReport }>('/reports/weekly/generate', {})
      if (res.data.success) {
        // Refresh reports list
        get().fetchMyReports()
        return res.data.data
      }
      throw new Error('Failed to generate report')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore nella generazione report'
      set({ error: message })
      throw error
    } finally {
      set({ isGenerating: false })
    }
  },

  clearSelectedReport: () => {
    set({ selectedReport: null })
  },

  clearError: () => {
    set({ error: null })
  },
}))
