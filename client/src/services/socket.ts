import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@stores/authStore'

let socket: Socket | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5

export function getSocket(): Socket | null {
  return socket
}

export function connectSocket(): Socket | null {
  // Don't reconnect if already connected
  if (socket?.connected) return socket

  const token = useAuthStore.getState().token

  // Don't attempt connection without a token
  if (!token) {
    console.warn('Socket connection skipped: no authentication token')
    return null
  }

  const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

  socket = io(socketUrl, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    transports: ['websocket', 'polling'],
  })

  socket.on('connect', () => {
    console.log('Socket connected successfully')
    reconnectAttempts = 0
  })

  socket.on('connect_error', (error: Error) => {
    reconnectAttempts++
    console.error(`Socket connection error (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}):`, error.message)
    
    // If max reconnect attempts reached, clear token and redirect to login
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max socket reconnection attempts reached')
      disconnectSocket()
    }
  })

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason)
  })

  return socket
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
    reconnectAttempts = 0
  }
}
