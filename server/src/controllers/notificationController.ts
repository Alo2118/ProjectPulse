/**
 * Notification Controller - HTTP request handling for notifications
 * @module controllers/notificationController
 */

import { Request, Response, NextFunction } from 'express'
import { notificationService } from '../services/notificationService.js'
import { notificationQuerySchema } from '../schemas/notificationSchemas.js'
import { sendSuccess, sendPaginated } from '../utils/responseHelpers.js'
import { requireUserId, requireResource } from '../utils/controllerHelpers.js'

/**
 * Gets paginated notifications for current user
 * @route GET /api/notifications
 */
export async function getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = requireUserId(req)
    const params = notificationQuerySchema.parse(req.query)
    const result = await notificationService.getNotifications(userId, { page: params.page, limit: params.limit })

    sendPaginated(res, result)
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
    const userId = requireUserId(req)
    const count = await notificationService.getUnreadCount(userId)

    sendSuccess(res, { count })
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
    const userId = requireUserId(req)
    const { id } = req.params
    const notification = await notificationService.markAsRead(id, userId)

    requireResource(notification, 'Notification')

    sendSuccess(res, notification)
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
    const userId = requireUserId(req)
    const count = await notificationService.markAllAsRead(userId)

    sendSuccess(res, { count })
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
    const userId = requireUserId(req)
    const { id } = req.params
    requireResource(await notificationService.deleteNotification(id, userId), 'Notification')

    sendSuccess(res, { message: 'Notification deleted successfully' })
  } catch (error) {
    next(error)
  }
}
