/**
 * Invitation Service - Business logic for project invitations (guest/external users)
 * Feature 4.2: Guest Users
 * @module services/invitationService
 */

import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { prisma } from '../models/prismaClient.js'
import { AppError } from '../middleware/errorMiddleware.js'
import { logger } from '../utils/logger.js'
import { UserWithoutPassword, Theme } from '../types/index.js'

// ============================================================
// CONSTANTS
// ============================================================

const BCRYPT_ROUNDS = 12
const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

// ============================================================
// INTERNAL RETURN TYPES
// ============================================================

interface InvitationRow {
  id: string
  email: string
  projectId: string
  projectRole: string
  invitedById: string
  token: string
  expiresAt: Date
  acceptedAt: Date | null
  createdAt: Date
}

interface InvitationWithRelations extends InvitationRow {
  project: { id: string; name: string; code: string }
  invitedBy: { id: string; firstName: string; lastName: string; email: string }
}

interface PendingInvitationRow extends InvitationRow {
  invitedBy: { id: string; firstName: string; lastName: string; email: string }
}

interface ProjectMemberRow {
  id: string
  projectId: string
  userId: string
  projectRole: string
  addedById: string
  createdAt: Date
  updatedAt: Date
}

interface UserRow {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  avatarUrl: string | null
  theme: string
  isActive: boolean
  isExternal: boolean
  createdAt: Date
  lastLoginAt: Date | null
}

// ============================================================
// SELECT FIELD SETS
// ============================================================

const invitationSelectFields = {
  id: true,
  email: true,
  projectId: true,
  projectRole: true,
  invitedById: true,
  token: true,
  expiresAt: true,
  acceptedAt: true,
  createdAt: true,
} as const

const invitationWithRelationsSelect = {
  ...invitationSelectFields,
  project: {
    select: { id: true, name: true, code: true },
  },
  invitedBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
} as const

const pendingInvitationSelect = {
  ...invitationSelectFields,
  invitedBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
} as const

const userSelectFields = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  avatarUrl: true,
  theme: true,
  isActive: true,
  isExternal: true,
  createdAt: true,
  lastLoginAt: true,
} as const

const projectMemberSelectFields = {
  id: true,
  projectId: true,
  userId: true,
  projectRole: true,
  addedById: true,
  createdAt: true,
  updatedAt: true,
} as const

// ============================================================
// SERVICE FUNCTIONS
// ============================================================

/**
 * Creates a project invitation.
 * Generates a random token with 7-day expiry.
 * If an invitation for the same email+project is already pending (not accepted, not expired),
 * the existing record is updated with a fresh token and expiry instead of inserting a duplicate.
 */
