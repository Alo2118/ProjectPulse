import { useEffect, useRef, useCallback } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useNotificationUIStore } from '@/stores/notificationUiStore'

function playNotificationSound(): void {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 800
    osc.type = 'sine'
    gain.gain.value = 0.15
    osc.start()
    osc.stop(ctx.currentTime + 0.15)
  } catch {
    // Audio not available
  }
}

interface SocketNotification {
  type: string
  title: string
  message: string
  data?: Record<string, unknown>
}

export function useSocket(token: string | null, userId: string | null) {
  const socketRef = useRef<Socket | null>(null)
  const queryClient = useQueryClient()
  const soundEnabled = useNotificationUIStore((s) => s.soundEnabled)

  const soundEnabledRef = useRef(soundEnabled)
  useEffect(() => {
    soundEnabledRef.current = soundEnabled
  }, [soundEnabled])

  const invalidateNotifications = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }, [queryClient])

  const invalidateTasks = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
    queryClient.invalidateQueries({ queryKey: ['projects'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }, [queryClient])

  const invalidateComments = useCallback(
    (taskId?: string) => {
      const queryKey = taskId ? ['comments', taskId] : ['comments']
      queryClient.invalidateQueries({ queryKey })
    },
    [queryClient]
  )

  useEffect(() => {
    if (!token || !userId) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }

    const socket = io({
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
      timeout: 10000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join:user', userId)
    })

    socket.on('notification', (notification: SocketNotification) => {
      invalidateNotifications()
      toast(notification.title, { description: notification.message })
      if (soundEnabledRef.current) {
        playNotificationSound()
      }
    })

    socket.on('task:created', invalidateTasks)
    socket.on('task:updated', invalidateTasks)
    socket.on('task:deleted', invalidateTasks)
    socket.on('task:statusChanged', () => {
      invalidateTasks()
      invalidateNotifications()
    })

    const handleComment = (payload: { taskId?: string }) => {
      invalidateComments(payload?.taskId)
    }
    socket.on('comment:created', handleComment)
    socket.on('comment:updated', handleComment)
    socket.on('comment:deleted', handleComment)

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token, userId, invalidateNotifications, invalidateTasks, invalidateComments])

  const joinProject = useCallback((projectId: string) => {
    socketRef.current?.emit('join:project', projectId)
    return () => {
      socketRef.current?.emit('leave:project', projectId)
    }
  }, [])

  const joinTask = useCallback((taskId: string) => {
    socketRef.current?.emit('join:task', taskId)
    return () => {
      socketRef.current?.emit('leave:task', taskId)
    }
  }, [])

  return { joinProject, joinTask }
}
