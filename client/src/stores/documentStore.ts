/**
 * Document Store - Zustand store for document management
 * @module stores/documentStore
 */

import { create } from 'zustand'
import api from '@services/api'
import { Document, PaginatedResponse, DocumentStats, DocumentStatus } from '@/types'

interface DocumentFilters {
  page?: number
  limit?: number
  projectId?: string
  type?: string
  status?: string
  search?: string
}

interface DocumentState {
  documents: Document[]
  projectDocuments: Document[]
  currentDocument: Document | null
  documentStats: DocumentStats | null
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  isLoading: boolean
  error: string | null

  // Actions
  fetchDocuments: (filters?: DocumentFilters) => Promise<void>
  fetchProjectDocuments: (projectId: string) => Promise<void>
  fetchDocument: (id: string) => Promise<void>
  fetchDocumentStats: (projectId: string) => Promise<void>
  createDocument: (data: FormData) => Promise<Document>
  updateDocument: (id: string, data: Partial<Document>) => Promise<void>
  uploadFile: (id: string, file: File) => Promise<void>
  changeDocumentStatus: (id: string, status: DocumentStatus) => Promise<void>
  deleteDocument: (id: string) => Promise<void>
  clearError: () => void
  clearCurrentDocument: () => void
}

export const useDocumentStore = create<DocumentState>((set) => ({
  documents: [],
  projectDocuments: [],
  currentDocument: null,
  documentStats: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  isLoading: false,
  error: null,

  fetchDocuments: async (filters = {}) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters.page) params.append('page', String(filters.page))
      if (filters.limit) params.append('limit', String(filters.limit))
      if (filters.projectId) params.append('projectId', filters.projectId)
      if (filters.type) params.append('type', filters.type)
      if (filters.status) params.append('status', filters.status)
      if (filters.search) params.append('search', filters.search)

      const response = await api.get<{ success: boolean } & PaginatedResponse<Document>>(
        `/documents?${params.toString()}`
      )

      if (response.data.success !== false) {
        set({
          documents: response.data.data,
          pagination: response.data.pagination,
          isLoading: false,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch documents'
      set({ error: message, isLoading: false })
    }
  },

  fetchProjectDocuments: async (projectId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get<{ success: boolean; data: Document[] }>(
        `/documents/project/${projectId}`
      )

      if (response.data.success) {
        set({ projectDocuments: response.data.data, isLoading: false })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch project documents'
      set({ error: message, isLoading: false })
    }
  },

  fetchDocument: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get<{ success: boolean; data: Document }>(`/documents/${id}`)

      if (response.data.success) {
        set({ currentDocument: response.data.data, isLoading: false })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch document'
      set({ error: message, isLoading: false })
    }
  },

  fetchDocumentStats: async (projectId: string) => {
    try {
      const response = await api.get<{ success: boolean; data: DocumentStats }>(
        `/documents/project/${projectId}/stats`
      )

      if (response.data.success) {
        set({ documentStats: response.data.data })
      }
    } catch (error) {
      console.error('Failed to fetch document stats:', error)
    }
  },

  createDocument: async (formData: FormData) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post<{ success: boolean; data: Document }>('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      if (response.data.success && response.data.data) {
        set((state) => ({
          documents: [response.data.data, ...state.documents],
          projectDocuments: [response.data.data, ...state.projectDocuments],
          isLoading: false,
        }))
        return response.data.data
      }
      throw new Error('Failed to create document')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create document'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  updateDocument: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.put<{ success: boolean; data: Document }>(`/documents/${id}`, data)

      if (response.data.success && response.data.data) {
        const updated = response.data.data
        set((state) => ({
          documents: state.documents.map((d) => (d.id === id ? updated : d)),
          projectDocuments: state.projectDocuments.map((d) => (d.id === id ? updated : d)),
          currentDocument: state.currentDocument?.id === id ? updated : state.currentDocument,
          isLoading: false,
        }))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update document'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  uploadFile: async (id, file) => {
    set({ isLoading: true, error: null })
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post<{ success: boolean; data: Document }>(
        `/documents/${id}/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )

      if (response.data.success && response.data.data) {
        const updated = response.data.data
        set((state) => ({
          documents: state.documents.map((d) => (d.id === id ? updated : d)),
          projectDocuments: state.projectDocuments.map((d) => (d.id === id ? updated : d)),
          currentDocument: state.currentDocument?.id === id ? updated : state.currentDocument,
          isLoading: false,
        }))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload file'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  changeDocumentStatus: async (id, status) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.patch<{ success: boolean; data: Document }>(`/documents/${id}/status`, {
        status,
      })

      if (response.data.success && response.data.data) {
        const updated = response.data.data
        set((state) => ({
          documents: state.documents.map((d) => (d.id === id ? updated : d)),
          projectDocuments: state.projectDocuments.map((d) => (d.id === id ? updated : d)),
          currentDocument: state.currentDocument?.id === id ? updated : state.currentDocument,
          isLoading: false,
        }))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to change document status'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  deleteDocument: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.delete(`/documents/${id}`)
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== id),
        projectDocuments: state.projectDocuments.filter((d) => d.id !== id),
        currentDocument: state.currentDocument?.id === id ? null : state.currentDocument,
        isLoading: false,
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete document'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  clearError: () => set({ error: null }),

  clearCurrentDocument: () => set({ currentDocument: null }),
}))