export async function createInvitation(
  projectId: string,
  email: string,
  projectRole: string,
  invitedById: string
): Promise<InvitationWithRelations> {
  // Verify the project exists
  const project = await prisma.project.findFirst({
    where: { id: projectId, isDeleted: false },
    select: { id: true, name: true, code: true },
  })
  if (!project) {
    throw new AppError('Project not found', 404)
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_MS)
  const normalizedEmail = email.toLowerCase()

  // Check for an existing pending invitation for the same email + project
  const existingInvitation = await prisma.projectInvitation.findFirst({
    where: {
      email: normalizedEmail,
      projectId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  })

  if (existingInvitation) {
    // Refresh the existing pending invitation with a new token and expiry
    const updated = await prisma.projectInvitation.update({
      where: { id: existingInvitation.id },
      data: { token, expiresAt, projectRole, invitedById },
      select: invitationWithRelationsSelect,
    })

    logger.info('Project invitation refreshed', {
      invitationId: existingInvitation.id,
      projectId,
      email: normalizedEmail,
      invitedById,
    })

    return updated as unknown as InvitationWithRelations
  }

  const created = await prisma.projectInvitation.create({
    data: {
      email: normalizedEmail,
      projectId,
      projectRole,
      invitedById,
      token,
      expiresAt,
    },
    select: invitationWithRelationsSelect,
  })

  logger.info('Project invitation created', {
    invitationId: created.id,
    projectId,
    email: normalizedEmail,
    projectRole,
    invitedById,
  })

  return created as unknown as InvitationWithRelations
}

/**
 * Validates an invitation token.
 * Returns null if the token does not exist, has already been accepted, or has expired.
 */
export async function validateInvitation(token: string): Promise<InvitationWithRelations | null> {
  const invitation = await prisma.projectInvitation.findFirst({
    where: {
      token,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: invitationWithRelationsSelect,
  })

  if (!invitation) {
    return null
  }

  return invitation as unknown as InvitationWithRelations
}

/**
 * Accepts an invitation.
 *
 * - If the email matches an existing active user → add them to the project as a ProjectMember.
 * - If the email has no existing account → create a new User with role='guest',
 *   isExternal=true, then add ProjectMember.
 * - Marks the invitation as accepted (sets acceptedAt).
 * - If the user is already a project member, the existing membership is returned as-is.
 *
 * @param token - The invitation token
 * @param userData - Required only when the email has no existing account
 */
export async function acceptInvitation(
  token: string,
  userData?: { firstName: string; lastName: string; password: string }
): Promise<{ user: UserWithoutPassword; projectMember: ProjectMemberRow }> {
  // Validate the token outside the transaction to surface early errors
  const invitation = await validateInvitation(token)
  if (!invitation) {
    throw new AppError('Invalid or expired invitation token', 400)
  }

  const result = await prisma.$transaction(async (tx) => {
    // Re-check inside the transaction to handle concurrent accepts safely
    const lockedInvitation = await tx.projectInvitation.findFirst({
      where: {
        token,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        projectId: true,
        projectRole: true,
        invitedById: true,
      },
    })

    if (!lockedInvitation) {
      throw new AppError('Invalid or expired invitation token', 400)
    }

    // Look up existing user by email (case-insensitive via normalized email)
    let user: UserRow | null = await tx.user.findFirst({
      where: { email: lockedInvitation.email, isDeleted: false },
      select: userSelectFields,
    }) as UserRow | null

    if (!user) {
      // New user — userData is required
      if (!userData?.firstName || !userData?.lastName || !userData?.password) {
        throw new AppError(
          'First name, last name, and password are required to create a new account',
          400
        )
      }

      const passwordHash = await bcrypt.hash(userData.password, BCRYPT_ROUNDS)

      user = await tx.user.create({
        data: {
          email: lockedInvitation.email,
          passwordHash,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: 'guest',
          isExternal: true,
          isActive: true,
        },
        select: userSelectFields,
      }) as UserRow

      logger.info('Guest user created from invitation', {
        userId: user.id,
        email: user.email,
        projectId: lockedInvitation.projectId,
      })
    }

    // Upsert project membership — handle already-member gracefully
    let projectMember: ProjectMemberRow | null = await tx.projectMember.findFirst({
      where: {
        projectId: lockedInvitation.projectId,
        userId: user.id,
      },
      select: projectMemberSelectFields,
    }) as ProjectMemberRow | null

    if (!projectMember) {
      projectMember = await tx.projectMember.create({
        data: {
          projectId: lockedInvitation.projectId,
          userId: user.id,
          projectRole: lockedInvitation.projectRole,
          addedById: lockedInvitation.invitedById,
        },
        select: projectMemberSelectFields,
      }) as ProjectMemberRow

      logger.info('User added to project via invitation', {
        userId: user.id,
        projectId: lockedInvitation.projectId,
        projectRole: lockedInvitation.projectRole,
      })
    }

    // Mark invitation as accepted
    await tx.projectInvitation.update({
      where: { id: lockedInvitation.id },
      data: { acceptedAt: new Date() },
    })

    return { user, projectMember }
  })

  const safeUser: UserWithoutPassword = {
    id: result.user.id,
    email: result.user.email,
    firstName: result.user.firstName,
    lastName: result.user.lastName,
    role: result.user.role,
    avatarUrl: result.user.avatarUrl,
    theme: (result.user.theme as Theme),
    isActive: result.user.isActive,
    createdAt: result.user.createdAt,
    lastLoginAt: result.user.lastLoginAt,
  }

  return {
    user: safeUser,
    projectMember: result.projectMember,
  }
}

/**
 * Lists pending (not accepted, not expired) invitations for a project.
 */
export async function listPendingInvitations(projectId: string): Promise<PendingInvitationRow[]> {
  const invitations = await prisma.projectInvitation.findMany({
    where: {
      projectId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: pendingInvitationSelect,
    orderBy: { createdAt: 'desc' },
  })

  return invitations as unknown as PendingInvitationRow[]
}

/**
 * Cancels (hard-deletes) an invitation by ID.
 * Throws 404 if the invitation does not exist.
 */
export async function cancelInvitation(invitationId: string): Promise<void> {
  const invitation = await prisma.projectInvitation.findFirst({
    where: { id: invitationId },
    select: { id: true, projectId: true, email: true },
  })

  if (!invitation) {
    throw new AppError('Invitation not found', 404)
  }

  await prisma.projectInvitation.delete({
    where: { id: invitationId },
  })

  logger.info('Project invitation cancelled', {
    invitationId,
    projectId: invitation.projectId,
    email: invitation.email,
  })
}

export const invitationService = {
  createInvitation,
  validateInvitation,
  acceptInvitation,
  listPendingInvitations,
  cancelInvitation,
}
