/**
 * Project Controller - HTTP request handling for projects
 * @module controllers/projectController
 */

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { projectService } from '../services/projectService.js'
import { AppError } from '../middleware/errorMiddleware.js'
import { ProjectStatus, ProjectPriority } from '../types/index.js'
import { datePreprocess, numberPreprocess } from '../utils/validation.js'
import { assertProjectOwnership } from '../utils/projectOwnership.js'

// ============================================================
// VALIDATION SCHEMAS (Rule 6: Input Validation)
// ============================================================

const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().nullish(),
  ownerId: z.string().uuid('Invalid owner ID'),
  templateId: z.string().uuid('Invalid template ID').nullish(),
  startDate: z.preprocess(datePreprocess, z.string().datetime().nullish()),
  targetEndDate: z.preprocess(datePreprocess, z.string().datetime().nullish()),
  budget: z.preprocess(numberPreprocess, z.number().positive('Budget must be positive').nullish()),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
})

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullish(),
  ownerId: z.string().uuid().optional(),
  status: z.enum(['planning', 'design', 'verification', 'validation', 'transfer', 'maintenance', 'completed', 'on_hold', 'cancelled']).optional(),
  startDate: z.preprocess(datePreprocess, z.string().datetime().nullish()),
  targetEndDate: z.preprocess(datePreprocess, z.string().datetime().nullish()),
  actualEndDate: z.preprocess(datePreprocess, z.string().datetime().nullish()),
  budget: z.preprocess(numberPreprocess, z.number().positive().nullish()),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional()
})

const querySchema = z.object({
  status: z.enum(['planning', 'design', 'verification', 'validation', 'transfer', 'maintenance', 'completed', 'on_hold', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  ownerId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
})

const statusChangeSchema = z.object({
  status: z.enum(['planning', 'design', 'verification', 'validation', 'transfer', 'maintenance', 'completed', 'on_hold', 'cancelled']),
})

// ============================================================
// CONTROLLER FUNCTIONS
// ============================================================

/**
 * Gets paginated list of projects
 * @route GET /api/projects
 */
export async function getProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = querySchema.parse(req.query)

    const result = await projectService.getProjects({
      status: params.status as ProjectStatus,
      priority: params.priority as ProjectPriority,
      ownerId: params.ownerId,
      search: params.search,
      page: params.page,
      limit: params.limit,
    })

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Gets a single project by ID
 * @route GET /api/projects/:id
 */
export async function getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params

    const project = await projectService.getProjectById(id)

    if (!project) {
      throw new AppError('Project not found', 404)
    }

    res.json({ success: true, data: project })
  } catch (error) {
    next(error)
  }
}

/**
 * Creates a new project
 * @route POST /api/projects
 */
export async function createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createProjectSchema.parse(req.body)
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    // Dipendente can only create projects owned by themselves
    const effectiveOwnerId = req.user?.role === 'dipendente' ? userId : (data.ownerId ?? undefined)

    const project = await projectService.createProject(
      {
        name: data.name,
        description: data.description ?? undefined,
        ownerId: effectiveOwnerId,
        templateId: data.templateId ?? undefined,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        targetEndDate: data.targetEndDate ? new Date(data.targetEndDate) : undefined,
        budget: data.budget ?? undefined,
        priority: data.priority as ProjectPriority,
      },
      userId
    )

    res.status(201).json({ success: true, data: project })
  } catch (error) {
    next(error)
  }
}

/**
 * Updates a project
 * @route PUT /api/projects/:id
 */
export async function updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const data = updateProjectSchema.parse(req.body)
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    await assertProjectOwnership(id, userId, req.user?.role)

    // Dipendente cannot change the project owner
    const effectiveOwnerId = req.user?.role === 'dipendente' ? undefined : data.ownerId

    const project = await projectService.updateProject(
      id,
      {
        name: data.name,
        description: data.description ?? undefined,
        ownerId: effectiveOwnerId,
        status: data.status as ProjectStatus,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        targetEndDate: data.targetEndDate ? new Date(data.targetEndDate) : undefined,
        actualEndDate: data.actualEndDate ? new Date(data.actualEndDate) : undefined,
        budget: data.budget ?? undefined,
        priority: data.priority as ProjectPriority,
      },
      userId
    )

    if (!project) {
      throw new AppError('Project not found', 404)
    }

    res.json({ success: true, data: project })
  } catch (error) {
    next(error)
  }
}

/**
 * Soft deletes a project (Rule 11: Soft Delete)
 * @route DELETE /api/projects/:id
 */
export async function deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    await assertProjectOwnership(id, userId, req.user?.role)

    const deleted = await projectService.deleteProject(id, userId)

    if (!deleted) {
      throw new AppError('Project not found', 404)
    }

    res.json({ success: true, message: 'Project deleted successfully' })
  } catch (error) {
    next(error)
  }
}

/**
 * Changes project status
 * @route PATCH /api/projects/:id/status
 */
export async function changeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const { status } = statusChangeSchema.parse(req.body)
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    await assertProjectOwnership(id, userId, req.user?.role)

    const project = await projectService.changeProjectStatus(id, status as ProjectStatus, userId)

    if (!project) {
      throw new AppError('Project not found', 404)
    }

    res.json({ success: true, data: project })
  } catch (error) {
    next(error)
  }
}

/**
 * Gets project statistics
 * @route GET /api/projects/:id/stats
 */
export async function getProjectStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params

    // First check if project exists
    const project = await projectService.getProjectById(id)
    if (!project) {
      throw new AppError('Project not found', 404)
    }

    const stats = await projectService.getProjectStats(id)

    res.json({ success: true, data: stats })
  } catch (error) {
    next(error)
  }
}
