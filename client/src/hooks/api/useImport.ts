import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function usePreviewImport() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post('/import/tasks/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data.data
    },
  })
}

export function useImportTasks() {
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/import/tasks', payload)
      return data.data
    },
  })
}
