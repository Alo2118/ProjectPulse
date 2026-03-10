/**
 * Project Service - Business logic for project management
 * @module services/projectService
 */

import { Prisma } from '@prisma/client'
import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import { auditService } from './auditService.js'
import { evaluateRules } from './automation/index.js'
import {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectQueryParams,
  EntityType,
  ProjectStatus,
  ProjectPriority,
} from '../types/index.js'
import type { ProjectPhase } from '../types/index.js'
import { AppError } from '../middleware/errorMiddleware.js'
import { projectWithRelationsSelect } from '../utils/selectFields.js'
import { generateProjectCode } from '../utils/codeGenerator.js'

/**
 * Creates a new project with audit logging
 * @param data - Project creation data
 * @param userId - ID of user creating the project
 * @returns Created project
 */
export async function createProject(data: CreateProjectInput, userId: string) {
  const code = await generateProjectCode()

  // Get next sortOrder
  const maxResult = await prisma.project.aggregate({
    _max: { sortOrder: true },
    where: { isDeleted: false },
  })
  const nextSortOrder = (maxResult._max.sortOrder ?? -1) + 1

  // Resolve phase template and copy phases
  let phasesJson: string | null = null
  let currentPhaseKey: string | null = null
  let resolvedPhaseTemplateId: string | null = data.phaseTemplateId ?? null

  if (data.phaseTemplateId) {
    const template = await prisma.workflowTemplate.findFirst({
      where: { id: data.phaseTemplateId, isActive: true, domain: 'project' },
      select: { statuses: true, transitions: true },
    })
    if (!template) {
      throw new AppError('Phase template not found', 404)
    }
    const phases = JSON.parse(template.statuses) as ProjectPhase[]
    const initialPhase = phases.find(p => p.isInitial)
    currentPhaseKey = initialPhase?.key ?? phases[0]?.key ?? null
    phasesJson = JSON.stringify({ phases, transitions: JSON.parse(template.transitions) })
  } else {
    const defaultTemplate = await prisma.workflowTemplate.findFirst({
      where: { isSystem: true, isDefault: true, domain: 'project', isActive: true },
      select: { id: true, statuses: true, transitions: true },
    })
    if (defaultTemplate) {
      resolvedPhaseTemplateId = defaultTemplate.id
      const phases = JSON.parse(defaultTemplate.statuses) as ProjectPhase[]
      const initialPhase = phases.find(p => p.isInitial)
      currentPhaseKey = initialPhase?.key ?? phases[0]?.key ?? null
      phasesJson = JSON.stringify({ phases, transitions: JSON.parse(defaultTemplate.transitions) })
    }
  }

  // Use transaction for create + audit log (Rule 10)
  const project = await prisma.$transaction(async (tx) => {
    const newProject = await tx.project.create({
      data: {
        code,
        name: data.name,
        description: data.description,
        ownerId: data.ownerId,
        templateId: data.templateId,
        startDate: data.startDate,
        targetEndDate: data.targetEndDate,
        budget: data.budget,
        priority: (data.priority as ProjectPriority) || 'medium',
        status: 'active',
        phaseTemplateId: resolvedPhaseTemplateId,
        phases: phasesJson,
        currentPhaseKey,
        createdById: userId,
        sortOrder: nextSortOrder,
      },
      select: projectWithRelationsSelect,
    })

    // Log to audit trail (convert Decimal to number for JSON serialization)
    await auditService.logCreate(
      EntityType.PROJECT,
      newProject.id,
      userId,
      { ...newProject, budget: newProject.budget ? Number(newProject.budget) : null },
      tx
    )

    return newProject
  })

  logger.info(`Project created: ${project.code}`, { projectId: project.id, userId })

  return project
}

/**
 * Retrieves projects with pagination and filters
 * @param params - Query parameters
 * @returns Paginated projects
 */
// Priority ordering: critical=0 (first in desc), high=1, medium=2, low=3
const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

