/**
 * Notification Action Executors - Ported from V1 automationEngine.ts
 * Handles notify_user, notify_assignee, notify_project_owner actions.
 * @module services/automation/actions/notifyActions
 */

import { logger } from '../../../utils/logger.js'
import { notificationService } from '../../notificationService.js'
import { interpolateMessage } from '../interpolation.js'
import type { ActionExecutor, ActionConfig, TriggerEvent, AutomationContext } from '../types.js'

/**
 * Builds the notification message, interpolating template variables.
 * Falls back to a default message if none is provided.
 */
function buildNotificationMessage(
  action: ActionConfig,
  context: AutomationContext
): string {
  const customMessage = action.params['message'] as string | undefined
  if (customMessage) {
    return interpolateMessage(customMessage, context)
  }

  // Build a sensible default based on domain
  const entityLabel = getEntityLabel(context)
  return `Automation triggered on ${entityLabel}`
}

/**
 * Returns a human-readable label for the entity in context.
 */
function getEntityLabel(context: AutomationContext): string {
  if (context.task) {
    return `task "${context.task.code} - ${context.task.title}"`
  }
  if (context.risk) {
    return `risk "${context.risk.code} - ${context.risk.title}"`
  }
  if (context.document) {
    return `document "${context.document.code} - ${context.document.title}"`
  }
  if (context.project) {
    return `project "${context.project.code} - ${context.project.name}"`
  }
  return `entity ${context.entityId}`
}

/**
 * Sends an automation notification to a specific user.
 * Does not throw - notification failure should not abort the pipeline.
 */
async function sendAutomationNotification(
  userId: string,
  event: TriggerEvent,
  context: AutomationContext,
  message: string
): Promise<void> {
  try {
    const data: Record<string, unknown> = {
      entityId: context.entityId,
      domain: context.domain,
      triggerType: event.type,
    }

    // Add domain-specific data for notification routing
    if (context.task) {
      data['taskId'] = context.task.id
      data['taskCode'] = context.task.code
      data['taskTitle'] = context.task.title
    }
    if (context.risk) {
      data['riskId'] = context.risk.id
      data['riskCode'] = context.risk.code
    }
    if (context.document) {
      data['documentId'] = context.document.id
      data['documentCode'] = context.document.code
    }
    if (context.project) {
      data['projectId'] = context.project.id
      data['projectCode'] = context.project.code
    }

    await notificationService.createNotification({
      userId,
      type: 'automation',
      title: 'Automation Rule Triggered',
      message,
      data,
    })

    logger.debug('Automation notification created', { userId, entityId: context.entityId })
  } catch (err) {
    logger.warn('Failed to create automation notification', {
      userId,
      entityId: context.entityId,
      error: err,
    })
  }
}

// ============================================================
// ACTION EXECUTORS
// ============================================================

/**
 * Notifies a specific user by ID.
 * Params: { userId: string, message?: string }
 */
export const notifyUserAction: ActionExecutor = {
  type: 'notify_user',
  domain: '*',

  async execute(config, event, context, _fireEvent) {
    const targetUserId = config.params['userId'] as string | undefined
    if (!targetUserId) {
      logger.warn('notify_user action missing userId param', { event: event.type })
      return
    }

    const message = buildNotificationMessage(config, context)
    await sendAutomationNotification(targetUserId, event, context, message)
  },
}

/**
 * Notifies the assignee (task) / owner (risk) / creator (document).
 * Params: { message?: string }
 */
export const notifyAssigneeAction: ActionExecutor = {
  type: 'notify_assignee',
  domain: '*',

  async execute(config, event, context, _fireEvent) {
    const assigneeId = context.assignee?.id
    if (!assigneeId) {
      logger.debug('notify_assignee skipped: no assignee in context', {
        entityId: context.entityId,
        domain: context.domain,
      })
      return
    }

    const message = buildNotificationMessage(config, context)
    await sendAutomationNotification(assigneeId, event, context, message)
  },
}

/**
 * Notifies the project owner.
 * Params: { message?: string }
 */
export const notifyProjectOwnerAction: ActionExecutor = {
  type: 'notify_project_owner',
  domain: '*',

  async execute(config, event, context, _fireEvent) {
    const ownerId = context.projectOwner?.id
    if (!ownerId) {
      logger.debug('notify_project_owner skipped: no project owner in context', {
        entityId: context.entityId,
        domain: context.domain,
      })
      return
    }

    const message = buildNotificationMessage(config, context)
    await sendAutomationNotification(ownerId, event, context, message)
  },
}

/** All notification action executors for bulk registration */
export const allNotifyActions: ActionExecutor[] = [
  notifyUserAction,
  notifyAssigneeAction,
  notifyProjectOwnerAction,
]
