/**
 * Project Ownership Helper - Centralized authorization check for project ownership
 * @module utils/projectOwnership
 */

import { prisma } from '../models/prismaClient.js'
import { AppError } from '../middleware/errorMiddleware.js'

/**
 * Asserts that the current user has ownership of a project.
 * Admin and direzione roles bypass this check.
 * Dipendente must be the project owner.
 *
 * @throws AppError 404 if project not found
 * @throws AppError 403 if dipendente lacks ownership
 */
export async function assertProjectOwnership(
  projectId: string,
  userId: string,
  userRole: string | undefined
): Promise<void> {
  if (userRole === 'admin' || userRole === 'direzione') {
    return
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, isDeleted: false },
    select: { ownerId: true },
  })

  if (!project) {
    throw new AppError('Project not found', 404)
  }

  if (project.ownerId !== userId) {
    throw new AppError('Non hai i permessi per questa operazione', 403)
  }
}
