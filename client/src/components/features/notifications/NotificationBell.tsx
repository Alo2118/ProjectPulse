import { useEffect, useRef, useState } from 'react'
import { Bell, BellOff, CheckCheck, Monitor, Volume2, VolumeX } from 'lucide-react'
import { useNotificationStore } from '@stores/notificationStore'
import NotificationItem from './NotificationItem'
import { useNavigate } from 'react-router-dom'
import { useDesktopNotifications } from '@hooks/useDesktopNotifications'
import type { Notification } from '@/types'

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    desktopEnabled,
    setDesktopEnabled,
    soundEnabled,
    setSoundEnabled,
  } = useNotificationStore()

  const { permission, isSupported, requestPermission } = useDesktopNotifications()

  const handleDesktopToggle = async () => {
    if (!desktopEnabled) {
      // Turning ON: request permission if not yet granted
      if (permission !== 'granted') {
        const result = await requestPermission()
        if (result !== 'granted') return // user denied — bail out
      }
      setDesktopEnabled(true)
    } else {
      setDesktopEnabled(false)
    }
  }

  useEffect(() => {
    fetchUnreadCount()
  }, [fetchUnreadCount])

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen, fetchNotifications])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleNotificationClick = (notification: Notification) => {
    const data = notification.data as Record<string, unknown> | null
    if (data?.taskId) {
      navigate(`/tasks/${data.taskId}`)
      setIsOpen(false)
    } else if (data?.projectId) {
      navigate(`/projects/${data.projectId}`)
      setIsOpen(false)
    } else if (data?.inputId) {
      navigate(`/inputs/${data.inputId}`)
      setIsOpen(false)
    } else if (data?.riskId) {
      navigate(`/risks/${data.riskId}`)
      setIsOpen(false)
    } else if (data?.documentId) {
      navigate(`/documents/${data.documentId}`)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100/60 dark:text-slate-400 dark:hover:bg-white/5 transition-all duration-150 relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifiche</h3>
            <div className="flex items-center gap-1.5">
              {/* Sound toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`flex items-center gap-1 text-xs rounded-md px-2 py-1 transition-colors ${
                  soundEnabled
                    ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/30'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
                title={soundEnabled ? 'Disattiva suono' : 'Attiva suono'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Desktop notification toggle */}
              {isSupported && permission !== 'denied' && (
                <button
                  onClick={handleDesktopToggle}
                  className={`flex items-center gap-1 text-xs rounded-md px-2 py-1 transition-colors ${
                    desktopEnabled && permission === 'granted'
                      ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/30'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                  title={desktopEnabled && permission === 'granted' ? 'Disattiva notifiche PC' : 'Attiva notifiche PC'}
                >
                  {desktopEnabled && permission === 'granted' ? (
                    <Monitor className="w-3.5 h-3.5" />
                  ) : (
                    <BellOff className="w-3.5 h-3.5" />
                  )}
                </button>
              )}

              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Lette
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">Caricamento...</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-gray-400">
                Nessuna notifica
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                  onClick={handleNotificationClick}
                />
              ))
            )}
          </div>

          {/* Footer: link to notification center */}
          <div className="border-t border-slate-100 dark:border-slate-700">
            <button
              onClick={() => {
                navigate('/notifications')
                setIsOpen(false)
              }}
              className="w-full px-4 py-2.5 text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-center"
            >
              Vedi tutte le notifiche
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
