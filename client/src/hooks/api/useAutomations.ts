import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const KEYS = {
  all: ['automations'] as const,
  lists: () => [...KEYS.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...KEYS.lists(), filters] as const,
  details: () => [...KEYS.all, 'detail'] as const,
  detail: (id: string) => [...KEYS.details(), id] as const,
  logs: (id: string) => [...KEYS.all, 'logs', id] as const,
  templates: () => [...KEYS.all, 'templates'] as const,
  registry: () => [...KEYS.all, 'registry'] as const,
  recommendations: () => [...KEYS.all, 'recommendations'] as const,
  packages: () => [...KEYS.all, 'packages'] as const,
}

export function useAutomationListQuery(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: async () => {
      const { data } = await api.get('/automations', { params: filters })
      return data
    },
  })
}

export function useAutomationQuery(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/automations/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

export function useAutomationLogsQuery(id: string) {
  return useQuery({
    queryKey: KEYS.logs(id),
    queryFn: async () => {
      const { data } = await api.get(`/automations/${id}/logs`)
      return data.data
    },
    enabled: !!id,
  })
}

export function useAutomationTemplatesQuery() {
  return useQuery({
    queryKey: KEYS.templates(),
    queryFn: async () => {
      const { data } = await api.get('/automations/templates')
      return data.data
    },
  })
}

export function useAutomationRegistryQuery() {
  return useQuery({
    queryKey: KEYS.registry(),
    queryFn: async () => {
      const { data } = await api.get('/automations/registry')
      return data.data
    },
  })
}

export function useAutomationRecommendationsQuery() {
  return useQuery({
    queryKey: KEYS.recommendations(),
    queryFn: async () => {
      const { data } = await api.get('/automations/recommendations')
      return data.data
    },
  })
}

export function useAutomationPackagesQuery() {
  return useQuery({
    queryKey: KEYS.packages(),
    queryFn: async () => {
      const { data } = await api.get('/automations/packages')
      return data.data
    },
  })
}

export function useCreateAutomation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/automations', payload)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
    },
  })
}

export function useUpdateAutomation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
      const { data } = await api.patch(`/automations/${id}`, payload)
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) })
    },
  })
}

export function useToggleAutomation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/automations/${id}/toggle`)
      return data.data
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.detail(id) })
    },
  })
}

export function useDeleteAutomation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/automations/${id}`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
    },
  })
}

export function useCreateFromTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/automations/from-template', payload)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
    },
  })
}

export function useGenerateRecommendations() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/automations/recommendations/generate')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.recommendations() })
    },
  })
}

export function useApplyRecommendation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/automations/recommendations/${id}/apply`)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.recommendations() })
      qc.invalidateQueries({ queryKey: KEYS.lists() })
    },
  })
}

export function useDismissRecommendation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/automations/recommendations/${id}/dismiss`)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.recommendations() })
    },
  })
}

export function useActivatePackage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (key: string) => {
      const { data } = await api.post(`/automations/packages/${key}/activate`)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.packages() })
      qc.invalidateQueries({ queryKey: KEYS.lists() })
    },
  })
}

export { KEYS as automationKeys }
