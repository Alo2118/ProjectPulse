/**
 * Team Time Store - Zustand store for team time tracking view
 * @module stores/teamTimeStore
 */

import { create } from 'zustand'
import api from '@services/api'
import { TeamTimeReport, UserTimeSummary, ProjectTimeSummary, TimeEntry } from '@/types'

interface TeamTimeFilters {
  startDate: string | null
  endDate: string | null
  projectId: string | null
  userId: string | null
}

interface TeamTimeState {
  // Data
  byUser: UserTimeSummary[]
  byProject: ProjectTimeSummary[]
  entries: TimeEntry[]
  summary: TeamTimeReport['summary'] | null

  // Filters
  filters: TeamTimeFilters

  // Loading states
  isLoading: boolean
  error: string | null

  // Actions
  fetchTeamTime: () => Promise<void>
  setFilters: (filters: Partial<TeamTimeFilters>) => void
  clearFilters: () => void
  clearError: () => void
}

const defaultFilters: TeamTimeFilters = {
  startDate: null,
  endDate: null,
  projectId: null,
  userId: null,
}

export const useTeamTimeStore = create<TeamTimeState>((set, get) => ({
  byUser: [],
  byProject: [],
  entries: [],
  summary: null,
  filters: { ...defaultFilters },
  isLoading: false,
  error: null,

  fetchTeamTime: async () => {
    set({ isLoading: true, error: null })
    try {
      const { filters } = get()
      const params = new URLSearchParams()

      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.projectId) params.append('projectId', filters.projectId)
      if (filters.userId) params.append('userId', filters.userId)

      const response = await api.get(`/time-entries/team?${params.toString()}`)

      if (response.data.success !== false) {
        const data = response.data.data as TeamTimeReport
        set({
          byUser: data.byUser,
          byProject: data.byProject,
          entries: data.entries,
          summary: data.summary,
        })
      }
    } catch {
      set({ error: 'Errore nel caricamento dei dati team' })
    } finally {
      set({ isLoading: false })
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }))
  },

  clearFilters: () => {
    set({ filters: { ...defaultFilters } })
  },

  clearError: () => {
    set({ error: null })
  },
}))
