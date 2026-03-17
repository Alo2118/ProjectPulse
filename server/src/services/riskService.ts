/**
 * Risk Service - Business logic for risk management
 * @module services/riskService
 */

import { Prisma } from '@prisma/client'
import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import { auditService } from './auditService.js'
import { notificationService } from './notificationService.js'
import { evaluateRules } from './automation/index.js'
import { riskWithRelationsSelect } from '../utils/selectFields.js'
import { buildPagination } from '../utils/paginate.js'
import { generateRiskCode } from '../utils/codeGenerator.js'
import {
  CreateRiskInput,
  UpdateRiskInput,
  PaginatedResponse,
  EntityType,
  PaginationParams,
  RiskCategory,
  RiskStatus,
} from '../types/index.js'
import { AppError } from '../middleware/errorMiddleware.js'
import { RISK_CRITICAL_THRESHOLD, RISK_HIGH_THRESHOLD, RISK_MEDIUM_THRESHOLD } from '../constants/enums.js'
import { buildPrismaScopeWhere } from '../utils/scopeFilter.js'

// ============================================================
// TYPES
// ============================================================

export interface RiskQueryParams extends PaginationParams {
  projectId?: string
  category?: string
  status?: string
  probability?: number
  impact?: number
  ownerId?: string
  search?: string
}


// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Calculates risk score as probability × impact (1-25 range)
 */
export function calculateRiskScore(probability: number, impact: number): number {
  return probability * impact
}

/**
 * Gets risk level label from numeric score
 */
export function getRiskLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= RISK_CRITICAL_THRESHOLD) return 'critical'
  if (score >= RISK_HIGH_THRESHOLD) return 'high'
  if (score >= RISK_MEDIUM_THRESHOLD) return 'medium'
  return 'low'
}

// ============================================================
// CRUD OPERATIONS
// ============================================================

/**
 * Creates a new risk with audit logging
 */
export async function createRisk(data: CreateRiskInput, userId: string) {
  // Verify project exists and is not deleted
  const project = await prisma.project.findFirst({
    where: { id: data.projectId, isDeleted: false },
    select: { id: true, code: true, ownerId: true },
  })

  if (!project) {
    throw new AppError('Project not found', 404)
  }

  const code = await generateRiskCode(project.code, project.id)

  const probability = data.probability ?? 3
  const impact = data.impact ?? 3

  // Use transaction for create + audit log (Rule 10)
  const risk = await prisma.$transaction(async (tx) => {
    const newRisk = await tx.risk.create({
      data: {
        code,
        title: data.title,
        description: data.description,
        projectId: data.projectId,
        category: (data.category as RiskCategory) || 'technical',
        probability,
        impact,
        mitigationPlan: data.mitigationPlan,
        ownerId: data.ownerId,
        createdById: userId,
      },
      select: riskWithRelationsSelect,
    })

    // Log to audit trail
    await auditService.logCreate(EntityType.RISK, newRisk.id, userId, { ...newRisk }, tx)

    // Notify project owner if risk is critical
    const score = probability * impact
    if (score >= RISK_CRITICAL_THRESHOLD && project.ownerId !== userId) {
      await notificationService.createNotification(
        {
          userId: project.ownerId,
          type: 'risk_high',
          title: 'High Risk Identified',
          message: `A high-level risk has been identified: ${newRisk.title}`,
          data: { riskId: newRisk.id, riskCode: newRisk.code, riskScore: score },
        },
        tx
      )
    }

    // Notify risk owner if assigned
    if (data.ownerId && data.ownerId !== userId) {
      await notificationService.createNotification(
        {
          userId: data.ownerId,
          type: 'risk_assigned',
          title: 'Risk Assigned',
          message: `You have been assigned as owner of risk: ${newRisk.title}`,
          data: { riskId: newRisk.id, riskCode: newRisk.code },
        },
        tx
      )
    }

    return newRisk
  })

  logger.info(`Risk created: ${risk.code}`, { riskId: risk.id, projectId: data.projectId, userId })

  // Fire risk_created automation trigger
  const createdScore = probability * impact
  evaluateRules({
    type: 'risk_created',
    domain: 'risk',
    entityId: risk.id,
    projectId: data.projectId,
    userId,
    data: { severity: getRiskLevel(createdScore) },
  }).catch(err => logger.error('Automation risk_created failed', { error: err }))

  return risk
}

/**
 * Retrieves risks with pagination and filters
 */