export async function getProjects(
  params: ProjectQueryParams
  ) {
  const { page = 1, limit = 10, status, priority, ownerId, search, sortBy = 'createdAt', sortOrder = 'desc' } = params

  const where: Prisma.ProjectWhereInput = {
    isDeleted: false, // Rule 11: Soft Delete filter
  }

  if (status) where.status = status as ProjectStatus
  if (priority) where.priority = priority as ProjectPriority
  if (ownerId) where.ownerId = ownerId
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
      { description: { contains: search } },
    ]
  }

  const skip = (page - 1) * limit

  // Priority sorting is done in-memory (string values need semantic ordering)
  const usePrismaSorting = sortBy !== 'priority'
  const orderBy: Prisma.ProjectOrderByWithRelationInput = usePrismaSorting
    ? { [sortBy]: sortOrder }
    : { createdAt: 'desc' } // fetch all, sort in-memory for priority

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      select: {
        ...projectWithRelationsSelect,
        tasks: {
          where: { isDeleted: false },
          select: { status: true },
        },
      },
      skip: usePrismaSorting ? skip : 0,
      take: usePrismaSorting ? limit : undefined,
      orderBy,
    }),
    prisma.project.count({ where }),
  ])

  let data = projects.map(({ tasks, ...project }) => {
    const totalTasks = tasks.length
    const completed = tasks.filter((t) => t.status === 'done').length
    return {
      ...project,
      taskStats: {
        total: totalTasks,
        completed,
        blocked: tasks.filter((t) => t.status === 'blocked').length,
      },
      stats: {
        completionPercentage: totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0,
      },
    }
  })

  // In-memory sorting for priority (semantic ordering)
  if (sortBy === 'priority') {
    data.sort((a, b) => {
      const aOrder = PRIORITY_ORDER[a.priority] ?? 99
      const bOrder = PRIORITY_ORDER[b.priority] ?? 99
      return sortOrder === 'desc' ? aOrder - bOrder : bOrder - aOrder
    })
    // Manual pagination
    data = data.slice(skip, skip + limit)
  }

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}

/**
 * Retrieves a single project by ID
 * @param projectId - Project ID
 * @returns Project with relations or null
 */
export async function getProjectById(projectId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      isDeleted: false,
    },
    select: {
      ...projectWithRelationsSelect,
      tasks: {
        where: { isDeleted: false },
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          assignee: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      risks: {
        where: { isDeleted: false },
        select: {
          id: true,
          title: true,
          category: true,
          probability: true,
          impact: true,
          status: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  return project
}

/**
 * Updates a project with audit logging
 * @param projectId - Project ID
 * @param data - Update data
 * @param userId - ID of user making update
 * @returns Updated project
 */
export async function updateProject(
  projectId: string,
  data: UpdateProjectInput,
  userId: string
) {
  // Get existing project for audit log
  const existing = await prisma.project.findFirst({
    where: { id: projectId, isDeleted: false },
  })

  if (!existing) {
    return null
  }

  const oldStatus = existing.status

  // Use transaction for update + audit log (Rule 10)
  const project = await prisma.$transaction(async (tx) => {
    const updated = await tx.project.update({
      where: { id: projectId },
      data: {
        name: data.name,
        description: data.description,
        ownerId: data.ownerId,
        status: data.status as ProjectStatus | undefined,
        startDate: data.startDate,
        targetEndDate: data.targetEndDate,
        actualEndDate: data.actualEndDate,
        budget: data.budget,
        priority: data.priority as ProjectPriority | undefined,
        updatedAt: new Date(),
      },
      select: projectWithRelationsSelect,
    })

    // Log status change separately if status changed
    if (data.status && data.status !== oldStatus) {
      await auditService.logStatusChange(
        EntityType.PROJECT,
        projectId,
        userId,
        oldStatus,
        data.status,
        tx
      )
    } else {
      // Log general update (convert Decimal to number for JSON serialization)
      await auditService.logUpdate(
        EntityType.PROJECT,
        projectId,
        userId,
        { ...existing, budget: existing.budget ? Number(existing.budget) : null },
        { ...updated, budget: updated.budget ? Number(updated.budget) : null },
        tx
      )
    }

    return updated
  })

  logger.info(`Project updated: ${project.code}`, { projectId, userId })

  // Fire project_status_changed if status changed via updateProject
  if (data.status && data.status !== oldStatus) {
    evaluateRules({
      type: 'project_status_changed',
      domain: 'project',
      entityId: projectId,
      projectId,
      userId,
      data: { oldStatus, newStatus: data.status },
    }).catch(err => logger.error('Automation project_status_changed failed', { error: err }))
  }

  return project
}

/**
 * Soft deletes a project (Rule 11: Soft Delete)
 * @param projectId - Project ID
 * @param userId - ID of user deleting
 * @returns True if deleted
 */
export async function deleteProject(projectId: string, userId: string): Promise<boolean> {
  const existing = await prisma.project.findFirst({
    where: { id: projectId, isDeleted: false },
  })

  if (!existing) {
    return false
  }

  // Use transaction for soft delete + audit log (Rule 10)
  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: projectId },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    })

    // Also soft delete related tasks
    await tx.task.updateMany({
      where: { projectId },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    })

    // Convert Decimal to number for JSON serialization
    await auditService.logDelete(EntityType.PROJECT, projectId, userId, { ...existing, budget: existing.budget ? Number(existing.budget) : null }, tx)
  })

  logger.info(`Project soft deleted: ${existing.code}`, { projectId, userId })

  return true
}

