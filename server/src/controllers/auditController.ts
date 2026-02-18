/**
 * Audit Controller - HTTP request handling for audit trail logs
 * @module controllers/auditController
 */

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { getAuditLogs } from '../services/auditService.js'
import { AuditAction, EntityType } from '../types/index.js'
import { datePreprocess } from '../utils/validation.js'

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

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    })
  } catch (error) {
    next(error)
  }
}
