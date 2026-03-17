import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useExportTasks() {
  return useMutation({
    mutationFn: async (params: Record<string, string>) => {
      const { data } = await api.get('/export/tasks', { params, responseType: 'blob' })
      return data
    },
  })
}

export function useExportProjects() {
  return useMutation({
    mutationFn: async (params: Record<string, string>) => {
      const { data } = await api.get('/export/projects', { params, responseType: 'blob' })
      return data
    },
  })
}

export function useExportTimeEntries() {
  return useMutation({
    mutationFn: async (params: Record<string, string>) => {
      const { data } = await api.get('/export/time-entries', { params, responseType: 'blob' })
      return data
    },
  })
}
