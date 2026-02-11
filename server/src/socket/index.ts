import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { logger } from '../utils/logger.js'

interface JwtPayload {
  userId: string
  email: string
  role: string
}

export const initializeSocket = (io: Server) => {
  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token

    if (!token) {
      return next(new Error('Authentication required'))
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key'
      ) as JwtPayload

      socket.data.user = decoded
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.user?.userId
    logger.info(`User connected: ${userId}`)

    // Join user's personal room
    if (userId) {
      socket.join(`user:${userId}`)
    }

    // Join project room
    socket.on('join:project', (projectId: string) => {
      socket.join(`project:${projectId}`)
      logger.debug(`User ${userId} joined project room: ${projectId}`)
    })

    // Leave project room
    socket.on('leave:project', (projectId: string) => {
      socket.leave(`project:${projectId}`)
      logger.debug(`User ${userId} left project room: ${projectId}`)
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${userId}`)
    })
  })

  return io
}

// Helper function to emit notifications
export const emitNotification = (
  io: Server,
  userId: string,
  notification: {
    type: string
    title: string
    message: string
    data?: Record<string, unknown>
  }
) => {
  io.to(`user:${userId}`).emit('notification', notification)
}

// Helper function to emit project updates
export const emitProjectUpdate = (
  io: Server,
  projectId: string,
  event: string,
  data: unknown
) => {
  io.to(`project:${projectId}`).emit(event, data)
}
