/**
 * Risk Trigger Handlers
 * Each handler validates whether an incoming event matches
 * the trigger configuration stored on the automation rule.
 * @module services/automation/triggers/riskTriggers
 */

import type { TriggerHandler } from '../types.js'

/**
 * Fires when a new risk is created.
 * Optional params: severity (matches calculated risk level label).
 */
export const riskCreatedTrigger: TriggerHandler = {
  type: 'risk_created',
  domain: 'risk',

  matches(config, event, _context) {
    if (config.type !== event.type) return false

    if (config.params['severity'] && event.data['severity'] !== config.params['severity']) {
      return false
    }

    return true
  },
}

/**
 * Fires when a risk's status changes.
 * Optional params: fromStatus, toStatus.
 */
export const riskStatusChangedTrigger: TriggerHandler = {
  type: 'risk_status_changed',
  domain: 'risk',

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
 * Fires when a risk's severity level changes (probability or impact changed).
 * Optional params: fromLevel, toLevel.
 */
export const riskLevelChangedTrigger: TriggerHandler = {
  type: 'risk_level_changed',
  domain: 'risk',

  matches(config, event, _context) {
    if (config.type !== event.type) return false

    if (config.params['fromLevel'] && event.data['fromLevel'] !== config.params['fromLevel']) {
      return false
    }
    if (config.params['toLevel'] && event.data['toLevel'] !== config.params['toLevel']) {
      return false
    }

    return true
  },
}

/** All risk trigger handlers for bulk registration */
export const allRiskTriggers: TriggerHandler[] = [
  riskCreatedTrigger,
  riskStatusChangedTrigger,
  riskLevelChangedTrigger,
]
