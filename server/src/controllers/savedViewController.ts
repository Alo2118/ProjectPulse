/**
 * SavedView Controller - HTTP handlers for saved filter views
 * @module controllers/savedViewController
 */

import { Request, Response } from 'express'
import { z } from 'zod'
import { savedViewService } from '../services/savedViewService.js'
import { logger } from '../utils/logger.js'
import { sendSuccess, sendCreated, sendError } from '../utils/responseHelpers.js'
import { requireUserId } from '../utils/controllerHelpers.js'

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const createViewSchema = z.object({
  name: z.string().min(1, 'Il nome è obbligatorio').max(100),
  entity: z.enum(['task', 'project', 'risk']),
  filters: z.record(z.unknown()),
  columns: z.array(z.string()).optional(),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  isShared: z.boolean().optional(),
  isDefault: z.boolean().optional(),
})

const updateViewSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  filters: z.record(z.unknown()).optional(),
  columns: z.array(z.string()).nullable().optional(),
  sortBy: z.string().max(50).nullable().optional(),
  sortOrder: z.enum(['asc', 'desc']).nullable().optional(),
  isShared: z.boolean().optional(),
  isDefault: z.boolean().optional(),
})

const querySchema = z.object({
  entity: z.enum(['task', 'project', 'risk']).optional(),
  includeShared: z
    .string()
    .optional()
    .transform((v) => v !== 'false'),
})

// ============================================================
// HANDLERS
// ============================================================

export async function getViews(req: Request, res: Response): Promise<void> {
  try {
    const query = querySchema.parse(req.query)
    const userId = requireUserId(req)
    const views = await savedViewService.getViews(userId, query)
    sendSuccess(res, views)
  } catch (error) {
    logger.error('Error fetching saved views', { error })
    sendError(res, 'Errore nel recupero delle viste salvate', 500)
  }
}

export async function getView(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const userId = requireUserId(req)
    const view = await savedViewService.getViewById(id, userId)
    if (!view) {
      sendError(res, 'Vista non trovata', 404)
      return
    }
    sendSuccess(res, view)
  } catch (error) {
    logger.error('Error fetching saved view', { error })
    sendError(res, 'Errore nel recupero della vista', 500)
  }
}

export async function createView(req: Request, res: Response): Promise<void> {
  try {
    const parsed = createViewSchema.safeParse(req.body)
    if (!parsed.success) {
      sendError(res, parsed.error.errors[0].message, 400)
      return
    }
    const userId = requireUserId(req)
    const view = await savedViewService.createView(parsed.data, userId)
    sendCreated(res, view)
  } catch (error) {
    logger.error('Error creating saved view', { error })
    sendError(res, 'Errore nella creazione della vista', 500)
  }
}

export async function updateView(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const parsed = updateViewSchema.safeParse(req.body)
    if (!parsed.success) {
      sendError(res, parsed.error.errors[0].message, 400)
      return
    }
    const userId = requireUserId(req)
    const view = await savedViewService.updateView(id, parsed.data, userId)
    if (!view) {
      sendError(res, 'Vista non trovata o accesso non autorizzato', 404)
      return
    }
    sendSuccess(res, view)
  } catch (error) {
    logger.error('Error updating saved view', { error })
    sendError(res, "Errore nell'aggiornamento della vista", 500)
  }
}

export async function deleteView(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const userId = requireUserId(req)
    const deleted = await savedViewService.deleteView(id, userId)
    if (!deleted) {
      sendError(res, 'Vista non trovata o accesso non autorizzato', 404)
      return
    }
    sendSuccess(res, { message: 'Vista eliminata' })
  } catch (error) {
    logger.error('Error deleting saved view', { error })
    sendError(res, "Errore nell'eliminazione della vista", 500)
  }
}
