import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { api } from '@/lib/api'

const KEYS = {
  all: ['invitations'] as const,
  byProject: (projectId: string) => [...KEYS.all, 'project', projectId] as const,
  validate: (token: string) => [...KEYS.all, 'validate', token] as const,
}

export function useValidateInvitationQuery(token: string) {
  return useQuery({
    queryKey: KEYS.validate(token),
    queryFn: async () => {
      const { data } = await axios.get(`/api/invitations/${token}`)
      return data.data
    },
    enabled: !!token,
    retry: false,
  })
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: async ({ token, ...payload }: { token: string } & Record<string, unknown>) => {
      const { data } = await axios.post(`/api/invitations/${token}/accept`, payload)
      return data.data
    },
  })
}

export function useCreateInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, ...payload }: { projectId: string } & Record<string, unknown>) => {
      const { data } = await api.post(`/projects/${projectId}/invite`, payload)
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.byProject(variables.projectId) })
    },
  })
}

export function useProjectInvitationsQuery(projectId: string) {
  return useQuery({
    queryKey: KEYS.byProject(projectId),
    queryFn: async () => {
      const { data } = await api.get(`/projects/${projectId}/invitations`)
      return data.data
    },
    enabled: !!projectId,
  })
}

export function useCancelInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/invitations/${id}`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}

export { KEYS as invitationKeys }
