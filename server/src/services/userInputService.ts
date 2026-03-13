/**
 * User Input Service - Business logic for user inputs (segnalazioni/suggerimenti)
 * @module services/userInputService
 */

import { Prisma } from '@prisma/client'
import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import { auditService } from './auditService.js'
import { notificationService } from './notificationService.js'
import { parseMentionedUserIds } from '../utils/mentions.js'
import { userInputWithRelationsSelect } from '../utils/selectFields.js'
import { buildPagination } from '../utils/paginate.js'
import { PaginatedResponse, EntityType, PaginationParams, InputCategory, InputStatus, TaskPriority } from '../types/index.js'
import { AppError } from '../middleware/errorMiddleware.js'
import { buildPrismaScopeWhere } from '../utils/scopeFilter.js'
import {
  generateInputCode,
  generateStandaloneTaskCode,
  generateTaskCode,
  generateProjectCode,
} from '../utils/codeGenerator.js'

// ============================================================
// TYPES
// ============================================================

export interface UserInputQueryParams extends PaginationParams {
  status?: string
  category?: string
  priority?: string
  createdById?: string
  search?: string
}

export interface CreateUserInputData {
  title: string
  description?: string
  category?: InputCategory
  priority?: TaskPriority
  attachments?: string[]
}

export interface UpdateUserInputData {
  title?: string
  description?: string
  category?: InputCategory
  priority?: TaskPriority
  attachments?: string[]
}

export interface ConvertToTaskData {
  projectId?: string
  assigneeId?: string
  priority?: TaskPriority
  dueDate?: Date
  estimatedHours?: number
}

export interface ConvertToProjectData {
  name?: string
  description?: string
  ownerId: string
  templateId?: string
  priority?: string
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Parses the JSON-string attachments field back to a string array.
 * The DB stores attachments as NVarChar(Max) JSON (e.g. "[]"), so we must
 * deserialize before returning to callers.
 */
function parseAttachments<T extends { attachments: unknown }>(input: T): T & { attachments: string[] } {
  return {
    ...input,
    attachments: JSON.parse((input.attachments as string) || '[]') as string[],
  }
}

function parseAttachmentsMany<T extends { attachments: unknown }>(inputs: T[]): (T & { attachments: string[] })[] {
  return inputs.map(parseAttachments)
}


// ============================================================
// CRUD OPERATIONS
// ============================================================

/**
 * Creates a new user input
 */
export async function createUserInput(data: CreateUserInputData, userId: string) {
  const code = await generateInputCode()

  const userInput = await prisma.$transaction(async (tx) => {
    const newInput = await tx.userInput.create({
      data: {
        code,
        title: data.title,
        description: data.description,
        category: data.category || 'other',
        priority: data.priority || 'medium',
        attachments: JSON.stringify(data.attachments || []),
        createdById: userId,
      },
      select: userInputWithRelationsSelect,
    })

    // Log to audit trail
    await auditService.logCreate(EntityType.USER_INPUT, newInput.id, userId, { ...newInput }, tx)

    // Notify admins about new input
    const admins = await tx.user.findMany({
      where: { role: 'admin', isActive: true },
      select: { id: true },
    })

    for (const admin of admins) {
      if (admin.id !== userId) {
        await notificationService.createNotification({
          userId: admin.id,
          type: 'input_received',
          title: 'New User Input',
          message: `New input received: ${newInput.title}`,
          data: { inputId: newInput.id, inputCode: newInput.code },
        }, tx)
      }
    }

    // Notify users mentioned in the description
    if (newInput.description) {
      const mentionedIds = await parseMentionedUserIds(newInput.description, userId, tx)
      for (const mentionedId of mentionedIds) {
        // Skip if already notified as admin
        const alreadyNotified = admins.some((a) => a.id === mentionedId)
        if (!alreadyNotified) {
          await notificationService.createNotification({
            userId: mentionedId,
            type: 'input_mention',
            title: 'Sei stato menzionato in una segnalazione',
            message: `Sei stato menzionato nella segnalazione "${newInput.title}" (${newInput.code})`,
            data: { inputId: newInput.id, inputCode: newInput.code },
          }, tx)
        }
      }
    }

    return parseAttachments(newInput)
  })

  logger.info(`User input created: ${userInput.code}`, { inputId: userInput.id, userId })

  return userInput
}

/**
 * Retrieves user inputs with pagination and filters
 */
export async function getUserInputs(
  params: UserInputQueryParams & { userId?: string; role?: string }
): Promise<PaginatedResponse<Prisma.UserInputGetPayload<{ select: typeof userInputWithRelationsSelect }>>> {
  const { page = 1, limit = 20, status, category, priority, createdById, search, userId, role } = params

  const where: Prisma.UserInputWhereInput = {
    isDeleted: false,
  }

  if (status) where.status = status as InputStatus
  if (category) where.category = category as InputCategory
  if (priority) where.priority = priority as TaskPriority
  if (createdById) where.createdById = createdById
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { code: { contains: search } },
      { description: { contains: search } },
    ]
  }

  // Scope=mine filter: non-direzione users see only their own records
  if (userId && role) {
    const scopeWhere = await buildPrismaScopeWhere(userId, role, 'userInput')
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

  const [inputs, total] = await Promise.all([
    prisma.userInput.findMany({
      where,
      select: userInputWithRelationsSelect,
      skip,
      take: limit,
      orderBy: [{ createdAt: 'desc' }],
    }),
    prisma.userInput.count({ where }),
  ])

  return {
    data: parseAttachmentsMany(inputs),
    pagination: buildPagination(page, limit, total),
  }
}

