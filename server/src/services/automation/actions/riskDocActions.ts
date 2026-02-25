/**
 * Risk & Document Action Executors - set_risk_field, set_document_field
 * Handles field updates on risk and document entities.
 * Uses domain services for status changes to enforce workflow rules.
 * @module services/automation/actions/riskDocActions
 */

import { logger } from '../../../utils/logger.js'
import type { RiskStatus, DocumentStatus } from '../../../types/index.js'
import type { ActionExecutor } from '../types.js'

/** Allowlist of risk fields that can be set by automation */
const RISK_ALLOWED_FIELDS = new Set(['status', 'probability', 'impact', 'category'])

/** Allowlist of document fields that can be set by automation */
const DOCUMENT_ALLOWED_FIELDS = new Set(['status', 'type'])

/**
 * Sets a field on a risk entity.
 * For 'status' changes, delegates to riskService.changeRiskStatus() for validation.
 * Params: { field: string, value: unknown }
 */
export const setRiskFieldAction: ActionExecutor = {
  type: 'set_risk_field',
  domain: 'risk',

  async execute(action, event, _context, _fireEvent) {
    const field = action.params['field'] as string
    const value = action.params['value']

    if (!field || !RISK_ALLOWED_FIELDS.has(field)) {
      logger.warn('set_risk_field: field not allowed or missing', {
        field,
        entityId: event.entityId,
      })
      return
    }

    // For status changes, use riskService for validation
    if (field === 'status') {
      try {
        const riskService = await import('../../riskService.js')
        await riskService.changeRiskStatus(event.entityId, value as RiskStatus, event.userId)
        logger.info('Automation V2 changed risk status', {
          entityId: event.entityId,
          newStatus: value,
        })
      } catch (err) {
        logger.warn('set_risk_field: status change rejected', {
          entityId: event.entityId,
          newStatus: value,
          error: err instanceof Error ? err.message : String(err),
        })
      }
      return
    }

    try {
      const { prisma } = await import('../../../models/prismaClient.js')
      await prisma.risk.update({
        where: { id: event.entityId },
        data: { [field]: value },
      })
      logger.info('Automation V2 set risk field', {
        entityId: event.entityId,
        field,
        value,
      })
    } catch (err) {
      logger.error('set_risk_field: update failed', {
        entityId: event.entityId,
        field,
        value,
        error: err,
      })
    }
  },
}

/**
 * Sets a field on a document entity.
 * For 'status' changes, delegates to documentService.changeDocumentStatus() for workflow validation.
 * Params: { field: string, value: unknown }
 */
export const setDocumentFieldAction: ActionExecutor = {
  type: 'set_document_field',
  domain: 'document',

  async execute(action, event, _context, _fireEvent) {
    const field = action.params['field'] as string
    const value = action.params['value']

    if (!field || !DOCUMENT_ALLOWED_FIELDS.has(field)) {
      logger.warn('set_document_field: field not allowed or missing', {
        field,
        entityId: event.entityId,
      })
      return
    }

    // For status changes, use documentService for workflow validation
    if (field === 'status') {
      try {
        const documentService = await import('../../documentService.js')
        await documentService.changeDocumentStatus(
          event.entityId,
          value as DocumentStatus,
          event.userId
        )
        logger.info('Automation V2 changed document status', {
          entityId: event.entityId,
          newStatus: value,
        })
      } catch (err) {
        logger.warn('set_document_field: status change rejected', {
          entityId: event.entityId,
          newStatus: value,
          error: err instanceof Error ? err.message : String(err),
        })
      }
      return
    }

    try {
      const { prisma } = await import('../../../models/prismaClient.js')
      await prisma.document.update({
        where: { id: event.entityId },
        data: { [field]: value },
      })
      logger.info('Automation V2 set document field', {
        entityId: event.entityId,
        field,
        value,
      })
    } catch (err) {
      logger.error('set_document_field: update failed', {
        entityId: event.entityId,
        field,
        value,
        error: err,
      })
    }
  },
}

/** All risk/document action executors for bulk registration */
export const allRiskDocActions: ActionExecutor[] = [setRiskFieldAction, setDocumentFieldAction]
