/**
 * Task Action Executors - Ported from V1 automationEngine.ts
 * Handles update_parent_status, set_task_field, create_comment, assign_to_user.
 *
 * CRITICAL: set_task_field and update_parent_status use taskService.changeTaskStatus()
 * instead of direct Prisma updates when the field is 'status', to enforce workflow rules.
 * assign_to_user and update_parent_status re-fire evaluateRules() for chaining.
 *
 * taskService is imported dynamically to avoid circular dependencies.
 *
 * @module services/automation/actions/taskActions
 */

import { prisma } from '../../../models/prismaClient.js'
import { logger } from '../../../utils/logger.js'
import { interpolateMessage } from '../interpolation.js'
import type { ActionExecutor, TriggerEvent, AutomationContext } from '../types.js'

/** Allowlist of safe, non-relational task fields that can be set by automation */
const ALLOWED_SET_FIELDS = new Set([
  'status',
  'priority',
  'title',
  'description',
  'blockedReason',
  'estimatedHours',
  'actualHours',
])

// ============================================================
// ACTION EXECUTORS
// ============================================================

/**
 * Updates the parent task's status when triggered by a child task event.
 * Uses taskService.changeTaskStatus() for workflow enforcement.
 * Re-fires evaluateRules() with depth + 1 for chaining.
 * Params: { status: string }
 */
export const updateParentStatusAction: ActionExecutor = {
  type: 'update_parent_status',
  domain: 'task',

  async execute(config, event, context, fireEvent) {
    const parentTaskId = context.task?.parentTaskId
    if (!parentTaskId) {
      logger.debug('update_parent_status skipped: task has no parent', {
        entityId: context.entityId,
      })
      return
    }

    const newStatus = config.params['status'] as string | undefined
    if (!newStatus) {
      logger.warn('update_parent_status action missing status param', {
        entityId: context.entityId,
      })
      return
    }

    // Fetch parent's current state
    const parent = await prisma.task.findFirst({
      where: { id: parentTaskId, isDeleted: false },
      select: {
        id: true,
        code: true,
        title: true,
        taskType: true,
        status: true,
        priority: true,
        assigneeId: true,
        parentTaskId: true,
        projectId: true,
        departmentId: true,
        dueDate: true,
      },
    })

    if (!parent) {
      logger.warn('update_parent_status: parent task not found', { parentTaskId })
      return
    }

    const oldParentStatus = parent.status

    // Use taskService.changeTaskStatus() for workflow enforcement
    const taskService = await import('../../taskService.js')
    try {
      await taskService.changeTaskStatus(
        parentTaskId,
        newStatus as Parameters<typeof taskService.changeTaskStatus>[1],
        event.userId !== 'system' ? event.userId : context.assignee?.id ?? 'system'
      )
    } catch (err) {
      // If workflow rejects the transition, log and return (don't throw)
      logger.warn('update_parent_status: status change rejected', {
        parentTaskId,
        oldStatus: oldParentStatus,
        newStatus,
        error: err instanceof Error ? err.message : String(err),
      })
      return
    }

    logger.info('Automation V2 updated parent task status', {
      parentTaskId,
      oldStatus: oldParentStatus,
      newStatus,
      triggeredBy: context.entityId,
    })

    // Fire a new event for the parent (chaining)
    const parentEvent: TriggerEvent = {
      domain: 'task',
      type: 'task_status_changed',
      entityId: parentTaskId,
      projectId: parent.projectId,
      userId: 'system',
      data: {
        oldStatus: oldParentStatus,
        newStatus,
      },
    }
    await fireEvent(parentEvent)
  },
}

/**
 * Sets a field on the current task.
 * When field is 'status', uses taskService.changeTaskStatus() instead of direct update.
 * Params: { field: string, value?: string }
 */