/**
 * Gets user inputs created by a specific user
 */
export async function getMyUserInputs(userId: string, params: UserInputQueryParams) {
  return getUserInputs({ ...params, createdById: userId })
}

/**
 * Retrieves a single user input by ID
 */
export async function getUserInputById(inputId: string) {
  const input = await prisma.userInput.findFirst({
    where: {
      id: inputId,
      isDeleted: false,
    },
    select: userInputWithRelationsSelect,
  })

  return input ? parseAttachments(input) : null
}

/**
 * Updates a user input (only owner can update, and only if status is pending)
 */
export async function updateUserInput(
  inputId: string,
  data: UpdateUserInputData,
  userId: string,
  userRole: string
) {
  const existing = await prisma.userInput.findFirst({
    where: { id: inputId, isDeleted: false },
  })

  if (!existing) {
    return null
  }

  // Check permissions: owner can edit if pending, admin can always edit
  const isOwner = existing.createdById === userId
  const isAdmin = userRole === 'admin'
  const isPending = existing.status === 'pending'

  if (!isAdmin && (!isOwner || !isPending)) {
    throw new AppError('Permission denied', 403)
  }

  const userInput = await prisma.$transaction(async (tx) => {
    const updated = await tx.userInput.update({
      where: { id: inputId },
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        attachments: data.attachments ? JSON.stringify(data.attachments) : undefined,
        updatedAt: new Date(),
      },
      select: userInputWithRelationsSelect,
    })

    await auditService.logUpdate(EntityType.USER_INPUT, inputId, userId, { ...existing }, { ...updated }, tx)

    return parseAttachments(updated)
  })

  logger.info(`User input updated: ${userInput.code}`, { inputId, userId })

  return userInput
}

/**
 * Starts processing a user input
 */
export async function startProcessing(inputId: string, userId: string) {
  const existing = await prisma.userInput.findFirst({
    where: { id: inputId, isDeleted: false },
  })

  if (!existing) {
    return null
  }

  if (existing.status !== 'pending') {
    throw new AppError('Input is not in pending status', 400)
  }

  const userInput = await prisma.$transaction(async (tx) => {
    const updated = await tx.userInput.update({
      where: { id: inputId },
      data: {
        status: 'processing',
        processedById: userId,
        processedAt: new Date(),
      },
      select: userInputWithRelationsSelect,
    })

    await auditService.logStatusChange(EntityType.USER_INPUT, inputId, userId, 'pending', 'processing', tx)

    // Notify creator
    if (existing.createdById !== userId) {
      await notificationService.createNotification({
        userId: existing.createdById,
        type: 'input_processed',
        title: 'Input Being Processed',
        message: `Your input "${existing.title}" is now being processed`,
        data: { inputId: updated.id, inputCode: updated.code },
      }, tx)
    }

    return parseAttachments(updated)
  })

  logger.info(`User input processing started: ${userInput.code}`, { inputId, userId })

  return userInput
}

/**
 * Converts user input to task
 */
