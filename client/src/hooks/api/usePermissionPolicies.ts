import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const KEYS = {
  all: ['permission-policies'] as const,
}

export interface PermissionPolicy {
  id: string
  role: string
  domain: string
  action: string
  allowed: boolean
}

export function usePermissionPoliciesQuery() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: () =>
      api
        .get<{ success: boolean; data: PermissionPolicy[] }>('/permissions/policies')
        .then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

export function useUpdatePolicies() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      policies: Array<{ role: string; domain: string; action: string; allowed: boolean }>
    ) => api.put('/permissions/policies', { policies }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useResetPolicies() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/permissions/policies/reset'),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}
