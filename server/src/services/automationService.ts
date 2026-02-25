/**
 * Automation Service - CRUD operations for automation rules and logs (Feature 4.4)
 * All business logic for managing automation rules; the engine itself lives in automation/engine.ts.
 * @module services/automationService
 */

import { prisma } from '../models/prismaClient.js'
import { AppError } from '../middleware/errorMiddleware.js'
import { logger } from '../utils/logger.js'
import type { TriggerConfig, ConditionConfig, ActionConfig, AutomationDomain } from './automation/types.js'

// ============================================================
// TYPES
// ============================================================

export interface CreateAutomationInput {
  name: string
  description?: string
  projectId?: string
  trigger: TriggerConfig
  conditions: ConditionConfig[]
  actions: ActionConfig[]
  isActive: boolean
  priority: number
  domain?: AutomationDomain
  conditionLogic?: 'AND' | 'OR'
  cooldownMinutes?: number
}

export interface UpdateAutomationInput {
  name?: string
  description?: string
  projectId?: string | null
  trigger?: TriggerConfig
  conditions?: ConditionConfig[]
  actions?: ActionConfig[]
  isActive?: boolean
  priority?: number
  domain?: AutomationDomain
  conditionLogic?: 'AND' | 'OR'
  cooldownMinutes?: number
}

// Select fields used across all rule queries
const ruleSelectFields = {
  id: true,
  name: true,
  description: true,
  projectId: true,
  trigger: true,
  conditions: true,
  actions: true,
  isActive: true,
  priority: true,
  domain: true,
  conditionLogic: true,
  cooldownMinutes: true,
  createdById: true,
  lastTriggeredAt: true,
  triggerCount: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
}

const ruleWithRelationsSelect = {
  ...ruleSelectFields,
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  project: {
    select: { id: true, code: true, name: true },
  },
  _count: {
    select: { logs: true },
  },
}

/**
 * Parse JSON string fields (trigger, conditions, actions) returned by Prisma
 * since they are stored as NVarChar(Max) in SQL Server.
 */
function parseRuleJsonFields<T extends Record<string, unknown>>(rule: T): T {
  const parsed: Record<string, unknown> = { ...rule }
  if (typeof parsed['trigger'] === 'string') {
    parsed['trigger'] = JSON.parse(parsed['trigger'] as string)
  }
  if (typeof parsed['conditions'] === 'string') {
    parsed['conditions'] = JSON.parse(parsed['conditions'] as string)
  }
  if (typeof parsed['actions'] === 'string') {
    parsed['actions'] = JSON.parse(parsed['actions'] as string)
  }
  return parsed as T
}

const logSelectFields = {
  id: true,
  ruleId: true,
  triggerId: true,
  status: true,
  details: true,
  createdAt: true,
}

// ============================================================
// CRUD OPERATIONS
// ============================================================

/**
 * Returns all non-deleted automation rules.
 * When projectId is provided, returns only rules for that project plus global rules.
 * When projectId is omitted, returns all rules (admin/direzione view).
 */
export async function getAutomationRules(projectId?: string) {
  const where = projectId
    ? {
        isDeleted: false,
        OR: [{ projectId }, { projectId: null }],
      }
    : { isDeleted: false }

  const rules = await prisma.automationRule.findMany({
    where,
    select: ruleWithRelationsSelect,
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
  })
  return rules.map(parseRuleJsonFields)
}

/**
 * Returns a single automation rule by ID, or null if not found / deleted.
 */
export async function getAutomationRule(id: string) {
  const rule = await prisma.automationRule.findFirst({
    where: { id, isDeleted: false },
    select: ruleWithRelationsSelect,
  })
  return rule ? parseRuleJsonFields(rule) : null
}

/**
 * Creates a new automation rule.
 * Validates that trigger, conditions, and actions use known types before persisting.
 */
export async function createAutomationRule(
  data: CreateAutomationInput,
  userId: string
) {
  // Validate referenced projectId exists
  if (data.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, isDeleted: false },
      select: { id: true },
    })
    if (!project) {
      throw new AppError('Project not found', 404)
    }
  }

  const rule = await prisma.automationRule.create({
    data: {
      name: data.name,
      description: data.description,
      projectId: data.projectId ?? null,
      trigger: JSON.stringify(data.trigger),
      conditions: JSON.stringify(data.conditions),
      actions: JSON.stringify(data.actions),
      isActive: data.isActive,
      priority: data.priority,
      domain: data.domain ?? 'task',
      conditionLogic: data.conditionLogic ?? 'AND',
      cooldownMinutes: data.cooldownMinutes ?? 0,
      createdById: userId,
    },
    select: ruleWithRelationsSelect,
  })

  logger.info('Automation rule created', {
    ruleId: rule.id,
    name: rule.name,
    createdBy: userId,
  })

  return parseRuleJsonFields(rule)
}

