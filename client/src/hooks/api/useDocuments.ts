import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const KEYS = {
  all: ['documents'] as const,
  lists: () => [...KEYS.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...KEYS.lists(), filters] as const,
  details: () => [...KEYS.all, 'detail'] as const,
  detail: (id: string) => [...KEYS.details(), id] as const,
  byProject: (projectId: string) => [...KEYS.all, 'project', projectId] as const,
  projectStats: (projectId: string) => [...KEYS.all, 'project-stats', projectId] as const,
  versions: (id: string) => [...KEYS.all, 'versions', id] as const,
}

export function useDocumentListQuery(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: async () => {
      const { data } = await api.get('/documents', { params: filters })
      return data
    },
  })
}

export function useDocumentQuery(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/documents/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

export function useDocumentsByProjectQuery(projectId: string) {
  return useQuery({
    queryKey: KEYS.byProject(projectId),
    queryFn: async () => {
      const { data } = await api.get(`/documents/project/${projectId}`)
      return data.data
    },
    enabled: !!projectId,
  })
}

export function useProjectDocStatsQuery(projectId: string) {
  return useQuery({
    queryKey: KEYS.projectStats(projectId),
    queryFn: async () => {
      const { data } = await api.get(`/documents/project/${projectId}/stats`)
      return data.data
    },
    enabled: !!projectId,
  })
}

export function useCreateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
    },
  })
}

export function useUpdateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
      const { data } = await api.put(`/documents/${id}`, payload)
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) })
    },
  })
}

export function useUploadDocumentVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post(`/documents/${id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) })
    },
  })
}

export function useChangeDocumentStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.patch(`/documents/${id}/status`, { status })
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) })
    },
  })
}

export function useDocumentVersionsQuery(documentId: string | undefined) {
  return useQuery({
    queryKey: KEYS.versions(documentId ?? ''),
    queryFn: async () => {
      const { data } = await api.get(`/documents/${documentId}/versions`)
      return data.data
    },
    enabled: !!documentId,
    staleTime: 60_000,
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/documents/${id}`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
    },
  })
}

export { KEYS as documentKeys }
