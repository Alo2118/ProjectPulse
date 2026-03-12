import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const KEYS = {
  all: ['inputs'] as const,
  lists: () => [...KEYS.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...KEYS.lists(), filters] as const,
  details: () => [...KEYS.all, 'detail'] as const,
  detail: (id: string) => [...KEYS.details(), id] as const,
  my: () => [...KEYS.all, 'my'] as const,
  stats: () => [...KEYS.all, 'stats'] as const,
}

export function useInputListQuery(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: async () => {
      const { data } = await api.get('/inputs', { params: filters })
      return data
    },
  })
}

export function useInputQuery(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/inputs/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

export function useMyInputsQuery() {
  return useQuery({
    queryKey: KEYS.my(),
    queryFn: async () => {
      const { data } = await api.get('/inputs/my')
      return data
    },
  })
}

export function useInputStatsQuery() {
  return useQuery({
    queryKey: KEYS.stats(),
    queryFn: async () => {
      const { data } = await api.get('/inputs/stats')
      return data.data
    },
  })
}

export function useCreateInput() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/inputs', payload)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.my() })
      qc.invalidateQueries({ queryKey: KEYS.stats() })
    },
  })
}

export function useUpdateInput() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
      const { data } = await api.put(`/inputs/${id}`, payload)
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) })
    },
  })
}

export function useDeleteInput() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/inputs/${id}`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.my() })
      qc.invalidateQueries({ queryKey: KEYS.stats() })
    },
  })
}

export function useProcessInput() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/inputs/${id}/process`)
      return data.data
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(id) })
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.stats() })
    },
  })
}

export function useConvertInputToTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
      const { data } = await api.post(`/inputs/${id}/convert-to-task`, payload)
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) })
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.stats() })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useConvertInputToProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
      const { data } = await api.post(`/inputs/${id}/convert-to-project`, payload)
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) })
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.stats() })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useAcknowledgeInput() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/inputs/${id}/acknowledge`)
      return data.data
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(id) })
      qc.invalidateQueries({ queryKey: KEYS.lists() })
    },
  })
}

export function useRejectInput() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.post(`/inputs/${id}/reject`, { reason })
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) })
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.stats() })
    },
  })
}

export { KEYS as inputKeys }
