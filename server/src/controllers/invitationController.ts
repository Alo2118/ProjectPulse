/**
 * Invitation Controller - HTTP handlers for project invitation management
 * Feature 4.2: Guest Users
 *
 * Route overview:
 *   POST   /api/projects/:projectId/invite           → createInvitation   (auth required, manage_members)
 *   GET    /api/invitations/:token                    → validateInvitation  (public)
 *   POST   /api/invitations/:token/accept             → acceptInvitation    (public)
 *   GET    /api/projects/:projectId/invitations       → listInvitations     (auth required, manage_members)
 *   DELETE /api/invitations/:id                       → cancelInvitation    (auth required, manage_members)
 *
 * @module controllers/invitationController
 */

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { invitationService } from '../services/invitationService.js'
import { AppError } from '../middleware/errorMiddleware.js'
import { logger } from '../utils/logger.js'

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  projectRole: z
    .enum(['manager', 'member', 'viewer', 'guest'])
    .default('guest'),
})

const acceptInvitationSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
})

// ============================================================
// HELPERS
// ============================================================

/**
 * Checks whether the authenticated user has manage_members capability for the given project.
 * Admins and direzione always pass. Project owners and managers also pass.
 * Returns 403 if the check fails.
 */
async function assertCanManageMembers(
  req: Request,
  res: Response,
  projectId: string
): Promise<boolean> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' })
    return false
  }

  const { userId, role } = req.user

  // System admins and direzione always have manage_members
  if (role === 'admin' || role === 'direzione') {
    return true
  }

  // Check project-level role: owner and manager can manage members
  const { prisma } = await import('../models/prismaClient.js')
  const membership = await prisma.projectMember.findFirst({
    where: { projectId, userId },
    select: { projectRole: true },
  })

  // Also allow if the user is the project owner
  const project = await prisma.project.findFirst({
    where: { id: projectId, isDeleted: false },
    select: { ownerId: true },
  })

  if (!project) {
    res.status(404).json({ success: false, error: 'Project not found' })
    return false
  }

  const isProjectOwner = project.ownerId === userId
  const isProjectManager = membership?.projectRole === 'owner' || membership?.projectRole === 'manager'

  if (!isProjectOwner && !isProjectManager) {
    res.status(403).json({
      success: false,
      error: 'You do not have permission to manage members for this project',
    })
    return false
  }

  return true
}

// ============================================================
// HANDLERS
// ============================================================

/**
 * POST /api/projects/:projectId/invite
 * Creates a project invitation for the given email address.
 * Requires: authenticated user with manage_members capability on the project.
 */
export async function createInvitation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' })
      return
    }

    const { projectId } = req.params

    const canManage = await assertCanManageMembers(req, res, projectId)
    if (!canManage) return

    const parsed = createInvitationSchema.safeParse(req.body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]
      res.status(400).json({
        success: false,
        error: firstError ? `${firstError.path.join('.')}: ${firstError.message}` : 'Validation failed',
        errors: parsed.error.errors,
      })
      return
    }

    const { email, projectRole } = parsed.data

    const invitation = await invitationService.createInvitation(
      projectId,
      email,
      projectRole,
      req.user.userId
    )

    res.status(201).json({ success: true, data: invitation })
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message })
      return
    }
    logger.error('Error creating invitation', { error })
    next(error)
  }
}

/**
 * GET /api/invitations/:token
 * Public endpoint — returns invitation metadata without sensitive data.
 * Used by the frontend to display the invitation acceptance page.
 */
export async function validateInvitation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token } = req.params

    const invitation = await invitationService.validateInvitation(token)

    if (!invitation) {
      res.status(404).json({
        success: false,
        error: 'Invitation not found, already accepted, or expired',
      })
      return
    }

    // Return only non-sensitive data — omit the raw token from the response body
    const { token: _token, invitedById: _invitedById, ...safeInvitation } = invitation

    res.json({ success: true, data: safeInvitation })
  } catch (error) {
    logger.error('Error validating invitation', { error })
    next(error)
  }
}

/**
 * POST /api/invitations/:token/accept
 * Public endpoint — accepts an invitation.
 *
 * If the email already exists as a user, no userData is needed (the existing user is
 * added directly to the project).
 *
 * If the email is new, firstName, lastName, and password are required.
 */
export async function acceptInvitation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token } = req.params

    const parsed = acceptInvitationSchema.safeParse(req.body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]
      res.status(400).json({
        success: false,
        error: firstError ? `${firstError.path.join('.')}: ${firstError.message}` : 'Validation failed',
        errors: parsed.error.errors,
      })
      return
    }

    const userData = parsed.data as
      | { firstName: string; lastName: string; password: string }
      | undefined

    const result = await invitationService.acceptInvitation(token, userData)

    res.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message })
      return
    }
    logger.error('Error accepting invitation', { error })
    next(error)
  }
}

/**
 * GET /api/projects/:projectId/invitations
 * Lists all pending (not accepted, not expired) invitations for a project.
 * Requires: authenticated user with manage_members capability on the project.
 */
export async function listInvitations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' })
      return
    }

    const { projectId } = req.params

    const canManage = await assertCanManageMembers(req, res, projectId)
    if (!canManage) return

    const invitations = await invitationService.listPendingInvitations(projectId)

    res.json({ success: true, data: invitations })
  } catch (error) {
    logger.error('Error listing invitations', { error })
    next(error)
  }
}

/**
 * DELETE /api/invitations/:id
 * Cancels (hard-deletes) an invitation.
 * Requires: authenticated user with manage_members capability on the invitation's project.
 */
export async function cancelInvitation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' })
      return
    }

    const { id } = req.params

    // Fetch the invitation first to determine its project (for the capability check)
    const { prisma } = await import('../models/prismaClient.js')
    const invitation = await prisma.projectInvitation.findFirst({
      where: { id },
      select: { id: true, projectId: true },
    })

    if (!invitation) {
      res.status(404).json({ success: false, error: 'Invitation not found' })
      return
    }

    const canManage = await assertCanManageMembers(req, res, invitation.projectId)
    if (!canManage) return

    await invitationService.cancelInvitation(id)

    res.json({ success: true, message: 'Invitation cancelled' })
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message })
      return
    }
    logger.error('Error cancelling invitation', { error })
    next(error)
  }
}
