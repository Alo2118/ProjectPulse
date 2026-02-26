/**
 * Workflow Controller - HTTP handlers for workflow template management (Feature 4.3)
 * GET endpoints: all authenticated users
 * POST/PUT: admin or direzione
 * DELETE: admin only
 * Project assignment: requires configure_workflow capability
 * @module controllers/workflowController
 */

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as workflowService from '../services/workflowService.js'
import { assertProjectCapability } from '../services/permissionService.js'
import { logger } from '../utils/logger.js'
import { AppError } from '../middleware/errorMiddleware.js'

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const workflowStatusSchema = z.object({
  key: z
    .string()
    .min(1, 'Il codice dello stato è obbligatorio')
    .max(50)
    .regex(/^[a-z_]+$/, 'Il codice deve contenere solo lettere minuscole e underscore'),
  label: z.string().min(1, 'Il label è obbligatorio').max(100),
  color: z.string().min(1, 'Il colore è obbligatorio').max(20),
  isFinal: z.boolean(),
  isInitial: z.boolean(),
  requiresComment: z.boolean(),
})

const createSchema = z.object({
  name: z.string().min(1, 'Il nome è obbligatorio').max(200),
  description: z.string().max(1000).optional(),
  statuses: z
    .array(workflowStatusSchema)
    .min(2, 'Il workflow deve avere almeno 2 stati')
    .max(20, 'Il workflow non può avere più di 20 stati'),
  transitions: z.record(z.string(), z.array(z.string())),
})

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  statuses: z
    .array(workflowStatusSchema)
    .min(2)
    .max(20)
    .optional(),
  transitions: z.record(z.string(), z.array(z.string())).optional(),
  isActive: z.boolean().optional(),
})

const assignSchema = z.object({
  workflowTemplateId: z.string().uuid().nullable(),
})

// ============================================================
// HANDLERS
// ============================================================

/**
 * GET /api/workflows
 * Returns all active workflow templates.
 */
export async function getWorkflows(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workflows = await workflowService.getWorkflowTemplates()
    res.json({ success: true, data: workflows })
  } catch (error) {
    logger.error('Error fetching workflow templates', { error })
    next(error)
  }
}

/**
 * GET /api/workflows/:id
 * Returns a single workflow template by ID.
 */
export async function getWorkflow(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params
    const workflow = await workflowService.getWorkflowTemplate(id)
    if (!workflow) {
      res.status(404).json({ success: false, error: 'Workflow non trovato' })
      return
    }
    res.json({ success: true, data: workflow })
  } catch (error) {
    logger.error('Error fetching workflow template', { error })
    next(error)
  }
}

/**
 * POST /api/workflows
 * Create a new workflow template. Restricted to admin and direzione.
 */
export async function createWorkflow(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]
      res.status(400).json({
        success: false,
        error: firstError
          ? `${firstError.path.join('.')}: ${firstError.message}`
          : 'Dati non validi',
      })
      return
    }

    const userId = req.user!.userId
    const workflow = await workflowService.createWorkflowTemplate(
      parsed.data,
      userId
    )
    res.status(201).json({ success: true, data: workflow })
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message })
      return
    }
    logger.error('Error creating workflow template', { error })
    next(error)
  }
}

/**
 * PUT /api/workflows/:id
 * Update a workflow template. Restricted to admin and direzione.
 * Cannot update system templates.
 */
export async function updateWorkflow(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]
      res.status(400).json({
        success: false,
        error: firstError
          ? `${firstError.path.join('.')}: ${firstError.message}`
          : 'Dati non validi',
      })
      return
    }

    const userId = req.user!.userId
    const workflow = await workflowService.updateWorkflowTemplate(
      id,
      parsed.data,
      userId
    )
    res.json({ success: true, data: workflow })
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message })
      return
    }
    logger.error('Error updating workflow template', { error })
    next(error)
  }
}

/**
 * DELETE /api/workflows/:id
 * Soft-delete a workflow template. Restricted to admin.
 */
export async function deleteWorkflow(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params
    await workflowService.deleteWorkflowTemplate(id)
    res.json({ success: true, message: 'Workflow eliminato' })
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message })
      return
    }
    logger.error('Error deleting workflow template', { error })
    next(error)
  }
}

/**
 * GET /api/projects/:projectId/workflow
 * Returns the effective workflow for a project.
 * Always returns a valid workflow (falls back to hardcoded defaults).
 */
export async function getProjectWorkflow(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params
    const workflow = await workflowService.getProjectWorkflow(projectId)
    res.json({ success: true, data: workflow })
  } catch (error) {
    logger.error('Error fetching project workflow', { error })
    next(error)
  }
}

/**
 * PUT /api/projects/:projectId/workflow
 * Assign a workflow template to a project (or remove with null).
 * Requires configure_workflow capability.
 */
export async function assignProjectWorkflow(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params
    const parsed = assignSchema.safeParse(req.body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]
      res.status(400).json({
        success: false,
        error: firstError
          ? `${firstError.path.join('.')}: ${firstError.message}`
          : 'Dati non validi',
      })
      return
    }

    const { userId, role } = req.user!
    await assertProjectCapability(userId, role, projectId, 'configure_workflow')

    await workflowService.assignWorkflowToProject(
      projectId,
      parsed.data.workflowTemplateId
    )

    // Return the now-effective workflow so the client can update immediately
    const effectiveWorkflow = await workflowService.getProjectWorkflow(projectId)
    res.json({ success: true, data: effectiveWorkflow })
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message })
      return
    }
    logger.error('Error assigning workflow to project', { error })
    next(error)
  }
}