export async function getRisks(
  params: RiskQueryParams & { userId?: string; role?: string }
): Promise<PaginatedResponse<Prisma.RiskGetPayload<{ select: typeof riskWithRelationsSelect }>>> {
  const { page = 1, limit = 20, projectId, category, status, probability, impact, ownerId, search, userId, role } = params

  const where: Prisma.RiskWhereInput = {
    isDeleted: false, // Rule 11: Soft Delete filter
  }

  if (projectId) where.projectId = projectId
  if (category) where.category = category as RiskCategory
  if (status) where.status = status as RiskStatus
  if (probability !== undefined) where.probability = probability
  if (impact !== undefined) where.impact = impact
  if (ownerId) where.ownerId = ownerId
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { code: { contains: search } },
      { description: { contains: search } },
    ]
  }

  // Scope=mine filter: non-direzione users see only their own records
  if (userId && role) {
    const scopeWhere = await buildPrismaScopeWhere(userId, role, 'risk')
    if (scopeWhere) {
      if (where.OR) {
        const searchOr = where.OR
        delete where.OR
        where.AND = [{ OR: searchOr }, scopeWhere]
      } else {
        Object.assign(where, scopeWhere)
      }
    }
  }

  const skip = (page - 1) * limit

  const [risks, total] = await Promise.all([
    prisma.risk.findMany({
      where,
      select: riskWithRelationsSelect,
      skip,
      take: limit,
      orderBy: [{ createdAt: 'desc' }],
    }),
    prisma.risk.count({ where }),
  ])

  return {
    data: risks,
    pagination: buildPagination(page, limit, total),
  }
}

/**
 * Gets risks for a specific project
 */
export async function getProjectRisks(projectId: string) {
  const risks = await prisma.risk.findMany({
    where: {
      projectId,
      isDeleted: false,
    },
    select: riskWithRelationsSelect,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })

  return risks
}

/**
 * Retrieves a single risk by ID with full details
 */
export async function getRiskById(riskId: string) {
  const risk = await prisma.risk.findFirst({
    where: {
      id: riskId,
      isDeleted: false,
    },
    select: riskWithRelationsSelect,
  })

  return risk
}

/**
 * Updates a risk with audit logging
 */
export async function updateRisk(riskId: string, data: UpdateRiskInput, userId: string) {
  // Get existing risk for audit log
  const existing = await prisma.risk.findFirst({
    where: { id: riskId, isDeleted: false },
  })

  if (!existing) {
    return null
  }

  const oldStatus = existing.status
  const oldOwnerId = existing.ownerId

  // Use transaction for update + audit log (Rule 10)
  const risk = await prisma.$transaction(async (tx) => {
    const updated = await tx.risk.update({
      where: { id: riskId },
      data: {
        title: data.title,
        description: data.description,
        category: data.category as RiskCategory | undefined,
        probability: data.probability,
        impact: data.impact,
        status: data.status as RiskStatus | undefined,
        mitigationPlan: data.mitigationPlan,
        ownerId: data.ownerId,
        updatedAt: new Date(),
      },
      select: riskWithRelationsSelect,
    })

    // Log status change separately if status changed
    if (data.status && data.status !== oldStatus) {
      await auditService.logStatusChange(EntityType.RISK, riskId, userId, oldStatus, data.status, tx)
    } else {
      await auditService.logUpdate(EntityType.RISK, riskId, userId, { ...existing }, { ...updated }, tx)
    }

    // Notify new owner if changed
    if (data.ownerId && data.ownerId !== oldOwnerId && data.ownerId !== userId) {
      await notificationService.createNotification(
        {
          userId: data.ownerId,
          type: 'risk_assigned',
          title: 'Risk Assigned',
          message: `You have been assigned as owner of risk: ${updated.title}`,
          data: { riskId: updated.id, riskCode: updated.code },
        },
        tx
      )
    }

    return updated
  })

  logger.info(`Risk updated: ${risk.code}`, { riskId, userId })

  // Fire risk_status_changed if status changed via updateRisk
  if (data.status && data.status !== oldStatus) {
    evaluateRules({
      type: 'risk_status_changed',
      domain: 'risk',
      entityId: riskId,
      projectId: existing.projectId,
      userId,
      data: { oldStatus, newStatus: data.status },
    }).catch(err => logger.error('Automation risk_status_changed failed', { error: err }))
  }

  // Fire risk_level_changed if probability or impact changed
  if (data.probability !== undefined || data.impact !== undefined) {
    const oldScore = (existing.probability as number) * (existing.impact as number)
    const newProb = data.probability ?? (existing.probability as number)
    const newImp = data.impact ?? (existing.impact as number)
    const newScore = newProb * newImp
    const oldLevel = getRiskLevel(oldScore)
    const newLevel = getRiskLevel(newScore)
    if (oldLevel !== newLevel) {
      evaluateRules({
        type: 'risk_level_changed',
        domain: 'risk',
        entityId: riskId,
        projectId: existing.projectId,
        userId,
        data: { fromLevel: oldLevel, toLevel: newLevel },
      }).catch(err => logger.error('Automation risk_level_changed failed', { error: err }))
    }
  }

  return risk
}

