import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { PageTransition } from '@/components/ui/PageTransition'
import { ToastContainer } from '@/components/ui/Toast'
import { toast, flushPendingDeletes } from '@stores/toastStore'
import { connectSocket, disconnectSocket } from '@/services/socket'
import { useNotificationStore } from '@stores/notificationStore'
import { useAuthStore } from '@stores/authStore'
import { useDesktopNotifications } from '@hooks/useDesktopNotifications'
import { useNotificationSound } from '@hooks/useNotificationSound'
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts'
import { KeyboardShortcutsModal } from '@components/features/KeyboardShortcutsModal'
import { useSearchStore } from '@stores/searchStore'
import CommandPalette from '@components/features/CommandPalette'
import { useTaskStore } from '@stores/taskStore'
import type { Notification } from '@/types'
import type {
  TaskSocketPayload,
  TaskStatusChangedSocketPayload,
  TaskDeletedSocketPayload,
} from '@stores/taskStore'

export default function DashboardLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const addRealtimeNotification = useNotificationStore((s) => s.addRealtimeNotification)
  const desktopEnabled = useNotificationStore((s) => s.desktopEnabled)
  const { permission, requestPermission, showNotification } = useDesktopNotifications()
  const { playSound } = useNotificationSound()
  const openSearch = useSearchStore((s) => s.open)
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false)
  const { shortcuts } = useKeyboardShortcuts({
    onOpenSearch: openSearch,
    onOpenShortcutsModal: () => setShortcutsModalOpen(true),
  })
  const location = useLocation()

  // Task store helpers for real-time updates
  const addTaskToStore = useTaskStore((s) => s.addTaskToStore)
  const updateTaskInStore = useTaskStore((s) => s.updateTaskInStore)
  const updateTaskStatusInStore = useTaskStore((s) => s.updateTaskStatusInStore)
  const removeTaskFromStore = useTaskStore((s) => s.removeTaskFromStore)

  // Flush any pending undo-deletes when the user navigates to a different route
  useEffect(() => {
    flushPendingDeletes()
  }, [location.pathname])

  // Flush any pending undo-deletes when the tab/window is closed
  useEffect(() => {
    const handleBeforeUnload = () => flushPendingDeletes()
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // Request browser permission once when desktop notifications are enabled
  useEffect(() => {
    if (desktopEnabled && permission === 'default') {
      // Delay slightly so the page has settled
      const timer = setTimeout(() => requestPermission(), 2000)
      return () => clearTimeout(timer)
    }
  }, [desktopEnabled, permission, requestPermission])

  useEffect(() => {
    if (!isAuthenticated) return

    // Attempt to connect socket
    const socket = connectSocket()

    if (socket) {
      // ── Notification events ──────────────────────────────────────────────
      socket.on('notification', (data: Notification) => {
        addRealtimeNotification(data)

        // Show in-app toast
        toast.info(data.title, data.message)

        // Play notification sound
        playSound()

        // Show desktop notification if enabled
        if (desktopEnabled) {
          showNotification({
            title: data.title,
            body: data.message,
            tag: data.id,
          })
        }
      })

      // ── Task real-time events ────────────────────────────────────────────
      // task:created — another user created a task visible in current project
      socket.on('task:created', ({ task }: TaskSocketPayload) => {
        addTaskToStore(task)
      })

      // task:updated — another user edited a task
      socket.on('task:updated', ({ task }: TaskSocketPayload) => {
        updateTaskInStore(task)
      })

      // task:statusChanged — another user changed a task's status
      socket.on('task:statusChanged', ({ taskId, newStatus }: TaskStatusChangedSocketPayload) => {
        updateTaskStatusInStore(taskId, newStatus)
      })

      // task:deleted — another user deleted a task
      socket.on('task:deleted', ({ taskId }: TaskDeletedSocketPayload) => {
        removeTaskFromStore(taskId)
      })

      return () => {
        socket.off('notification')
        socket.off('task:created')
        socket.off('task:updated')
        socket.off('task:statusChanged')
        socket.off('task:deleted')
        disconnectSocket()
      }
    }
  }, [
    isAuthenticated,
    addRealtimeNotification,
    desktopEnabled,
    showNotification,
    playSound,
    addTaskToStore,
    updateTaskInStore,
    updateTaskStatusInStore,
    removeTaskFromStore,
  ])

  return (
    <div className="min-h-screen bg-grid-pattern bg-vignette" style={{ backgroundColor: 'var(--bg-app)' }}>
      <Sidebar />
      <div className="lg:pl-64 relative z-10">
        <Header />
        <main className="p-6">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
      <ToastContainer />
      <CommandPalette />
      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
        shortcuts={shortcuts}
      />
    </div>
  )
}
