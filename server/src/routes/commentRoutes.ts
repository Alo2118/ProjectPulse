/**
 * Comment Routes - HTTP routes for task comments
 * @module routes/commentRoutes
 */

import { Router } from 'express'
import {
  createComment,
  getTaskComments,
  getComment,
  updateComment,
  deleteComment,
  getRecentComments,
} from '../controllers/commentController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

// All routes require authentication (Rule 7)
router.use(authMiddleware)

// GET /api/comments/recent - Get recent comments for user
router.get('/recent', getRecentComments)

// GET /api/comments/task/:taskId - Get comments for a task
router.get('/task/:taskId', getTaskComments)

// GET /api/comments/:id - Get single comment
router.get('/:id', getComment)

// POST /api/comments - Create comment
router.post('/', createComment)

// PUT /api/comments/:id - Update comment
router.put('/:id', updateComment)

// DELETE /api/comments/:id - Delete comment (soft delete)
router.delete('/:id', deleteComment)

export default router
