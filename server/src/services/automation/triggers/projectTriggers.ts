/**
 * Project Trigger Handlers
 * Each handler validates whether an incoming event matches
 * the trigger configuration stored on the automation rule.
 * @module services/automation/triggers/projectTriggers
 */

import type { TriggerHandler } from '../types.js'

/**
 * Fires when a project's status changes.
 * Optional params: fromStatus, toStatus.
 */
export const projectStatusChangedTrigger: TriggerHandler = {
  type: 'project_status_changed',
  domain: 'project',

  matches(config, event, _context) {
    if (config.type !== event.type) return false

    if (config.params['fromStatus'] && event.data['oldStatus'] !== config.params['fromStatus']) {
      return false
    }
    if (config.params['toStatus'] && event.data['newStatus'] !== config.params['toStatus']) {
      return false
    }

    return true
  },
}

/**
 * Fires when a project deadline is approaching.
 * Optional params: daysBeforeDeadline (matches exact window).
 * Triggered by the scheduler.
 */
export const projectDeadlineApproachingTrigger: TriggerHandler = {
  type: 'project_deadline_approaching',
  domain: 'project',

  matches(config, event, _context) {
    if (config.type !== event.type) return false

    if (
      config.params['daysBeforeDeadline'] !== undefined &&
      config.params['daysBeforeDeadline'] !== event.data['daysBeforeDeadline']
    ) {
      return false
    }

    return true
  },
}

/** All project trigger handlers for bulk registration */
export const allProjectTriggers: TriggerHandler[] = [
  projectStatusChangedTrigger,
  projectDeadlineApproachingTrigger,
]
