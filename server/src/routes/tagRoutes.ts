/**
 * Tag Routes - HTTP routes for tag management
 * @module routes/tagRoutes
 */

import { Router } from 'express'
import {
  getTags,
  getTag,
  createTag,
  updateTag,
  deleteTag,
  assignTag,
  unassignTag,
  getEntityTags,
} from '../controllers/tagController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

// All routes require authentication
router.use(authMiddleware)

// GET /api/tags - List all tags
router.get('/', getTags)

// GET /api/tags/entity/:type/:id - Get tags for a specific entity
router.get('/entity/:type/:id', getEntityTags)

// GET /api/tags/:id - Get single tag
router.get('/:id', getTag)

// POST /api/tags/assign - Assign tag to entity (before /:id to avoid conflict)
router.post('/assign', assignTag)

// DELETE /api/tags/assign - Remove tag from entity (before /:id to avoid conflict)
router.delete('/assign', unassignTag)

// POST /api/tags - Create tag
router.post('/', createTag)

// PUT /api/tags/:id - Update tag
router.put('/:id', updateTag)

// DELETE /api/tags/:id - Soft delete tag
router.delete('/:id', deleteTag)

export default router
