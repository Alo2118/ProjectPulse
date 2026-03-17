import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const KEYS = {
  all: ['workflows'] as const,
  lists: () => [...KEYS.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...KEYS.lists(), filters] as const,
  details: () => [...KEYS.all, 'detail'] as const,
  detail: (id: string) => [...KEYS.details(), id] as const,
  projectWorkflow: (projectId: string) => [...KEYS.all, 'project', projectId] as const,
}

export function useWorkflowListQuery(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: async () => {
      const { data } = await api.get('/workflows', { params: filters })
      return data
    },
  })
}

export function useWorkflowQuery(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/workflows/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

export function useProjectWorkflowQuery(projectId: string) {
  return useQuery({
    queryKey: KEYS.projectWorkflow(projectId),
    queryFn: async () => {
      const { data } = await api.get(`/projects/${projectId}/workflow`)
      return data.data
    },
    enabled: !!projectId,
  })
}

export function useCreateWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/workflows', payload)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
    },
  })
}

export function useUpdateWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
      const { data } = await api.put(`/workflows/${id}`, payload)
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) })
    },
  })
}

export function useDeleteWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/workflows/${id}`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
    },
  })
}

export function useAssignProjectWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, ...payload }: { projectId: string } & Record<string, unknown>) => {
      const { data } = await api.put(`/projects/${projectId}/workflow`, payload)
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.projectWorkflow(variables.projectId) })
    },
  })
}

export { KEYS as workflowKeys }
