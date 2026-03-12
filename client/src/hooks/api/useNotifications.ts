import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const KEYS = {
  all: ['notifications'] as const,
  lists: () => [...KEYS.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...KEYS.lists(), filters] as const,
  unreadCount: () => [...KEYS.all, 'unread-count'] as const,
}

export function useNotificationListQuery(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: async () => {
      const { data } = await api.get('/notifications', { params: filters })
      return data
    },
  })
}

export function useUnreadCountQuery() {
  return useQuery({
    queryKey: KEYS.unreadCount(),
    queryFn: async () => {
      const { data } = await api.get('/notifications/unread-count')
      return data.data
    },
    refetchInterval: 60_000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/notifications/${id}/read`)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.unreadCount() })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.patch('/notifications/read-all')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.unreadCount() })
    },
  })
}

export function useDeleteNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/notifications/${id}`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.unreadCount() })
    },
  })
}

export { KEYS as notificationKeys }
