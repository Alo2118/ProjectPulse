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

    // Join task room (for real-time comment + status updates on detail page)
    socket.on('join:task', (taskId: string) => {
      socket.join(`task:${taskId}`)
      logger.debug(`User ${userId} joined task room: ${taskId}`)
    })

    // Leave task room
    socket.on('leave:task', (taskId: string) => {
      socket.leave(`task:${taskId}`)
      logger.debug(`User ${userId} left task room: ${taskId}`)
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

// ─────────────────────────────────────────────────────────────────────────────
// Task event helpers
// ─────────────────────────────────────────────────────────────────────────────

export interface TaskCreatedPayload {
  task: unknown
  projectId: string | null
}

export interface TaskUpdatedPayload {
  task: unknown
  projectId: string | null
}

export interface TaskStatusChangedPayload {
  taskId: string
  projectId: string | null
  oldStatus: string
  newStatus: string
  updatedBy: string
}

export interface TaskDeletedPayload {
  taskId: string
  projectId: string | null
}

/**
 * Emit task:created to the project room (excluding the author's socket).
 * Falls back to a global broadcast when projectId is null (standalone task).
 */
export const emitTaskCreated = (
  io: Server,
  payload: TaskCreatedPayload,
  actorSocketId?: string
): void => {
  if (payload.projectId) {
    const target = io.to(`project:${payload.projectId}`)
    const emitter = actorSocketId ? target.except(actorSocketId) : target
    emitter.emit('task:created', payload)
  } else {
    // Standalone task: broadcast to all connected clients
    io.emit('task:created', payload)
  }
}

/**
 * Emit task:updated to the project room and the task room.
 */
export const emitTaskUpdated = (
  io: Server,
  payload: TaskUpdatedPayload,
  actorSocketId?: string
): void => {
  const rooms: string[] = []
  if (payload.projectId) rooms.push(`project:${payload.projectId}`)
  const taskObj = payload.task as { id?: string } | null
  if (taskObj?.id) rooms.push(`task:${taskObj.id}`)

  if (rooms.length === 0) return
  const target = io.to(rooms)
  const emitter = actorSocketId ? target.except(actorSocketId) : target
  emitter.emit('task:updated', payload)
}

/**
 * Emit task:statusChanged to the project room and the task room.
 */
export const emitTaskStatusChanged = (
  io: Server,
  payload: TaskStatusChangedPayload,
  actorSocketId?: string
): void => {
  const rooms: string[] = [`task:${payload.taskId}`]
  if (payload.projectId) rooms.push(`project:${payload.projectId}`)

  const target = io.to(rooms)
  const emitter = actorSocketId ? target.except(actorSocketId) : target
  emitter.emit('task:statusChanged', payload)
}

/**
 * Emit task:deleted to the project room.
 */
export const emitTaskDeleted = (
  io: Server,
  payload: TaskDeletedPayload,
  actorSocketId?: string
): void => {
  const rooms: string[] = [`task:${payload.taskId}`]
  if (payload.projectId) rooms.push(`project:${payload.projectId}`)

  const target = io.to(rooms)
  const emitter = actorSocketId ? target.except(actorSocketId) : target
  emitter.emit('task:deleted', payload)
}

// ─────────────────────────────────────────────────────────────────────────────
// Comment event helpers
// ─────────────────────────────────────────────────────────────────────────────

export interface CommentCreatedPayload {
  comment: unknown
  taskId: string
}

export interface CommentUpdatedPayload {
  comment: unknown
  taskId: string
}

export interface CommentDeletedPayload {
  commentId: string
  taskId: string
}

/**
 * Emit comment:created to the task room.
 */
export const emitCommentCreated = (
  io: Server,
  payload: CommentCreatedPayload,
  actorSocketId?: string
): void => {
  const target = io.to(`task:${payload.taskId}`)
  const emitter = actorSocketId ? target.except(actorSocketId) : target
  emitter.emit('comment:created', payload)
}

/**
 * Emit comment:updated to the task room.
 */
export const emitCommentUpdated = (
  io: Server,
  payload: CommentUpdatedPayload,
  actorSocketId?: string
): void => {
  const target = io.to(`task:${payload.taskId}`)
  const emitter = actorSocketId ? target.except(actorSocketId) : target
  emitter.emit('comment:updated', payload)
}

/**
 * Emit comment:deleted to the task room.
 */
export const emitCommentDeleted = (
  io: Server,
  payload: CommentDeletedPayload,
  actorSocketId?: string
): void => {
  const target = io.to(`task:${payload.taskId}`)
  const emitter = actorSocketId ? target.except(actorSocketId) : target
  emitter.emit('comment:deleted', payload)
}
