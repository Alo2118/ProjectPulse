/**
 * Audit Service - Handles audit trail logging for ISO 13485 compliance
 * @module services/auditService
 */

import { Prisma } from '@prisma/client'
import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import { AuditAction, EntityType, AuditLogInput, PaginationParams } from '../types/index.js'

/**
 * Creates an audit log entry
 * @param input - Audit log data
 * @param tx - Optional Prisma transaction client
 * @returns Created audit log entry
 */
export async function createAuditLog(
  input: AuditLogInput,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx || prisma

  try {
    await client.auditLog.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        userId: input.userId,
        oldData: input.oldData ? JSON.stringify(input.oldData) : null,
        newData: input.newData ? JSON.stringify(input.newData) : null,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    })

    logger.info(`Audit log created: ${input.action} on ${input.entityType}`, {
      entityId: input.entityId,
      userId: input.userId,
    })
  } catch (error) {
    logger.error('Failed to create audit log', { error, input })
    // Don't throw - audit logging should not break main operations
  }
}

/**
 * Logs entity creation
 * @param entityType - Type of entity created
 * @param entityId - ID of created entity
 * @param userId - ID of user who created entity
 * @param newData - Data of created entity
 * @param tx - Optional Prisma transaction client
 */
export async function logCreate(
  entityType: EntityType,
  entityId: string,
  userId: string,
  newData: Record<string, unknown>,
  tx?: Prisma.TransactionClient
): Promise<void> {
  await createAuditLog(
    {
      entityType,
      entityId,
      action: AuditAction.CREATE,
      userId,
      oldData: null,
      newData,
    },
    tx
  )
}

/**
 * Logs entity update
 * @param entityType - Type of entity updated
 * @param entityId - ID of updated entity
 * @param userId - ID of user who updated entity
 * @param oldData - Previous data
 * @param newData - New data
 * @param tx - Optional Prisma transaction client
 */
export async function logUpdate(
  entityType: EntityType,
  entityId: string,
  userId: string,
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
  tx?: Prisma.TransactionClient
): Promise<void> {
  await createAuditLog(
    {
      entityType,
      entityId,
      action: AuditAction.UPDATE,
      userId,
      oldData,
      newData,
    },
    tx
  )
}

/**
 * Logs entity deletion (soft delete)
 * @param entityType - Type of entity deleted
 * @param entityId - ID of deleted entity
 * @param userId - ID of user who deleted entity
 * @param oldData - Data before deletion
 * @param tx - Optional Prisma transaction client
 */
export async function logDelete(
  entityType: EntityType,
  entityId: string,
  userId: string,
  oldData: Record<string, unknown>,
  tx?: Prisma.TransactionClient
): Promise<void> {
  await createAuditLog(
    {
      entityType,
      entityId,
      action: AuditAction.DELETE,
      userId,
      oldData,
      newData: null,
    },
    tx
  )
}

/**
 * Logs status change
 * @param entityType - Type of entity
 * @param entityId - ID of entity
 * @param userId - ID of user who changed status
 * @param oldStatus - Previous status
 * @param newStatus - New status
 * @param tx - Optional Prisma transaction client
 */
export async function logStatusChange(
  entityType: EntityType,
  entityId: string,
  userId: string,
  oldStatus: string,
  newStatus: string,
  tx?: Prisma.TransactionClient
): Promise<void> {
  await createAuditLog(
    {
      entityType,
      entityId,
      action: AuditAction.STATUS_CHANGE,
      userId,
      oldData: { status: oldStatus },
      newData: { status: newStatus },
    },
    tx
  )
}

/**
 * Logs user login
 * @param userId - ID of logged in user
 * @param ipAddress - IP address
 * @param userAgent - User agent string
 */
export async function logLogin(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await createAuditLog({
    entityType: EntityType.USER,
    entityId: userId,
    action: AuditAction.LOGIN,
    userId,
    ipAddress,
    userAgent,
  })
}

/**
 * Logs user logout
 * @param userId - ID of logged out user
 */
export async function logLogout(userId: string): Promise<void> {
  await createAuditLog({
    entityType: EntityType.USER,
    entityId: userId,
    action: AuditAction.LOGOUT,
    userId,
  })
}

interface AuditLogQueryParams extends PaginationParams {
  entityType?: EntityType
  entityId?: string
  action?: AuditAction
  userId?: string
  startDate?: Date
  endDate?: Date
}

/**
 * Retrieves audit logs with pagination and filters
 * @param params - Query parameters
 * @returns Paginated audit logs
 */
export async function getAuditLogs(params: AuditLogQueryParams) {
  const {
    page = 1,
    limit = 50,
    entityType,
    entityId,
    action,
    userId,
    startDate,
    endDate,
  } = params

  const where: Prisma.AuditLogWhereInput = {}

  if (entityType) where.entityType = entityType
  if (entityId) where.entityId = entityId
  if (action) where.action = action
  if (userId) where.userId = userId
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = startDate
    if (endDate) where.createdAt.lte = endDate
  }

  const skip = (page - 1) * limit

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count({ where }),
  ])

  return {
    data: logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}

/**
 * Gets audit history for a specific entity
 * @param entityType - Type of entity
 * @param entityId - ID of entity
 * @returns Array of audit logs for the entity
 */
export async function getEntityHistory(entityType: EntityType, entityId: string) {
  return prisma.auditLog.findMany({
    where: { entityType, entityId },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Gets status change timeline for a specific entity (ordered chronologically)
 * @param entityId - ID of entity
 * @returns Array of status change audit logs ordered by createdAt ASC
 */
export async function getStatusChangeTimeline(entityId: string) {
  return prisma.auditLog.findMany({
    where: { entityId, action: AuditAction.STATUS_CHANGE },
    select: {
      id: true,
      oldData: true,
      newData: true,
      createdAt: true,
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
}

/**
 * Gets recent activity for all entities belonging to a project
 * @param projectId - ID of the project
 * @param limit - Maximum number of entries to return
 * @returns Array of audit logs across all project entities
 */
export async function getProjectActivity(projectId: string, limit: number = 20) {
  const taskIds = await prisma.task.findMany({
    where: { projectId, isDeleted: false },
    select: { id: true },
  })

  const entityIds = [projectId, ...taskIds.map((t) => t.id)]

  return prisma.auditLog.findMany({
    where: { entityId: { in: entityIds } },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export const auditService = {
  createAuditLog,
  logCreate,
  logUpdate,
  logDelete,
  logStatusChange,
  logLogin,
  logLogout,
  getAuditLogs,
  getEntityHistory,
  getStatusChangeTimeline,
  getProjectActivity,
}