export async function convertToTask(inputId: string, data: ConvertToTaskData, userId: string) {
  const existing = await prisma.userInput.findFirst({
    where: { id: inputId, isDeleted: false },
  })

  if (!existing) {
    return null
  }

  if (existing.status === 'resolved') {
    throw new AppError('Input is already resolved', 400)
  }

  const result = await prisma.$transaction(async (tx) => {
    // Generate task code
    let taskCode: string
    if (data.projectId) {
      const project = await tx.project.findFirst({
        where: { id: data.projectId, isDeleted: false },
        select: { code: true },
      })
      if (!project) {
        throw new AppError('Project not found', 404)
      }
      taskCode = await generateTaskCode(project.code, data.projectId)
    } else {
      taskCode = await generateStandaloneTaskCode()
    }

    // Create task
    const task = await tx.task.create({
      data: {
        code: taskCode,
        title: existing.title,
        description: existing.description,
        projectId: data.projectId || null,
        assigneeId: data.assigneeId,
        createdById: userId,
        priority: data.priority || existing.priority,
        dueDate: data.dueDate,
        estimatedHours: data.estimatedHours,
      },
      select: { id: true, code: true, title: true },
    })

    // Update user input
    const updated = await tx.userInput.update({
      where: { id: inputId },
      data: {
        status: 'resolved',
        resolutionType: 'converted_to_task',
        resolutionNotes: `Converted to task ${task.code}`,
        resolvedAt: new Date(),
        convertedTaskId: task.id,
        processedById: userId,
        processedAt: existing.processedAt || new Date(),
      },
      select: userInputWithRelationsSelect,
    })

    await auditService.logUpdate(
      EntityType.USER_INPUT,
      inputId,
      userId,
      { ...existing },
      { ...updated, resolutionType: 'converted_to_task' },
      tx
    )

    // Notify creator
    if (existing.createdById !== userId) {
      await notificationService.createNotification({
        userId: existing.createdById,
        type: 'input_converted',
        title: 'Input Converted to Task',
        message: `Your input "${existing.title}" has been converted to task ${task.code}`,
        data: { inputId: updated.id, taskId: task.id, taskCode: task.code },
      }, tx)
    }

    return { userInput: parseAttachments(updated), task }
  })

  logger.info(`User input converted to task: ${existing.code} -> ${result.task.code}`, {
    inputId,
    taskId: result.task.id,
    userId,
  })

  return result
}

/**
 * Converts user input to project
 */
export async function convertToProject(inputId: string, data: ConvertToProjectData, userId: string) {
  const existing = await prisma.userInput.findFirst({
    where: { id: inputId, isDeleted: false },
  })

  if (!existing) {
    return null
  }

  if (existing.status === 'resolved') {
    throw new AppError('Input is already resolved', 400)
  }

  // Generate project code before transaction (uses separate query)
  const projectCode = await generateProjectCode()

  const result = await prisma.$transaction(async (tx) => {
    // Create project
    const project = await tx.project.create({
      data: {
        code: projectCode,
        name: data.name || existing.title,
        description: data.description || existing.description,
        ownerId: data.ownerId,
        createdById: userId,
        templateId: data.templateId,
        priority: (data.priority as 'low' | 'medium' | 'high') || 'medium',
      },
      select: { id: true, code: true, name: true },
    })

    // Update user input
    const updated = await tx.userInput.update({
      where: { id: inputId },
      data: {
        status: 'resolved',
        resolutionType: 'converted_to_project',
        resolutionNotes: `Converted to project ${project.code}`,
        resolvedAt: new Date(),
        convertedProjectId: project.id,
        processedById: userId,
        processedAt: existing.processedAt || new Date(),
      },
      select: userInputWithRelationsSelect,
    })

    await auditService.logUpdate(
      EntityType.USER_INPUT,
      inputId,
      userId,
      { ...existing },
      { ...updated, resolutionType: 'converted_to_project' },
      tx
    )

    // Notify creator
    if (existing.createdById !== userId) {
      await notificationService.createNotification({
        userId: existing.createdById,
        type: 'input_converted',
        title: 'Input Converted to Project',
        message: `Your input "${existing.title}" has been converted to project ${project.code}`,
        data: { inputId: updated.id, projectId: project.id, projectCode: project.code },
      }, tx)
    }

    return { userInput: parseAttachments(updated), project }
  })

  logger.info(`User input converted to project: ${existing.code} -> ${result.project.code}`, {
    inputId,
    projectId: result.project.id,
    userId,
  })

  return result
}

/**
 * Acknowledges a user input (presa visione)
 */
