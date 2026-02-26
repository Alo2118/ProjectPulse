/**
 * Workflow Service - Business logic for customizable workflow templates (Feature 4.3)
 * Manages workflow templates (statuses + transitions) and their assignment to projects.
 * @module services/workflowService
 */

import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import { AppError } from '../middleware/errorMiddleware.js'

// ============================================================
// TYPES
// ============================================================

export interface WorkflowStatus {
  key: string
  label: string
  color: string           // Tailwind color name: gray, blue, yellow, red, green, purple, orange
  isFinal: boolean        // Terminal state (done, cancelled)
  isInitial: boolean      // Starting state for new tasks
  requiresComment: boolean // Force comment on transition to this status
}

export interface ParsedWorkflow {
  id: string
  name: string
  statuses: WorkflowStatus[]
  transitions: Record<string, string[]>
  isSystem: boolean
}

// ============================================================
// HARDCODED DEFAULTS (match current task status behaviour)
// ============================================================

const DEFAULT_WORKFLOW_ID = '__default__'

const DEFAULT_STATUSES: WorkflowStatus[] = [
  { key: 'todo',        label: 'Da fare',       color: 'gray',   isInitial: true,  isFinal: false, requiresComment: false },
  { key: 'in_progress', label: 'In corso',      color: 'blue',   isInitial: false, isFinal: false, requiresComment: false },
  { key: 'review',      label: 'In revisione',  color: 'yellow', isInitial: false, isFinal: false, requiresComment: false },
  { key: 'blocked',     label: 'Bloccato',      color: 'red',    isInitial: false, isFinal: false, requiresComment: true  },
  { key: 'done',        label: 'Completato',    color: 'green',  isInitial: false, isFinal: true,  requiresComment: false },
  { key: 'cancelled',   label: 'Annullato',     color: 'gray',   isInitial: false, isFinal: true,  requiresComment: false },
]

const DEFAULT_TRANSITIONS: Record<string, string[]> = {
  todo:        ['in_progress', 'blocked', 'cancelled'],
  in_progress: ['todo', 'review', 'blocked', 'done'],
  review:      ['in_progress', 'done', 'blocked'],
  blocked:     ['todo', 'in_progress'],
  done:        ['in_progress'],
  cancelled:   ['todo'],
}

const HARDCODED_DEFAULT_WORKFLOW: ParsedWorkflow = {
  id: DEFAULT_WORKFLOW_ID,
  name: 'Default',
  statuses: DEFAULT_STATUSES,
  transitions: DEFAULT_TRANSITIONS,
  isSystem: true,
}

// ============================================================
// PRISMA SELECT SHAPE
// ============================================================

