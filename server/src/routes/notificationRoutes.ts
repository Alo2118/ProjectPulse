/**
 * Notification Routes - HTTP routes for notifications
 * @module routes/notificationRoutes
 */

import { Router } from 'express'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notificationController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

// All routes require authentication
router.use(authMiddleware)

// GET /api/notifications/unread-count - Get unread count
router.get('/unread-count', getUnreadCount)

// GET /api/notifications - Get paginated notifications
router.get('/', getNotifications)

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', markAllAsRead)

// PATCH /api/notifications/:id/read - Mark one as read
router.patch('/:id/read', markAsRead)

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', deleteNotification)

export default router
