/**
 * Permission Service - Granular permission management for ProjectPulse (Feature 4.1)
 * Handles project-level roles, capability checks, and ProjectMember CRUD.
 * @module services/permissionService
 */

import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import { AppError } from '../middleware/errorMiddleware.js'
import { auditService } from './auditService.js'
import { EntityType } from '../types/index.js'

// ============================================================
// TYPES
// ============================================================

export type ProjectRole = 'owner' | 'manager' | 'member' | 'viewer' | 'guest'

export type ProjectCapability =
  | 'view_project'
  | 'edit_project'
  | 'delete_project'
  | 'manage_members'
  | 'create_task'
  | 'edit_any_task'
  | 'edit_own_task'
  | 'view_tasks'
  | 'manage_risks'
  | 'view_risks'
  | 'configure_workflow'
  | 'view_analytics'

export interface ProjectMemberWithUser {
  id: string
  projectId: string
  userId: string
  projectRole: string
  addedById: string
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    avatarUrl: string | null
    role: string
    isActive: boolean
  }
  addedBy: {
    id: string
    firstName: string
    lastName: string
  }
}

// ============================================================
// CAPABILITY MATRIX
// ============================================================

const CAPABILITIES: Record<ProjectRole, ProjectCapability[]> = {
  owner: [
    'view_project',
    'edit_project',
    'delete_project',
    'manage_members',
    'create_task',
    'edit_any_task',
    'edit_own_task',
    'view_tasks',
    'manage_risks',
    'view_risks',
    'configure_workflow',
    'view_analytics',
  ],
  manager: [
    'view_project',
    'edit_project',
    'manage_members',
    'create_task',
    'edit_any_task',
    'edit_own_task',
    'view_tasks',
    'manage_risks',
    'view_risks',
    'configure_workflow',
    'view_analytics',
  ],
  member: [
    'view_project',
    'create_task',
    'edit_own_task',
    'view_tasks',
    'view_risks',
    'view_analytics',
  ],
  viewer: [
    'view_project',
    'view_tasks',
    'view_risks',
    'view_analytics',
  ],
  guest: [
    'view_project',
  ],
}

// ============================================================
// SELECT SHAPES
// ============================================================

const memberSelectFields = {
  id: true,
  projectId: true,
  userId: true,
  projectRole: true,
  addedById: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatarUrl: true,
      role: true,
      isActive: true,
    },
  },
  addedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
}

// ============================================================
// ROLE RESOLUTION
// ============================================================

/**
 * Resolve the effective project role for a user.
 * Priority: explicit ProjectMember row > Project.ownerId fallback.
 * Returns null if user has no access.
 */
export async function getProjectRole(
  userId: string,
  projectId: string
): Promise<ProjectRole | null> {
  // Check explicit member row first
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { projectRole: true },
  })

  if (member) {
    return member.projectRole as ProjectRole
  }

  // Fallback: check if user is the project owner
  const project = await prisma.project.findFirst({
    where: { id: projectId, isDeleted: false },
    select: { ownerId: true },
  })

  if (project && project.ownerId === userId) {
    return 'owner'
  }

  return null
}

// ============================================================
// CAPABILITY ASSERTION
// ============================================================

/**
 * Assert that a user has a specific capability on a project.
 * - admin: always passes
 * - direzione: passes for everything except delete_project
 * - dipendente/guest: resolved via project role + capability matrix
 * Throws AppError(403) on insufficient permissions.
 */
export async function assertProjectCapability(
  userId: string,
  userSystemRole: string,
  projectId: string,
  capability: ProjectCapability
): Promise<void> {
  // Admin bypasses all checks
  if (userSystemRole === 'admin') {
    return
  }

  // Direzione can do everything except delete_project
  if (userSystemRole === 'direzione') {
    if (capability === 'delete_project') {
      throw new AppError('Non hai i permessi per questa operazione', 403)
    }
    return
  }

  // All other system roles: resolve project role and check capability matrix
  const projectRole = await getProjectRole(userId, projectId)

  if (!projectRole) {
    throw new AppError('Non hai i permessi per questa operazione', 403)
  }

  const allowedCapabilities = CAPABILITIES[projectRole]
  if (!allowedCapabilities.includes(capability)) {
    throw new AppError('Non hai i permessi per questa operazione', 403)
  }
}

// ============================================================
// ACCESSIBLE PROJECT IDS
// ============================================================

