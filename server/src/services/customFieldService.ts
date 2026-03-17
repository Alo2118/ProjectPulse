/**
 * Custom Field Service - Business logic for custom field definitions and values
 * Supports per-project and global (projectId=null) custom fields on tasks.
 * @module services/customFieldService
 */

import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import { auditService } from './auditService.js'
import {
  CreateCustomFieldInput,
  UpdateCustomFieldInput,
  SetCustomFieldValueInput,
  CustomFieldQueryParams,
  EntityType,
} from '../types/index.js'
import { AppError } from '../middleware/errorMiddleware.js'

// ============================================================
// SELECT SHAPES
// ============================================================

const definitionSelect = {
  id: true,
  name: true,
  fieldType: true,
  options: true,
  projectId: true,
  isRequired: true,
  position: true,
  isActive: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  project: {
    select: { id: true, code: true, name: true },
  },
}

const valueSelect = {
  id: true,
  definitionId: true,
  taskId: true,
  value: true,
  createdAt: true,
  updatedAt: true,
}

// ============================================================
// LOCAL TYPES (mirror Prisma select shapes until client is generated)
// ============================================================

interface DefinitionRow {
  id: string
  name: string
  fieldType: string
  options: string | null
  projectId: string | null
  isRequired: boolean
  position: number
  isActive: boolean
  createdById: string
  createdAt: Date
  updatedAt: Date
  project: { id: string; code: string; name: string } | null
}

interface ValueRow {
  id: string
  definitionId: string
  taskId: string
  value: string | null
  createdAt: Date
  updatedAt: Date
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Parses stored JSON options string into string array.
 * Returns null when the field has no options stored.
 */
function parseOptions(raw: string | null): string[] | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as string[]
    return null
  } catch {
    return null
  }
}

function hydrateDefinition(def: DefinitionRow) {
  return { ...def, options: parseOptions(def.options) }
}

// ============================================================
// DEFINITIONS
// ============================================================

/**
 * Lists custom field definitions with optional filters.
 */
async function getDefinitions(params: CustomFieldQueryParams = {}) {
  const { projectId, includeGlobal = true, includeInactive = false } = params

  const orConditions: Array<Record<string, unknown>> = []

  if (projectId) {
    orConditions.push({ projectId })
  }
  if (includeGlobal || !projectId) {
    orConditions.push({ projectId: null })
  }
  // If no projectId given, return everything (global + project-specific)
  if (!projectId && !includeGlobal) {
    orConditions.push({ projectId: { not: null } })
  }

  const where: Record<string, unknown> = {}

  if (orConditions.length > 0 && (projectId || !includeGlobal)) {
    where.OR = orConditions
  }

  if (!includeInactive) {
    where.isActive = true
  }

  const definitions = await prisma.customFieldDefinition.findMany({
    where,
    select: definitionSelect,
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
  })

  return definitions.map(hydrateDefinition)
}

/**
 * Gets a single definition by ID, including count of values set.
 */
async function getDefinitionById(id: string) {
  const def = await prisma.customFieldDefinition.findUnique({
    where: { id },
    select: {
      ...definitionSelect,
      _count: { select: { values: true } },
    },
  })
  if (!def) return null

  return { ...hydrateDefinition(def), valuesCount: def._count.values }
}

/**
 * Creates a new custom field definition.
 */
async function createDefinition(input: CreateCustomFieldInput, userId: string) {
  const optionsJson = input.options && input.options.length > 0
    ? JSON.stringify(input.options)
    : null

  const created = await prisma.$transaction(async (tx) => {
    const result = await tx.customFieldDefinition.create({
      data: {
        name: input.name,
        fieldType: input.fieldType,
        options: optionsJson,
        projectId: input.projectId ?? null,
        isRequired: input.isRequired ?? false,
        position: input.position ?? 0,
        createdById: userId,
      },
      select: definitionSelect,
    })

    await auditService.logCreate(
      EntityType.CUSTOM_FIELD,
      result.id,
      userId,
      { name: result.name, fieldType: result.fieldType, projectId: result.projectId } as Record<string, unknown>,
      tx
    )

    return result
  })

  logger.info('Custom field definition created', { id: created.id, name: created.name, userId })
  return hydrateDefinition(created)
}

/**
 * Updates an existing custom field definition.
 */
