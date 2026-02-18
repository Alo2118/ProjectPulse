/**
 * Template Controller - HTTP request handling for project templates
 * @module controllers/templateController
 */

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { templateService } from '../services/templateService.js'
import { AppError } from '../middleware/errorMiddleware.js'

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(2000).nullish(),
  phases: z.array(z.string()).optional(),
  structure: z.record(z.unknown()).optional(),
})

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullish(),
  isActive: z.boolean().optional(),
  phases: z.array(z.string()).optional(),
  structure: z.record(z.unknown()).optional(),
})

// ============================================================
// CONTROLLER FUNCTIONS
// ============================================================

/**
 * GET /api/templates
 */
export async function getTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const includeInactive = req.query.includeInactive === 'true'
    const templates = await templateService.getTemplates(includeInactive)
    res.json({ success: true, data: templates })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/templates/:id
 */
export async function getTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const template = await templateService.getTemplateById(id)
    if (!template) throw new AppError('Template not found', 404)
    res.json({ success: true, data: template })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/templates
 */
export async function createTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createTemplateSchema.parse(req.body)
    const template = await templateService.createTemplate({
      name: body.name,
      description: body.description ?? null,
      phases: body.phases ? JSON.stringify(body.phases) : undefined,
      structure: body.structure ? JSON.stringify(body.structure) : undefined,
    })
    res.status(201).json({ success: true, data: template })
  } catch (error) {
    next(error)
  }
}

/**
 * PUT /api/templates/:id
 */
export async function updateTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const body = updateTemplateSchema.parse(req.body)
    const template = await templateService.updateTemplate(id, {
      name: body.name,
      description: body.description ?? undefined,
      isActive: body.isActive,
      phases: body.phases ? JSON.stringify(body.phases) : undefined,
      structure: body.structure ? JSON.stringify(body.structure) : undefined,
    })
    if (!template) throw new AppError('Template not found', 404)
    res.json({ success: true, data: template })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/templates/:id
 */
export async function deleteTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    await templateService.deleteTemplate(id)
    res.json({ success: true, message: 'Template deleted' })
  } catch (error) {
    next(error)
  }
}