/**
 * Gets project statistics
 * @param projectId - Project ID
 * @returns Project statistics
 */
export async function getProjectStats(projectId: string) {
  const [taskStats, timeStats, riskStats, documentCount] = await Promise.all([
    // Task statistics
    prisma.task.groupBy({
      by: ['status'],
      where: { projectId, isDeleted: false },
      _count: { id: true },
    }),
    // Time statistics
    prisma.timeEntry.aggregate({
      where: {
        task: { projectId, isDeleted: false },
      },
      _sum: { duration: true },
    }),
    // Risk statistics
    prisma.risk.groupBy({
      by: ['status'],
      where: { projectId, isDeleted: false },
      _count: { id: true },
    }),
    // Document count
    prisma.document.count({
      where: { projectId, isDeleted: false },
    }),
  ])

  const taskCounts = taskStats.reduce(
    (acc, item) => {
      acc[item.status] = item._count.id
      return acc
    },
    {} as Record<string, number>
  )

  const riskCounts = riskStats.reduce(
    (acc, item) => {
      acc[item.status] = item._count.id
      return acc
    },
    {} as Record<string, number>
  )

  const totalTasks = Object.values(taskCounts).reduce((a, b) => a + b, 0)
  const completedTasks = taskCounts['done'] || 0
  const totalRisks = Object.values(riskCounts).reduce((a, b) => a + b, 0)

  return {
    totalTasks,
    completedTasks,
    completionPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    totalRisks,
    totalDocuments: documentCount,
    tasks: {
      total: totalTasks,
      byStatus: taskCounts,
    },
    timeTracked: {
      totalMinutes: timeStats._sum.duration || 0,
      totalHours: Math.round((timeStats._sum.duration || 0) / 60 * 100) / 100,
    },
    risks: {
      total: totalRisks,
      byStatus: riskCounts,
    },
  }
}

/**
 * Changes project status with validation
 * @param projectId - Project ID
 * @param newStatus - New status
 * @param userId - User making the change
 * @returns Updated project or null
 */