async function updateDefinition(id: string, input: UpdateCustomFieldInput, userId: string) {
  const existing = await prisma.customFieldDefinition.findUnique({
    where: { id },
    select: definitionSelect,
  })
  if (!existing) return null

  const optionsJson = input.options !== undefined
    ? (input.options && input.options.length > 0 ? JSON.stringify(input.options) : null)
    : undefined

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.customFieldDefinition.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.fieldType !== undefined && { fieldType: input.fieldType }),
        ...(optionsJson !== undefined && { options: optionsJson }),
        ...(input.isRequired !== undefined && { isRequired: input.isRequired }),
        ...(input.position !== undefined && { position: input.position }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
      select: definitionSelect,
    })

    await auditService.logUpdate(
      EntityType.CUSTOM_FIELD,
      id,
      userId,
      { name: existing.name, fieldType: existing.fieldType } as Record<string, unknown>,
      { name: result.name, fieldType: result.fieldType } as Record<string, unknown>,
      tx
    )

    return result
  })

  logger.info('Custom field definition updated', { id, userId })
  return hydrateDefinition(updated)
}

/**
 * Hard-deletes a definition (cascade deletes all associated values).
 */
async function deleteDefinition(id: string, userId: string): Promise<boolean> {
  const existing = await prisma.customFieldDefinition.findUnique({
    where: { id },
    select: { id: true, name: true, fieldType: true },
  })
  if (!existing) return false

  await prisma.$transaction(async (tx) => {
    await tx.customFieldDefinition.delete({ where: { id } })

    await auditService.logDelete(
      EntityType.CUSTOM_FIELD,
      id,
      userId,
      { name: existing.name, fieldType: existing.fieldType } as Record<string, unknown>,
      tx
    )
  })

  logger.info('Custom field definition deleted', { id, userId })
  return true
}

// ============================================================
// VALUES
// ============================================================

/**
 * Returns all custom field values for a task, merged with their definitions.
 * Includes fields that have no value yet (left-join pattern).
 * Fetches all active definitions applicable to the task's project (+ globals).
 */
async function getValuesForTask(taskId: string, projectId?: string | null) {
  // Build OR condition: global fields + project-specific fields
  const definitionWhere: Record<string, unknown> = { isActive: true }

  if (projectId) {
    definitionWhere.OR = [{ projectId: null }, { projectId }]
  }
  // If no projectId, only global fields
  else {
    definitionWhere.projectId = null
  }

  const [definitions, values] = await Promise.all([
    prisma.customFieldDefinition.findMany({
      where: definitionWhere,
      select: definitionSelect,
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    }),
    prisma.customFieldValue.findMany({
      where: { taskId },
      select: valueSelect,
    }),
  ])

  // Build a map of definitionId -> value
  const valueMap = new Map((values as ValueRow[]).map((v) => [v.definitionId, v]))

  return (definitions as DefinitionRow[]).map((def) => ({
    definition: hydrateDefinition(def),
    value: valueMap.get(def.id) ?? null,
  }))
}

/**
 * Upserts a custom field value for a task.
 */
async function setFieldValue(input: SetCustomFieldValueInput, userId: string) {
  const { definitionId, taskId, value } = input

  // Verify definition exists
  const def = await prisma.customFieldDefinition.findUnique({
    where: { id: definitionId },
    select: { id: true, isRequired: true },
  })
  if (!def) throw new AppError('Definizione campo personalizzato non trovata', 404)

  if (def.isRequired && (value === null || value === undefined || value === '')) {
    throw new AppError('Questo campo è obbligatorio', 400)
  }

  const result = await prisma.customFieldValue.upsert({
    where: {
      definitionId_taskId: { definitionId, taskId },
    },
    create: {
      definitionId,
      taskId,
      value: value ?? null,
    },
    update: {
      value: value ?? null,
    },
    select: valueSelect,
  })

  logger.info('Custom field value set', { definitionId, taskId, userId })
  return result
}

/**
 * Deletes a custom field value for a task.
 */
async function deleteFieldValue(definitionId: string, taskId: string, userId: string): Promise<boolean> {
  const existing = await prisma.customFieldValue.findUnique({
    where: { definitionId_taskId: { definitionId, taskId } },
    select: { id: true },
  })
  if (!existing) return false

  await prisma.customFieldValue.delete({
    where: { definitionId_taskId: { definitionId, taskId } },
  })

  logger.info('Custom field value deleted', { definitionId, taskId, userId })
  return true
}

// ============================================================
// EXPORT
// ============================================================

export const customFieldService = {
  getDefinitions,
  getDefinitionById,
  createDefinition,
  updateDefinition,
  deleteDefinition,
  getValuesForTask,
  setFieldValue,
  deleteFieldValue,
}
