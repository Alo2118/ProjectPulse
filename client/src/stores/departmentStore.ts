import { create } from 'zustand'
import api from '@services/api'
import { Department } from '@/types'

interface DepartmentState {
  departments: Department[]
  isLoading: boolean
  error: string | null
  fetchDepartments: (includeInactive?: boolean) => Promise<void>
  createDepartment: (data: { name: string; description?: string; color?: string }) => Promise<Department>
  updateDepartment: (id: string, data: Partial<Pick<Department, 'name' | 'description' | 'color' | 'isActive'>>) => Promise<void>
  deleteDepartment: (id: string) => Promise<void>
  clearError: () => void
}

export const useDepartmentStore = create<DepartmentState>((set) => ({
  departments: [],
  isLoading: false,
  error: null,

  fetchDepartments: async (includeInactive = false) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (includeInactive) params.set('includeInactive', 'true')
      const response = await api.get<{ success: boolean; data: Department[] }>(`/departments?${params}`)
      set({ departments: response.data.data, isLoading: false })
    } catch {
      set({ error: 'Errore nel caricamento dei reparti', isLoading: false })
    }
  },

  createDepartment: async (data) => {
    const response = await api.post<{ success: boolean; data: Department }>('/departments', data)
    const dept = response.data.data
    set((state) => ({
      departments: [...state.departments, dept].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    return dept
  },

  updateDepartment: async (id, data) => {
    const response = await api.put<{ success: boolean; data: Department }>(`/departments/${id}`, data)
    const updated = response.data.data
    set((state) => ({
      departments: state.departments.map((d) => (d.id === id ? updated : d)),
    }))
  },

  deleteDepartment: async (id) => {
    await api.delete(`/departments/${id}`)
    set((state) => ({
      departments: state.departments.filter((d) => d.id !== id),
    }))
  },

  clearError: () => set({ error: null }),
}))
