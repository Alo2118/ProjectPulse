/**
 * Escalation Action Executor - escalate
 * Notifies both the assignee and project owner with escalation-flagged notifications.
 * Works across all domains.
 * @module services/automation/actions/escalateAction
 */

import { logger } from '../../../utils/logger.js'
import { interpolateMessage } from '../interpolation.js'
import type { ActionExecutor } from '../types.js'

/**
 * Escalates an issue by notifying both the assignee and the project owner.
 * Creates notifications with escalation metadata for UI highlighting.
 * Params:
 *   - message: string (supports interpolation, default: 'Escalation automatica: {entity.title}')
 */
export const escalateAction: ActionExecutor = {
  type: 'escalate',
  domain: '*',

  async execute(action, event, context, _fireEvent) {
    // Build a default message template that works across domains
    const defaultMessage = context.task
      ? 'Escalation automatica: {task.title}'
      : context.risk
        ? 'Escalation automatica: {risk.title}'
        : context.document
          ? 'Escalation automatica: {document.title}'
          : context.project
            ? 'Escalation automatica: {project.name}'
            : 'Escalation automatica'

    const message = interpolateMessage(
      (action.params['message'] as string) || defaultMessage,
      context
    )

    const { notificationService } = await import('../../notificationService.js')

    const entityTitle = String(
      context.task?.title ??
        context.risk?.title ??
        context.document?.title ??
        context.project?.name ??
        'Entit\u00e0'
    )

    const notificationData = {
      entityId: event.entityId,
      domain: context.domain,
      escalation: true,
    }

    // Step 1: Notify assignee/owner immediately
    const assigneeId = context.assignee?.id
    if (assigneeId) {
      try {
        await notificationService.createNotification({
          userId: assigneeId,
          type: 'automation',
          title: `Escalation: ${entityTitle}`,
          message,
          data: notificationData,
        })
        logger.debug('Escalation notification sent to assignee', {
          assigneeId,
          entityId: event.entityId,
        })
      } catch (err) {
        logger.warn('escalate: failed to notify assignee', {
          assigneeId,
          error: err,
        })
      }
    }

    // Step 2: Notify project owner (if different from assignee)
    const ownerId = context.projectOwner?.id
    if (ownerId && ownerId !== assigneeId) {
      try {
        await notificationService.createNotification({
          userId: ownerId,
          type: 'automation',
          title: `Escalation: ${entityTitle}`,
          message: `[Escalation] ${message}`,
          data: notificationData,
        })
        logger.debug('Escalation notification sent to project owner', {
          ownerId,
          entityId: event.entityId,
        })
      } catch (err) {
        logger.warn('escalate: failed to notify project owner', {
          ownerId,
          error: err,
        })
      }
    }

    logger.info('Automation V2 escalation executed', {
      entityId: event.entityId,
      domain: context.domain,
      assigneeNotified: !!assigneeId,
      ownerNotified: ownerId ? ownerId !== assigneeId : false,
    })
  },
}

/** All escalation action executors for bulk registration */
export const allEscalateActions: ActionExecutor[] = [escalateAction]
