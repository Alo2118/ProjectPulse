/**
 * Checklist Routes - CRUD for task checklist items
 * @module routes/checklistRoutes
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import * as checklistController from '../controllers/checklistController.js'

const router = Router()

// List items for a task
router.get('/:taskId', authMiddleware, checklistController.getChecklist)

// Add item to a task
router.post('/:taskId', authMiddleware, checklistController.addItem)

// Reorder items — literal segment, must come before wildcard /:taskId/:itemId
router.patch('/:taskId/reorder', authMiddleware, checklistController.reorderItems)

// Toggle isChecked — three-segment path, must come before two-segment /:taskId/:itemId
router.patch('/:taskId/:itemId/toggle', authMiddleware, checklistController.toggleItem)

// Update a single item
router.patch('/:taskId/:itemId', authMiddleware, checklistController.updateItem)

// Delete a single item
router.delete('/:taskId/:itemId', authMiddleware, checklistController.deleteItem)

export default router
