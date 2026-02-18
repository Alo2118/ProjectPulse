/**
 * Task Controller - HTTP request handling for tasks
 * @module controllers/taskController
 */

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { taskService } from '../services/taskService.js'
import { AppError } from '../middleware/errorMiddleware.js'
import { assertTaskOwnership } from '../utils/taskOwnership.js'
import { TaskStatus, TaskPriority } from '../types/index.js'
import { datePreprocess, numberPreprocess } from '../utils/validation.js'
import { logger } from '../utils/logger.js'

// ============================================================
// VALIDATION SCHEMAS (Rule 6: Input Validation)
// ============================================================

// Helper to convert empty strings to undefined for UUIDs
const emptyStringToUndefined = z.preprocess((val) => {
  if (val === '') return undefined
  return val
}, z.string().uuid('Invalid ID'))

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().nullable().optional(),
  projectId: emptyStringToUndefined.nullable().optional(),
  parentTaskId: emptyStringToUndefined.nullable().optional(),
  assigneeId: emptyStringToUndefined.nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  taskType: z.enum(['milestone', 'task', 'subtask']).default('task'),
  startDate: z.preprocess(datePreprocess, z.string().datetime().nullable().optional()),
  dueDate: z.preprocess(datePreprocess, z.string().datetime().nullable().optional()),
  estimatedHours: z.preprocess(numberPreprocess, z.number().positive('Estimated hours must be positive').nullable().optional()),
  isRecurring: z.boolean().optional(),
  blockedReason: z.string().max(1000).nullable().optional(),
  recurrencePattern: z.string().nullable().optional(),
  position: z.preprocess(numberPreprocess, z.number().int().nonnegative().nullable().optional()),
})

const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  projectId: emptyStringToUndefined.nullable().optional(),
  parentTaskId: emptyStringToUndefined.nullable().optional(),
  assigneeId: emptyStringToUndefined.nullable().optional(),
  assignToSubtasks: z.boolean().optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'blocked', 'done', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  taskType: z.enum(['milestone', 'task', 'subtask']).optional(),
  startDate: z.preprocess(datePreprocess, z.string().datetime().nullable().optional()),
  dueDate: z.preprocess(datePreprocess, z.string().datetime().nullable().optional()),
  estimatedHours: z.preprocess(numberPreprocess, z.number().positive().nullable().optional()),
  actualHours: z.preprocess(numberPreprocess, z.number().positive().nullable().optional()),
  isRecurring: z.boolean().optional(),
  blockedReason: z.string().max(1000).nullable().optional(),
  recurrencePattern: z.string().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
})

const querySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assigneeId: z.string().uuid().optional(),
  search: z.string().optional(),
  standalone: z.string().transform((v) => v === 'true').optional(),
  parentTaskId: z.string().uuid().optional(),
  includeSubtasks: z.string().transform((v) => v === 'true').optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
})

const statusChangeSchema = z
  .object({
    status: z.enum(['todo', 'in_progress', 'review', 'blocked', 'done', 'cancelled']),
    blockedReason: z.string().min(1).max(1000).optional(),
  })
  .refine(
    (data) => {
      // If status is 'blocked', blockedReason is required
      if (data.status === 'blocked') {
        return !!data.blockedReason?.trim()
      }
      return true
    },
    {
      message: 'Blocked reason is required when setting status to blocked',
      path: ['blockedReason'],
    }
  )

const ganttQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  startDateFrom: z.preprocess(datePreprocess, z.string().datetime().optional()),
  startDateTo: z.preprocess(datePreprocess, z.string().datetime().optional()),
})

const createDependencySchema = z.object({
  predecessorId: z.string().uuid('Invalid predecessor task ID'),
  successorId: z.string().uuid('Invalid successor task ID'),
  dependencyType: z.enum(['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish']).default('finish_to_start'),
  lagDays: z.number().int().default(0),
})

// ============================================================
// CONTROLLER FUNCTIONS
// ============================================================

/**
 * Gets paginated list of tasks
 * @route GET /api/tasks
 */
export async function getTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = querySchema.parse(req.query)

    const result = await taskService.getTasks({
      projectId: params.projectId,
      status: params.status as TaskStatus,
      priority: params.priority as TaskPriority,
      assigneeId: params.assigneeId,
      search: params.search,
      standalone: params.standalone,
      parentTaskId: params.parentTaskId,
      includeSubtasks: params.includeSubtasks,
      page: params.page,
      limit: params.limit,
    })

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Gets tasks grouped by status for Kanban view
 * @route GET /api/tasks/kanban/:projectId
 */
export async function getTasksKanban(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params

    const tasks = await taskService.getTasksKanban(projectId)

    res.json({ success: true, data: tasks })
  } catch (error) {
    next(error)
  }
}

/**
 * Gets a single task by ID
 * @route GET /api/tasks/:id
 */
export async function getTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params

    const task = await taskService.getTaskById(id)

    if (!task) {
      throw new AppError('Task not found', 404)
    }

    res.json({ success: true, data: task })
  } catch (error) {
    next(error)
  }
}

/**
 * Creates a new task
 * @route POST /api/tasks
 */
