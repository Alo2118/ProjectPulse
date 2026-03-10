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
import { sendSuccess, sendCreated, sendError } from '../utils/responseHelpers.js'
import { requireUserId } from '../utils/controllerHelpers.js'

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
  domain: z.enum(['task', 'project']).default('task'),
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
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const domain = typeof req.query.domain === 'string' ? req.query.domain : undefined
    const workflows = await workflowService.getWorkflowTemplates(domain)
    sendSuccess(res, workflows)
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
      sendError(res, 'Workflow non trovato', 404)
      return
    }
    sendSuccess(res, workflow)
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
      sendError(
        res,
        firstError ? `${firstError.path.join('.')}: ${firstError.message}` : 'Dati non validi',
        400
      )
      return
    }

    const userId = requireUserId(req)
    const workflow = await workflowService.createWorkflowTemplate(
      parsed.data,
      userId
    )
    sendCreated(res, workflow)
  } catch (error) {
    if (error instanceof AppError) {
      sendError(res, error.message, error.statusCode)
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
      sendError(
        res,
        firstError ? `${firstError.path.join('.')}: ${firstError.message}` : 'Dati non validi',
        400
      )
      return
    }

    const userId = requireUserId(req)
    const workflow = await workflowService.updateWorkflowTemplate(
      id,
      parsed.data,
      userId
    )
    sendSuccess(res, workflow)
  } catch (error) {
    if (error instanceof AppError) {
      sendError(res, error.message, error.statusCode)
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
    sendSuccess(res, { message: 'Workflow eliminato' })
  } catch (error) {
    if (error instanceof AppError) {
      sendError(res, error.message, error.statusCode)
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
    sendSuccess(res, workflow)
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
      sendError(
        res,
        firstError ? `${firstError.path.join('.')}: ${firstError.message}` : 'Dati non validi',
        400
      )
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
    sendSuccess(res, effectiveWorkflow)
  } catch (error) {
    if (error instanceof AppError) {
      sendError(res, error.message, error.statusCode)
      return
    }
    logger.error('Error assigning workflow to project', { error })
    next(error)
  }
}
