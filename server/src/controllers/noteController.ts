/**
 * Note Controller - HTTP request handling for polymorphic notes
 * @module controllers/noteController
 */

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { noteService } from '../services/noteService.js'
import { AppError } from '../middleware/errorMiddleware.js'

// ============================================================
// VALIDATION SCHEMAS (Rule 6: Input Validation)
// ============================================================

const entityTypeSchema = z.enum(['project', 'task', 'time_entry'])

const createNoteSchema = z.object({
  entityType: entityTypeSchema,
  entityId: z.string().uuid('Invalid entity ID'),
  content: z.string().min(1, 'Content is required').max(10000),
  isInternal: z.boolean().default(false),
  parentId: z.string().uuid('Invalid parent ID').optional(),
})

const updateNoteSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  isInternal: z.boolean().optional(),
})

const querySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
})

// ============================================================
// CONTROLLER FUNCTIONS
// ============================================================

/**
 * Creates a new note on an entity
 * @route POST /api/notes
 */
export async function createNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createNoteSchema.parse(req.body)
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    // Only direzione/admin can create internal notes
    const userRole = req.user?.role || 'dipendente'
    if (data.isInternal && userRole === 'dipendente') {
      throw new AppError('Only direzione and admin can create internal notes', 403)
    }

    const note = await noteService.createNote(
      {
        entityType: data.entityType,
        entityId: data.entityId,
        content: data.content,
        isInternal: data.isInternal,
        parentId: data.parentId,
      },
      userId
    )

    res.status(201).json({ success: true, data: note })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      next(new AppError(error.message, 404))
    } else {
      next(error)
    }
  }
}

/**
 * Gets notes for an entity
 * @route GET /api/notes/:entityType/:entityId
 */
export async function getEntityNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { entityType, entityId } = req.params
    const params = querySchema.parse(req.query)
    const userRole = req.user?.role || 'dipendente'

    // Validate entityType
    const validatedEntityType = entityTypeSchema.parse(entityType)

    const result = await noteService.getEntityNotes(
      {
        entityType: validatedEntityType,
        entityId,
        page: params.page,
        limit: params.limit,
      },
      userRole
    )

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Gets a single note by ID
 * @route GET /api/notes/:id
 */
export async function getNoteById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params

    const note = await noteService.getNoteById(id)

    if (!note) {
      throw new AppError('Note not found', 404)
    }

    // Check if user can see internal note
    const userRole = req.user?.role || 'dipendente'
    if (note.isInternal && userRole === 'dipendente') {
      throw new AppError('Note not found', 404)
    }

    res.json({ success: true, data: note })
  } catch (error) {
    next(error)
  }
}

/**
 * Updates a note
 * @route PUT /api/notes/:id
 */
export async function updateNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const data = updateNoteSchema.parse(req.body)
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    // Only direzione/admin can set notes as internal
    const userRole = req.user?.role || 'dipendente'
    if (data.isInternal && userRole === 'dipendente') {
      throw new AppError('Only direzione and admin can create internal notes', 403)
    }

    const note = await noteService.updateNote(id, data, userId)

    if (!note) {
      throw new AppError('Note not found or you do not have permission to edit it', 404)
    }

    res.json({ success: true, data: note })
  } catch (error) {
    next(error)
  }
}

/**
 * Deletes a note
 * @route DELETE /api/notes/:id
 */
export async function deleteNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const userId = req.user?.userId
    const userRole = req.user?.role || 'dipendente'

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const deleted = await noteService.deleteNote(id, userId, userRole)

    if (!deleted) {
      throw new AppError('Note not found or you do not have permission to delete it', 404)
    }

    res.json({ success: true, message: 'Note deleted successfully' })
  } catch (error) {
    next(error)
  }
}

/**
 * Gets note count for an entity
 * @route GET /api/notes/:entityType/:entityId/count
 */
export async function getNoteCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { entityType, entityId } = req.params

    // Validate entityType
    const validatedEntityType = entityTypeSchema.parse(entityType)

    const count = await noteService.getNoteCount(validatedEntityType, entityId)

    res.json({ success: true, data: { count } })
  } catch (error) {
    next(error)
  }
}
