/**
 * SavedView Routes - /api/views
 * All authenticated users can manage their own saved views.
 * @module routes/savedViewRoutes
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import {
  getViews,
  getView,
  createView,
  updateView,
  deleteView,
} from '../controllers/savedViewController.js'

const router = Router()

// All routes require authentication
router.use(authMiddleware)

// GET /api/views - list views (user's own + shared if includeShared=true)
router.get('/', getViews)

// GET /api/views/:id - single view
router.get('/:id', getView)

// POST /api/views - create view
router.post('/', createView)

// PATCH /api/views/:id - update view
router.patch('/:id', updateView)

// DELETE /api/views/:id - delete view
router.delete('/:id', deleteView)

export default router
