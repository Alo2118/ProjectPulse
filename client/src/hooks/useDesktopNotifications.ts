/**
 * useDesktopNotifications - Browser Notification API integration
 * Handles permission requests and shows desktop notifications.
 * Respects user preference stored in notificationStore.
 * @module hooks/useDesktopNotifications
 */

import { useCallback, useEffect, useState } from 'react'

export type NotificationPermission = 'default' | 'granted' | 'denied'

export interface DesktopNotificationOptions {
  title: string
  body?: string
  icon?: string
  tag?: string
  /** Click callback — called when user clicks the notification */
  onClick?: () => void
}

export interface UseDesktopNotificationsReturn {
  permission: NotificationPermission
  isSupported: boolean
  requestPermission: () => Promise<NotificationPermission>
  showNotification: (options: DesktopNotificationOptions) => void
}

const ICON_PATH = '/favicon.ico'

export function useDesktopNotifications(): UseDesktopNotificationsReturn {
  const isSupported = typeof window !== 'undefined' && 'Notification' in window

  const [permission, setPermission] = useState<NotificationPermission>(
    isSupported ? (Notification.permission as NotificationPermission) : 'denied'
  )

  // Keep local state in sync with browser permission (can change externally)
  useEffect(() => {
    if (!isSupported) return
    setPermission(Notification.permission as NotificationPermission)
  }, [isSupported])

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) return 'denied'
    if (Notification.permission === 'granted') {
      setPermission('granted')
      return 'granted'
    }
    const result = await Notification.requestPermission()
    const perm = result as NotificationPermission
    setPermission(perm)
    return perm
  }, [isSupported])

  const showNotification = useCallback(
    (options: DesktopNotificationOptions) => {
      if (!isSupported || Notification.permission !== 'granted') return

      // Don't show if the document is focused (user is already looking at the app)
      if (document.visibilityState === 'visible') return

      try {
        const notif = new Notification(options.title, {
          body: options.body,
          icon: options.icon ?? ICON_PATH,
          tag: options.tag,
        } as NotificationOptions)

        if (options.onClick) {
          notif.onclick = (e) => {
            e.preventDefault()
            window.focus()
            options.onClick?.()
            notif.close()
          }
        } else {
          notif.onclick = () => {
            window.focus()
            notif.close()
          }
        }

        // Auto-close after 8 seconds
        setTimeout(() => notif.close(), 8000)
      } catch {
        // Ignore — can fail in some browser contexts (e.g. sandboxed iframes)
      }
    },
    [isSupported]
  )

  return { permission, isSupported, requestPermission, showNotification }
}
