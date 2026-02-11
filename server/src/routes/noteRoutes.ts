/**
 * Note Routes - HTTP routes for polymorphic notes
 * @module routes/noteRoutes
 */

import { Router } from 'express'
import {
  createNote,
  getEntityNotes,
  getNoteById,
  updateNote,
  deleteNote,
  getNoteCount,
} from '../controllers/noteController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

// All routes require authentication (Rule 7)
router.use(authMiddleware)

// GET /api/notes/:entityType/:entityId/count - Get note count for an entity
router.get('/:entityType/:entityId/count', getNoteCount)

// GET /api/notes/:entityType/:entityId - Get notes for an entity
router.get('/:entityType/:entityId', getEntityNotes)

// GET /api/notes/:id - Get single note (must be after entity routes)
router.get('/:id', getNoteById)

// POST /api/notes - Create note
router.post('/', createNote)

// PUT /api/notes/:id - Update note
router.put('/:id', updateNote)

// DELETE /api/notes/:id - Delete note (soft delete)
router.delete('/:id', deleteNote)

export default router
