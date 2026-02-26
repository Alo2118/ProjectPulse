/**
 * Export Routes - /api/export
 * @module routes/exportRoutes
 */

import { Router } from 'express'
import { authMiddleware, requireRole as authorize } from '../middleware/authMiddleware.js'
import {
  exportTasksHandler,
  exportProjectsHandler,
  exportTimeEntriesHandler,
} from '../controllers/exportController.js'

const router = Router()

// All routes require authentication + admin or direzione role
router.use(authMiddleware)
router.use(authorize('admin', 'direzione'))

// GET /api/export/tasks?projectId=&status=&assigneeId=&departmentId=
router.get('/tasks', exportTasksHandler)

// GET /api/export/projects?status=&priority=
router.get('/projects', exportProjectsHandler)

// GET /api/export/time-entries?startDate=&endDate=&userId=&projectId=
router.get('/time-entries', exportTimeEntriesHandler)

export default router
