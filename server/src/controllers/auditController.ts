/**
 * Audit Controller - HTTP request handling for audit trail logs
 * @module controllers/auditController
 */

import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { getAuditLogs, getEntityHistory, getStatusChangeTimeline, getProjectActivity } from '../services/auditService.js'
import { AuditAction, EntityType } from '../types/index.js'
import { datePreprocess } from '../utils/validation.js'
import { sendSuccess, sendPaginated, sendError } from '../utils/responseHelpers.js'

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const auditQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
  entityType: z
    .enum([
      EntityType.USER,
      EntityType.PROJECT,
      EntityType.TASK,
      EntityType.RISK,
      EntityType.DOCUMENT,
      EntityType.COMMENT,
      EntityType.TIME_ENTRY,
      EntityType.USER_INPUT,
      EntityType.NOTE,
      EntityType.ATTACHMENT,
      EntityType.TAG,
    ])
    .optional(),
  entityId: z.string().optional(),
  action: z
    .enum([
      AuditAction.CREATE,
      AuditAction.UPDATE,
      AuditAction.DELETE,
      AuditAction.STATUS_CHANGE,
      AuditAction.LOGIN,
      AuditAction.LOGOUT,
    ])
    .optional(),
  userId: z.string().uuid('Invalid user ID').optional(),
  startDate: z.preprocess(datePreprocess, z.string().datetime().optional()),
  endDate: z.preprocess(datePreprocess, z.string().datetime().optional()),
})

// ============================================================
// CONTROLLER FUNCTIONS
// ============================================================

/**
 * Gets paginated and filtered audit logs
 * @route GET /api/audit
 */
export async function getAuditLogsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params = auditQuerySchema.parse(req.query)

    const result = await getAuditLogs({
      page: params.page,
      limit: params.limit,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      userId: params.userId,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
    })

    sendPaginated(res, result)
  } catch (error) {
    next(error)
  }
}

/**
 * Gets audit history for a specific entity
 * @route GET /api/audit/entity/:entityType/:entityId
 */
export async function getEntityHistoryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const entityType = req.params.entityType as EntityType
    const { entityId } = req.params

    if (!Object.values(EntityType).includes(entityType)) {
      sendError(res, 'Invalid entity type', 400)
      return
    }

    const data = await getEntityHistory(entityType, entityId)
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
}

/**
 * Gets status change timeline for a specific entity
 * @route GET /api/audit/timeline/:entityId
 */
export async function getStatusTimelineHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { entityId } = req.params
    const data = await getStatusChangeTimeline(entityId)
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
}

/**
 * Gets recent activity for all entities in a project
 * @route GET /api/audit/project/:projectId
 */
export async function getProjectActivityHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params
    const limit = req.query.limit ? Number(req.query.limit) : 20
    const data = await getProjectActivity(projectId, limit)
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
}
