import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { PageTransition } from '@/components/ui/PageTransition'
import { ToastContainer } from '@/components/ui/Toast'
import { connectSocket, disconnectSocket } from '@/services/socket'
import { useNotificationStore } from '@stores/notificationStore'
import { useAuthStore } from '@stores/authStore'
import { useDesktopNotifications } from '@hooks/useDesktopNotifications'
import type { Notification } from '@/types'

export default function DashboardLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const addRealtimeNotification = useNotificationStore((s) => s.addRealtimeNotification)
  const desktopEnabled = useNotificationStore((s) => s.desktopEnabled)
  const { permission, requestPermission, showNotification } = useDesktopNotifications()

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
      socket.on('notification', (data: Notification) => {
        addRealtimeNotification(data)

        // Show desktop notification if enabled
        if (desktopEnabled) {
          showNotification({
            title: data.title,
            body: data.message,
            tag: data.id,
          })
        }
      })

      return () => {
        socket.off('notification')
        disconnectSocket()
      }
    }
  }, [isAuthenticated, addRealtimeNotification, desktopEnabled, showNotification])

  return (
    <div className="min-h-screen bg-surface-100 dark:bg-surface-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="p-6">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}
