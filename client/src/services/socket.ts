import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@stores/authStore'

let socket: Socket | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 10
let socketInitialized = false

export function getSocket(): Socket | null {
  return socket
}

export function connectSocket(): Socket | null {
  // Don't reconnect if already connected
  if (socket?.connected) return socket

  const token = useAuthStore.getState().token

  // Don't attempt connection without a token
  if (!token) {
    return null
  }

  const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

  // Initialize socket with delay on first connection
  const initializeSocket = () => {
    if (socket) return

    socket = io(socketUrl, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 8000,
      reconnectionAttempts: 10,
      transports: ['websocket', 'polling'],
      timeout: 10000,
      upgrade: true,
    })

    socket.on('connect', () => {
      reconnectAttempts = 0
    })

    socket.on('connect_error', (_error: Error) => {
      reconnectAttempts++

      // If max reconnect attempts reached, disconnect
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        disconnectSocket()
      }
    })

    socket.on('disconnect', () => {
      // no-op
    })

    socket.on('error', () => {
      // no-op
    })

    socket.on('connect_timeout', () => {
      // no-op
    })

    socket.on('reconnect_attempt', () => {
      // no-op
    })

    socketInitialized = true
  }

  // Add small delay on first connection to ensure server is ready
  if (!socketInitialized) {
    setTimeout(initializeSocket, 500)
  } else {
    initializeSocket()
  }

  return socket
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
    reconnectAttempts = 0
  }
}
