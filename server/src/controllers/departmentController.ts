/**
 * Department Controller - HTTP handlers for department management
 * GET endpoints: accessible to all authenticated users (for dropdown population)
 * POST/PUT/DELETE: admin only
 * @module controllers/departmentController
 */

import { Request, Response } from 'express'
import { z } from 'zod'
import { departmentService } from '../services/departmentService.js'
import { logger } from '../utils/logger.js'
import { sendSuccess, sendCreated, sendError } from '../utils/responseHelpers.js'

const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Il nome è obbligatorio').max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Colore non valido (formato #RRGGBB)').optional(),
})

const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Colore non valido (formato #RRGGBB)').optional(),
  isActive: z.boolean().optional(),
})

const querySchema = z.object({
  search: z.string().optional(),
  includeInactive: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 50)),
})

export async function getDepartments(req: Request, res: Response): Promise<void> {
  try {
    const query = querySchema.parse(req.query)
    const result = await departmentService.getDepartments(query)
    sendSuccess(res, result)
  } catch (error) {
    logger.error('Error fetching departments', { error })
    sendError(res, 'Errore nel recupero dei reparti', 500)
  }
}

export async function getDepartment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const department = await departmentService.getDepartmentById(id)
    if (!department) {
      sendError(res, 'Reparto non trovato', 404)
      return
    }
    sendSuccess(res, department)
  } catch (error) {
    logger.error('Error fetching department', { error })
    sendError(res, 'Errore nel recupero del reparto', 500)
  }
}

export async function createDepartment(req: Request, res: Response): Promise<void> {
  try {
    if (req.user?.role !== 'admin') {
      sendError(res, 'Accesso riservato agli amministratori', 403)
      return
    }

    const parsed = createDepartmentSchema.safeParse(req.body)
    if (!parsed.success) {
      sendError(res, parsed.error.errors[0].message, 400)
      return
    }

    const department = await departmentService.createDepartment(parsed.data, req.user.userId)
    sendCreated(res, department)
  } catch (error) {
    if (error instanceof Error && error.message.includes('esiste già')) {
      sendError(res, error.message, 409)
      return
    }
    logger.error('Error creating department', { error })
    sendError(res, 'Errore nella creazione del reparto', 500)
  }
}

export async function updateDepartment(req: Request, res: Response): Promise<void> {
  try {
    if (req.user?.role !== 'admin') {
      sendError(res, 'Accesso riservato agli amministratori', 403)
      return
    }

    const { id } = req.params
    const parsed = updateDepartmentSchema.safeParse(req.body)
    if (!parsed.success) {
      sendError(res, parsed.error.errors[0].message, 400)
      return
    }

    const department = await departmentService.updateDepartment(id, parsed.data, req.user.userId)
    if (!department) {
      sendError(res, 'Reparto non trovato', 404)
      return
    }
    sendSuccess(res, department)
  } catch (error) {
    if (error instanceof Error && error.message.includes('esiste già')) {
      sendError(res, error.message, 409)
      return
    }
    logger.error('Error updating department', { error })
    sendError(res, "Errore nell'aggiornamento del reparto", 500)
  }
}

export async function deleteDepartment(req: Request, res: Response): Promise<void> {
  try {
    if (req.user?.role !== 'admin') {
      sendError(res, 'Accesso riservato agli amministratori', 403)
      return
    }

    const { id } = req.params
    const deleted = await departmentService.deleteDepartment(id, req.user.userId)
    if (!deleted) {
      sendError(res, 'Reparto non trovato', 404)
      return
    }
    sendSuccess(res, { message: 'Reparto eliminato' })
  } catch (error) {
    logger.error('Error deleting department', { error })
    sendError(res, "Errore nell'eliminazione del reparto", 500)
  }
}
