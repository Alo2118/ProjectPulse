/**
 * Tag Controller - HTTP request handling for tags
 * @module controllers/tagController
 */

import { Request, Response, NextFunction } from 'express'
import { tagService } from '../services/tagService.js'
import { AppError } from '../middleware/errorMiddleware.js'
import { TaggableEntityType } from '../types/index.js'
import {
  createTagSchema,
  updateTagSchema,
  assignTagSchema,
  unassignTagSchema,
  tagQuerySchema,
} from '../schemas/tagSchemas.js'
import { sendSuccess, sendCreated, sendPaginated } from '../utils/responseHelpers.js'
import { requireUserId, requireResource } from '../utils/controllerHelpers.js'

// ============================================================
// CONTROLLER FUNCTIONS
// ============================================================

/**
 * Gets paginated list of tags
 * @route GET /api/tags
 */
export async function getTags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = tagQuerySchema.parse(req.query)

    const result = await tagService.getTags({
      search: params.search,
      page: params.page,
      limit: params.limit,
    })

    sendPaginated(res, result)
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

    requireResource(tag, 'Tag')

    sendSuccess(res, tag)
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
    const userId = requireUserId(req)

    const tag = await tagService.createTag(data, userId)

    sendCreated(res, tag)
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
    const userId = requireUserId(req)

    const tag = await tagService.updateTag(id, data, userId)

    requireResource(tag, 'Tag')

    sendSuccess(res, tag)
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
    const userId = requireUserId(req)

    requireResource(await tagService.deleteTag(id, userId), 'Tag')

    sendSuccess(res, { message: 'Tag deleted successfully' })
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
    const userId = requireUserId(req)

    const assignment = await tagService.assignTag(
      data.tagId,
      data.entityType as TaggableEntityType,
      data.entityId,
      userId
    )

    sendCreated(res, assignment)
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
    const userId = requireUserId(req)

    const removed = await tagService.unassignTag(
      data.tagId,
      data.entityType as TaggableEntityType,
      data.entityId,
      userId
    )

    requireResource(removed, 'Tag assignment')

    sendSuccess(res, { message: 'Tag unassigned successfully' })
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

    sendSuccess(res, tags)
  } catch (error) {
    next(error)
  }
}