export async function createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Debug logging
    logger.info('Received task creation request:', {
      body: req.body,
      userId: req.user?.userId,
    })

    const data = createTaskSchema.parse(req.body)
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    logger.info('Task schema validated:', {
      taskType: data.taskType,
      projectId: data.projectId,
      parentTaskId: data.parentTaskId,
      title: data.title,
    })

    const task = await taskService.createTask(
      {
        title: data.title,
        description: data.description ?? undefined,
        projectId: data.projectId ?? undefined,
        parentTaskId: data.parentTaskId ?? undefined,
        assigneeId: data.assigneeId ?? undefined,
        priority: data.priority as TaskPriority,
        taskType: data.taskType,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        estimatedHours: data.estimatedHours ?? undefined,
        isRecurring: data.isRecurring,
        blockedReason: data.blockedReason ?? undefined,
        recurrencePattern: data.recurrencePattern ?? undefined,
        position: data.position ?? undefined,
      },
      userId
    )

    res.status(201).json({ success: true, data: task })
  } catch (error) {
    if (error instanceof Error && (error.message === 'Project not found' || error.message === 'Parent task not found')) {
      next(new AppError(error.message, 404))
    } else {
      next(error)
    }
  }
}

/**
 * Updates a task
 * @route PUT /api/tasks/:id
 */
export async function updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const data = updateTaskSchema.parse(req.body)
    const userId = req.user?.userId
    const userRole = req.user?.role

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    await assertTaskOwnership(id, userId, userRole)

    const task = await taskService.updateTask(
      id,
      {
        title: data.title,
        description: data.description ?? undefined,
        projectId: data.projectId ?? undefined,
        parentTaskId: data.parentTaskId ?? undefined,
        assigneeId: data.assigneeId ?? undefined,
        status: data.status as TaskStatus,
        priority: data.priority as TaskPriority,
        taskType: data.taskType,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        estimatedHours: data.estimatedHours ?? undefined,
        actualHours: data.actualHours ?? undefined,
        isRecurring: data.isRecurring,
        blockedReason: data.blockedReason ?? undefined,
        recurrencePattern: data.recurrencePattern ?? undefined,
        position: data.position,
      },
      userId
    )

    if (!task) {
      throw new AppError('Task not found', 404)
    }

    // Recursive assignment to subtasks at N levels
    let subtasksUpdated = 0
    if (data.assignToSubtasks && data.assigneeId !== undefined) {
      subtasksUpdated = await taskService.assignSubtasksRecursively(
        id,
        data.assigneeId,
        userId
      )
    }

    res.json({ success: true, data: task, subtasksUpdated })
  } catch (error) {
    next(error)
  }
}

/**
 * Changes task status
 * @route PATCH /api/tasks/:id/status
 */
export async function changeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const { status, blockedReason } = statusChangeSchema.parse(req.body)
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    await assertTaskOwnership(id, userId, req.user?.role)

    const task = await taskService.changeTaskStatus(id, status as TaskStatus, userId, blockedReason)

    if (!task) {
      throw new AppError('Task not found', 404)
    }

    res.json({ success: true, data: task })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Blocked reason is required')) {
      next(new AppError(error.message, 400))
    } else {
      next(error)
    }
  }
}

/**
 * Soft deletes a task (Rule 11: Soft Delete)
 * @route DELETE /api/tasks/:id
 */
export async function deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const userId = req.user?.userId
    const userRole = req.user?.role

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    await assertTaskOwnership(id, userId, userRole)

    const deleted = await taskService.deleteTask(id, userId)

    if (!deleted) {
      throw new AppError('Task not found', 404)
    }

    res.json({ success: true, message: 'Task deleted successfully' })
  } catch (error) {
    next(error)
  }
}

/**
 * Gets tasks assigned to current user
 * @route GET /api/tasks/my
 */
export async function getMyTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const params = querySchema.parse(req.query)

    const result = await taskService.getMyTasks(userId, {
      projectId: params.projectId,
      status: params.status as TaskStatus,
      priority: params.priority as TaskPriority,
      search: params.search,
      page: params.page,
      limit: params.limit,
      includeSubtasks: params.includeSubtasks,
    })

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Gets task statistics for current user
 * @route GET /api/tasks/my/stats
 */
export async function getMyTaskStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const stats = await taskService.getUserTaskStats(userId)

    res.json({ success: true, data: stats })
  } catch (error) {
    next(error)
  }
}

// ============================================================
// BULK OPERATION SCHEMAS
// ============================================================

const bulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one task ID required').max(100, 'Maximum 100 tasks per bulk operation'),
  update: z
    .object({
      status: z.enum(['todo', 'in_progress', 'review', 'blocked', 'done', 'cancelled']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      assigneeId: z.string().uuid().optional(),
    })
    .refine((obj) => Object.keys(obj).length > 0, {
      message: 'At least one field to update is required',
    }),
})

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one task ID required').max(100, 'Maximum 100 tasks per bulk operation'),
})

/**
 * Bulk updates multiple tasks (status, priority, or assignee)
 * @route PATCH /api/tasks/bulk
 */