const workflowSelectFields = {
  id: true,
  name: true,
  description: true,
  statuses: true,
  transitions: true,
  isDefault: true,
  isSystem: true,
  isActive: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

type WorkflowRecord = {
  id: string
  name: string
  description: string | null
  statuses: string
  transitions: string
  isDefault: boolean
  isSystem: boolean
  isActive: boolean
  createdById: string
  createdAt: Date
  updatedAt: Date
}

function parseWorkflowTemplate(record: WorkflowRecord): ParsedWorkflow {
  return {
    id: record.id,
    name: record.name,
    statuses: JSON.parse(record.statuses) as WorkflowStatus[],
    transitions: JSON.parse(record.transitions) as Record<string, string[]>,
    isSystem: record.isSystem,
  }
}

/**
 * Validate workflow statuses and transitions for logical consistency.
 * Throws AppError(400) on failure.
 */
function validateWorkflowData(
  statuses: WorkflowStatus[],
  transitions: Record<string, string[]>
): void {
  // Unique keys
  const keys = statuses.map((s) => s.key)
  const uniqueKeys = new Set(keys)
  if (uniqueKeys.size !== keys.length) {
    throw new AppError('I codici degli stati devono essere univoci', 400)
  }

  // At least one initial state
  const hasInitial = statuses.some((s) => s.isInitial)
  if (!hasInitial) {
    throw new AppError('Il workflow deve avere almeno uno stato iniziale', 400)
  }

  // At least one final state
  const hasFinal = statuses.some((s) => s.isFinal)
  if (!hasFinal) {
    throw new AppError('Il workflow deve avere almeno uno stato finale', 400)
  }

  // Transitions reference only valid status keys
  const validKeys = new Set(keys)
  for (const [fromKey, toKeys] of Object.entries(transitions)) {
    if (!validKeys.has(fromKey)) {
      throw new AppError(
        `La transizione parte da uno stato non valido: "${fromKey}"`,
        400
      )
    }
    for (const toKey of toKeys) {
      if (!validKeys.has(toKey)) {
        throw new AppError(
          `La transizione verso "${toKey}" da "${fromKey}" non è valida`,
          400
        )
      }
    }
  }
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Get all active workflow templates.
 */
export async function getWorkflowTemplates(): Promise<ParsedWorkflow[]> {
  const records = await prisma.workflowTemplate.findMany({
    where: { isActive: true },
    select: workflowSelectFields,
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  })

  return records.map((r) => parseWorkflowTemplate(r as WorkflowRecord))
}

/**
 * Get a workflow template by ID.
 */
export async function getWorkflowTemplate(
  id: string
): Promise<ParsedWorkflow | null> {
  const record = await prisma.workflowTemplate.findFirst({
    where: { id, isActive: true },
    select: workflowSelectFields,
  })

  if (!record) return null
  return parseWorkflowTemplate(record as WorkflowRecord)
}

/**
 * Create a new workflow template.
 * Validates that statuses have unique keys, at least one initial and one final.
 * Validates that transitions reference only valid status keys.
 */
export async function createWorkflowTemplate(
  data: {
    name: string
    description?: string
    statuses: WorkflowStatus[]
    transitions: Record<string, string[]>
  },
  userId: string
): Promise<ParsedWorkflow> {
  validateWorkflowData(data.statuses, data.transitions)

  // Check name uniqueness
  const existing = await prisma.workflowTemplate.findFirst({
    where: { name: data.name, isActive: true },
    select: { id: true },
  })
  if (existing) {
    throw new AppError(
      `Un workflow con nome "${data.name}" esiste già`,
      409
    )
  }

  const record = await prisma.workflowTemplate.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      statuses: JSON.stringify(data.statuses),
      transitions: JSON.stringify(data.transitions),
      isDefault: false,
      isSystem: false,
      isActive: true,
      createdById: userId,
    },
    select: workflowSelectFields,
  })

  logger.info('Workflow template created', {
    workflowId: record.id,
    name: record.name,
    userId,
  })

  return parseWorkflowTemplate(record as WorkflowRecord)
}

/**
 * Update a workflow template. Cannot update system templates.
 */
export async function updateWorkflowTemplate(
  id: string,
  data: {
    name?: string
    description?: string
    statuses?: WorkflowStatus[]
    transitions?: Record<string, string[]>
    isActive?: boolean
  },
  userId: string
): Promise<ParsedWorkflow> {
  const existing = await prisma.workflowTemplate.findFirst({
    where: { id },
    select: workflowSelectFields,
  })

  if (!existing) {
    throw new AppError('Workflow non trovato', 404)
  }

  if (existing.isSystem) {
    throw new AppError('I workflow di sistema non possono essere modificati', 403)
  }

  // Merge current statuses/transitions with incoming changes for validation
  const mergedStatuses =
    data.statuses ?? (JSON.parse(existing.statuses) as WorkflowStatus[])
  const mergedTransitions =
    data.transitions ??
    (JSON.parse(existing.transitions) as Record<string, string[]>)

  validateWorkflowData(mergedStatuses, mergedTransitions)

  // Name uniqueness check when changing name
  if (data.name && data.name !== existing.name) {
    const nameConflict = await prisma.workflowTemplate.findFirst({
      where: { name: data.name, isActive: true, id: { not: id } },
      select: { id: true },
    })
    if (nameConflict) {
      throw new AppError(
        `Un workflow con nome "${data.name}" esiste già`,
        409
      )
    }
  }

  const updatePayload: Record<string, unknown> = {}
  if (data.name !== undefined) updatePayload.name = data.name
  if (data.description !== undefined) updatePayload.description = data.description
  if (data.statuses !== undefined) updatePayload.statuses = JSON.stringify(data.statuses)
  if (data.transitions !== undefined) updatePayload.transitions = JSON.stringify(data.transitions)
  if (data.isActive !== undefined) updatePayload.isActive = data.isActive

  const updated = await prisma.workflowTemplate.update({
    where: { id },
    data: updatePayload,
    select: workflowSelectFields,
  })

  logger.info('Workflow template updated', { workflowId: id, userId })

  return parseWorkflowTemplate(updated as WorkflowRecord)
}

