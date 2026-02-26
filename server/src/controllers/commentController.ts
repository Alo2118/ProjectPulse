/**
 * Comment Controller - HTTP request handling for task comments
 * @module controllers/commentController
 */

import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { commentService } from '../services/commentService.js'
import { AppError } from '../middleware/errorMiddleware.js'
import { sendSuccess, sendCreated, sendPaginated } from '../utils/responseHelpers.js'

// ============================================================
// VALIDATION SCHEMAS (Rule 6: Input Validation)
// ============================================================

const createCommentSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  content: z.string().min(1, 'Content is required').max(10000),
  isInternal: z.boolean().default(false),
  parentId: z.string().uuid('Invalid parent comment ID').optional(),
})

const updateCommentSchema = z.object({
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
 * Creates a new comment on a task
 * @route POST /api/comments
 */
export async function createComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createCommentSchema.parse(req.body)
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    // Only direzione/admin can create internal comments
    const userRole = req.user?.role || 'dipendente'
    if (data.isInternal && userRole === 'dipendente') {
      throw new AppError('Only direzione and admin can create internal comments', 403)
    }

    const comment = await commentService.createComment(
      {
        taskId: data.taskId,
        content: data.content,
        isInternal: data.isInternal,
        ...(data.parentId ? { parentId: data.parentId } : {}),
      },
      userId
    )

    sendCreated(res, comment)
  } catch (error) {
    if (error instanceof Error && error.message === 'Task not found') {
      next(new AppError('Task not found', 404))
    } else {
      next(error)
    }
  }
}

/**
 * Gets comments for a task
 * @route GET /api/comments/task/:taskId
 */
export async function getTaskComments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { taskId } = req.params
    const params = querySchema.parse(req.query)
    const userRole = req.user?.role || 'dipendente'

    const result = await commentService.getTaskComments(
      taskId,
      { page: params.page, limit: params.limit },
      userRole
    )

    sendPaginated(res, result)
  } catch (error) {
    next(error)
  }
}

/**
 * Gets a single comment by ID
 * @route GET /api/comments/:id
 */
export async function getComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params

    const comment = await commentService.getCommentById(id)

    if (!comment) {
      throw new AppError('Comment not found', 404)
    }

    // Check if user can view internal comments
    const userRole = req.user?.role || 'dipendente'
    if (comment.isInternal && userRole === 'dipendente') {
      throw new AppError('Comment not found', 404) // Hide existence of internal comments
    }

    sendSuccess(res, comment)
  } catch (error) {
    next(error)
  }
}

/**
 * Updates a comment
 * @route PUT /api/comments/:id
 */
export async function updateComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const data = updateCommentSchema.parse(req.body)
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    // Only direzione/admin can set internal flag
    const userRole = req.user?.role || 'dipendente'
    if (data.isInternal !== undefined && userRole === 'dipendente') {
      throw new AppError('Only direzione and admin can modify internal flag', 403)
    }

    const comment = await commentService.updateComment(
      id,
      {
        content: data.content,
        isInternal: data.isInternal,
      },
      userId
    )

    if (!comment) {
      throw new AppError('Comment not found or not owned by user', 404)
    }

    sendSuccess(res, comment)
  } catch (error) {
    next(error)
  }
}

/**
 * Deletes a comment (soft delete)
 * @route DELETE /api/comments/:id
 */
export async function deleteComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const userId = req.user?.userId
    const userRole = req.user?.role || 'dipendente'

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const deleted = await commentService.deleteComment(id, userId, userRole)

    if (!deleted) {
      throw new AppError('Comment not found or not owned by user', 404)
    }

    res.json({ success: true, message: 'Comment deleted successfully' })
  } catch (error) {
    next(error)
  }
}

/**
 * Gets recent comments for current user
 * @route GET /api/comments/recent
 */
export async function getRecentComments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const limit = parseInt(req.query.limit as string) || 20

    const comments = await commentService.getRecentComments(userId, limit)

    sendSuccess(res, comments)
  } catch (error) {
    next(error)
  }
}
