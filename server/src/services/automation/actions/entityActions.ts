/**
 * Entity Action Executors - set_due_date, create_subtask
 * These actions modify task entities directly.
 * @module services/automation/actions/entityActions
 */

import { prisma } from '../../../models/prismaClient.js'
import { logger } from '../../../utils/logger.js'
import { interpolateMessage } from '../interpolation.js'
import type { ActionExecutor } from '../types.js'

/**
 * Sets or shifts a due date on a task.
 * Params:
 *   - mode: 'absolute' | 'relative' (default: 'relative')
 *   - value: ISO date string (absolute) or number of days from now (relative, default: 7)
 */
export const setDueDateAction: ActionExecutor = {
  type: 'set_due_date',
  domain: 'task',

  async execute(action, event, _context, _fireEvent) {
    const mode = (action.params['mode'] as string) || 'relative'
    const value = action.params['value']

    let newDate: Date
    if (mode === 'absolute') {
      newDate = new Date(value as string)
      if (isNaN(newDate.getTime())) {
        logger.warn('set_due_date: invalid absolute date', {
          value,
          entityId: event.entityId,
        })
        return
      }
    } else {
      // Relative: add N days from now
      const days = Number(value ?? 7)
      if (isNaN(days)) {
        logger.warn('set_due_date: invalid relative days value', {
          value,
          entityId: event.entityId,
        })
        return
      }
      newDate = new Date(Date.now() + days * 86400000)
    }

    await prisma.task.update({
      where: { id: event.entityId },
      data: { dueDate: newDate },
    })

    logger.info('Automation V2 set due date', {
      entityId: event.entityId,
      mode,
      newDate: newDate.toISOString(),
    })
  },
}

/**
 * Creates a subtask under the current task.
 * Params:
 *   - title: string (supports interpolation, default: 'Subtask automatico')
 *   - assigneeId?: string (default: inherits from parent task)
 */
export const createSubtaskAction: ActionExecutor = {
  type: 'create_subtask',
  domain: 'task',

  async execute(action, event, context, _fireEvent) {
    const title = interpolateMessage(
      (action.params['title'] as string) || 'Subtask automatico',
      context
    )
    const assigneeId =
      (action.params['assigneeId'] as string) || context.task?.assigneeId || null

    // Generate a code for the subtask based on parent code
    const count = await prisma.task.count({
      where: { parentTaskId: event.entityId },
    })
    const parentCode = context.task?.code ?? 'TASK'
    const code = `${parentCode}-S${count + 1}`

    // Determine the createdBy user
    const createdById =
      event.userId !== 'system'
        ? event.userId
        : context.task?.assigneeId ?? context.assignee?.id ?? event.userId

    await prisma.task.create({
      data: {
        code,
        title,
        taskType: 'subtask',
        status: 'todo',
        priority: context.task?.priority ?? 'medium',
        parentTaskId: event.entityId,
        projectId: context.projectId,
        assigneeId,
        createdById,
      },
    })

    logger.info('Automation V2 created subtask', {
      parentTaskId: event.entityId,
      code,
      title,
      assigneeId,
    })
  },
}

/** All entity action executors for bulk registration */
export const allEntityActions: ActionExecutor[] = [setDueDateAction, createSubtaskAction]
