/**
 * Project Member Controller - HTTP handlers for project membership management
 * Enforces granular permissions via assertProjectCapability before mutations.
 * @module controllers/projectMemberController
 */

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as permissionService from '../services/permissionService.js'
import { logger } from '../utils/logger.js'
import { sendSuccess, sendCreated, sendError } from '../utils/responseHelpers.js'
import { AppError } from '../middleware/errorMiddleware.js'

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const projectRoleSchema = z.enum(['owner', 'manager', 'member', 'viewer', 'guest'])

const addMemberSchema = z.object({
  userId: z.string().uuid('userId deve essere un UUID valido'),
  projectRole: projectRoleSchema,
})

const updateMemberSchema = z.object({
  projectRole: projectRoleSchema,
})

// ============================================================
// HELPERS
// ============================================================

function getRequester(req: Request): { userId: string; role: string } {
  if (!req.user) {
    throw new AppError('Unauthenticated', 401)
  }
  return { userId: req.user.userId, role: req.user.role }
}

// ============================================================
// HANDLERS
// ============================================================

/**
 * GET /api/projects/:projectId/members
 * Returns all members of a project with user details.
 * Requires view_project capability.
 */
export async function getMembers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params
    const { userId, role } = getRequester(req)

    await permissionService.assertProjectCapability(
      userId,
      role,
      projectId,
      'view_project'
    )

    const members = await permissionService.getProjectMembers(projectId)
    sendSuccess(res, members)
  } catch (error) {
    logger.error('Error fetching project members', { error })
    next(error)
  }
}

/**
 * POST /api/projects/:projectId/members
 * Add a user to the project with a specific role.
 * Requires manage_members capability.
 */
export async function addMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params
    const { userId, role } = getRequester(req)

    await permissionService.assertProjectCapability(
      userId,
      role,
      projectId,
      'manage_members'
    )

    const parsed = addMemberSchema.safeParse(req.body)
    if (!parsed.success) {
      sendError(res, parsed.error.errors[0]?.message ?? 'Dati non validi', 400)
      return
    }

    const member = await permissionService.addProjectMember(
      projectId,
      parsed.data.userId,
      parsed.data.projectRole,
      userId
    )

    sendCreated(res, member)
  } catch (error) {
    logger.error('Error adding project member', { error })
    next(error)
  }
}

/**
 * PUT /api/projects/:projectId/members/:memberId
 * Update the project role of an existing member.
 * Requires manage_members capability.
 */
export async function updateMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId, memberId } = req.params
    const { userId, role } = getRequester(req)

    await permissionService.assertProjectCapability(
      userId,
      role,
      projectId,
      'manage_members'
    )

    const parsed = updateMemberSchema.safeParse(req.body)
    if (!parsed.success) {
      sendError(res, parsed.error.errors[0]?.message ?? 'Dati non validi', 400)
      return
    }

    const updated = await permissionService.updateProjectMember(
      memberId,
      parsed.data.projectRole,
      userId
    )

    sendSuccess(res, updated)
  } catch (error) {
    logger.error('Error updating project member', { error })
    next(error)
  }
}

/**
 * DELETE /api/projects/:projectId/members/:memberId
 * Remove a user from the project.
 * Requires manage_members capability.
 */
export async function removeMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId, memberId } = req.params
    const { userId, role } = getRequester(req)

    await permissionService.assertProjectCapability(
      userId,
      role,
      projectId,
      'manage_members'
    )

    await permissionService.removeProjectMember(memberId, userId)

    sendSuccess(res, { message: 'Membro rimosso dal progetto' })
  } catch (error) {
    logger.error('Error removing project member', { error })
    next(error)
  }
}
