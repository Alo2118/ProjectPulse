import { create } from 'zustand'
import api from '@/services/api'
import type { Notification, PaginatedResponse } from '@/types'

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  pagination: { page: number; limit: number; total: number; pages: number } | null

  fetchNotifications: (page?: number) => Promise<void>
  fetchUnreadCount: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  addRealtimeNotification: (notification: Notification) => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  pagination: null,

  fetchNotifications: async (page = 1) => {
    try {
      set({ isLoading: true })
      const res = await api.get<{ success: boolean; data: Notification[]; pagination: PaginatedResponse<Notification>['pagination'] }>(
        '/notifications',
        { params: { page, limit: 20 } }
      )
      set({
        notifications: res.data.data,
        pagination: res.data.pagination,
        isLoading: false,
      })
    } catch {
      set({ isLoading: false })
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await api.get<{ success: boolean; data: { count: number } }>('/notifications/unread-count')
      set({ unreadCount: res.data.data.count })
    } catch {
      // silent
    }
  },

  markAsRead: async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }))
    } catch {
      // silent
    }
  },

  markAllAsRead: async () => {
    try {
      await api.patch('/notifications/read-all')
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }))
    } catch {
      // silent
    }
  },

  deleteNotification: async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`)
      const notification = get().notifications.find((n) => n.id === id)
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: notification && !notification.isRead
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      }))
    } catch {
      // silent
    }
  },

  addRealtimeNotification: (notification: Notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }))
  },
}))