export async function changeProjectStatus(
  projectId: string,
  newStatus: ProjectStatus,
  userId: string
) {
  if (newStatus === 'completed') {
    throw new AppError('Projects can only be completed by advancing to the final phase', 400)
  }

  const existing = await prisma.project.findFirst({
    where: { id: projectId, isDeleted: false },
  })

  if (!existing) {
    return null
  }

  const oldStatus = existing.status

  // Use transaction for update + audit log
  const project = await prisma.$transaction(async (tx) => {
    const updated = await tx.project.update({
      where: { id: projectId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
      select: projectWithRelationsSelect,
    })

    await auditService.logStatusChange(
      EntityType.PROJECT,
      projectId,
      userId,
      oldStatus,
      newStatus,
      tx
    )

    return updated
  })

  logger.info(`Project status changed: ${oldStatus} → ${newStatus}`, { projectId, userId })

  // Fire project_status_changed automation trigger
  evaluateRules({
    type: 'project_status_changed',
    domain: 'project',
    entityId: projectId,
    projectId,
    userId,
    data: { oldStatus, newStatus },
  }).catch(err => logger.error('Automation project_status_changed failed', { error: err }))

  return project
}

/**
 * Gets milestone validation data for a project.
 * For each milestone: checks child tasks completion and project document approval.
 */
async function getMilestoneValidation(projectId: string) {
  // Fetch milestones for this project
  const milestones = await prisma.task.findMany({
    where: {
      projectId,
      taskType: 'milestone',
      isDeleted: false,
    },
    orderBy: [{ dueDate: 'asc' }, { position: 'asc' }],
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
      dueDate: true,
      position: true,
      subtasks: {
        where: { isDeleted: false },
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          assignee: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { position: 'asc' },
      },
    },
  })

  // Fetch all project documents (cumulative validation)
  const documents = await prisma.document.findMany({
    where: {
      projectId,
      isDeleted: false,
    },
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  // Find the first non-done, non-cancelled milestone (current)
  let foundCurrent = false

  return milestones.map((milestone) => {
    const isCurrent =
      !foundCurrent && milestone.status !== 'done' && milestone.status !== 'cancelled'
    if (isCurrent) foundCurrent = true

    const tasks = milestone.subtasks.map((t) => ({
      id: t.id,
      code: t.code,
      title: t.title,
      status: t.status,
      assignee: t.assignee,
      isDone: t.status === 'done',
    }))

    const docs = documents.map((d) => ({
      id: d.id,
      code: d.code,
      title: d.title,
      status: d.status,
      isApproved: d.status === 'approved',
    }))

    const doneCount = tasks.filter((t) => t.isDone).length
    const approvedCount = docs.filter((d) => d.isApproved).length
    const allTasksDone = tasks.length === 0 || doneCount === tasks.length
    const allDocsApproved = docs.length === 0 || approvedCount === docs.length
    const canComplete = allTasksDone && allDocsApproved && milestone.status !== 'done' && milestone.status !== 'cancelled'

    const blockers: string[] = []
    if (!allTasksDone) {
      blockers.push(`${tasks.length - doneCount} task non completati`)
    }
    if (!allDocsApproved) {
      blockers.push(`${docs.length - approvedCount} documenti non approvati`)
    }

    return {
      milestoneId: milestone.id,
      milestoneTitle: milestone.title,
      milestoneCode: milestone.code,
      milestoneStatus: milestone.status,
      targetEndDate: milestone.dueDate?.toISOString() ?? null,
      isCurrent,
      tasks,
      documents: docs,
      validation: {
        allTasksDone,
        allDocsApproved,
        canComplete,
        blockers,
        taskProgress: { done: doneCount, total: tasks.length },
        docProgress: { approved: approvedCount, total: docs.length },
      },
    }
  })
}

/**
 * Reorders projects by updating their sortOrder values
 * @param items - Array of { id, sortOrder } pairs
 * @param userId - User making the change
 */
export async function reorderProjects(
  items: Array<{ id: string; sortOrder: number }>,
  userId: string
) {
  await prisma.$transaction(
    items.map((item) =>
      prisma.project.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder, updatedAt: new Date() },
      })
    )
  )

  logger.info(`Projects reordered: ${items.length} items`, { userId })
}

/**
 * Gets project phases with milestone completion data
 * @param projectId - Project ID
 * @returns Phase data with milestones and canAdvance flag
 */
