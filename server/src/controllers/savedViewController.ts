/**
 * SavedView Controller - HTTP handlers for saved filter views
 * @module controllers/savedViewController
 */

import { Request, Response } from 'express'
import { z } from 'zod'
import { savedViewService } from '../services/savedViewService.js'
import { logger } from '../utils/logger.js'

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
    const userId = req.user!.userId
    const views = await savedViewService.getViews(userId, query)
    res.json({ success: true, data: views })
  } catch (error) {
    logger.error('Error fetching saved views', { error })
    res.status(500).json({ success: false, error: 'Errore nel recupero delle viste salvate' })
  }
}

export async function getView(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const userId = req.user!.userId
    const view = await savedViewService.getViewById(id, userId)
    if (!view) {
      res.status(404).json({ success: false, error: 'Vista non trovata' })
      return
    }
    res.json({ success: true, data: view })
  } catch (error) {
    logger.error('Error fetching saved view', { error })
    res.status(500).json({ success: false, error: 'Errore nel recupero della vista' })
  }
}

export async function createView(req: Request, res: Response): Promise<void> {
  try {
    const parsed = createViewSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.errors[0].message })
      return
    }
    const userId = req.user!.userId
    const view = await savedViewService.createView(parsed.data, userId)
    res.status(201).json({ success: true, data: view })
  } catch (error) {
    logger.error('Error creating saved view', { error })
    res.status(500).json({ success: false, error: 'Errore nella creazione della vista' })
  }
}

export async function updateView(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const parsed = updateViewSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.errors[0].message })
      return
    }
    const userId = req.user!.userId
    const view = await savedViewService.updateView(id, parsed.data, userId)
    if (!view) {
      res.status(404).json({ success: false, error: 'Vista non trovata o accesso non autorizzato' })
      return
    }
    res.json({ success: true, data: view })
  } catch (error) {
    logger.error('Error updating saved view', { error })
    res.status(500).json({ success: false, error: 'Errore nell\'aggiornamento della vista' })
  }
}

export async function deleteView(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const userId = req.user!.userId
    const deleted = await savedViewService.deleteView(id, userId)
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Vista non trovata o accesso non autorizzato' })
      return
    }
    res.json({ success: true, message: 'Vista eliminata' })
  } catch (error) {
    logger.error('Error deleting saved view', { error })
    res.status(500).json({ success: false, error: 'Errore nell\'eliminazione della vista' })
  }
}