export const setTaskFieldAction: ActionExecutor = {
  type: 'set_task_field',
  domain: 'task',

  async execute(config, event, context, _fireEvent) {
    const field = config.params['field'] as string | undefined
    const value = config.params['value'] as string | undefined

    if (!field) {
      logger.warn('set_task_field action missing field param', { entityId: context.entityId })
      return
    }

    if (!ALLOWED_SET_FIELDS.has(field)) {
      logger.warn('set_task_field: field not in allowlist', {
        field,
        entityId: context.entityId,
      })
      return
    }

    // For status changes, use taskService.changeTaskStatus() (workflow enforcement)
    if (field === 'status' && value) {
      const taskService = await import('../../taskService.js')
      try {
        await taskService.changeTaskStatus(
          context.entityId,
          value as Parameters<typeof taskService.changeTaskStatus>[1],
          event.userId !== 'system' ? event.userId : context.assignee?.id ?? 'system'
        )
      } catch (err) {
        logger.warn('set_task_field: status change rejected by workflow', {
          entityId: context.entityId,
          newStatus: value,
          error: err instanceof Error ? err.message : String(err),
        })
        return
      }
    } else {
      await prisma.task.update({
        where: { id: context.entityId },
        data: { [field]: value ?? null },
      })
    }

    logger.info('Automation V2 set task field', {
      entityId: context.entityId,
      field,
      value,
    })
  },
}

/**
 * Creates a comment on the current task.
 * Params: { message: string }
 */
export const createCommentAction: ActionExecutor = {
  type: 'create_comment',
  domain: 'task',

  async execute(config, event, context, _fireEvent) {
    const rawMessage = config.params['message'] as string | undefined
    if (!rawMessage) {
      logger.warn('create_comment action missing message param', { entityId: context.entityId })
      return
    }

    const message = interpolateMessage(rawMessage, context)

    // Use event userId for the comment; fall back to finding a system/admin user
    let commentUserId = event.userId !== 'system' ? event.userId : null

    if (!commentUserId) {
      const adminUser = await prisma.user.findFirst({
        where: { role: 'admin', isDeleted: false, isActive: true },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      })
      commentUserId = adminUser?.id ?? null
    }

    if (!commentUserId) {
      logger.warn('create_comment: no suitable user found to author comment', {
        entityId: context.entityId,
      })
      return
    }

    await prisma.comment.create({
      data: {
        taskId: context.entityId,
        userId: commentUserId,
        content: message,
        isInternal: false,
      },
    })

    logger.info('Automation V2 created comment on task', {
      entityId: context.entityId,
      userId: commentUserId,
    })
  },
}

/**
 * Assigns the task to a specific user.
 * Re-fires evaluateRules() with depth + 1 for chaining (task_assigned trigger).
 * Params: { userId: string }
 */
export const assignToUserAction: ActionExecutor = {
  type: 'assign_to_user',
  domain: 'task',

  async execute(config, event, context, fireEvent) {
    const targetUserId = config.params['userId'] as string | undefined
    if (!targetUserId) {
      logger.warn('assign_to_user action missing userId param', { entityId: context.entityId })
      return
    }

    const oldAssigneeId = context.task?.assigneeId ?? null

    await prisma.task.update({
      where: { id: context.entityId },
      data: { assigneeId: targetUserId },
    })

    logger.info('Automation V2 assigned task to user', {
      entityId: context.entityId,
      assigneeId: targetUserId,
    })

    // Fire a task_assigned event for chaining
    const assignedEvent: TriggerEvent = {
      domain: 'task',
      type: 'task_assigned',
      entityId: context.entityId,
      projectId: context.projectId,
      userId: 'system',
      data: {
        oldAssigneeId,
        newAssigneeId: targetUserId,
      },
    }
    await fireEvent(assignedEvent)
  },
}

/** All task action executors for bulk registration */
export const allTaskActions: ActionExecutor[] = [
  updateParentStatusAction,
  setTaskFieldAction,
  createCommentAction,
  assignToUserAction,
]