export async function getProjectPhases(projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, isDeleted: false },
    select: {
      id: true,
      status: true,
      phases: true,
      currentPhaseKey: true,
      phaseTemplateId: true,
    },
  })

  if (!project) {
    throw new AppError('Project not found', 404)
  }

  if (!project.phases) {
    return {
      currentPhaseKey: project.currentPhaseKey,
      status: project.status,
      phases: [] as ProjectPhase[],
      transitions: {} as Record<string, string[]>,
      milestonesByPhase: {} as Record<string, unknown[]>,
      canAdvance: false,
      nextPhaseKey: null as string | null,
    }
  }

  const parsed = JSON.parse(project.phases) as {
    phases: ProjectPhase[]
    transitions: Record<string, string[]>
  }

  const milestones = await prisma.task.findMany({
    where: { projectId, taskType: 'milestone', isDeleted: false },
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
      phaseKey: true,
      dueDate: true,
      _count: { select: { subtasks: { where: { isDeleted: false } } } },
    },
    orderBy: [{ position: 'asc' }],
  })

  const milestonesByPhase: Record<string, typeof milestones> = {}
  for (const m of milestones) {
    const key = m.phaseKey ?? '__unassigned'
    if (!milestonesByPhase[key]) milestonesByPhase[key] = []
    milestonesByPhase[key].push(m)
  }

  const currentPhase = project.currentPhaseKey
  const currentMilestones = currentPhase ? (milestonesByPhase[currentPhase] ?? []) : []
  const allCurrentDone = currentMilestones.length > 0 &&
    currentMilestones.every(m => m.status === 'done' || m.status === 'cancelled')

  const nextPhases = currentPhase ? (parsed.transitions[currentPhase] ?? []) : []
  const currentOrder = parsed.phases.find(p => p.key === currentPhase)?.order ?? -1
  const forwardPhase = nextPhases
    .map(key => parsed.phases.find(p => p.key === key))
    .filter((p): p is ProjectPhase => p !== undefined)
    .find(p => p.order > currentOrder)

  return {
    currentPhaseKey: project.currentPhaseKey,
    status: project.status,
    phases: parsed.phases,
    transitions: parsed.transitions,
    milestonesByPhase,
    canAdvance: allCurrentDone && !!forwardPhase,
    nextPhaseKey: allCurrentDone && forwardPhase ? forwardPhase.key : null,
  }
}

/**
 * Advances a project to the next phase
 * @param projectId - Project ID
 * @param targetPhaseKey - Target phase key to advance to
 * @param userId - User making the change
 * @returns Updated project
 */
export async function advancePhase(projectId: string, targetPhaseKey: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, isDeleted: false },
    select: { id: true, status: true, phases: true, currentPhaseKey: true },
  })

  if (!project) throw new AppError('Project not found', 404)
  if (project.status !== 'active') throw new AppError(`Cannot advance phase: project is ${project.status}`, 400)
  if (!project.phases) throw new AppError('Project has no phases configured', 400)

  const parsed = JSON.parse(project.phases) as { phases: ProjectPhase[]; transitions: Record<string, string[]> }
  const targetPhase = parsed.phases.find(p => p.key === targetPhaseKey)
  if (!targetPhase) throw new AppError(`Phase "${targetPhaseKey}" not found in project`, 400)

  const currentKey = project.currentPhaseKey
  if (!currentKey) throw new AppError('Project has no current phase', 400)

  const allowed = parsed.transitions[currentKey] ?? []
  if (!allowed.includes(targetPhaseKey)) {
    throw new AppError(`Transition from "${currentKey}" to "${targetPhaseKey}" is not allowed`, 400)
  }

  const currentMilestones = await prisma.task.findMany({
    where: { projectId, taskType: 'milestone', phaseKey: currentKey, isDeleted: false },
    select: { id: true, status: true, title: true },
  })

  const incompleteMilestones = currentMilestones.filter(m => m.status !== 'done' && m.status !== 'cancelled')
  if (incompleteMilestones.length > 0) {
    const names = incompleteMilestones.map(m => m.title).join(', ')
    throw new AppError(`Cannot advance: ${incompleteMilestones.length} milestone(s) incomplete: ${names}`, 400)
  }

  const newStatus = targetPhase.isFinal ? 'completed' : 'active'

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.project.update({
      where: { id: projectId },
      data: {
        currentPhaseKey: targetPhaseKey,
        status: newStatus,
        actualEndDate: targetPhase.isFinal ? new Date() : undefined,
        updatedAt: new Date(),
      },
      select: projectWithRelationsSelect,
    })

    await auditService.logStatusChange(EntityType.PROJECT, projectId, userId, `phase:${currentKey}`, `phase:${targetPhaseKey}`, tx)
    return result
  })

  logger.info(`Project phase advanced: ${currentKey} → ${targetPhaseKey}`, { projectId, userId })

  evaluateRules({
    type: 'project_status_changed',
    domain: 'project',
    entityId: projectId,
    projectId,
    userId,
    data: { oldPhase: currentKey, newPhase: targetPhaseKey, oldStatus: project.status, newStatus },
  }).catch(err => logger.error('Automation phase advance failed', { error: err }))

  return updated
}

