/**
 * Recurrence Service - Business logic for recurring tasks
 * @module services/recurrenceService
 */

import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import {
  RecurrencePattern,
  RecurrenceType,
  CreateTaskCompletionInput,
  TaskCompletionResponse,
  RecurringTaskResponse,
} from '../types/index.js'
import { auditService } from './auditService.js'
import { EntityType } from '../types/index.js'

/**
 * Calculate next occurrence date based on recurrence pattern
 */
export function calculateNextOccurrence(
  lastDate: Date,
  pattern: RecurrencePattern
): Date | null {
  const next = new Date(lastDate)

  switch (pattern.type) {
    case RecurrenceType.DAILY:
      next.setDate(next.getDate() + pattern.interval)
      break

    case RecurrenceType.WEEKLY:
      if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
        // Compute next occurrence based on sorted days of week
        const daysOfWeek = [...pattern.daysOfWeek].sort((a, b) => a - b)
        const dayOfWeek = next.getDay()
        const remainingDays = daysOfWeek.filter((d) => d > dayOfWeek)

        if (remainingDays.length > 0) {
          next.setDate(next.getDate() + (remainingDays[0] - dayOfWeek))
        } else {
          const daysToAdd = pattern.interval * 7 - (dayOfWeek - daysOfWeek[0])
          next.setDate(next.getDate() + daysToAdd)
        }
      } else {
        next.setDate(next.getDate() + pattern.interval * 7)
      }
      break

    case RecurrenceType.MONTHLY:
      next.setMonth(next.getMonth() + pattern.interval)
      if (pattern.dayOfMonth) {
        next.setDate(Math.min(pattern.dayOfMonth, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()))
      }
      break

    case RecurrenceType.YEARLY:
      next.setFullYear(next.getFullYear() + pattern.interval)
      break
  }

  // Check if pattern has ended
  if (pattern.recurrenceEnd && next > new Date(pattern.recurrenceEnd)) {
    return null
  }

  return next
}

/**
 * Mark a recurring task occurrence as complete
 */
