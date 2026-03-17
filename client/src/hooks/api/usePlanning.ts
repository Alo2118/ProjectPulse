import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const KEYS = {
  all: ['planning'] as const,
  estimationMetrics: () => [...KEYS.all, 'estimation-metrics'] as const,
  teamCapacity: () => [...KEYS.all, 'team-capacity'] as const,
  bottlenecks: (projectId: string) => [...KEYS.all, 'bottlenecks', projectId] as const,
  reassignments: (projectId: string) => [...KEYS.all, 'reassignments', projectId] as const,
}

export function useEstimationMetricsQuery() {
  return useQuery({
    queryKey: KEYS.estimationMetrics(),
    queryFn: async () => {
      const { data } = await api.get('/planning/estimation-metrics')
      return data.data
    },
  })
}

export function useTeamCapacityQuery() {
  return useQuery({
    queryKey: KEYS.teamCapacity(),
    queryFn: async () => {
      const { data } = await api.get('/planning/team-capacity')
      return data.data
    },
  })
}

export function useBottlenecksQuery(projectId: string) {
  return useQuery({
    queryKey: KEYS.bottlenecks(projectId),
    queryFn: async () => {
      const { data } = await api.get(`/planning/bottlenecks/${projectId}`)
      return data.data
    },
    enabled: !!projectId,
  })
}

export function useReassignmentSuggestionsQuery(projectId: string) {
  return useQuery({
    queryKey: KEYS.reassignments(projectId),
    queryFn: async () => {
      const { data } = await api.get(`/planning/suggest-reassignments/${projectId}`)
      return data.data
    },
    enabled: !!projectId,
  })
}

export function useSuggestTimeline() {
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/planning/suggest-timeline', payload)
      return data.data
    },
  })
}

export function useGeneratePlan() {
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/planning/generate-plan', payload)
      return data.data
    },
  })
}

export function useCommitPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/planning/commit-plan', payload)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useAutoSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (projectId: string) => {
      const { data } = await api.post(`/planning/auto-schedule/${projectId}`)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useWhatIfAnalysis() {
  return useMutation({
    mutationFn: async ({ projectId, ...payload }: { projectId: string } & Record<string, unknown>) => {
      const { data } = await api.post(`/planning/what-if/${projectId}`, payload)
      return data.data
    },
  })
}

export { KEYS as planningKeys }
