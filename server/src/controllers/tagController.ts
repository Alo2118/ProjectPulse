/**
 * Tag Controller - HTTP request handling for tags
 * @module controllers/tagController
 */

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { tagService } from '../services/tagService.js'
import { AppError } from '../middleware/errorMiddleware.js'
import { TaggableEntityType } from '../types/index.js'

// ============================================================
// VALIDATION SCHEMAS
// ============================================================


const createTagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
})

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
})

const assignTagSchema = z.object({
  tagId: z.string().uuid('Invalid tag ID'),
  entityType: z.enum(['task', 'document']),
  entityId: z.string().uuid('Invalid entity ID'),
})

const unassignTagSchema = z.object({
  tagId: z.string().uuid('Invalid tag ID'),
  entityType: z.enum(['task', 'document']),
  entityId: z.string().uuid('Invalid entity ID'),
})

const querySchema = z.object({
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
})

// ============================================================
// CONTROLLER FUNCTIONS
// ============================================================

/**
 * Gets paginated list of tags
 * @route GET /api/tags
 */
export async function getTags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = querySchema.parse(req.query)

    const result = await tagService.getTags({
      search: params.search,
      page: params.page,
      limit: params.limit,
    })

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
 * Gets a single tag by ID
 * @route GET /api/tags/:id
 */
export async function getTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const tag = await tagService.getTagById(id)

    if (!tag) {
      throw new AppError('Tag not found', 404)
    }

    res.json({ success: true, data: tag })
  } catch (error) {
    next(error)
  }
}

/**
 * Creates a new tag
 * @route POST /api/tags
 */
export async function createTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createTagSchema.parse(req.body)
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const tag = await tagService.createTag(data, userId)

    res.status(201).json({ success: true, data: tag })
  } catch (error) {
    next(error)
  }
}

/**
 * Updates a tag
 * @route PUT /api/tags/:id
 */
export async function updateTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const data = updateTagSchema.parse(req.body)
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const tag = await tagService.updateTag(id, data, userId)

    if (!tag) {
      throw new AppError('Tag not found', 404)
    }

    res.json({ success: true, data: tag })
  } catch (error) {
    next(error)
  }
}

/**
 * Soft deletes a tag
 * @route DELETE /api/tags/:id
 */
export async function deleteTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const deleted = await tagService.deleteTag(id, userId)

    if (!deleted) {
      throw new AppError('Tag not found', 404)
    }

    res.json({ success: true, message: 'Tag deleted successfully' })
  } catch (error) {
    next(error)
  }
}

/**
 * Assigns a tag to an entity
 * @route POST /api/tags/assign
 */
export async function assignTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = assignTagSchema.parse(req.body)
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const assignment = await tagService.assignTag(
      data.tagId,
      data.entityType as TaggableEntityType,
      data.entityId,
      userId
    )

    res.status(201).json({ success: true, data: assignment })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      next(new AppError(error.message, 404))
    } else if (error instanceof Error && error.message.includes('Unique constraint')) {
      next(new AppError('Tag already assigned to this entity', 409))
    } else {
      next(error)
    }
  }
}

/**
 * Removes a tag assignment from an entity
 * @route DELETE /api/tags/assign
 */
export async function unassignTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = unassignTagSchema.parse(req.body)
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const removed = await tagService.unassignTag(
      data.tagId,
      data.entityType as TaggableEntityType,
      data.entityId,
      userId
    )

    if (!removed) {
      throw new AppError('Tag assignment not found', 404)
    }

    res.json({ success: true, message: 'Tag unassigned successfully' })
  } catch (error) {
    next(error)
  }
}

/**
 * Gets tags for a specific entity
 * @route GET /api/tags/entity/:type/:id
 */
export async function getEntityTags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { type, id } = req.params

    if (!['task', 'document'].includes(type)) {
      throw new AppError('Invalid entity type. Must be "task" or "document"', 400)
    }

    const tags = await tagService.getTagsByEntity(type as TaggableEntityType, id)

    res.json({ success: true, data: tags })
  } catch (error) {
    next(error)
  }
}
