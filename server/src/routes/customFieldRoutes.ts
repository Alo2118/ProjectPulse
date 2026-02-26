/**
 * Custom Field Routes
 * GET endpoints: all authenticated users
 * POST/PATCH/DELETE definitions: admin/direzione only
 * Value endpoints: all authenticated users
 * @module routes/customFieldRoutes
 */

import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js'
import {
  getDefinitions,
  getDefinition,
  createDefinition,
  updateDefinition,
  deleteDefinition,
  getTaskFieldValues,
  setTaskFieldValue,
  deleteTaskFieldValue,
} from '../controllers/customFieldController.js'

const router = Router()

// Apply auth to all routes
router.use(authMiddleware)

// ---- Definition routes ----
router.get('/definitions', getDefinitions)
router.get('/definitions/:id', getDefinition)
router.post('/definitions', requireRole('admin', 'direzione'), createDefinition)
router.patch('/definitions/:id', requireRole('admin', 'direzione'), updateDefinition)
router.delete('/definitions/:id', requireRole('admin', 'direzione'), deleteDefinition)

// ---- Value routes (per task) ----
router.get('/tasks/:taskId/values', getTaskFieldValues)
router.put('/tasks/:taskId/values', setTaskFieldValue)
router.delete('/tasks/:taskId/values/:defId', deleteTaskFieldValue)

export default router
