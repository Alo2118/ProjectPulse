/**
 * Document Trigger Handlers
 * Each handler validates whether an incoming event matches
 * the trigger configuration stored on the automation rule.
 * @module services/automation/triggers/documentTriggers
 */

import type { TriggerHandler } from '../types.js'

/**
 * Fires when a new document is created.
 * Optional params: type (document type filter).
 */
export const documentCreatedTrigger: TriggerHandler = {
  type: 'document_created',
  domain: 'document',

  matches(config, event, _context) {
    if (config.type !== event.type) return false

    if (config.params['type'] && event.data['documentType'] !== config.params['type']) {
      return false
    }

    return true
  },
}

/**
 * Fires when a document's status changes.
 * Optional params: fromStatus, toStatus.
 */
export const documentStatusChangedTrigger: TriggerHandler = {
  type: 'document_status_changed',
  domain: 'document',

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
 * Fires when a document review is approaching its due date.
 * Optional params: daysBeforeExpiry (matches exact window).
 */
export const documentReviewDueTrigger: TriggerHandler = {
  type: 'document_review_due',
  domain: 'document',

  matches(config, event, _context) {
    if (config.type !== event.type) return false

    if (
      config.params['daysBeforeExpiry'] !== undefined &&
      event.data['daysBeforeExpiry'] !== config.params['daysBeforeExpiry']
    ) {
      return false
    }

    return true
  },
}

/** All document trigger handlers for bulk registration */
export const allDocumentTriggers: TriggerHandler[] = [
  documentCreatedTrigger,
  documentStatusChangedTrigger,
  documentReviewDueTrigger,
]
