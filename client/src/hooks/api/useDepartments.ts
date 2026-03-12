import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const KEYS = {
  all: ['departments'] as const,
  lists: () => [...KEYS.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...KEYS.lists(), filters] as const,
  details: () => [...KEYS.all, 'detail'] as const,
  detail: (id: string) => [...KEYS.details(), id] as const,
}

export function useDepartmentListQuery(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: async () => {
      const { data } = await api.get('/departments', { params: filters })
      return data
    },
  })
}

export function useDepartmentQuery(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/departments/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

export function useCreateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/departments', payload)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
    },
  })
}

export function useUpdateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
      const { data } = await api.put(`/departments/${id}`, payload)
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) })
    },
  })
}

export function useDeleteDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/departments/${id}`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
    },
  })
}

export { KEYS as departmentKeys }
