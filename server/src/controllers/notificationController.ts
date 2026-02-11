/**
 * Notification Controller - HTTP request handling for notifications
 * @module controllers/notificationController
 */

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { notificationService } from '../services/notificationService.js'
import { AppError } from '../middleware/errorMiddleware.js'

const querySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
})

/**
 * Gets paginated notifications for current user
 * @route GET /api/notifications
 */
export async function getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId
    if (!userId) throw new AppError('User not authenticated', 401)

    const params = querySchema.parse(req.query)
    const result = await notificationService.getNotifications(userId, { page: params.page, limit: params.limit })

    res.json({ success: true, data: result.data, pagination: result.pagination })
  } catch (error) {
    next(error)
  }
}

/**
 * Gets unread notification count
 * @route GET /api/notifications/unread-count
 */
export async function getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId
    if (!userId) throw new AppError('User not authenticated', 401)

    const count = await notificationService.getUnreadCount(userId)

    res.json({ success: true, data: { count } })
  } catch (error) {
    next(error)
  }
}

/**
 * Marks a notification as read
 * @route PATCH /api/notifications/:id/read
 */
export async function markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId
    if (!userId) throw new AppError('User not authenticated', 401)

    const { id } = req.params
    const notification = await notificationService.markAsRead(id, userId)

    if (!notification) {
      throw new AppError('Notification not found', 404)
    }

    res.json({ success: true, data: notification })
  } catch (error) {
    next(error)
  }
}

/**
 * Marks all notifications as read
 * @route PATCH /api/notifications/read-all
 */
export async function markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId
    if (!userId) throw new AppError('User not authenticated', 401)

    const count = await notificationService.markAllAsRead(userId)

    res.json({ success: true, data: { count } })
  } catch (error) {
    next(error)
  }
}

/**
 * Deletes a notification
 * @route DELETE /api/notifications/:id
 */
export async function deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId
    if (!userId) throw new AppError('User not authenticated', 401)

    const { id } = req.params
    const deleted = await notificationService.deleteNotification(id, userId)

    if (!deleted) {
      throw new AppError('Notification not found', 404)
    }

    res.json({ success: true, message: 'Notification deleted successfully' })
  } catch (error) {
    next(error)
  }
}
