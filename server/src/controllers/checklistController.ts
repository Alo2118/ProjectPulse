/**
 * Checklist Controller - HTTP request handling for task checklist items
 * @module controllers/checklistController
 */

import { Request, Response } from 'express'
import { z } from 'zod'
import { checklistService } from '../services/checklistService.js'
import { logger } from '../utils/logger.js'

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const createSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
})

const updateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  isChecked: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
})

const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int().min(0),
    })
  ),
})

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
    res.json({ success: true, data: items })
  } catch (error) {
    logger.error('Error fetching checklist', { error, taskId: req.params.taskId })
    res.status(500).json({ success: false, error: 'Server error' })
  }
}

/**
 * POST /:taskId
 * Adds a new checklist item to a task
 */
export async function addItem(req: Request, res: Response): Promise<void> {
  try {
    const { taskId } = req.params
    const userId = req.user!.userId

    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.errors[0].message })
      return
    }

    const item = await checklistService.createChecklistItem(taskId, parsed.data.title, userId)
    res.status(201).json({ success: true, data: item })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    if (message === 'Task not found') {
      res.status(404).json({ success: false, error: message })
      return
    }
    logger.error('Error adding checklist item', { error, taskId: req.params.taskId })
    res.status(500).json({ success: false, error: 'Server error' })
  }
}

/**
 * PATCH /:taskId/:itemId
 * Updates title, isChecked, or position of a checklist item
 */
export async function updateItem(req: Request, res: Response): Promise<void> {
  try {
    const { itemId } = req.params
    const userId = req.user!.userId

    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.errors[0].message })
      return
    }

    const item = await checklistService.updateChecklistItem(itemId, parsed.data, userId)
    if (!item) {
      res.status(404).json({ success: false, error: 'Checklist item not found' })
      return
    }

    res.json({ success: true, data: item })
  } catch (error) {
    logger.error('Error updating checklist item', { error, itemId: req.params.itemId })
    res.status(500).json({ success: false, error: 'Server error' })
  }
}

/**
 * DELETE /:taskId/:itemId
 * Deletes a checklist item
 */
export async function deleteItem(req: Request, res: Response): Promise<void> {
  try {
    const { itemId } = req.params
    const userId = req.user!.userId

    const deleted = await checklistService.deleteChecklistItem(itemId, userId)
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Checklist item not found' })
      return
    }

    res.json({ success: true, message: 'Item deleted' })
  } catch (error) {
    logger.error('Error deleting checklist item', { error, itemId: req.params.itemId })
    res.status(500).json({ success: false, error: 'Server error' })
  }
}

/**
 * PATCH /:taskId/:itemId/toggle
 * Toggles isChecked without requiring a request body
 */
export async function toggleItem(req: Request, res: Response): Promise<void> {
  try {
    const { itemId } = req.params
    const userId = req.user!.userId

    const item = await checklistService.toggleChecklistItem(itemId, userId)
    if (!item) {
      res.status(404).json({ success: false, error: 'Checklist item not found' })
      return
    }

    res.json({ success: true, data: item })
  } catch (error) {
    logger.error('Error toggling checklist item', { error, itemId: req.params.itemId })
    res.status(500).json({ success: false, error: 'Server error' })
  }
}

/**
 * PATCH /:taskId/reorder
 * Bulk-updates positions for reordering
 */
export async function reorderItems(req: Request, res: Response): Promise<void> {
  try {
    const { taskId } = req.params
    const userId = req.user!.userId

    const parsed = reorderSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.errors[0].message })
      return
    }

    const items = await checklistService.reorderChecklistItems(taskId, parsed.data.items, userId)
    res.json({ success: true, data: items })
  } catch (error) {
    logger.error('Error reordering checklist items', { error, taskId: req.params.taskId })
    res.status(500).json({ success: false, error: 'Server error' })
  }
}
