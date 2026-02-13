/**
 * Task Ownership Helper - Centralized authorization check for task ownership
 * @module utils/taskOwnership
 */

import { taskService } from '../services/taskService.js'
import { AppError } from '../middleware/errorMiddleware.js'

/**
 * Asserts that the current user has ownership of a task.
 * Admin and direzione roles bypass this check.
 * Dipendente must be the creator or assignee of the task.
 *
 * @throws AppError 404 if task not found
 * @throws AppError 403 if dipendente lacks ownership
 */
export async function assertTaskOwnership(
  taskId: string,
  userId: string,
  userRole: string | undefined
): Promise<void> {
  if (userRole === 'admin' || userRole === 'direzione') {
    return
  }

  const task = await taskService.getTaskById(taskId)
  if (!task) {
    throw new AppError('Task not found', 404)
  }
  if (task.createdById !== userId && task.assigneeId !== userId) {
    throw new AppError('Non hai i permessi per questa operazione', 403)
  }
}
