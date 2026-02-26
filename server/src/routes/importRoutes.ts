/**
 * Import Routes - /api/import
 * @module routes/importRoutes
 */

import { Router } from 'express'
import { authMiddleware, requireRole as authorize } from '../middleware/authMiddleware.js'
import {
  previewTasksImport,
  importTasksHandler,
} from '../controllers/importController.js'

const router = Router()

// All routes require authentication + admin or direzione role
router.use(authMiddleware)
router.use(authorize('admin', 'direzione'))

// POST /api/import/tasks/preview — parse CSV and return headers + first 5 rows
router.post('/tasks/preview', previewTasksImport)

// POST /api/import/tasks — perform actual import
router.post('/tasks', importTasksHandler)

export default router
