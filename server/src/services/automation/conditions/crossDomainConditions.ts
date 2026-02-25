/**
 * Cross-Domain Condition Evaluators
 * Evaluators that work across multiple domains (task, risk, document, project)
 * or check properties specific to risk/document contexts.
 * @module services/automation/conditions/crossDomainConditions
 */

import { prisma } from '../../../models/prismaClient.js'
import { logger } from '../../../utils/logger.js'
import type { ConditionEvaluator } from '../types.js'

/**
 * Checks if the entity belongs to a specific project.
 * Works for any domain by comparing context.projectId.
 * Params: { projectId: string }
 */
export const entityInProjectCondition: ConditionEvaluator = {
  type: 'entity_in_project',
  domain: '*',

  async evaluate(config, context) {
    return context.projectId === (config.params['projectId'] as string)
  },
}

/**
 * Checks if a risk's probability matches the expected value.
 * Params: { value: string }
 */
export const riskProbabilityIsCondition: ConditionEvaluator = {
  type: 'risk_probability_is',
  domain: 'risk',

  async evaluate(config, context) {
    if (!context.risk) return false
    return context.risk.probability === (config.params['value'] as string)
  },
}

/**
 * Checks if a risk's impact matches the expected value.
 * Params: { value: string }
 */
export const riskImpactIsCondition: ConditionEvaluator = {
  type: 'risk_impact_is',
  domain: 'risk',

  async evaluate(config, context) {
    if (!context.risk) return false
    return context.risk.impact === (config.params['value'] as string)
  },
}

/**
 * Checks if a document's type matches the expected value.
 * Params: { value: string }
 */
export const documentTypeIsCondition: ConditionEvaluator = {
  type: 'document_type_is',
  domain: 'document',

  async evaluate(config, context) {
    if (!context.document) return false
    return context.document.type === (config.params['value'] as string)
  },
}

/**
 * Checks time elapsed since the entity was last updated.
 * Fetches `updatedAt` directly from the database to avoid adding it to all context types.
 * Params: { value: number, unit?: 'hours' | 'days', operator?: 'gt' | 'lt' }
 */
export const timeSinceLastUpdateCondition: ConditionEvaluator = {
  type: 'time_since_last_update',
  domain: '*',

  async evaluate(config, context) {
    const value = Number(config.params['value'])
    const unit = (config.params['unit'] as string) || 'days'
    const operator = (config.params['operator'] as string) || 'gt'

    if (isNaN(value)) {
      logger.warn('time_since_last_update: invalid value param', {
        value: config.params['value'],
        entityId: context.entityId,
      })
      return false
    }

    // Fetch updatedAt directly from the appropriate table
    let updatedAt: Date | null = null

    try {
      if (context.domain === 'task' && context.task) {
        const row = await prisma.task.findUnique({
          where: { id: context.entityId },
          select: { updatedAt: true },
        })
        updatedAt = row?.updatedAt ?? null
      } else if (context.domain === 'risk' && context.risk) {
        const row = await prisma.risk.findUnique({
          where: { id: context.entityId },
          select: { updatedAt: true },
        })
        updatedAt = row?.updatedAt ?? null
      } else if (context.domain === 'document' && context.document) {
        const row = await prisma.document.findUnique({
          where: { id: context.entityId },
          select: { updatedAt: true },
        })
        updatedAt = row?.updatedAt ?? null
      } else if (context.domain === 'project' && context.project) {
        const row = await prisma.project.findUnique({
          where: { id: context.entityId },
          select: { updatedAt: true },
        })
        updatedAt = row?.updatedAt ?? null
      }
    } catch (err) {
      logger.warn('time_since_last_update: failed to fetch updatedAt', {
        entityId: context.entityId,
        domain: context.domain,
        error: err,
      })
      return false
    }

    if (!updatedAt) return false

    const multiplier = unit === 'hours' ? 3600000 : 86400000
    const elapsed = Date.now() - new Date(updatedAt).getTime()
    const threshold = value * multiplier

    return operator === 'lt' ? elapsed < threshold : elapsed > threshold
  },
}

/**
 * Checks if the task assignee has more active tasks than a threshold.
 * Params: { maxTasks?: number } (default: 10)
 */
export const userWorkloadAboveCondition: ConditionEvaluator = {
  type: 'user_workload_above',
  domain: 'task',

  async evaluate(config, context) {
    const maxTasks = Number(config.params['maxTasks'] ?? 10)
    const assigneeId = context.task?.assigneeId
    if (!assigneeId) return false

    try {
      const count = await prisma.task.count({
        where: {
          assigneeId,
          isDeleted: false,
          status: { notIn: ['done', 'cancelled'] },
        },
      })
      return count > maxTasks
    } catch (err) {
      logger.warn('user_workload_above: failed to count tasks', {
        assigneeId,
        error: err,
      })
      return false
    }
  },
}

/** All cross-domain condition evaluators for bulk registration */
export const allCrossDomainConditions: ConditionEvaluator[] = [
  entityInProjectCondition,
  riskProbabilityIsCondition,
  riskImpactIsCondition,
  documentTypeIsCondition,
  timeSinceLastUpdateCondition,
  userWorkloadAboveCondition,
]