/**
 * Get all project IDs accessible to a user.
 * - admin / direzione: all non-deleted projects
 * - Others: only projects where they have a ProjectMember row or are the owner
 */
export async function getAccessibleProjectIds(
  userId: string,
  userSystemRole: string
): Promise<string[]> {
  if (userSystemRole === 'admin' || userSystemRole === 'direzione') {
    const projects = await prisma.project.findMany({
      where: { isDeleted: false },
      select: { id: true },
    })
    return projects.map((p) => p.id)
  }

  // Projects where user is an explicit member
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  })
  const memberProjectIds = memberships.map((m) => m.projectId)

  // Projects where user is the owner but may not have a member row
  const ownedProjects = await prisma.project.findMany({
    where: {
      ownerId: userId,
      isDeleted: false,
    },
    select: { id: true },
  })
  const ownedProjectIds = ownedProjects.map((p) => p.id)

  // Union of both sets (deduplicated)
  const allIds = new Set([...memberProjectIds, ...ownedProjectIds])
  return Array.from(allIds)
}

// ============================================================
// PROJECT MEMBER CRUD
// ============================================================

/**
 * Get all members of a project, including their user details.
 */
export async function getProjectMembers(
  projectId: string
): Promise<ProjectMemberWithUser[]> {
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    select: memberSelectFields,
    orderBy: [
      { projectRole: 'asc' },
      { createdAt: 'asc' },
    ],
  })

  return members as unknown as ProjectMemberWithUser[]
}

/**
 * Add a user to a project with the given role.
 * Throws if the user is already a member.
 */
export async function addProjectMember(
  projectId: string,
  userId: string,
  projectRole: ProjectRole,
  addedById: string
) {
  // Verify project exists
  const project = await prisma.project.findFirst({
    where: { id: projectId, isDeleted: false },
    select: { id: true },
  })
  if (!project) {
    throw new AppError('Progetto non trovato', 404)
  }

  // Verify target user exists and is active
  const user = await prisma.user.findFirst({
    where: { id: userId, isDeleted: false, isActive: true },
    select: { id: true },
  })
  if (!user) {
    throw new AppError('Utente non trovato', 404)
  }

  // Check for existing membership
  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { id: true },
  })
  if (existing) {
    throw new AppError("L'utente è già membro di questo progetto", 409)
  }

  const member = await prisma.$transaction(async (tx) => {
    const created = await tx.projectMember.create({
      data: {
        projectId,
        userId,
        projectRole,
        addedById,
      },
      select: memberSelectFields,
    })

    await auditService.logCreate(
      EntityType.PROJECT_MEMBER,
      created.id,
      addedById,
      { projectId, userId, projectRole },
      tx
    )

    return created
  })

  logger.info('Project member added', {
    projectId,
    userId,
    projectRole,
    addedById,
  })

  return member
}

/**
 * Update the project role of an existing member.
 */
export async function updateProjectMember(
  memberId: string,
  projectRole: ProjectRole,
  updatedById: string
) {
  const existing = await prisma.projectMember.findUnique({
    where: { id: memberId },
    select: { id: true, projectId: true, userId: true, projectRole: true },
  })
  if (!existing) {
    throw new AppError('Membro non trovato', 404)
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.projectMember.update({
      where: { id: memberId },
      data: { projectRole },
      select: memberSelectFields,
    })

    await auditService.logUpdate(
      EntityType.PROJECT_MEMBER,
      memberId,
      updatedById,
      { projectRole: existing.projectRole },
      { projectRole },
      tx
    )

    return result
  })

  logger.info('Project member updated', { memberId, projectRole, updatedById })

  return updated
}

/**
 * Remove a member from a project (hard delete — no soft delete for memberships).
 */
export async function removeProjectMember(
  memberId: string,
  removedById: string
): Promise<void> {
  const existing = await prisma.projectMember.findUnique({
    where: { id: memberId },
    select: { id: true, projectId: true, userId: true, projectRole: true },
  })
  if (!existing) {
    throw new AppError('Membro non trovato', 404)
  }

  await prisma.$transaction(async (tx) => {
    await tx.projectMember.delete({ where: { id: memberId } })

    await auditService.logDelete(
      EntityType.PROJECT_MEMBER,
      memberId,
      removedById,
      {
        projectId: existing.projectId,
        userId: existing.userId,
        projectRole: existing.projectRole,
      },
      tx
    )
  })

  logger.info('Project member removed', { memberId, removedById })
}
