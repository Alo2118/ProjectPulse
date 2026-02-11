/**
 * Notification Service - Business logic for user notifications
 * @module services/notificationService
 */

import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import { emitNotification } from '../socket/index.js'
import type { PaginationParams, PaginatedResponse, Notification } from '../types/index.js'

// Lazy import to avoid circular dependency (io is created in index.ts)
let _io: import('socket.io').Server | null = null

export function setSocketIO(io: import('socket.io').Server): void {
  _io = io
}

interface CreateNotificationInput {
  userId: string
  type: string
  title: string
  message: string
  data?: Record<string, unknown>
}

const notificationSelect = {
  id: true,
  userId: true,
  type: true,
  title: true,
  message: true,
  data: true,
  isRead: true,
  isDeleted: true,
  createdAt: true,
}

/**
 * Creates a notification and emits it via Socket.io
 */
async function createNotification(
  input: CreateNotificationInput,
  tx?: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
): Promise<Notification> {
  const db = tx || prisma

  const notification = await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data ? JSON.parse(JSON.stringify(input.data)) : undefined,
    },
  })

  // Emit real-time notification
  if (_io) {
    emitNotification(_io, input.userId, {
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data,
    })
  }

  logger.debug('Notification created', { notificationId: notification.id, userId: input.userId, type: input.type })

  return notification
}

/**
 * Gets paginated notifications for a user
 */
async function getNotifications(
  userId: string,
  params: PaginationParams
): Promise<PaginatedResponse<Notification>> {
  const page = params.page || 1
  const limit = params.limit || 20
  const skip = (page - 1) * limit

  const where = { userId, isDeleted: false }

  const [data, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      select: notificationSelect,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ])

  return {
    data: data as Notification[],
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}

/**
 * Gets unread notification count for a user
 */
async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false, isDeleted: false },
  })
}

/**
 * Marks a single notification as read
 */
async function markAsRead(id: string, userId: string): Promise<Notification | null> {
  const notification = await prisma.notification.findFirst({
    where: { id, userId, isDeleted: false },
  })

  if (!notification) return null

  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
    select: notificationSelect,
  }) as Promise<Notification>
}

/**
 * Marks all notifications as read for a user
 */
async function markAllAsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false, isDeleted: false },
    data: { isRead: true },
  })

  return result.count
}

/**
 * Soft deletes a notification
 */
async function deleteNotification(id: string, userId: string): Promise<boolean> {
  const notification = await prisma.notification.findFirst({
    where: { id, userId, isDeleted: false },
  })

  if (!notification) return false

  await prisma.notification.update({
    where: { id },
    data: { isDeleted: true },
  })
  return true
}

export const notificationService = {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
}