export async function bulkUpdate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const { ids, update } = bulkUpdateSchema.parse(req.body)

    const count = await taskService.bulkUpdateTasks(ids, update, userId)

    res.json({ success: true, data: { updated: count } })
  } catch (error) {
    next(error)
  }
}

/**
 * Bulk soft-deletes multiple tasks
 * @route DELETE /api/tasks/bulk
 */
export async function bulkDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const { ids } = bulkDeleteSchema.parse(req.body)

    const count = await taskService.bulkDeleteTasks(ids, userId)

    res.json({ success: true, data: { deleted: count } })
  } catch (error) {
    next(error)
  }
}

const reorderSchema = z.object({
  tasks: z.array(
    z.object({
      taskId: z.string().uuid(),
      position: z.number().int().min(0),
    })
  ),
})

/**
 * Reorder user's tasks by updating position field
 * @route PATCH /api/tasks/reorder
 */
export async function reorderTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const { tasks } = reorderSchema.parse(req.body)

    await taskService.reorderTasks(tasks, userId)

    res.json({ success: true, message: 'Tasks reordered successfully' })
  } catch (error) {
    next(error)
  }
}

/**
 * Gets subtasks for a task
 * @route GET /api/tasks/:id/subtasks
 */
export async function getSubtasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const subtasks = await taskService.getSubtasks(id)
    res.json({ success: true, data: subtasks })
  } catch (error) {
    next(error)
  }
}

/**
 * Gets standalone tasks (no project)
 * @route GET /api/tasks/standalone
 */
export async function getStandaloneTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = querySchema.parse(req.query)

    const result = await taskService.getStandaloneTasks({
      status: params.status as TaskStatus,
      priority: params.priority as TaskPriority,
      assigneeId: params.assigneeId,
      search: params.search,
      page: params.page,
      limit: params.limit,
    })

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    })
  } catch (error) {
    next(error)
  }
}

// ============================================================
// GANTT CONTROLLER FUNCTIONS
// ============================================================

/**
 * Gets tasks formatted for Gantt chart
 * @route GET /api/tasks/gantt
 */
export async function getTasksForGantt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = ganttQuerySchema.parse(req.query)

    const tasks = await taskService.getTasksForGantt({
      projectId: params.projectId,
      assigneeId: params.assigneeId,
      startDateFrom: params.startDateFrom ? new Date(params.startDateFrom) : undefined,
      startDateTo: params.startDateTo ? new Date(params.startDateTo) : undefined,
    })

    res.json({ success: true, data: tasks })
  } catch (error) {
    next(error)
  }
}

// ============================================================
// DEPENDENCY CONTROLLER FUNCTIONS
// ============================================================

/**
 * Creates a task dependency
 * @route POST /api/tasks/dependencies
 */
export async function createDependency(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createDependencySchema.parse(req.body)
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    // Dipendente must own at least one of the two linked tasks
    if (req.user?.role === 'dipendente') {
      const [pred, succ] = await Promise.all([
        taskService.getTaskById(data.predecessorId),
        taskService.getTaskById(data.successorId),
      ])
      if (!pred) throw new AppError('Predecessor task not found', 404)
      if (!succ) throw new AppError('Successor task not found', 404)

      const ownsPred = pred.createdById === userId || pred.assigneeId === userId
      const ownsSucc = succ.createdById === userId || succ.assigneeId === userId
      if (!ownsPred && !ownsSucc) {
        throw new AppError('Non hai i permessi per creare questa dipendenza', 403)
      }
    }

    const dependency = await taskService.createTaskDependency(data, userId)

    res.status(201).json({ success: true, data: dependency })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('Circular') || error.message.includes('cannot depend')) {
        next(new AppError(error.message, 400))
        return
      }
    }
    next(error)
  }
}

/**
 * Gets dependencies for a task
 * @route GET /api/tasks/:id/dependencies
 */
export async function getTaskDependencies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params

    const dependencies = await taskService.getTaskDependencies(id)

    res.json({ success: true, data: dependencies })
  } catch (error) {
    next(error)
  }
}

/**
 * Deletes a task dependency
 * @route DELETE /api/tasks/dependencies/:dependencyId
 */
export async function deleteDependency(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { dependencyId } = req.params
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    // Dipendente must own at least one of the two linked tasks
    if (req.user?.role === 'dipendente') {
      const dep = await taskService.getTaskDependencyById(dependencyId)
      if (!dep) throw new AppError('Dependency not found', 404)

      const [pred, succ] = await Promise.all([
        taskService.getTaskById(dep.predecessorId),
        taskService.getTaskById(dep.successorId),
      ])

      const ownsPred = pred && (pred.createdById === userId || pred.assigneeId === userId)
      const ownsSucc = succ && (succ.createdById === userId || succ.assigneeId === userId)
      if (!ownsPred && !ownsSucc) {
        throw new AppError('Non hai i permessi per eliminare questa dipendenza', 403)
      }
    }

    const deleted = await taskService.deleteTaskDependency(dependencyId, userId)

    if (!deleted) {
      throw new AppError('Dependency not found', 404)
    }

    res.json({ success: true, message: 'Dependency deleted successfully' })
  } catch (error) {
    next(error)
  }
}
