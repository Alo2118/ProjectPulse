/**
 * Task Service - Business logic for task management
 * @module services/taskService
 */

import { Prisma } from '@prisma/client'
import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import { auditService } from './auditService.js'
import { parseMentionedUserIds } from '../utils/mentions.js'
import { AppError } from '../middleware/errorMiddleware.js'
import * as workflowService from './workflowService.js'
import { notificationService } from './notificationService.js'
import { evaluateRules } from './automation/index.js'
import type { TriggerEvent } from './automation/types.js'
import { toNumber } from '../utils/toNumber.js'
import { getIO } from '../socket/socketManager.js'
import {
  emitTaskCreated,
  emitTaskUpdated,
  emitTaskStatusChanged,
  emitTaskDeleted,
} from '../socket/index.js'
import {
  CreateTaskInput,
  UpdateTaskInput,
  TaskQueryParams,
  PaginatedResponse,
  EntityType,
  GanttQueryParams,
  GanttTask,
  CreateTaskDependencyInput,
  TaskDependencyResponse,
  TaskStatus,
  TaskPriority,
  TaskType,
} from '../types/index.js'
import { taskSelectFields, taskWithRelationsSelect } from '../utils/selectFields.js'
import { getTaskStats } from './statsService.js'

/**
 * Generates unique task code based on project, task type, and standalone prefix
 * Milestone: PRJ-M001, Task/Subtask: PRJ-T001, Standalone: STD-T001
 * @param projectCode - Project code (null for standalone)
 * @param projectId - Project ID (null for standalone)
 * @param taskType - Type of task (milestone, task, subtask)
 * @returns Generated task code
 */
async function generateTaskCode(
  projectCode: string | null,
  projectId: string | null,
  taskType: TaskType = 'task'
): Promise<string> {
  const prefix = projectCode ?? 'STD'
  const typePrefix = taskType === 'milestone' ? 'M' : 'T'

  const whereClause = projectId
    ? { projectId, code: { startsWith: `${prefix}-${typePrefix}` } }
    : { projectId: null, code: { startsWith: `STD-${typePrefix}` } }

  logger.info('Generating task code:', { prefix, typePrefix, whereClause })

  const lastTask = await prisma.task.findFirst({
    where: whereClause,
    orderBy: { code: 'desc' },
    select: { code: true },
  })

  logger.info('Last task found:', { lastTask })

  let nextNumber = 1
  if (lastTask?.code) {
    const parts = lastTask.code.split(`-${typePrefix}`)
    if (parts.length > 1) {
      nextNumber = parseInt(parts[1], 10) + 1
    }
  }

  // Verify code is unique and increment if necessary
  let generatedCode = `${prefix}-${typePrefix}${String(nextNumber).padStart(3, '0')}`
  let attempts = 0
  const maxAttempts = 100
  
  while (attempts < maxAttempts) {
    const existing = await prisma.task.findUnique({
      where: { code: generatedCode },
      select: { id: true }
    })
    
    if (!existing) {
      break // Code is unique, we can use it
    }
    
    // Code exists, try next number
    nextNumber++
    generatedCode = `${prefix}-${typePrefix}${String(nextNumber).padStart(3, '0')}`
    attempts++
  }
  
  if (attempts >= maxAttempts) {
    throw new Error('Could not generate unique task code after max attempts')
  }

  logger.info('Generated unique task code:', { generatedCode, attempts })

  return generatedCode
}

/**
 * Creates a new task with audit logging
 * Hierarchy rules:
 * - milestone: can only contain tasks (not subtasks)
 * - task: can only contain subtasks
 * - subtask: cannot contain children
 * @param data - Task creation data
 * @param userId - ID of user creating the task
 * @returns Created task
 * @throws Error if project not found or hierarchy violated
 */
