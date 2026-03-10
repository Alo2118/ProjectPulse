/**
 * Project Controller - HTTP request handling for projects
 * @module controllers/projectController
 */

import type { Request, Response, NextFunction } from 'express'
import { projectService } from '../services/projectService.js'
import { ProjectStatus, ProjectPriority } from '../types/index.js'
import { assertProjectOwnership } from '../utils/projectOwnership.js'
import { sendSuccess, sendCreated, sendPaginated } from '../utils/responseHelpers.js'
import {
  createProjectSchema,
  updateProjectSchema,
  projectQuerySchema as querySchema,
  projectStatusChangeSchema as statusChangeSchema,
  reorderProjectsSchema,
} from '../schemas/projectSchemas.js'
import { requireUserId, requireResource } from '../utils/controllerHelpers.js'

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
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    })

    sendPaginated(res, result)
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

    const project = requireResource(await projectService.getProjectById(id), 'Project')

    sendSuccess(res, project)
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
    const userId = requireUserId(req)

    // Dipendente can only create projects owned by themselves
    const effectiveOwnerId = req.user?.role === 'dipendente' ? userId : (data.ownerId ?? undefined)

    const project = await projectService.createProject(
      {
        name: data.name,
        description: data.description ?? undefined,
        ownerId: effectiveOwnerId,
        templateId: data.templateId ?? undefined,
        phaseTemplateId: data.phaseTemplateId ?? undefined,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        targetEndDate: data.targetEndDate ? new Date(data.targetEndDate) : undefined,
        budget: data.budget ?? undefined,
        priority: data.priority as ProjectPriority,
      },
      userId
    )

    sendCreated(res, project)
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
    const userId = requireUserId(req)

    await assertProjectOwnership(id, userId, req.user?.role)

    // Dipendente cannot change the project owner
    const effectiveOwnerId = req.user?.role === 'dipendente' ? undefined : data.ownerId

    const project = requireResource(await projectService.updateProject(
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
    ), 'Project')

    sendSuccess(res, project)
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
    const userId = requireUserId(req)

    await assertProjectOwnership(id, userId, req.user?.role)

    requireResource(await projectService.deleteProject(id, userId), 'Project')

    sendSuccess(res, { message: 'Project deleted successfully' })
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
    const userId = requireUserId(req)

    await assertProjectOwnership(id, userId, req.user?.role)

    const project = requireResource(await projectService.changeProjectStatus(id, status as ProjectStatus, userId), 'Project')

    sendSuccess(res, project)
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
    requireResource(await projectService.getProjectById(id), 'Project')

    const stats = await projectService.getProjectStats(id)

    sendSuccess(res, stats)
  } catch (error) {
    next(error)
  }
}

/**
 * Gets milestone validation data for a project
 * @route GET /api/projects/:id/milestone-validation
 */
export async function getMilestoneValidation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params

    requireResource(await projectService.getProjectById(id), 'Project')

    const validation = await projectService.getMilestoneValidation(id)

    sendSuccess(res, validation)
  } catch (error) {
    next(error)
  }
}

/**
 * Reorders projects
 * @route PATCH /api/projects/reorder
 */
export async function reorderProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { items } = reorderProjectsSchema.parse(req.body)
    const userId = requireUserId(req)

    await projectService.reorderProjects(items, userId)

    sendSuccess(res, null)
  } catch (error) {
    next(error)
  }
}
