/**
 * Risk Service - Business logic for risk management
 * @module services/riskService
 */

import { Prisma } from '@prisma/client'
import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import { auditService } from './auditService.js'
import {
  CreateRiskInput,
  UpdateRiskInput,
  PaginatedResponse,
  EntityType,
  PaginationParams,
  RiskCategory,
  RiskProbability,
  RiskImpact,
  RiskStatus,
} from '../types/index.js'

// ============================================================
// TYPES
// ============================================================

export interface RiskQueryParams extends PaginationParams {
  projectId?: string
  category?: string
  status?: string
  probability?: string
  impact?: string
  ownerId?: string
  search?: string
}

// Select fields for risk queries (Rule 9: Query Optimization)
const riskSelectFields = {
  id: true,
  code: true,
  title: true,
  description: true,
  category: true,
  probability: true,
  impact: true,
  status: true,
  mitigationPlan: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
  projectId: true,
  ownerId: true,
  createdById: true,
}

const riskWithRelationsSelect = {
  ...riskSelectFields,
  project: {
    select: { id: true, code: true, name: true },
  },
  owner: {
    select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true },
  },
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Calculates risk level based on probability and impact
 * Returns: 1-3 (low), 4-6 (medium), 7-9 (high)
 */
export function calculateRiskLevel(probability: RiskProbability, impact: RiskImpact): number {
  const probValue = { low: 1, medium: 2, high: 3 }
  const impactValue = { low: 1, medium: 2, high: 3 }
  return probValue[probability] * impactValue[impact]
}

/**
 * Gets risk level label from numeric value
 */
export function getRiskLevelLabel(level: number): 'low' | 'medium' | 'high' {
  if (level <= 2) return 'low'
  if (level <= 4) return 'medium'
  return 'high'
}

/**
 * Generates unique risk code based on project
 */
async function generateRiskCode(projectCode: string, projectId: string): Promise<string> {
  const lastRisk = await prisma.risk.findFirst({
    where: { projectId },
    orderBy: { code: 'desc' },
    select: { code: true },
  })

  let nextNumber = 1
  if (lastRisk?.code) {
    const parts = lastRisk.code.split('-R')
    if (parts.length > 1) {
      nextNumber = parseInt(parts[1], 10) + 1
    }
  }

  return `${projectCode}-R${String(nextNumber).padStart(3, '0')}`
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
    throw new Error('Project not found')
  }

  const code = await generateRiskCode(project.code, project.id)

  // Use transaction for create + audit log (Rule 10)
  const risk = await prisma.$transaction(async (tx) => {
    const newRisk = await tx.risk.create({
      data: {
        code,
        title: data.title,
        description: data.description,
        projectId: data.projectId,
        category: (data.category as RiskCategory) || 'technical',
        probability: (data.probability as RiskProbability) || 'medium',
        impact: (data.impact as RiskImpact) || 'medium',
        mitigationPlan: data.mitigationPlan,
        ownerId: data.ownerId,
        createdById: userId,
      },
      select: riskWithRelationsSelect,
    })

    // Log to audit trail
    await auditService.logCreate(EntityType.RISK, newRisk.id, userId, { ...newRisk }, tx)

    // Notify project owner if risk is high
    const riskLevel = calculateRiskLevel(
      newRisk.probability as RiskProbability,
      newRisk.impact as RiskImpact
    )
    if (riskLevel >= 6 && project.ownerId !== userId) {
      await tx.notification.create({
        data: {
          userId: project.ownerId,
          type: 'risk_high',
          title: 'High Risk Identified',
          message: `A high-level risk has been identified: ${newRisk.title}`,
          data: JSON.stringify({ riskId: newRisk.id, riskCode: newRisk.code, riskLevel }),
        },
      })
    }

    // Notify risk owner if assigned
    if (data.ownerId && data.ownerId !== userId) {
      await tx.notification.create({
        data: {
          userId: data.ownerId,
          type: 'risk_assigned',
          title: 'Risk Assigned',
          message: `You have been assigned as owner of risk: ${newRisk.title}`,
          data: JSON.stringify({ riskId: newRisk.id, riskCode: newRisk.code }),
        },
      })
    }

    return newRisk
  })

  logger.info(`Risk created: ${risk.code}`, { riskId: risk.id, projectId: data.projectId, userId })

  return risk
}

/**
 * Retrieves risks with pagination and filters
 */
export async function getRisks(
  params: RiskQueryParams
): Promise<PaginatedResponse<Prisma.RiskGetPayload<{ select: typeof riskWithRelationsSelect }>>> {
  const { page = 1, limit = 20, projectId, category, status, probability, impact, ownerId, search } = params

  const where: Prisma.RiskWhereInput = {
    isDeleted: false, // Rule 11: Soft Delete filter
  }

  if (projectId) where.projectId = projectId
  if (category) where.category = category as RiskCategory
  if (status) where.status = status as RiskStatus
  if (probability) where.probability = probability as RiskProbability
  if (impact) where.impact = impact as RiskImpact
  if (ownerId) where.ownerId = ownerId
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { code: { contains: search } },
      { description: { contains: search } },
    ]
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
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
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
        probability: data.probability as RiskProbability | undefined,
        impact: data.impact as RiskImpact | undefined,
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
      await tx.notification.create({
        data: {
          userId: data.ownerId,
          type: 'risk_assigned',
          title: 'Risk Assigned',
          message: `You have been assigned as owner of risk: ${updated.title}`,
          data: JSON.stringify({ riskId: updated.id, riskCode: updated.code }),
        },
      })
    }

    return updated
  })

  logger.info(`Risk updated: ${risk.code}`, { riskId, userId })

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
  const [byStatus, byCategory, total] = await Promise.all([
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
  ])

  // Get high-level risks count
  const highLevelRisks = await prisma.risk.count({
    where: {
      projectId,
      isDeleted: false,
      status: { not: 'closed' },
      OR: [
        { probability: 'high', impact: { in: ['medium', 'high'] } },
        { impact: 'high', probability: { in: ['medium', 'high'] } },
      ],
    },
  })

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
 * Gets risk matrix data for visualization
 */
export async function getRiskMatrix(projectId: string) {
  const risks = await prisma.risk.findMany({
    where: {
      projectId,
      isDeleted: false,
      status: { not: 'closed' },
    },
    select: {
      id: true,
      code: true,
      title: true,
      probability: true,
      impact: true,
      status: true,
    },
  })

  // Group risks by probability and impact for matrix
  const matrix: Record<string, Record<string, typeof risks>> = {
    low: { low: [], medium: [], high: [] },
    medium: { low: [], medium: [], high: [] },
    high: { low: [], medium: [], high: [] },
  }

  risks.forEach((risk) => {
    matrix[risk.probability][risk.impact].push(risk)
  })

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
  calculateRiskLevel,
  getRiskLevelLabel,
}