/**
 * Updates phases configuration for a project
 * @param projectId - Project ID
 * @param newPhases - New phase definitions
 * @param newTransitions - New transition map
 * @param userId - User making the change
 * @returns Updated project
 */
export async function updateProjectPhases(
  projectId: string,
  newPhases: ProjectPhase[],
  newTransitions: Record<string, string[]>,
  userId: string
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, isDeleted: false },
    select: { id: true, phases: true, currentPhaseKey: true },
  })
  if (!project) throw new AppError('Project not found', 404)

  if (project.phases) {
    const oldParsed = JSON.parse(project.phases) as { phases: ProjectPhase[] }
    const oldKeys = new Set(oldParsed.phases.map(p => p.key))
    const newKeys = new Set(newPhases.map(p => p.key))
    const removedKeys = [...oldKeys].filter(k => !newKeys.has(k))

    if (removedKeys.length > 0) {
      const milestonesInRemoved = await prisma.task.count({
        where: { projectId, taskType: 'milestone', phaseKey: { in: removedKeys }, isDeleted: false },
      })
      if (milestonesInRemoved > 0) {
        throw new AppError('Cannot remove phases with assigned milestones. Reassign milestones first.', 400)
      }
    }
  }

  const newKeys = new Set(newPhases.map(p => p.key))
  let currentPhaseKey = project.currentPhaseKey
  if (currentPhaseKey && !newKeys.has(currentPhaseKey)) {
    const initial = newPhases.find(p => p.isInitial) ?? newPhases[0]
    currentPhaseKey = initial?.key ?? null
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      phases: JSON.stringify({ phases: newPhases, transitions: newTransitions }),
      currentPhaseKey,
      updatedAt: new Date(),
    },
    select: projectWithRelationsSelect,
  })

  logger.info('Project phases updated', { projectId, userId })
  return updated
}

/**
 * Saves the current project's phases as a reusable workflow template
 * @param projectId - Project ID
 * @param name - Template name
 * @param description - Template description
 * @param userId - User making the change
 * @returns Created template reference
 */
export async function savePhasesAsTemplate(
  projectId: string,
  name: string,
  description: string | undefined,
  userId: string
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, isDeleted: false },
    select: { phases: true },
  })
  if (!project?.phases) throw new AppError('Project has no phases to save', 400)

  const parsed = JSON.parse(project.phases) as { phases: ProjectPhase[]; transitions: Record<string, string[]> }

  const existing = await prisma.workflowTemplate.findFirst({
    where: { name, isActive: true },
    select: { id: true },
  })
  if (existing) throw new AppError(`A template named "${name}" already exists`, 409)

  const template = await prisma.workflowTemplate.create({
    data: {
      name,
      description: description ?? null,
      domain: 'project',
      statuses: JSON.stringify(parsed.phases),
      transitions: JSON.stringify(parsed.transitions),
      isDefault: false,
      isSystem: false,
      isActive: true,
      createdById: userId,
    },
  })

  logger.info('Phases saved as template', { projectId, templateId: template.id, userId })
  return { id: template.id, name: template.name }
}

export const projectService = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectStats,
  changeProjectStatus,
  getMilestoneValidation,
  reorderProjects,
  getProjectPhases,
  advancePhase,
  updateProjectPhases,
  savePhasesAsTemplate,
}