/**
 * Updates an existing automation rule.
 * Only provided fields are updated; JSON fields are re-serialized.
 */
export async function updateAutomationRule(
  id: string,
  data: UpdateAutomationInput,
  userId: string
) {
  const existing = await prisma.automationRule.findFirst({
    where: { id, isDeleted: false },
    select: { id: true, name: true },
  })

  if (!existing) {
    throw new AppError('Automation rule not found', 404)
  }

  // Validate new projectId if being changed
  if (data.projectId !== undefined) {
    if (data.projectId !== null) {
      const project = await prisma.project.findFirst({
        where: { id: data.projectId, isDeleted: false },
        select: { id: true },
      })
      if (!project) {
        throw new AppError('Project not found', 404)
      }
    }
  }

  const updateData: Record<string, unknown> = {}

  if (data.name !== undefined) updateData['name'] = data.name
  if (data.description !== undefined) updateData['description'] = data.description
  if (data.projectId !== undefined) updateData['projectId'] = data.projectId ?? null
  if (data.trigger !== undefined) updateData['trigger'] = JSON.stringify(data.trigger)
  if (data.conditions !== undefined) updateData['conditions'] = JSON.stringify(data.conditions)
  if (data.actions !== undefined) updateData['actions'] = JSON.stringify(data.actions)
  if (data.isActive !== undefined) updateData['isActive'] = data.isActive
  if (data.priority !== undefined) updateData['priority'] = data.priority
  if (data.domain !== undefined) updateData['domain'] = data.domain
  if (data.conditionLogic !== undefined) updateData['conditionLogic'] = data.conditionLogic
  if (data.cooldownMinutes !== undefined) updateData['cooldownMinutes'] = data.cooldownMinutes

  const rule = await prisma.automationRule.update({
    where: { id },
    data: updateData,
    select: ruleWithRelationsSelect,
  })

  logger.info('Automation rule updated', {
    ruleId: rule.id,
    name: rule.name,
    updatedBy: userId,
  })

  return parseRuleJsonFields(rule)
}

/**
 * Soft-deletes an automation rule.
 * Logs and associated records are preserved for audit purposes.
 */
export async function deleteAutomationRule(id: string): Promise<void> {
  const existing = await prisma.automationRule.findFirst({
    where: { id, isDeleted: false },
    select: { id: true, name: true },
  })

  if (!existing) {
    throw new AppError('Automation rule not found', 404)
  }

  await prisma.automationRule.update({
    where: { id },
    data: { isDeleted: true, isActive: false },
  })

  logger.info('Automation rule deleted', { ruleId: id, name: existing.name })
}

/**
 * Toggles the isActive flag on a rule.
 */
export async function toggleAutomationRule(id: string, isActive: boolean) {
  const existing = await prisma.automationRule.findFirst({
    where: { id, isDeleted: false },
    select: { id: true, name: true },
  })

  if (!existing) {
    throw new AppError('Automation rule not found', 404)
  }

  const updated = await prisma.automationRule.update({
    where: { id },
    data: { isActive },
    select: ruleWithRelationsSelect,
  })

  logger.info('Automation rule toggled', { ruleId: id, name: existing.name, isActive })
  return parseRuleJsonFields(updated)
}

/**
 * Returns paginated execution logs for a specific rule.
 */
export async function getAutomationLogs(
  ruleId: string,
  page: number = 1,
  limit: number = 50
) {
  // Verify rule exists
  const rule = await prisma.automationRule.findFirst({
    where: { id: ruleId, isDeleted: false },
    select: { id: true },
  })

  if (!rule) {
    throw new AppError('Automation rule not found', 404)
  }

  const skip = (page - 1) * limit

  const [logs, total] = await Promise.all([
    prisma.automationLog.findMany({
      where: { ruleId },
      select: logSelectFields,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.automationLog.count({ where: { ruleId } }),
  ])

  return {
    logs,
    total,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}
