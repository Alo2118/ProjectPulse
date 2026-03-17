/**
 * Activity Service - Unified timeline from audit logs
 *
 * Provides a consistent activity feed for any entity (project, task, risk,
 * document, user) by reading from the AuditLog table.
 *
 * @module services/activityService
 */

import { prisma } from '../models/prismaClient.js'
import { userMinimalSelect } from '../utils/selectFields.js'
import type { ActivityItem } from '../types/index.js'

// ============================================================
// HELPERS
// ============================================================

interface AuditLogRow {
  id: string
  action: string
  entityType: string
  entityId: string
  oldData: string | null
  newData: string | null
  createdAt: Date
  user: { id: string; firstName: string; lastName: string }
}

const auditLogSelect = {
  id: true,
  action: true,
  entityType: true,
  entityId: true,
  oldData: true,
  newData: true,
  createdAt: true,
  user: { select: userMinimalSelect },
} as const

function extractEntityName(log: { newData: string | null; oldData: string | null }): string {
  try {
    const data = log.newData ? JSON.parse(log.newData) : log.oldData ? JSON.parse(log.oldData) : {}
    return data.name || data.title || data.code || 'Unknown'
  } catch {
    return 'Unknown'
  }
}

function extractFieldChange(log: { oldData: string | null; newData: string | null }): {
  field?: string; oldValue?: string; newValue?: string
} {
  try {
    const oldObj = log.oldData ? JSON.parse(log.oldData) : {}
    const newObj = log.newData ? JSON.parse(log.newData) : {}

    for (const key of Object.keys(newObj)) {
      if (oldObj[key] !== undefined && oldObj[key] !== newObj[key]) {
        return {
          field: key,
          oldValue: String(oldObj[key] ?? ''),
          newValue: String(newObj[key] ?? ''),
        }
      }
    }
    return {}
  } catch {
    return {}
  }
}

function mapToActivityItem(log: AuditLogRow): ActivityItem {
  const change = log.action === 'update' ? extractFieldChange(log) : {}
  return {
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    entityName: extractEntityName(log),
    ...change,
    user: log.user,
    createdAt: log.createdAt.toISOString(),
  }
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Returns activity for a specific entity (project, task, risk, document).
 */
export async function getEntityActivity(
  entityType: string,
  entityId: string,
  limit = 20
): Promise<ActivityItem[]> {
  const logs = await prisma.auditLog.findMany({
    where: { entityType, entityId },
    select: auditLogSelect,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return logs.map(mapToActivityItem)
}

/**
 * Returns activity performed by a specific user.
 */
export async function getUserActivity(userId: string, limit = 20): Promise<ActivityItem[]> {
  const logs = await prisma.auditLog.findMany({
    where: { userId },
    select: auditLogSelect,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return logs.map(mapToActivityItem)
}

/**
 * Returns a global activity feed, optionally scoped to a user (dipendente).
 */
export async function getFeed(userId: string, role: string, limit = 20): Promise<ActivityItem[]> {
  const where = role === 'dipendente' ? { userId } : {}
  const logs = await prisma.auditLog.findMany({
    where,
    select: auditLogSelect,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return logs.map(mapToActivityItem)
}
