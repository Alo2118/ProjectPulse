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
    res.json({ success: true, ...result })
  } catch (error) {
    logger.error('Error fetching departments', { error })
    res.status(500).json({ success: false, error: 'Errore nel recupero dei reparti' })
  }
}

export async function getDepartment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const department = await departmentService.getDepartmentById(id)
    if (!department) {
      res.status(404).json({ success: false, error: 'Reparto non trovato' })
      return
    }
    res.json({ success: true, data: department })
  } catch (error) {
    logger.error('Error fetching department', { error })
    res.status(500).json({ success: false, error: 'Errore nel recupero del reparto' })
  }
}

export async function createDepartment(req: Request, res: Response): Promise<void> {
  try {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Accesso riservato agli amministratori' })
      return
    }

    const parsed = createDepartmentSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.errors[0].message })
      return
    }

    const department = await departmentService.createDepartment(parsed.data, req.user.userId)
    res.status(201).json({ success: true, data: department })
  } catch (error) {
    if (error instanceof Error && error.message.includes('esiste già')) {
      res.status(409).json({ success: false, error: error.message })
      return
    }
    logger.error('Error creating department', { error })
    res.status(500).json({ success: false, error: 'Errore nella creazione del reparto' })
  }
}

export async function updateDepartment(req: Request, res: Response): Promise<void> {
  try {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Accesso riservato agli amministratori' })
      return
    }

    const { id } = req.params
    const parsed = updateDepartmentSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.errors[0].message })
      return
    }

    const department = await departmentService.updateDepartment(id, parsed.data, req.user.userId)
    if (!department) {
      res.status(404).json({ success: false, error: 'Reparto non trovato' })
      return
    }
    res.json({ success: true, data: department })
  } catch (error) {
    if (error instanceof Error && error.message.includes('esiste già')) {
      res.status(409).json({ success: false, error: error.message })
      return
    }
    logger.error('Error updating department', { error })
    res.status(500).json({ success: false, error: 'Errore nell\'aggiornamento del reparto' })
  }
}

export async function deleteDepartment(req: Request, res: Response): Promise<void> {
  try {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Accesso riservato agli amministratori' })
      return
    }

    const { id } = req.params
    const deleted = await departmentService.deleteDepartment(id, req.user.userId)
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Reparto non trovato' })
      return
    }
    res.json({ success: true, message: 'Reparto eliminato' })
  } catch (error) {
    logger.error('Error deleting department', { error })
    res.status(500).json({ success: false, error: 'Errore nell\'eliminazione del reparto' })
  }
}
