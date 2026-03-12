import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const KEYS = {
  all: ['attachments'] as const,
  byEntity: (entityType: string, entityId: string) => [...KEYS.all, entityType, entityId] as const,
  count: (entityType: string, entityId: string) => [...KEYS.all, 'count', entityType, entityId] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
}

export function useAttachmentListQuery(entityType: string, entityId: string) {
  return useQuery({
    queryKey: KEYS.byEntity(entityType, entityId),
    queryFn: async () => {
      const { data } = await api.get(`/attachments/${entityType}/${entityId}`)
      return data.data
    },
    enabled: !!entityType && !!entityId,
  })
}

export function useAttachmentCountQuery(entityType: string, entityId: string) {
  return useQuery({
    queryKey: KEYS.count(entityType, entityId),
    queryFn: async () => {
      const { data } = await api.get(`/attachments/${entityType}/${entityId}/count`)
      return data.data
    },
    enabled: !!entityType && !!entityId,
  })
}

export function useAttachmentQuery(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/attachments/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

export function useDownloadAttachment() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.get(`/attachments/${id}/download`, { responseType: 'blob' })
      return data
    },
  })
}

export function useCreateAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ entityType, entityId, file }: { entityType: string; entityId: string; file: File }) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('entityType', entityType)
      formData.append('entityId', entityId)
      const { data } = await api.post('/attachments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.byEntity(variables.entityType, variables.entityId) })
      qc.invalidateQueries({ queryKey: KEYS.count(variables.entityType, variables.entityId) })
    },
  })
}

export function useConvertAttachmentToDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/attachments/${id}/convert-to-document`)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all })
      qc.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export function useDeleteAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { id: string; entityType: string; entityId: string }) => {
      const { data } = await api.delete(`/attachments/${vars.id}`)
      return data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.byEntity(variables.entityType, variables.entityId) })
      qc.invalidateQueries({ queryKey: KEYS.count(variables.entityType, variables.entityId) })
    },
  })
}

export { KEYS as attachmentKeys }
