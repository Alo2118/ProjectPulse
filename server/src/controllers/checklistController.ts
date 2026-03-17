/**
 * Checklist Controller - HTTP request handling for task checklist items
 * @module controllers/checklistController
 */

import { Request, Response } from 'express'
import { checklistService } from '../services/checklistService.js'
import { logger } from '../utils/logger.js'
import {
  createChecklistItemSchema,
  updateChecklistItemSchema,
  reorderChecklistSchema,
} from '../schemas/checklistSchemas.js'
import { sendSuccess, sendCreated, sendError } from '../utils/responseHelpers.js'
import { requireUserId } from '../utils/controllerHelpers.js'

// ============================================================
// CONTROLLER METHODS
// ============================================================

/**
 * GET /:taskId
 * Returns all checklist items for a task ordered by position
 */
export async function getChecklist(req: Request, res: Response): Promise<void> {
  try {
    const { taskId } = req.params
    const items = await checklistService.getChecklistItems(taskId)
    sendSuccess(res, items)
  } catch (error) {
    logger.error('Error fetching checklist', { error, taskId: req.params.taskId })
    sendError(res, 'Server error', 500)
  }
}

/**
 * POST /:taskId
 * Adds a new checklist item to a task
 */
export async function addItem(req: Request, res: Response): Promise<void> {
  try {
    const { taskId } = req.params
    const userId = requireUserId(req)

    const parsed = createChecklistItemSchema.safeParse(req.body)
    if (!parsed.success) {
      sendError(res, parsed.error.errors[0].message, 400)
      return
    }

    const item = await checklistService.createChecklistItem(taskId, parsed.data.title, userId)
    sendCreated(res, item)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    if (message === 'Task not found') {
      sendError(res, message, 404)
      return
    }
    logger.error('Error adding checklist item', { error, taskId: req.params.taskId })
    sendError(res, 'Server error', 500)
  }
}

/**
 * PATCH /:taskId/:itemId
 * Updates title, isChecked, or position of a checklist item
 */
export async function updateItem(req: Request, res: Response): Promise<void> {
  try {
    const { itemId } = req.params
    const userId = requireUserId(req)

    const parsed = updateChecklistItemSchema.safeParse(req.body)
    if (!parsed.success) {
      sendError(res, parsed.error.errors[0].message, 400)
      return
    }

    const item = await checklistService.updateChecklistItem(itemId, parsed.data, userId)
    if (!item) {
      sendError(res, 'Checklist item not found', 404)
      return
    }

    sendSuccess(res, item)
  } catch (error) {
    logger.error('Error updating checklist item', { error, itemId: req.params.itemId })
    sendError(res, 'Server error', 500)
  }
}

/**
 * DELETE /:taskId/:itemId
 * Deletes a checklist item
 */
export async function deleteItem(req: Request, res: Response): Promise<void> {
  try {
    const { itemId } = req.params
    const userId = requireUserId(req)

    const deleted = await checklistService.deleteChecklistItem(itemId, userId)
    if (!deleted) {
      sendError(res, 'Checklist item not found', 404)
      return
    }

    sendSuccess(res, { message: 'Item deleted' })
  } catch (error) {
    logger.error('Error deleting checklist item', { error, itemId: req.params.itemId })
    sendError(res, 'Server error', 500)
  }
}

/**
 * PATCH /:taskId/:itemId/toggle
 * Toggles isChecked without requiring a request body
 */
export async function toggleItem(req: Request, res: Response): Promise<void> {
  try {
    const { itemId } = req.params
    const userId = requireUserId(req)

    const item = await checklistService.toggleChecklistItem(itemId, userId)
    if (!item) {
      sendError(res, 'Checklist item not found', 404)
      return
    }

    sendSuccess(res, item)
  } catch (error) {
    logger.error('Error toggling checklist item', { error, itemId: req.params.itemId })
    sendError(res, 'Server error', 500)
  }
}

/**
 * PATCH /:taskId/reorder
 * Bulk-updates positions for reordering
 */
export async function reorderItems(req: Request, res: Response): Promise<void> {
  try {
    const { taskId } = req.params
    const userId = requireUserId(req)

    const parsed = reorderChecklistSchema.safeParse(req.body)
    if (!parsed.success) {
      sendError(res, parsed.error.errors[0].message, 400)
      return
    }

    const items = await checklistService.reorderChecklistItems(taskId, parsed.data.items, userId)
    sendSuccess(res, items)
  } catch (error) {
    logger.error('Error reordering checklist items', { error, taskId: req.params.taskId })
    sendError(res, 'Server error', 500)
  }
}