export async function completeOccurrence(
  taskId: string,
  data: CreateTaskCompletionInput,
  userId: string
): Promise<TaskCompletionResponse> {
  // Verify task exists and is recurring
  const task = await prisma.task.findFirst({
    where: { id: taskId, isDeleted: false },
    select: {
      id: true,
      title: true,
      isRecurring: true,
      recurrencePattern: true,
    },
  })

  if (!task) {
    throw new Error('Task not found')
  }

  if (!task.isRecurring) {
    throw new Error('Task is not recurring')
  }

  // Create completion record in transaction
  const completion = await prisma.$transaction(async (tx) => {
    const newCompletion = await tx.taskCompletion.create({
      data: {
        taskId,
        completedBy: data.completedBy,
        notes: data.notes,
      },
      select: {
        id: true,
        taskId: true,
        completedBy: true,
        completedAt: true,
        notes: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Log to audit trail
    await auditService.logCreate(
      EntityType.TASK,
      taskId,
      userId,
      { completionId: newCompletion.id, notes: data.notes },
      tx
    )

    return newCompletion
  })

  logger.info(`Task occurrence completed: ${task.title}`, {
    taskId,
    completedBy: data.completedBy,
  })

  return completion as TaskCompletionResponse
}

/**
 * Get task completion history
 */
export async function getCompletionHistory(
  taskId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{
  completions: TaskCompletionResponse[]
  total: number
}> {
  const [completions, total] = await Promise.all([
    prisma.taskCompletion.findMany({
      where: { taskId, isDeleted: false },
      select: {
        id: true,
        taskId: true,
        completedBy: true,
        completedAt: true,
        notes: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.taskCompletion.count({
      where: { taskId, isDeleted: false },
    }),
  ])

  return {
    completions: completions as TaskCompletionResponse[],
    total,
  }
}

/**
 * Get recurring task with completion info
 */
export async function getRecurringTaskWithCompletions(
  taskId: string
): Promise<RecurringTaskResponse | null> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, isDeleted: false },
    select: {
      id: true,
      code: true,
      title: true,
      description: true,
      taskType: true,
      status: true,
      priority: true,
      projectId: true,
      assigneeId: true,
      createdById: true,
      parentTaskId: true,
      startDate: true,
      dueDate: true,
      estimatedHours: true,
      actualHours: true,
      tags: true,
      position: true,
      blockedReason: true,
      isRecurring: true,
      recurrencePattern: true,
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
      assignee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      project: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      completions: {
        where: { isDeleted: false },
        orderBy: { completedAt: 'desc' },
        take: 1,
        select: {
          id: true,
          taskId: true,
          completedBy: true,
          completedAt: true,
          notes: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  })

  if (!task) {
    return null
  }

  let nextOccurrence: Date | null | undefined

  const lastCompletion = task.completions?.[0]

  if (task.isRecurring && task.recurrencePattern) {
    const pattern = task.recurrencePattern as unknown as RecurrencePattern

    if (lastCompletion) {
      nextOccurrence = calculateNextOccurrence(lastCompletion.completedAt, pattern)
    } else {
      // No completions yet, next occurrence is now or start date
      nextOccurrence = task.startDate || new Date()
    }
  }

  const lastCompletionInfo = lastCompletion
    ? {
        id: lastCompletion.id,
        taskId: lastCompletion.taskId,
        completedBy: lastCompletion.completedBy,
        completedAt: lastCompletion.completedAt,
        notes: lastCompletion.notes,
        user: {
          id: lastCompletion.user?.id || '',
          firstName: lastCompletion.user?.firstName || '',
          lastName: lastCompletion.user?.lastName || '',
        },
      }
    : undefined

  return {
    ...task,
    recurrencePattern: task.recurrencePattern as unknown as RecurrencePattern | undefined,
    lastCompletion: lastCompletionInfo,
    nextOccurrence,
  } as RecurringTaskResponse
}

/**
 * Set or update recurrence for a task
 */
export async function setRecurrence(
  taskId: string,
  isRecurring: boolean,
  pattern: RecurrencePattern | undefined,
  userId: string
): Promise<RecurringTaskResponse | null> {
  // Allow saving as recurring without pattern

  // Validate pattern if provided
  if (pattern) {
    if (!pattern.type || !Object.values(RecurrenceType).includes(pattern.type)) {
      throw new Error('Invalid recurrence type')
    }
    if (!pattern.interval || pattern.interval < 1) {
      throw new Error('Interval must be >= 1')
    }
  }

  const task = await prisma.$transaction(async (tx) => {
    const updatedTask = await tx.task.update({
      where: { id: taskId },
      data: {
        isRecurring,
        recurrencePattern: isRecurring ? (pattern as unknown as any) : null,
      },
      select: {
        id: true,
        code: true,
        title: true,
        isRecurring: true,
        recurrencePattern: true,
      },
    })

    // Log to audit trail
    await auditService.logUpdate(
      EntityType.TASK,
      taskId,
      userId,
      {
        isRecurring,
        recurrencePattern: pattern,
      },
      tx
    )

    return updatedTask
  })

  logger.info(`Task recurrence updated: ${task.code}`, {
    taskId,
    isRecurring,
  })

  return getRecurringTaskWithCompletions(taskId)
}

/**
 * Clean old completions (soft delete) for a task
 */
export async function purgeOldCompletions(
  taskId: string,
  keepCount: number = 10,
  userId: string
): Promise<{ purged: number }> {
  // Get all completions sorted by date
  const completions = await prisma.taskCompletion.findMany({
    where: { taskId, isDeleted: false },
    orderBy: { completedAt: 'desc' },
    select: { id: true },
  })

  if (completions.length <= keepCount) {
    return { purged: 0 }
  }

  const toPurge = completions.slice(keepCount).map((c) => c.id)

  await prisma.$transaction(async (tx) => {
    await tx.taskCompletion.updateMany({
      where: { id: { in: toPurge } },
      data: { isDeleted: true },
    })

    // Log the purge
    await auditService.logDelete(
      EntityType.TASK,
      taskId,
      userId,
      { purgedCompletions: toPurge.length },
      tx
    )
  })

  logger.info(`Purged old completions for task: ${taskId}`, {
    purged: toPurge.length,
  })

  return { purged: toPurge.length }
}
