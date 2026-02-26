/**
 * Template Routes - /api/templates
 * @module routes/templateRoutes
 */

import { Router } from 'express'
import { authMiddleware, requireRole as authorize } from '../middleware/authMiddleware.js'
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '../controllers/templateController.js'

const router = Router()

// All routes require authentication
router.use(authMiddleware)

// GET /api/templates - list (all authenticated users can read)
router.get('/', getTemplates)

// GET /api/templates/:id
router.get('/:id', getTemplate)

// POST /api/templates - create (admin only)
router.post('/', authorize('admin'), createTemplate)

// PUT /api/templates/:id - update (admin only)
router.put('/:id', authorize('admin'), updateTemplate)

// DELETE /api/templates/:id - delete (admin only)
router.delete('/:id', authorize('admin'), deleteTemplate)

export default router
