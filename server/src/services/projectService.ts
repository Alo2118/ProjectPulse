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
import { projectWithRelationsSelect } from '../utils/selectFields.js'

/**
 * Generates unique project code in format PRJ-YYYY-NNN
 * @returns Generated project code
 */
async function generateProjectCode(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `PRJ-${year}`

  const lastProject = await prisma.project.findFirst({
    where: {
      code: { startsWith: prefix },
    },
    orderBy: { code: 'desc' },
    select: { code: true },
  })

  let nextNumber = 1
  if (lastProject?.code) {
    const lastNumber = parseInt(lastProject.code.split('-')[2], 10)
    nextNumber = lastNumber + 1
  }

  return `${prefix}-${String(nextNumber).padStart(3, '0')}`
}

/**
 * Creates a new project with audit logging
 * @param data - Project creation data
 * @param userId - ID of user creating the project
 * @returns Created project
 */
export async function createProject(data: CreateProjectInput, userId: string) {
  const code = await generateProjectCode()

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
        createdById: userId,
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
export async function getProjects(
  params: ProjectQueryParams
  ) {
  const { page = 1, limit = 10, status, priority, ownerId, search } = params

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
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.project.count({ where }),
  ])

  const data = projects.map(({ tasks, ...project }) => ({
    ...project,
    taskStats: {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === 'done').length,
      blocked: tasks.filter((t) => t.status === 'blocked').length,
    },
  }))

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
  const [taskStats, timeStats, riskStats] = await Promise.all([
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

  return {
    tasks: {
      total: Object.values(taskCounts).reduce((a, b) => a + b, 0),
      byStatus: taskCounts,
    },
    timeTracked: {
      totalMinutes: timeStats._sum.duration || 0,
      totalHours: Math.round((timeStats._sum.duration || 0) / 60 * 100) / 100,
    },
    risks: {
      total: Object.values(riskCounts).reduce((a, b) => a + b, 0),
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
        actualEndDate: newStatus === 'completed' ? new Date() : undefined,
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

export const projectService = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectStats,
  changeProjectStatus,
}
