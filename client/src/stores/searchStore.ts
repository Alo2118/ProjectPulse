/**
 * Search Store - Zustand store for global command palette search
 * @module stores/searchStore
 */

import { create } from 'zustand'
import api from '@services/api'

export interface TaskSearchResult {
  id: string
  code: string
  title: string
  status: string
  priority: string
  projectName?: string
}

export interface ProjectSearchResult {
  id: string
  code: string
  name: string
  status: string
}

export interface UserSearchResult {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
}

export interface RiskSearchResult {
  id: string
  code: string
  title: string
  status: string
}

export interface DocumentSearchResult {
  id: string
  code: string
  title: string
  status: string
}

export interface SearchResults {
  tasks: TaskSearchResult[]
  projects: ProjectSearchResult[]
  users: UserSearchResult[]
  risks: RiskSearchResult[]
  documents: DocumentSearchResult[]
}

interface SearchState {
  query: string
  results: SearchResults | null
  isOpen: boolean
  isLoading: boolean
  setQuery: (q: string) => void
  search: (q: string) => Promise<void>
  open: () => void
  close: () => void
  clear: () => void
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  results: null,
  isOpen: false,
  isLoading: false,

  setQuery: (q) => set({ query: q }),

  search: async (q) => {
    if (q.trim().length < 2) {
      set({ results: null, isLoading: false })
      return
    }

    set({ isLoading: true })
    try {
      const response = await api.get<{ success: boolean; data: SearchResults }>('/search', {
        params: { q: q.trim(), limit: 5 },
      })
      if (response.data.success) {
        set({ results: response.data.data, isLoading: false })
      } else {
        set({ results: null, isLoading: false })
      }
    } catch {
      set({ results: null, isLoading: false })
    }
  },

  open: () => set({ isOpen: true }),

  close: () => set({ isOpen: false, query: '', results: null, isLoading: false }),

  clear: () => set({ query: '', results: null, isLoading: false }),
}))
