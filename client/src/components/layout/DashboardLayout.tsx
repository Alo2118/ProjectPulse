import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { PageTransition } from '@/components/ui/PageTransition'
import { ToastContainer } from '@/components/ui/Toast'
import { connectSocket, disconnectSocket } from '@/services/socket'
import { useNotificationStore } from '@stores/notificationStore'
import { useAuthStore } from '@stores/authStore'
import type { Notification } from '@/types'

export default function DashboardLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const addRealtimeNotification = useNotificationStore((s) => s.addRealtimeNotification)

  useEffect(() => {
    if (!isAuthenticated) return

    // Attempt to connect socket
    const socket = connectSocket()

    if (socket) {
      socket.on('notification', (data: Notification) => {
        addRealtimeNotification(data)
      })

      return () => {
        socket.off('notification')
        disconnectSocket()
      }
    }
  }, [isAuthenticated, addRealtimeNotification])

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
