import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const KEYS = {
  all: ['projectMembers'] as const,
  byProject: (projectId: string) => [...KEYS.all, projectId] as const,
}

export function useProjectMembersQuery(projectId: string) {
  return useQuery({
    queryKey: KEYS.byProject(projectId),
    queryFn: async () => {
      const { data } = await api.get(`/projects/${projectId}/members`)
      return data.data
    },
    enabled: !!projectId,
  })
}

export function useAddProjectMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, ...payload }: { projectId: string } & Record<string, unknown>) => {
      const { data } = await api.post(`/projects/${projectId}/members`, payload)
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.byProject(variables.projectId) })
    },
  })
}

export function useUpdateProjectMemberRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, memberId, ...payload }: { projectId: string; memberId: string } & Record<string, unknown>) => {
      const { data } = await api.put(`/projects/${projectId}/members/${memberId}`, payload)
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.byProject(variables.projectId) })
    },
  })
}

export function useRemoveProjectMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, memberId }: { projectId: string; memberId: string }) => {
      const { data } = await api.delete(`/projects/${projectId}/members/${memberId}`)
      return data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.byProject(variables.projectId) })
    },
  })
}

export { KEYS as projectMemberKeys }