/**
 * Changes risk status with validation
 */
export async function changeRiskStatus(riskId: string, newStatus: RiskStatus, userId: string) {
  const existing = await prisma.risk.findFirst({
    where: { id: riskId, isDeleted: false },
  })

  if (!existing) {
    return null
  }

  const oldStatus = existing.status

  // Use transaction for update + audit log
  const risk = await prisma.$transaction(async (tx) => {
    const updated = await tx.risk.update({
      where: { id: riskId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
      select: riskWithRelationsSelect,
    })

    await auditService.logStatusChange(EntityType.RISK, riskId, userId, oldStatus, newStatus, tx)

    return updated
  })

  logger.info(`Risk status changed: ${oldStatus} → ${newStatus}`, { riskId, userId })

  // Fire risk_status_changed automation trigger
  evaluateRules({
    type: 'risk_status_changed',
    domain: 'risk',
    entityId: riskId,
    projectId: existing.projectId,
    userId,
    data: { oldStatus, newStatus },
  }).catch(err => logger.error('Automation risk_status_changed failed', { error: err }))

  return risk
}

/**
 * Soft deletes a risk (Rule 11: Soft Delete)
 */
export async function deleteRisk(riskId: string, userId: string): Promise<boolean> {
  const existing = await prisma.risk.findFirst({
    where: { id: riskId, isDeleted: false },
  })

  if (!existing) {
    return false
  }

  // Use transaction for soft delete + audit log (Rule 10)
  await prisma.$transaction(async (tx) => {
    await tx.risk.update({
      where: { id: riskId },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    })

    await auditService.logDelete(EntityType.RISK, riskId, userId, { ...existing }, tx)
  })

  logger.info(`Risk soft deleted: ${existing.code}`, { riskId, userId })

  return true
}

/**
 * Gets risk statistics for a project
 */
export async function getProjectRiskStats(projectId: string) {
  const [byStatus, byCategory, total, allOpenRisks] = await Promise.all([
    prisma.risk.groupBy({
      by: ['status'],
      where: { projectId, isDeleted: false },
      _count: { id: true },
    }),
    prisma.risk.groupBy({
      by: ['category'],
      where: { projectId, isDeleted: false },
      _count: { id: true },
    }),
    prisma.risk.count({
      where: { projectId, isDeleted: false },
    }),
    prisma.risk.findMany({
      where: { projectId, isDeleted: false, status: { not: 'closed' } },
      select: { probability: true, impact: true },
    }),
  ])

  const highLevelRisks = allOpenRisks.filter(
    r => (r.probability as number) * (r.impact as number) >= RISK_HIGH_THRESHOLD
  ).length

  const statusCounts = byStatus.reduce(
    (acc, item) => {
      acc[item.status] = item._count.id
      return acc
    },
    {} as Record<string, number>
  )

  const categoryCounts = byCategory.reduce(
    (acc, item) => {
      acc[item.category] = item._count.id
      return acc
    },
    {} as Record<string, number>
  )

  return {
    total,
    byStatus: statusCounts,
    byCategory: categoryCounts,
    highLevelRisks,
    openRisks: statusCounts['open'] || 0,
  }
}

/**
 * Gets risk matrix data for visualization (5×5 integer grid)
 */
export async function getRiskMatrix(projectId: string) {
  const risks = await prisma.risk.findMany({
    where: {
      projectId,
      isDeleted: false,
      status: { not: 'closed' },
    },
    select: riskWithRelationsSelect,
  })

  const matrix: Record<number, Record<number, typeof risks>> = {}
  for (let p = 1; p <= 5; p++) {
    matrix[p] = {}
    for (let i = 1; i <= 5; i++) {
      matrix[p][i] = []
    }
  }

  for (const risk of risks) {
    const p = risk.probability as number
    const i = risk.impact as number
    if (matrix[p] && matrix[p][i]) {
      matrix[p][i].push(risk)
    }
  }

  return matrix
}

export const riskService = {
  createRisk,
  getRisks,
  getProjectRisks,
  getRiskById,
  updateRisk,
  changeRiskStatus,
  deleteRisk,
  getProjectRiskStats,
  getRiskMatrix,
  calculateRiskScore,
  getRiskLevel,
}
