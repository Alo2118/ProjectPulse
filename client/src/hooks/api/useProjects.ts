import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ProjectPhase, ProjectPhasesResponse } from '@/types'

const KEYS = {
  all: ['projects'] as const,
  lists: () => [...KEYS.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...KEYS.lists(), filters] as const,
  details: () => [...KEYS.all, 'detail'] as const,
  detail: (id: string) => [...KEYS.details(), id] as const,
  stats: (id: string) => [...KEYS.all, 'stats', id] as const,
  milestoneValidation: (id: string) => [...KEYS.all, 'milestone-validation', id] as const,
}

export function useProjectListQuery(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: async () => {
      const { data } = await api.get('/projects', { params: filters })
      return data
    },
  })
}

export function useProjectQuery(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/projects/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

export function useProjectStatsQuery(id: string) {
  return useQuery({
    queryKey: KEYS.stats(id),
    queryFn: async () => {
      const { data } = await api.get(`/projects/${id}/stats`)
      return data.data
    },
    enabled: !!id,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/projects', payload)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
    },
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
      const { data } = await api.put(`/projects/${id}`, payload)
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) })
      qc.invalidateQueries({ queryKey: KEYS.stats(variables.id) })
    },
  })
}

export function useChangeProjectStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.patch(`/projects/${id}/status`, { status })
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) })
    },
  })
}

export function useMilestoneValidationQuery(projectId: string) {
  return useQuery({
    queryKey: KEYS.milestoneValidation(projectId),
    queryFn: async () => {
      const { data } = await api.get(`/projects/${projectId}/milestone-validation`)
      return data.data
    },
    enabled: !!projectId,
  })
}

export function useCompleteMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ milestoneId }: { milestoneId: string }) => {
      const { data } = await api.patch(`/tasks/${milestoneId}/status`, { status: 'done' })
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/projects/${id}`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
    },
  })
}

export function useReorderProjects() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (items: Array<{ id: string; sortOrder: number }>) => {
      const { data } = await api.patch('/projects/reorder', { items })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
    },
  })
}

export function useProjectPhasesQuery(projectId: string) {
  return useQuery({
    queryKey: [...KEYS.detail(projectId), 'phases'],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${projectId}/phases`)
      return data.data as ProjectPhasesResponse
    },
    enabled: !!projectId,
  })
}

export function useAdvancePhase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, targetPhaseKey }: { id: string; targetPhaseKey: string }) => {
      const { data } = await api.patch(`/projects/${id}/phase/advance`, { targetPhaseKey })
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) })
    },
  })
}

export function useUpdateProjectPhases() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, phases, transitions }: {
      id: string
      phases: ProjectPhase[]
      transitions: Record<string, string[]>
    }) => {
      const { data } = await api.patch(`/projects/${id}/phases`, { phases, transitions })
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) })
    },
  })
}

export function useSavePhasesAsTemplate() {
  return useMutation({
    mutationFn: async ({ id, name, description }: {
      id: string
      name: string
      description?: string
    }) => {
      const { data } = await api.post(`/projects/${id}/phases/save-as-template`, { name, description })
      return data.data
    },
  })
}

export function usePhaseTemplatesQuery() {
  return useQuery({
    queryKey: ['workflow-templates', 'project'],
    queryFn: async () => {
      const { data } = await api.get('/workflows', { params: { domain: 'project' } })
      return data.data
    },
  })
}

export { KEYS as projectKeys }