export async function acknowledgeInput(inputId: string, notes: string | undefined, userId: string) {
  const existing = await prisma.userInput.findFirst({
    where: { id: inputId, isDeleted: false },
  })

  if (!existing) {
    return null
  }

  if (existing.status === 'resolved') {
    throw new AppError('Input is already resolved', 400)
  }

  const userInput = await prisma.$transaction(async (tx) => {
    const updated = await tx.userInput.update({
      where: { id: inputId },
      data: {
        status: 'resolved',
        resolutionType: 'acknowledged',
        resolutionNotes: notes || 'Acknowledged',
        resolvedAt: new Date(),
        processedById: userId,
        processedAt: existing.processedAt || new Date(),
      },
      select: userInputWithRelationsSelect,
    })

    await auditService.logUpdate(
      EntityType.USER_INPUT,
      inputId,
      userId,
      { ...existing },
      { ...updated, resolutionType: 'acknowledged' },
      tx
    )

    // Notify creator
    if (existing.createdById !== userId) {
      await notificationService.createNotification({
        userId: existing.createdById,
        type: 'input_processed',
        title: 'Input Acknowledged',
        message: `Your input "${existing.title}" has been acknowledged`,
        data: { inputId: updated.id, inputCode: updated.code },
      }, tx)
    }

    return parseAttachments(updated)
  })

  logger.info(`User input acknowledged: ${userInput.code}`, { inputId, userId })

  return userInput
}

/**
 * Rejects a user input
 */
export async function rejectInput(inputId: string, reason: string, userId: string) {
  const existing = await prisma.userInput.findFirst({
    where: { id: inputId, isDeleted: false },
  })

  if (!existing) {
    return null
  }

  if (existing.status === 'resolved') {
    throw new AppError('Input is already resolved', 400)
  }

  const userInput = await prisma.$transaction(async (tx) => {
    const updated = await tx.userInput.update({
      where: { id: inputId },
      data: {
        status: 'resolved',
        resolutionType: 'rejected',
        resolutionNotes: reason,
        resolvedAt: new Date(),
        processedById: userId,
        processedAt: existing.processedAt || new Date(),
      },
      select: userInputWithRelationsSelect,
    })

    await auditService.logUpdate(
      EntityType.USER_INPUT,
      inputId,
      userId,
      { ...existing },
      { ...updated, resolutionType: 'rejected' },
      tx
    )

    // Notify creator
    if (existing.createdById !== userId) {
      await notificationService.createNotification({
        userId: existing.createdById,
        type: 'input_processed',
        title: 'Input Rejected',
        message: `Your input "${existing.title}" has been rejected: ${reason}`,
        data: { inputId: updated.id, inputCode: updated.code, reason },
      }, tx)
    }

    return parseAttachments(updated)
  })

  logger.info(`User input rejected: ${userInput.code}`, { inputId, userId, reason })

  return userInput
}

/**
 * Soft deletes a user input
 */
export async function deleteUserInput(inputId: string, userId: string, userRole: string): Promise<boolean> {
  const existing = await prisma.userInput.findFirst({
    where: { id: inputId, isDeleted: false },
  })

  if (!existing) {
    return false
  }

  // Check permissions: owner can delete if pending, admin can always delete
  const isOwner = existing.createdById === userId
  const isAdmin = userRole === 'admin'
  const isPending = existing.status === 'pending'

  if (!isAdmin && (!isOwner || !isPending)) {
    throw new AppError('Permission denied', 403)
  }

  await prisma.$transaction(async (tx) => {
    await tx.userInput.update({
      where: { id: inputId },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    })

    await auditService.logDelete(EntityType.USER_INPUT, inputId, userId, { ...existing }, tx)
  })

  logger.info(`User input soft deleted: ${existing.code}`, { inputId, userId })

  return true
}

/**
 * Gets user input statistics
 */
export async function getUserInputStats() {
  const [byStatus, byCategory, total, pending] = await Promise.all([
    prisma.userInput.groupBy({
      by: ['status'],
      where: { isDeleted: false },
      _count: { id: true },
    }),
    prisma.userInput.groupBy({
      by: ['category'],
      where: { isDeleted: false },
      _count: { id: true },
    }),
    prisma.userInput.count({
      where: { isDeleted: false },
    }),
    prisma.userInput.count({
      where: { isDeleted: false, status: 'pending' },
    }),
  ])

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
    pending,
    byStatus: statusCounts,
    byCategory: categoryCounts,
  }
}

export const userInputService = {
  createUserInput,
  getUserInputs,
  getMyUserInputs,
  getUserInputById,
  updateUserInput,
  startProcessing,
  convertToTask,
  convertToProject,
  acknowledgeInput,
  rejectInput,
  deleteUserInput,
  getUserInputStats,
}
