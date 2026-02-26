/**
 * Task Ownership Helper - Centralized authorization check for task ownership
 * @module utils/taskOwnership
 */

import { prisma } from '../models/prismaClient.js'
import { AppError } from '../middleware/errorMiddleware.js'
import { getProjectRole } from '../services/permissionService.js'

/**
 * Asserts that the current user can modify a task.
 * Admin and direzione bypass.
 * For others: check if user has 'edit_any_task' capability on the project,
 * or if they are the creator/assignee (which needs 'edit_own_task' capability).
 *
 * @throws AppError 404 if task not found
 * @throws AppError 403 if user lacks permission to modify the task
 */
export async function assertTaskOwnership(
  taskId: string,
  userId: string,
  userRole: string | undefined
): Promise<void> {
  if (userRole === 'admin' || userRole === 'direzione') {
    return
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, isDeleted: false },
    select: { createdById: true, assigneeId: true, projectId: true },
  })

  if (!task) {
    throw new AppError('Task not found', 404)
  }

  // If task has a project, check project-level permissions
  if (task.projectId) {
    const projectRole = await getProjectRole(userId, task.projectId)

    if (!projectRole) {
      throw new AppError('Non hai i permessi per questa operazione', 403)
    }

    // owners and managers can edit any task in the project
    if (projectRole === 'owner' || projectRole === 'manager') return

    // members can edit their own/assigned tasks
    if (projectRole === 'member') {
      if (task.createdById === userId || task.assigneeId === userId) return
      throw new AppError('Non hai i permessi per questa operazione', 403)
    }

    // viewers and guests cannot edit tasks
    throw new AppError('Non hai i permessi per questa operazione', 403)
  }

  // Standalone task (no project): only creator or assignee
  if (task.createdById !== userId && task.assigneeId !== userId) {
    throw new AppError('Non hai i permessi per questa operazione', 403)
  }
}
