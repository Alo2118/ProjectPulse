import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// --- Types ---

export interface RiskPayload {
  code: string
  title: string
  description?: string
  category?: string
  probability: number
  impact: number
  status?: string
  mitigationPlan?: string
  projectId?: string
  ownerId?: string
}

export interface RiskMatrixCell {
  probability: number
  impact: number
  count: number
  risks: { id: string; title: string; status: string }[]
}

// --- Query Keys ---

const KEYS = {
  all: ['risks'] as const,
  lists: () => [...KEYS.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...KEYS.lists(), filters] as const,
  details: () => [...KEYS.all, 'detail'] as const,
  detail: (id: string) => [...KEYS.details(), id] as const,
  byProject: (projectId: string) => [...KEYS.all, 'project', projectId] as const,
  projectStats: (projectId: string) => [...KEYS.all, 'project-stats', projectId] as const,
  projectMatrix: (projectId: string) => [...KEYS.all, 'project-matrix', projectId] as const,
}

export function useRiskListQuery(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: async () => {
      const { data } = await api.get('/risks', { params: filters })
      return data
    },
  })
}

export function useRiskQuery(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/risks/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

export function useRisksByProjectQuery(projectId: string) {
  return useQuery({
    queryKey: KEYS.byProject(projectId),
    queryFn: async () => {
      const { data } = await api.get(`/risks/project/${projectId}`)
      return data.data
    },
    enabled: !!projectId,
  })
}

export function useProjectRiskStatsQuery(projectId: string) {
  return useQuery({
    queryKey: KEYS.projectStats(projectId),
    queryFn: async () => {
      const { data } = await api.get(`/risks/project/${projectId}/stats`)
      return data.data
    },
    enabled: !!projectId,
  })
}

export function useProjectRiskMatrixQuery(projectId: string) {
  return useQuery<RiskMatrixCell[]>({
    queryKey: KEYS.projectMatrix(projectId),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: RiskMatrixCell[] }>(
        `/risks/project/${projectId}/matrix`
      )
      return data.data
    },
    enabled: !!projectId,
  })
}

export function useCreateRisk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: RiskPayload) => {
      const { data } = await api.post('/risks', payload)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
    },
  })
}

export function useUpdateRisk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Partial<RiskPayload>) => {
      const { data } = await api.put(`/risks/${id}`, payload)
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) })
    },
  })
}

export function useChangeRiskStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.patch(`/risks/${id}/status`, { status })
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) })
    },
  })
}

export function useDeleteRisk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/risks/${id}`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
    },
  })
}

export { KEYS as riskKeys }