export async function createTask(data: CreateTaskInput, userId: string) {
  let projectCode: string | null = null
  let projectId: string | null = null
  let taskType: TaskType = (data.taskType as TaskType) || 'task'

  // Verify project if provided
  if (data.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, isDeleted: false },
      select: { id: true, code: true },
    })

    if (!project) {
      throw new Error('Project not found')
    }
    projectCode = project.code
    projectId = project.id
  }

  // Verify parent task if provided and validate hierarchy
  if (data.parentTaskId) {
    const parentTask = await prisma.task.findFirst({
      where: { id: data.parentTaskId, isDeleted: false },
      select: { id: true, projectId: true, taskType: true, assigneeId: true, departmentId: true },
    })

    if (!parentTask) {
      throw new Error('Parent task not found')
    }

    // Validate hierarchy rules
    if (parentTask.taskType === 'milestone') {
      // Milestone can only contain tasks
      if (taskType === 'subtask') {
        throw new Error('Milestone can only contain tasks, not subtasks directly')
      }
      if (taskType === 'milestone') {
        throw new Error('Milestone cannot contain other milestones')
      }
      taskType = 'task' // Force to task if under milestone
    } else if (parentTask.taskType === 'task') {
      // Task can only contain subtasks
      if (taskType === 'milestone') {
        throw new Error('Task cannot contain milestones')
      }
      if (taskType === 'task') {
        taskType = 'subtask' // Auto-convert to subtask if under task
      }
    } else if (parentTask.taskType === 'subtask') {
      // Subtask cannot contain children
      throw new Error('Subtask cannot contain children')
    }

    // Inherit project from parent if not specified
    if (!projectId && parentTask.projectId) {
      const parentProject = await prisma.project.findFirst({
        where: { id: parentTask.projectId, isDeleted: false },
        select: { id: true, code: true },
      })
      if (parentProject) {
        projectCode = parentProject.code
        projectId = parentProject.id
      }
    }

    // Inherit additional fields from parent task if not explicitly provided
    if (!data.assigneeId && parentTask.assigneeId) {
      data.assigneeId = parentTask.assigneeId
    }
    if (!data.departmentId && parentTask.departmentId) {
      data.departmentId = parentTask.departmentId
    }
  } else {
    // No parent - milestone must have a project
    if (taskType === 'milestone' && !projectId) {
      throw new Error('Milestone must belong to a project')
    }
  }

  const code = await generateTaskCode(projectCode, projectId, taskType)

  // Use transaction for create + audit log (Rule 10)
  const task = await prisma.$transaction(async (tx) => {
    const newTask = await tx.task.create({
      data: {
        code,
        title: data.title,
        description: data.description,
        taskType,
        projectId: projectId,
        parentTaskId: data.parentTaskId,
        assigneeId: data.assigneeId,
        departmentId: data.departmentId ?? null,
        priority: (data.priority as TaskPriority) || 'medium',
        startDate: data.startDate,
        dueDate: data.dueDate,
        estimatedHours: data.estimatedHours,
        isRecurring: data.isRecurring ?? false,
        blockedReason: data.blockedReason,
        recurrencePattern: data.recurrencePattern,
        position: data.position ?? 0,
        createdById: userId,
      },
      select: taskWithRelationsSelect,
    })

    // Log to audit trail
    await auditService.logCreate(EntityType.TASK, newTask.id, userId, { ...newTask }, tx)

    // Create notification if task is assigned
    if (data.assigneeId && data.assigneeId !== userId) {
      await notificationService.createNotification({
        userId: data.assigneeId,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You have been assigned to task: ${newTask.title}`,
        data: { taskId: newTask.id, taskCode: newTask.code },
      }, tx)
    }

    return newTask
  })

  logger.info(`Task created: ${task.code}`, { taskId: task.id, projectId, userId })

  // Fire automation rules (async, don't block response)
  evaluateRules({
    type: 'task_created',
    domain: 'task',
    entityId: task.id,
    projectId: task.projectId ?? null,
    userId,
    data: {},
  }).catch(err =>
    logger.error('Automation evaluation failed after task creation', { error: err })
  )

  // Emit real-time event to project members (fire-and-forget)
  const io = getIO()
  if (io) {
    emitTaskCreated(io, { task, projectId: task.projectId ?? null })
  }

  return task
}

/**
 * Retrieves tasks with pagination and filters
 * @param params - Query parameters
 * @returns Paginated tasks
 */
export async function getTasks(
  params: TaskQueryParams
): Promise<PaginatedResponse<Prisma.TaskGetPayload<{ select: typeof taskWithRelationsSelect }>>> {
  const { page = 1, limit = 20, projectId, taskType, status, priority, assigneeId, departmentId, search, standalone, parentTaskId, includeSubtasks } = params

  const where: Prisma.TaskWhereInput = {
    isDeleted: false, // Rule 11: Soft Delete filter
  }

  if (projectId) where.projectId = projectId
  if (standalone) where.projectId = null
  if (taskType) where.taskType = taskType as TaskType

  // Filter by parentTaskId: if specified, show subtasks of that parent
  // If not specified and includeSubtasks is false (default), exclude subtasks from main list
  if (parentTaskId) {
    where.parentTaskId = parentTaskId
  } else if (!includeSubtasks) {
    where.parentTaskId = null // Only show root-level tasks
  }
  if (status) {
    if (status.includes(',')) {
      where.status = { in: status.split(',') as TaskStatus[] }
    } else {
      where.status = status as TaskStatus
    }
  }
  if (priority) where.priority = priority as TaskPriority
  if (assigneeId) where.assigneeId = assigneeId
  if (departmentId) where.departmentId = departmentId
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { code: { contains: search } },
      { description: { contains: search } },
    ]
  }

  const skip = (page - 1) * limit

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      select: taskWithRelationsSelect,
      skip,
      take: limit,
      orderBy: [{ position: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.task.count({ where }),
  ])

  return {
    data: tasks,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}

/**
 * Gets tasks for Kanban board view grouped by status
 * @param projectId - Project ID
 * @returns Tasks grouped by status
 */
export async function getTasksKanban(projectId: string) {
  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      isDeleted: false,
    },
    select: {
      ...taskSelectFields,
      assignee: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
      _count: {
        select: { comments: true },
      },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  })

  // Group by status
  const grouped = {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    review: tasks.filter((t) => t.status === 'review'),
    blocked: tasks.filter((t) => t.status === 'blocked'),
    done: tasks.filter((t) => t.status === 'done'),
  }

  return grouped
}

/**
 * Retrieves a single task by ID with full details
 * @param taskId - Task ID
 * @returns Task with relations or null
 */
export async function getTaskById(taskId: string) {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      isDeleted: false,
    },
    select: {
      ...taskWithRelationsSelect,
      subtasks: {
        where: { isDeleted: false },
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          priority: true,
          assignee: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      },
      comments: {
        where: { isDeleted: false },
        select: {
          id: true,
          content: true,
          isInternal: true,
          createdAt: true,
          user: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      timeEntries: {
        select: {
          id: true,
          description: true,
          startTime: true,
          endTime: true,
          duration: true,
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { startTime: 'desc' },
        take: 20,
      },
    },
  })

  return task
}

/**
 * Updates a task with audit logging
 * @param taskId - Task ID
 * @param data - Update data
 * @param userId - ID of user making update
 * @returns Updated task
 */
export async function updateTask(taskId: string, data: UpdateTaskInput, userId: string) {
  // Get existing task for audit log
  const existing = await prisma.task.findFirst({
    where: { id: taskId, isDeleted: false },
    select: { ...taskWithRelationsSelect, parentTaskId: true },
  })

  if (!existing) {
    return null
  }

  const oldStatus = existing.status
  const oldAssigneeId = existing.assigneeId

  // Validate taskType change if provided
  let newTaskType: TaskType | undefined
  if (data.taskType) {
    newTaskType = data.taskType as TaskType

    // Milestone cannot have a parent
    if (newTaskType === 'milestone' && (existing.parentTaskId || data.parentTaskId)) {
      throw new Error('Milestone cannot have a parent task')
    }

    // Milestone must belong to a project
    if (newTaskType === 'milestone' && !existing.projectId && !data.projectId) {
      throw new Error('Milestone must belong to a project')
    }

    // Check if task has children - cannot become subtask if it has children
    if (newTaskType === 'subtask' && existing.taskType !== 'subtask') {
      const hasChildren = await prisma.task.count({
        where: { parentTaskId: taskId, isDeleted: false },
      })
      if (hasChildren > 0) {
        throw new Error('Cannot convert to subtask: task has children')
      }
    }
  }

  // Use transaction for update + audit log (Rule 10)
  const task = await prisma.$transaction(async (tx) => {
    const updated = await tx.task.update({
      where: { id: taskId },
      data: {
        title: data.title,
        description: data.description,
        taskType: newTaskType,
        projectId: data.projectId,
        parentTaskId: data.parentTaskId,
        assigneeId: data.assigneeId,
        departmentId: data.departmentId,
        status: data.status as TaskStatus | undefined,
        priority: data.priority as TaskPriority | undefined,
        startDate: data.startDate,
        dueDate: data.dueDate,
        estimatedHours: data.estimatedHours,
        actualHours: data.actualHours,
        isRecurring: data.isRecurring,
        blockedReason: data.blockedReason,
        recurrencePattern: data.recurrencePattern,
        position: data.position,
        updatedAt: new Date(),
      },
      select: taskWithRelationsSelect,
    })

    // Log status change separately if status changed
    if (data.status && data.status !== oldStatus) {
      await auditService.logStatusChange(EntityType.TASK, taskId, userId, oldStatus, data.status, tx)
    } else {
      await auditService.logUpdate(EntityType.TASK, taskId, userId, { ...existing }, { ...updated }, tx)
    }

    // Notify new assignee if changed
    if (data.assigneeId && data.assigneeId !== oldAssigneeId && data.assigneeId !== userId) {
      await notificationService.createNotification({
        userId: data.assigneeId,
        type: 'task_assigned',
        title: 'Task Assigned',
        message: `You have been assigned to task: ${updated.title}`,
        data: { taskId: updated.id, taskCode: updated.code },
      }, tx)
    }

    return updated
  })

  logger.info(`Task updated: ${task.code}`, { taskId, userId })

  // Check if assignee changed — fire automation hook
  if (data.assigneeId && data.assigneeId !== existing.assigneeId) {
    evaluateRules({
      type: 'task_assigned',
      domain: 'task',
      entityId: task.id,
      projectId: task.projectId ?? null,
      userId,
      data: {
        oldAssigneeId: existing.assigneeId ?? undefined,
        newAssigneeId: data.assigneeId,
      },
    }).catch(err =>
      logger.error('Automation evaluation failed after task assignment', { error: err })
    )
  }

  // Emit real-time event to project members and task detail viewers
  const ioUpdate = getIO()
  if (ioUpdate) {
    emitTaskUpdated(ioUpdate, { task, projectId: task.projectId ?? null })
  }

  return task
}

/**
 * Changes task status with validation
 * @param taskId - Task ID
 * @param newStatus - New status
 * @param userId - User making the change
 * @param blockedReason - Required when newStatus is 'blocked'
 * @returns Updated task or null
 * @throws Error if status is 'blocked' and blockedReason is not provided
 */
export async function changeTaskStatus(
  taskId: string,
  newStatus: TaskStatus,
  userId: string,
  blockedReason?: string
) {
  // Validate blockedReason is required when status is 'blocked'
  if (newStatus === 'blocked' && !blockedReason?.trim()) {
    throw new Error('Blocked reason is required when setting status to blocked')
  }

  const existing = await prisma.task.findFirst({
    where: { id: taskId, isDeleted: false },
  })

  if (!existing) {
    return null
  }

  // Validate transition via workflow
  const validation = await workflowService.validateTransition(
    existing.projectId,
    existing.status,
    newStatus
  )
  if (!validation.valid) {
    throw new AppError(
      `Transizione da '${existing.status}' a '${newStatus}' non consentita dal workflow`,
      400
    )
  }
  // If workflow requires comment for this transition, enforce it
  if (validation.requiresComment && !blockedReason?.trim()) {
    throw new AppError(
      `È richiesto un commento per la transizione a '${newStatus}'`,
      400
    )
  }

  const oldStatus = existing.status

  // Use transaction for update + audit log
  const task = await prisma.$transaction(async (tx) => {
    // Prepare update data
    const updateData: Prisma.TaskUpdateInput = {
      status: newStatus,
      updatedAt: new Date(),
    }

    // Set or clear blockedReason based on status
    if (newStatus === 'blocked') {
      updateData.blockedReason = blockedReason
    } else if (existing.status === 'blocked') {
      // Clear blockedReason when unblocking
      updateData.blockedReason = null
    }

    const updated = await tx.task.update({
      where: { id: taskId },
      data: updateData,
      select: taskWithRelationsSelect,
    })

    await auditService.logStatusChange(EntityType.TASK, taskId, userId, oldStatus, newStatus, tx)

    // Notify assignee about status change (if changed by someone else)
    if (updated.assigneeId && updated.assigneeId !== userId && newStatus !== 'blocked') {
      await notificationService.createNotification({
        userId: updated.assigneeId,
        type: 'task_status_changed',
        title: 'Stato task aggiornato',
        message: `Lo stato del task ${updated.code} è cambiato da "${oldStatus}" a "${newStatus}"`,
        data: { taskId: updated.id, taskCode: updated.code, oldStatus, newStatus },
      }, tx)
    }

    // Notify if task is blocked
    if (newStatus === 'blocked' && updated.assigneeId && updated.projectId) {
      // Notify project owner or direzione
      const project = await tx.project.findUnique({
        where: { id: updated.projectId },
        select: { ownerId: true },
      })

      if (project?.ownerId && project.ownerId !== userId) {
        await notificationService.createNotification({
          userId: project.ownerId,
          type: 'task_blocked',
          title: 'Task Blocked',
          message: `Task ${updated.code} has been marked as blocked: ${blockedReason}`,
          data: { taskId: updated.id, taskCode: updated.code, blockedReason },
        }, tx)
      }

      // Notify users mentioned in the blockedReason
      if (blockedReason) {
        const mentionedIds = await parseMentionedUserIds(blockedReason, userId, tx)
        for (const mentionedId of mentionedIds) {
          const alreadyNotified = project?.ownerId === mentionedId
          if (!alreadyNotified) {
            await notificationService.createNotification({
              userId: mentionedId,
              type: 'task_blocked_mention',
              title: 'Sei stato menzionato in un blocco',
              message: `Sei stato menzionato nel blocco del task ${updated.code}: ${blockedReason}`,
              data: { taskId: updated.id, taskCode: updated.code, blockedReason },
            }, tx)
          }
        }
      }
    }

    return updated
  })

  logger.info(`Task status changed: ${oldStatus} → ${newStatus}`, { taskId, userId, blockedReason })

  // Fire automation rules (async, don't block response)
  const automationEvent: TriggerEvent = {
    type: 'task_status_changed',
    domain: 'task',
    entityId: taskId,
    projectId: task.projectId ?? null,
    userId,
    data: {
      oldStatus: existing.status,
      newStatus,
    },
  }
  // Don't await - fire and forget to avoid blocking the response
  evaluateRules(automationEvent).catch(err =>
    logger.error('Automation evaluation failed after status change', { error: err })
  )

  // Check if all subtasks are completed (for parent auto-complete automation)
  if (newStatus === 'done' && existing.parentTaskId) {
    const siblings = await prisma.task.findMany({
      where: { parentTaskId: existing.parentTaskId, isDeleted: false },
      select: { status: true },
    })
    const allDone = siblings.every(s => s.status === 'done' || s.status === 'cancelled')
    if (allDone) {
      const parentTask = await prisma.task.findFirst({
        where: { id: existing.parentTaskId, isDeleted: false },
        select: { id: true, code: true, title: true, taskType: true, status: true, priority: true, assigneeId: true, parentTaskId: true, projectId: true },
      })
      if (parentTask) {
        evaluateRules({
          type: 'all_subtasks_completed',
          domain: 'task',
          entityId: parentTask.id,
          projectId: parentTask.projectId,
          userId,
          data: {},
        }).catch(err =>
          logger.error('Automation evaluation failed for all_subtasks_completed', { error: err })
        )
      }
    }
  }

  // Emit real-time status change event
  const ioStatus = getIO()
  if (ioStatus) {
    emitTaskStatusChanged(ioStatus, {
      taskId: task.id,
      projectId: task.projectId ?? null,
      oldStatus,
      newStatus,
      updatedBy: userId,
    })
  }

  return task
}

/**
 * Soft deletes a task (Rule 11: Soft Delete)
 * @param taskId - Task ID
 * @param userId - ID of user deleting
 * @returns True if deleted
 */
export async function deleteTask(taskId: string, userId: string): Promise<boolean> {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, isDeleted: false },
  })

  if (!existing) {
    return false
  }

  // Use transaction for soft delete + audit log (Rule 10)
  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: taskId },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    })

    await auditService.logDelete(EntityType.TASK, taskId, userId, { ...existing }, tx)
  })

  logger.info(`Task soft deleted: ${existing.code}`, { taskId, userId })

  // Emit real-time deletion event
  const ioDelete = getIO()
  if (ioDelete) {
    emitTaskDeleted(ioDelete, {
      taskId,
      projectId: existing.projectId ?? null,
    })
  }

  return true
}

/**
 * Gets tasks assigned to a specific user
 * @param userId - User ID
 * @param params - Query parameters
 * @returns Paginated tasks
 */
export async function getMyTasks(userId: string, params: TaskQueryParams) {
  return getTasks({ ...params, assigneeId: userId })
}

/**
 * Gets task statistics for a user
 * @param userId - User ID
 * @returns Task statistics
 */
export async function getUserTaskStats(userId: string) {
  // Delegate grouped counts + overdue to statsService (single source of truth)
  const [stats, completedToday] = await Promise.all([
    getTaskStats({ assigneeId: userId }),
    prisma.task.count({
      where: {
        assigneeId: userId,
        isDeleted: false,
        status: 'done',
        updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ])

  return {
    total: stats.total,
    byStatus: {
      todo: stats.todo,
      in_progress: stats.inProgress,
      review: stats.review,
      blocked: stats.blocked,
      done: stats.done,
      cancelled: stats.cancelled,
    },
    overdue: stats.overdue,
    completedToday,
  }
}

/**
 * Gets subtasks for a given parent task
 */
export async function getSubtasks(parentTaskId: string) {
  return prisma.task.findMany({
    where: { parentTaskId, isDeleted: false },
    select: taskWithRelationsSelect,
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  })
}

/**
 * Recursively assigns a user to all subtasks at any depth level
 * @param parentTaskId - ID of the parent task
 * @param assigneeId - ID of the user to assign (null to unassign)
 * @param userId - ID of the user performing the operation
 * @returns Number of subtasks updated
 */
export async function assignSubtasksRecursively(
  parentTaskId: string,
  assigneeId: string | null,
  userId: string
): Promise<number> {
  let totalUpdated = 0

  // Use transaction for atomicity (Rule 10)
  await prisma.$transaction(async (tx) => {
    // Recursive helper function
    const assignRecursive = async (taskId: string): Promise<void> => {
      // Get direct subtasks
      const subtasks = await tx.task.findMany({
        where: { parentTaskId: taskId, isDeleted: false },
        select: { id: true, title: true, code: true, assigneeId: true },
      })

      for (const subtask of subtasks) {
        const oldAssigneeId = subtask.assigneeId

        // Update assignee
        await tx.task.update({
          where: { id: subtask.id },
          data: { assigneeId, updatedAt: new Date() },
        })

        totalUpdated++

        // Audit log for each change
        await auditService.logUpdate(
          EntityType.TASK,
          subtask.id,
          userId,
          { assigneeId: oldAssigneeId },
          { assigneeId },
          tx
        )

        // Notify new assignee if changed and not self
        if (assigneeId && assigneeId !== oldAssigneeId && assigneeId !== userId) {
          await notificationService.createNotification({
            userId: assigneeId,
            type: 'task_assigned',
            title: 'Task Assigned',
            message: `You have been assigned to task: ${subtask.title}`,
            data: { taskId: subtask.id, taskCode: subtask.code },
          }, tx)
        }

        // Recurse to children (N levels deep)
        await assignRecursive(subtask.id)
      }
    }

    // Start recursion from parent task
    await assignRecursive(parentTaskId)
  })

  logger.info(`Recursively assigned ${totalUpdated} subtasks`, {
    parentTaskId,
    assigneeId,
    userId,
  })

  return totalUpdated
}

/**
 * Gets standalone tasks (no project) with pagination
 */
export async function getStandaloneTasks(params: TaskQueryParams) {
  return getTasks({ ...params, standalone: true })
}

// ============================================================
// GANTT FUNCTIONS
// ============================================================

/**
 * Gets tasks formatted for Gantt chart view
 * @param params - Query parameters
 * @returns Tasks with progress and dependencies
 */
export async function getTasksForGantt(params: GanttQueryParams): Promise<GanttTask[]> {
  const { projectId, assigneeId, startDateFrom, startDateTo } = params

  const where: Prisma.TaskWhereInput = {
    isDeleted: false,
    // Include all tasks (parents and subtasks) that have dates
  }

  if (projectId) where.projectId = projectId
  if (assigneeId) where.assigneeId = assigneeId

  // Filter tasks that have at least startDate or dueDate
  where.OR = [{ startDate: { not: null } }, { dueDate: { not: null } }]

  if (startDateFrom || startDateTo) {
    where.AND = []
    if (startDateFrom) {
      where.AND.push({
        OR: [{ startDate: { gte: startDateFrom } }, { dueDate: { gte: startDateFrom } }],
      })
    }
    if (startDateTo) {
      where.AND.push({
        OR: [{ startDate: { lte: startDateTo } }, { dueDate: { lte: startDateTo } }],
      })
    }
  }

  const tasks = await prisma.task.findMany({
    where,
    select: {
      id: true,
      code: true,
      title: true,
      taskType: true,
      status: true,
      priority: true,
      startDate: true,
      dueDate: true,
      estimatedHours: true,
      parentTaskId: true,
      assignee: {
        select: { id: true, firstName: true, lastName: true },
      },
      project: {
        select: { id: true, code: true, name: true },
      },
      _count: {
        select: { subtasks: true },
      },
      // Get dependencies where this task is the successor (predecessors of this task)
      predecessors: {
        select: {
          predecessorId: true,
          successorId: true,
          dependencyType: true,
          lagDays: true,
        },
      },
    },
    orderBy: [{ startDate: 'asc' }, { dueDate: 'asc' }, { createdAt: 'asc' }],
  })

  // Calculate progress based on time entries
  const taskIds = tasks.map((t) => t.id)
  const timeEntries = await prisma.timeEntry.groupBy({
    by: ['taskId'],
    where: { taskId: { in: taskIds }, isDeleted: false },
    _sum: { duration: true },
  })

  const progressMap = new Map(timeEntries.map((te) => [te.taskId, te._sum.duration || 0]))

  // Build task map for hierarchy calculation
  const taskMap = new Map(tasks.map((t) => [t.id, t]))

  // Calculate depth for each task
  const getDepth = (taskId: string | null, visited = new Set<string>()): number => {
    if (!taskId) return 0
    if (visited.has(taskId)) return 0 // Prevent infinite loops
    visited.add(taskId)
    const task = taskMap.get(taskId)
    if (!task || !task.parentTaskId) return 0
    return 1 + getDepth(task.parentTaskId, visited)
  }

  const ganttTasks = tasks.map((task) => {
    const actualMinutes = progressMap.get(task.id) || 0
    const estimatedMinutes = task.estimatedHours ? Number(task.estimatedHours) * 60 : 0

    return {
      id: task.id,
      code: task.code,
      title: task.title,
      taskType: task.taskType,
      status: task.status,
      priority: task.priority,
      startDate: task.startDate,
      endDate: task.dueDate,
      estimatedHours: task.estimatedHours ? Number(task.estimatedHours) : null,
      progress: task.status === 'done' ? 100
        : task.status === 'cancelled' ? 0
        : estimatedMinutes > 0 ? Math.min(100, Math.round((actualMinutes / estimatedMinutes) * 100))
        : 0,
      parentTaskId: task.parentTaskId,
      subtaskCount: task._count.subtasks,
      depth: getDepth(task.id),
      assignee: task.assignee,
      project: task.project,
      dependencies: task.predecessors,
    }
  })

  // Sort tasks hierarchically: parent tasks first, then their subtasks
  const sortHierarchically = (tasks: typeof ganttTasks): typeof ganttTasks => {
    const result: typeof ganttTasks = []
    const added = new Set<string>()

    const addTaskWithSubtasks = (task: (typeof ganttTasks)[0]) => {
      if (added.has(task.id)) return
      added.add(task.id)
      result.push(task)
      // Add subtasks immediately after parent
      const subtasks = tasks.filter((t) => t.parentTaskId === task.id)
      subtasks.forEach(addTaskWithSubtasks)
    }

    // Start with root tasks (no parent)
    tasks.filter((t) => !t.parentTaskId).forEach(addTaskWithSubtasks)

    // Add any orphaned subtasks (parent not in current view)
    tasks.filter((t) => !added.has(t.id)).forEach((t) => result.push(t))

    return result
  }

  return sortHierarchically(ganttTasks)
}

// ============================================================
// TASK DEPENDENCY FUNCTIONS
// ============================================================

/**
 * Creates a dependency between two tasks
 * @param data - Dependency data
 * @param userId - User creating the dependency
 * @returns Created dependency
 */
export async function getTaskDependencyById(dependencyId: string) {
  return prisma.taskDependency.findUnique({
    where: { id: dependencyId },
    select: { id: true, predecessorId: true, successorId: true },
  })
}

export async function createTaskDependency(
  data: CreateTaskDependencyInput,
  userId: string
): Promise<TaskDependencyResponse> {
  // Verify both tasks exist
  const [predecessor, successor] = await Promise.all([
    prisma.task.findFirst({ where: { id: data.predecessorId, isDeleted: false }, select: { id: true, code: true, title: true } }),
    prisma.task.findFirst({ where: { id: data.successorId, isDeleted: false }, select: { id: true, code: true, title: true } }),
  ])

  if (!predecessor) throw new Error('Predecessor task not found')
  if (!successor) throw new Error('Successor task not found')

  // Prevent self-reference
  if (data.predecessorId === data.successorId) {
    throw new Error('A task cannot depend on itself')
  }

  // Check for circular dependency using BFS traversal
  // Starting from successorId, follow all successor chains to check if predecessorId is reachable
  const MAX_BFS_DEPTH = 50
  const visited = new Set<string>()
  const queue: string[] = [data.successorId]
  let depth = 0

  while (queue.length > 0 && depth < MAX_BFS_DEPTH) {
    const current = queue.shift()!
    if (current === data.predecessorId) {
      throw new Error('Circular dependency detected: adding this dependency would create a cycle')
    }
    if (visited.has(current)) continue
    visited.add(current)

    const outgoing = await prisma.taskDependency.findMany({
      where: { predecessorId: current },
      select: { successorId: true },
    })
    for (const dep of outgoing) {
      if (!visited.has(dep.successorId)) {
        queue.push(dep.successorId)
      }
    }
    depth++
  }

  const dependency = await prisma.taskDependency.create({
    data: {
      predecessorId: data.predecessorId,
      successorId: data.successorId,
      dependencyType: data.dependencyType || 'finish_to_start',
      lagDays: data.lagDays || 0,
    },
    include: {
      predecessor: { select: { id: true, code: true, title: true } },
      successor: { select: { id: true, code: true, title: true } },
    },
  })

  logger.info(`Task dependency created: ${predecessor.code} → ${successor.code}`, { userId })

  return {
    id: dependency.id,
    predecessorId: dependency.predecessorId,
    successorId: dependency.successorId,
    dependencyType: dependency.dependencyType,
    lagDays: dependency.lagDays,
    predecessor: dependency.predecessor,
    successor: dependency.successor,
  }
}

/**
 * Gets all dependencies for a task (both as predecessor and successor)
 * @param taskId - Task ID
 * @returns Dependencies
 */
export async function getTaskDependencies(taskId: string): Promise<TaskDependencyResponse[]> {
  const dependencies = await prisma.taskDependency.findMany({
    where: {
      OR: [{ predecessorId: taskId }, { successorId: taskId }],
    },
    include: {
      predecessor: { select: { id: true, code: true, title: true } },
      successor: { select: { id: true, code: true, title: true } },
    },
  })

  return dependencies.map((d) => ({
    id: d.id,
    predecessorId: d.predecessorId,
    successorId: d.successorId,
    dependencyType: d.dependencyType,
    lagDays: d.lagDays,
    predecessor: d.predecessor,
    successor: d.successor,
  }))
}

/**
 * Deletes a task dependency
 * @param dependencyId - Dependency ID
 * @param userId - User deleting the dependency
 * @returns True if deleted
 */
export async function deleteTaskDependency(dependencyId: string, userId: string): Promise<boolean> {
  const existing = await prisma.taskDependency.findUnique({ where: { id: dependencyId } })
  if (!existing) return false

  await prisma.taskDependency.delete({ where: { id: dependencyId } })
  logger.info(`Task dependency deleted: ${dependencyId}`, { userId })

  return true
}

/**
 * Reorder user's tasks by updating position field
 * @param tasks - Array of task IDs with new positions
 * @param userId - User performing the reorder
 */
export async function reorderTasks(
  tasks: Array<{ taskId: string; position: number }>,
  userId: string
): Promise<void> {
  // Use transaction for atomicity (Rule 10)
  await prisma.$transaction(async (tx) => {
    for (const item of tasks) {
      // Verify task is assigned to user
      const task = await tx.task.findFirst({
        where: { id: item.taskId, assigneeId: userId, isDeleted: false },
        select: { id: true },
      })

      if (!task) {
        throw new Error(`Task ${item.taskId} not found or not assigned to user`)
      }

      await tx.task.update({
        where: { id: item.taskId },
        data: { position: item.position, updatedAt: new Date() },
      })
    }
  })

  logger.info(`Reordered ${tasks.length} tasks`, { userId })
}

// ============================================================
// MILESTONE FUNCTIONS
// ============================================================

/**
 * Gets milestones for a project with aggregated statistics from children
 * @param projectId - Project ID
 * @returns Milestones with derived data (dates, hours, progress)
 */
export async function getProjectMilestones(projectId: string) {
  const milestones = await prisma.task.findMany({
    where: {
      projectId,
      taskType: 'milestone',
      isDeleted: false,
    },
    select: {
      ...taskSelectFields,
      parentTaskId: true,
      subtasks: {
        where: { isDeleted: false },
        select: {
          id: true,
          code: true,
          title: true,
          taskType: true,
          status: true,
          priority: true,
          startDate: true,
          dueDate: true,
          estimatedHours: true,
          actualHours: true,
          _count: {
            select: { subtasks: true },
          },
        },
      },
    },
    orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
  })

  // Batch fetch all tasks in the project to avoid N+1 queries
  const allProjectTasks = await prisma.task.findMany({
    where: { projectId, isDeleted: false, taskType: { not: 'milestone' } },
    select: {
      id: true,
      taskType: true,
      status: true,
      estimatedHours: true,
      actualHours: true,
      startDate: true,
      dueDate: true,
      parentTaskId: true,
    },
  })

  // Build parent→children map
  const childrenMap = new Map<string, typeof allProjectTasks>()
  for (const task of allProjectTasks) {
    if (task.parentTaskId) {
      const existing = childrenMap.get(task.parentTaskId) || []
      existing.push(task)
      childrenMap.set(task.parentTaskId, existing)
    }
  }

  // Recursive in-memory descendant collection
  function collectDescendants(parentId: string): typeof allProjectTasks {
    const children = childrenMap.get(parentId) || []
    const all = [...children]
    for (const child of children) {
      all.push(...collectDescendants(child.id))
    }
    return all
  }

  return milestones.map((milestone) => {
    const descendants = collectDescendants(milestone.id)
    const workItems = descendants.filter((t) => t.taskType !== 'milestone')

    const totalTasks = workItems.length
    const completedTasks = workItems.filter((t) => t.status === 'done').length
    const totalEstimatedHours = workItems.reduce((sum, t) => sum + toNumber(t.estimatedHours), 0)
    const totalActualHours = workItems.reduce((sum, t) => sum + toNumber(t.actualHours), 0)
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    const startDates = workItems.filter((t) => t.startDate).map((t) => t.startDate!)
    const dueDates = workItems.filter((t) => t.dueDate).map((t) => t.dueDate!)
    const earliestStartDate = startDates.length > 0 ? new Date(Math.min(...startDates.map((d) => d.getTime()))) : null
    const latestDueDate = dueDates.length > 0 ? new Date(Math.max(...dueDates.map((d) => d.getTime()))) : null

    const statusSummary = workItems.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      ...milestone,
      derivedStats: { totalTasks, completedTasks, totalEstimatedHours, totalActualHours, progress, earliestStartDate, latestDueDate, statusSummary },
    }
  })
}

/**
 * Calculates derived statistics for a milestone based on its children (recursive)
 * @param milestoneId - Milestone ID
 * @returns Aggregated statistics
 */
export async function calculateMilestoneStats(milestoneId: string): Promise<{
  totalTasks: number
  completedTasks: number
  totalEstimatedHours: number
  totalActualHours: number
  progress: number
  earliestStartDate: Date | null
  latestDueDate: Date | null
  statusSummary: Record<string, number>
}> {
  // Get all descendant tasks recursively
  const descendants = await getDescendantTasks(milestoneId)

  // Filter only actual tasks and subtasks (not nested milestones)
  const workItems = descendants.filter((t) => t.taskType !== 'milestone')

  const totalTasks = workItems.length
  const completedTasks = workItems.filter((t) => t.status === 'done').length

  const totalEstimatedHours = workItems.reduce((sum, t) => sum + toNumber(t.estimatedHours), 0)
  const totalActualHours = workItems.reduce((sum, t) => sum + toNumber(t.actualHours), 0)

  // Calculate progress based on completed tasks
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Find earliest start date and latest due date
  const startDates = workItems.filter((t) => t.startDate).map((t) => t.startDate!)
  const dueDates = workItems.filter((t) => t.dueDate).map((t) => t.dueDate!)

  const earliestStartDate = startDates.length > 0 ? new Date(Math.min(...startDates.map((d) => d.getTime()))) : null
  const latestDueDate = dueDates.length > 0 ? new Date(Math.max(...dueDates.map((d) => d.getTime()))) : null

  // Count by status
  const statusSummary = workItems.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return {
    totalTasks,
    completedTasks,
    totalEstimatedHours,
    totalActualHours,
    progress,
    earliestStartDate,
    latestDueDate,
    statusSummary,
  }
}

/**
 * Gets all descendant tasks recursively (children, grandchildren, etc.)
 * @param parentId - Parent task ID
 * @returns All descendant tasks
 */
async function getDescendantTasks(parentId: string): Promise<
  Array<{
    id: string
    taskType: TaskType
    status: TaskStatus
    estimatedHours: Prisma.Decimal | null
    actualHours: Prisma.Decimal | null
    startDate: Date | null
    dueDate: Date | null
  }>
> {
  const children = await prisma.task.findMany({
    where: { parentTaskId: parentId, isDeleted: false },
    select: {
      id: true,
      taskType: true,
      status: true,
      estimatedHours: true,
      actualHours: true,
      startDate: true,
      dueDate: true,
    },
  })

  // Cast Prisma string fields to our typed aliases
  const typedChildren = children.map((child) => ({
    ...child,
    taskType: child.taskType as TaskType,
    status: child.status as TaskStatus,
  }))

  const descendants: Array<{
    id: string
    taskType: TaskType
    status: TaskStatus
    estimatedHours: Prisma.Decimal | null
    actualHours: Prisma.Decimal | null
    startDate: Date | null
    dueDate: Date | null
  }> = [...typedChildren]

  // Recursively get grandchildren
  for (const child of typedChildren) {
    const grandchildren = await getDescendantTasks(child.id)
    descendants.push(...grandchildren)
  }

  return descendants
}

/**
 * Gets a milestone by ID with full derived statistics
 * @param milestoneId - Milestone ID
 * @returns Milestone with stats or null
 */
export async function getMilestoneWithStats(milestoneId: string) {
  const milestone = await prisma.task.findFirst({
    where: {
      id: milestoneId,
      taskType: 'milestone',
      isDeleted: false,
    },
    select: {
      ...taskWithRelationsSelect,
      subtasks: {
        where: { isDeleted: false },
        select: {
          id: true,
          code: true,
          title: true,
          taskType: true,
          status: true,
          priority: true,
          startDate: true,
          dueDate: true,
          estimatedHours: true,
          assignee: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          _count: {
            select: { subtasks: true },
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      },
    },
  })

  if (!milestone) return null

  const stats = await calculateMilestoneStats(milestoneId)

  return {
    ...milestone,
    derivedStats: stats,
  }
}

/**
 * Bulk updates multiple tasks (status, priority, or assignee)
 * @param ids - Array of task IDs to update
 * @param update - Fields to update (at least one required)
 * @param userId - ID of user performing the update
 * @returns Number of tasks updated
 */
export async function bulkUpdateTasks(
  ids: string[],
  update: { status?: string; priority?: string; assigneeId?: string },
  userId: string
): Promise<number> {
  let totalUpdated = 0

  await prisma.$transaction(async (tx) => {
    for (const taskId of ids) {
      const existing = await tx.task.findFirst({
        where: { id: taskId, isDeleted: false },
        select: taskSelectFields,
      })

      if (!existing) continue

      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          ...(update.status !== undefined && { status: update.status as TaskStatus }),
          ...(update.priority !== undefined && { priority: update.priority as TaskPriority }),
          ...(update.assigneeId !== undefined && { assigneeId: update.assigneeId }),
          updatedAt: new Date(),
        },
        select: taskSelectFields,
      })

      await auditService.logUpdate(EntityType.TASK, taskId, userId, { ...existing }, { ...updated }, tx)

      totalUpdated++
    }
  })

  logger.info(`Bulk updated ${totalUpdated} tasks`, { ids, update, userId })

  return totalUpdated
}

/**
 * Bulk soft-deletes multiple tasks
 * @param ids - Array of task IDs to delete
 * @param userId - ID of user performing the deletion
 * @returns Number of tasks deleted
 */
export async function bulkDeleteTasks(ids: string[], userId: string): Promise<number> {
  let totalDeleted = 0

  await prisma.$transaction(async (tx) => {
    for (const taskId of ids) {
      const existing = await tx.task.findFirst({
        where: { id: taskId, isDeleted: false },
        select: taskSelectFields,
      })

      if (!existing) continue

      await tx.task.update({
        where: { id: taskId },
        data: { isDeleted: true, updatedAt: new Date() },
      })

      await auditService.logDelete(EntityType.TASK, taskId, userId, { ...existing }, tx)

      totalDeleted++
    }
  })

  logger.info(`Bulk deleted ${totalDeleted} tasks`, { ids, userId })

  return totalDeleted
}

// ============================================================
// CALENDAR FUNCTIONS
// ============================================================

/**
 * Gets tasks whose dates overlap with the given date range for calendar view
 * @param params - Query parameters including start, end, optional filters, and role-based access
 * @returns Tasks with minimal fields needed for calendar display
 */
export async function getTasksForCalendar(params: {
  start: Date
  end: Date
  projectId?: string
  assigneeId?: string
  userId?: string
  role?: string
}) {
  const where: Prisma.TaskWhereInput = {
    isDeleted: false,
    OR: [
      { dueDate: { gte: params.start, lte: params.end } },
      { startDate: { gte: params.start, lte: params.end } },
      { AND: [{ startDate: { lte: params.start } }, { dueDate: { gte: params.end } }] },
    ],
  }

  if (params.projectId) where.projectId = params.projectId
  if (params.assigneeId) where.assigneeId = params.assigneeId
  // dipendente can only see their own assigned tasks
  if (params.role === 'dipendente') where.assigneeId = params.userId

  const tasks = await prisma.task.findMany({
    where,
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
      priority: true,
      taskType: true,
      startDate: true,
      dueDate: true,
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { dueDate: 'asc' },
  })

  return tasks
}

/**
 * Clones a task with optional subtask cloning
 */
export async function cloneTask(
  taskId: string,
  userId: string,
  options: { includeSubtasks?: boolean } = {}
): Promise<any> {
  const original = await prisma.task.findFirst({
    where: { id: taskId, isDeleted: false },
    select: taskWithRelationsSelect,
  })

  if (!original) throw new Error('Task not found')

  // Fetch tags separately (polymorphic TagAssignment)
  const originalTags = await prisma.tagAssignment.findMany({
    where: { entityType: 'task', entityId: taskId },
    select: { tagId: true },
  })

  const projectCode = (original as any).project?.code ?? null
  const code = await generateTaskCode(
    projectCode,
    original.projectId ?? null,
    original.taskType as TaskType
  )

  const cloned = await prisma.$transaction(async (tx) => {
    const newTask = await tx.task.create({
      data: {
        code,
        title: `Copia di ${original.title}`,
        description: original.description,
        taskType: original.taskType,
        status: 'todo',
        priority: original.priority,
        startDate: original.startDate,
        dueDate: original.dueDate,
        estimatedHours: original.estimatedHours,
        projectId: original.projectId,
        parentTaskId: original.parentTaskId,
        assigneeId: original.assigneeId,
        departmentId: original.departmentId,
        createdById: userId,
      },
      select: taskWithRelationsSelect,
    })

    // Clone tags (polymorphic TagAssignment)
    if (originalTags.length > 0) {
      await tx.tagAssignment.createMany({
        data: originalTags.map((t) => ({ tagId: t.tagId, entityType: 'task', entityId: newTask.id })),
      })
    }

    // Clone subtasks recursively if requested
    if (options.includeSubtasks) {
      await cloneSubtasksRecursive(tx, taskId, newTask.id, userId, original.projectId ?? null)
    }

    await auditService.logCreate(EntityType.TASK, newTask.id, userId, { originalTaskId: taskId, includeSubtasks: options.includeSubtasks }, tx)

    return newTask
  })

  return cloned
}

async function cloneSubtasksRecursive(
  tx: Prisma.TransactionClient,
  originalParentId: string,
  newParentId: string,
  userId: string,
  projectId: string | null
) {
  const subtasks = await tx.task.findMany({
    where: { parentTaskId: originalParentId, isDeleted: false },
    select: {
      id: true,
      title: true,
      description: true,
      taskType: true,
      priority: true,
      startDate: true,
      dueDate: true,
      estimatedHours: true,
      assigneeId: true,
      departmentId: true,
    },
  })

  for (const sub of subtasks) {
    const projectCode = projectId
      ? (
          await prisma.project.findFirst({
            where: { id: projectId },
            select: { code: true },
          })
        )?.code ?? null
      : null
    const code = await generateTaskCode(projectCode, projectId, sub.taskType as TaskType)
    const newSub = await tx.task.create({
      data: {
        code,
        title: sub.title,
        description: sub.description,
        taskType: sub.taskType,
        status: 'todo',
        priority: sub.priority,
        startDate: sub.startDate,
        dueDate: sub.dueDate,
        estimatedHours: sub.estimatedHours,
        projectId,
        parentTaskId: newParentId,
        assigneeId: sub.assigneeId,
        departmentId: sub.departmentId,
        createdById: userId,
      },
    })

    // Recurse for nested subtasks
    await cloneSubtasksRecursive(tx, sub.id, newSub.id, userId, projectId)
  }
}

export const taskService = {
  createTask,
  getTasks,
  getTasksKanban,
  getTaskById,
  updateTask,
  changeTaskStatus,
  deleteTask,
  getMyTasks,
  getUserTaskStats,
  getSubtasks,
  getStandaloneTasks,
  assignSubtasksRecursively,
  reorderTasks,
  bulkUpdateTasks,
  bulkDeleteTasks,
  // Gantt
  getTasksForGantt,
  // Calendar
  getTasksForCalendar,
  // Dependencies
  getTaskDependencyById,
  createTaskDependency,
  getTaskDependencies,
  deleteTaskDependency,
  // Milestones
  getProjectMilestones,
  getMilestoneWithStats,
  calculateMilestoneStats,
  // Clone
  cloneTask,
}