/**
 * Soft-delete a workflow template. Cannot delete system templates.
 * If active projects use this workflow, deletion is blocked.
 */
export async function deleteWorkflowTemplate(id: string): Promise<void> {
  const existing = await prisma.workflowTemplate.findFirst({
    where: { id },
    select: { id: true, isSystem: true, name: true },
  })

  if (!existing) {
    throw new AppError('Workflow non trovato', 404)
  }

  if (existing.isSystem) {
    throw new AppError('I workflow di sistema non possono essere eliminati', 403)
  }

  // Block deletion if projects are still using this workflow
  const projectCount = await prisma.project.count({
    where: { workflowTemplateId: id, isDeleted: false },
  })

  if (projectCount > 0) {
    throw new AppError(
      `Impossibile eliminare: ${projectCount} progett${projectCount === 1 ? 'o usa' : 'i usano'} questo workflow. Riassegna prima i progetti.`,
      409
    )
  }

  await prisma.workflowTemplate.update({
    where: { id },
    data: { isActive: false },
  })

  logger.info('Workflow template soft-deleted', { workflowId: id })
}

/**
 * Get the effective workflow for a project.
 * If project has workflowTemplateId set, use that.
 * Otherwise, try the system-default from the DB.
 * If none exists in DB, return hardcoded defaults.
 */
export async function getProjectWorkflow(
  projectId: string | null
): Promise<ParsedWorkflow> {
  // Try to resolve from project's assigned template
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, isDeleted: false },
      select: { workflowTemplateId: true },
    })

    if (project?.workflowTemplateId) {
      const template = await prisma.workflowTemplate.findFirst({
        where: { id: project.workflowTemplateId, isActive: true },
        select: workflowSelectFields,
      })

      if (template) {
        return parseWorkflowTemplate(template as WorkflowRecord)
      }
    }
  }

  // Fall back to system-default template in DB
  const systemDefault = await prisma.workflowTemplate.findFirst({
    where: { isDefault: true, isSystem: true, isActive: true },
    select: workflowSelectFields,
  })

  if (systemDefault) {
    return parseWorkflowTemplate(systemDefault as WorkflowRecord)
  }

  // Ultimate fallback: hardcoded defaults (always safe)
  return HARDCODED_DEFAULT_WORKFLOW
}

/**
 * Validate a status transition for a project's workflow.
 * Returns { valid: boolean; requiresComment: boolean }
 */
export async function validateTransition(
  projectId: string | null,
  currentStatus: string,
  newStatus: string
): Promise<{ valid: boolean; requiresComment: boolean }> {
  const workflow = await getProjectWorkflow(projectId)

  const allowedNext = workflow.transitions[currentStatus] ?? []
  const valid = allowedNext.includes(newStatus)

  if (!valid) {
    return { valid: false, requiresComment: false }
  }

  const targetStatus = workflow.statuses.find((s) => s.key === newStatus)
  const requiresComment = targetStatus?.requiresComment ?? false

  return { valid: true, requiresComment }
}

/**
 * Assign a workflow template to a project.
 * Pass null to remove the assignment (falls back to system default).
 */
export async function assignWorkflowToProject(
  projectId: string,
  workflowTemplateId: string | null
): Promise<void> {
  // Verify project exists
  const project = await prisma.project.findFirst({
    where: { id: projectId, isDeleted: false },
    select: { id: true },
  })
  if (!project) {
    throw new AppError('Progetto non trovato', 404)
  }

  // If assigning a template, verify it exists and is active
  if (workflowTemplateId !== null) {
    const template = await prisma.workflowTemplate.findFirst({
      where: { id: workflowTemplateId, isActive: true },
      select: { id: true },
    })
    if (!template) {
      throw new AppError('Workflow non trovato', 404)
    }
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { workflowTemplateId },
  })

  logger.info('Workflow assigned to project', { projectId, workflowTemplateId })
}
