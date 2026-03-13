/**
 * Task Controller - HTTP request handling for tasks
 * @module controllers/taskController
 */

import type { Request, Response, NextFunction } from 'express'
import { taskService } from '../services/taskService.js'
import { AppError } from '../middleware/errorMiddleware.js'
import { assertTaskOwnership } from '../utils/taskOwnership.js'
import { TaskStatus, TaskPriority } from '../types/index.js'
import { sendSuccess, sendCreated, sendPaginated } from '../utils/responseHelpers.js'
import {
  createTaskSchema,
  updateTaskSchema,
  taskQuerySchema as querySchema,
  taskStatusChangeSchema as statusChangeSchema,
  ganttQuerySchema,
  createTaskDependencySchema as createDependencySchema,
  bulkUpdateTaskSchema,
  bulkDeleteTaskSchema,
  reorderTaskSchema,
  cloneTaskSchema,
  calendarQuerySchema,
} from '../schemas/taskSchemas.js'
import { requireUserId, requireResource } from '../utils/controllerHelpers.js'

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
      userId: req.user?.userId,
      role: req.user?.role,
    })

    sendPaginated(res, result)
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

    sendSuccess(res, tasks)
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

    const task = requireResource(await taskService.getTaskById(id), 'Task')

    sendSuccess(res, task)
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
    const data = createTaskSchema.parse(req.body)
    const userId = requireUserId(req)

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

    sendCreated(res, task)
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
    const userId = requireUserId(req)
    const userRole = req.user?.role

    await assertTaskOwnership(id, userId, userRole)

    const task = requireResource(await taskService.updateTask(
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
    ), 'Task')

    // Recursive assignment to subtasks at N levels
    let subtasksUpdated = 0
    if (data.assignToSubtasks && data.assigneeId !== undefined) {
      subtasksUpdated = await taskService.assignSubtasksRecursively(
        id,
        data.assigneeId,
        userId
      )
    }

    sendSuccess(res, { ...task, subtasksUpdated })
  } catch (error) {
    next(error)
  }
}

/**
 * Changes task status
 * @route PATCH /api/tasks/:id/status
 * NOTE: updateTask keeps its custom response (subtasksUpdated field) so sendSuccess is not used there.
 */
export async function changeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const { status, blockedReason } = statusChangeSchema.parse(req.body)
    const userId = requireUserId(req)

    await assertTaskOwnership(id, userId, req.user?.role)

    const task = requireResource(await taskService.changeTaskStatus(id, status as TaskStatus, userId, blockedReason), 'Task')

    sendSuccess(res, task)
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
    const userId = requireUserId(req)
    const userRole = req.user?.role

    await assertTaskOwnership(id, userId, userRole)

    requireResource(await taskService.deleteTask(id, userId), 'Task')

    sendSuccess(res, { message: 'Task deleted successfully' })
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
    const userId = requireUserId(req)

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

    sendPaginated(res, result)
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
    const userId = requireUserId(req)

    const stats = await taskService.getUserTaskStats(userId)

    sendSuccess(res, stats)
  } catch (error) {
    next(error)
  }
}

// ============================================================
// BULK OPERATION FUNCTIONS
// ============================================================

/**
 * Bulk updates multiple tasks (status, priority, or assignee)
 * @route PATCH /api/tasks/bulk
 */
export async function bulkUpdate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = requireUserId(req)

    const { ids, update } = bulkUpdateTaskSchema.parse(req.body)

    const count = await taskService.bulkUpdateTasks(ids, update, userId)

    sendSuccess(res, { updated: count })
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
    const userId = requireUserId(req)

    const { ids } = bulkDeleteTaskSchema.parse(req.body)

    const count = await taskService.bulkDeleteTasks(ids, userId)

    sendSuccess(res, { deleted: count })
  } catch (error) {
    next(error)
  }
}

/**
 * Reorder user's tasks by updating position field
 * @route PATCH /api/tasks/reorder
 */
export async function reorderTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = requireUserId(req)

    const { tasks } = reorderTaskSchema.parse(req.body)

    await taskService.reorderTasks(tasks, userId)

    sendSuccess(res, { message: 'Tasks reordered successfully' })
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
    sendSuccess(res, subtasks)
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
      userId: req.user?.userId,
      role: req.user?.role,
    })

    sendPaginated(res, result)
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

    sendSuccess(res, tasks)
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
    const userId = requireUserId(req)

    // Dipendente must own at least one of the two linked tasks
    if (req.user?.role === 'dipendente') {
      const [predRaw, succRaw] = await Promise.all([
        taskService.getTaskById(data.predecessorId),
        taskService.getTaskById(data.successorId),
      ])
      const pred = requireResource(predRaw, 'Predecessor task')
      const succ = requireResource(succRaw, 'Successor task')

      const ownsPred = pred.createdById === userId || pred.assigneeId === userId
      const ownsSucc = succ.createdById === userId || succ.assigneeId === userId
      if (!ownsPred && !ownsSucc) {
        throw new AppError('You do not have permission to create this dependency', 403)
      }
    }

    const dependency = await taskService.createTaskDependency(data, userId)

    sendCreated(res, dependency)
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

    sendSuccess(res, dependencies)
  } catch (error) {
    next(error)
  }
}

// ============================================================
// CALENDAR CONTROLLER FUNCTIONS
// ============================================================

/**
 * Gets tasks for calendar view filtered by date range
 * @route GET /api/tasks/calendar
 */
export async function getTasksForCalendar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = calendarQuerySchema.parse(req.query)

    const tasks = await taskService.getTasksForCalendar({
      start: new Date(parsed.start),
      end: new Date(parsed.end),
      projectId: parsed.projectId,
      assigneeId: parsed.assigneeId,
      userId: req.user?.userId,
      role: req.user?.role,
    })

    sendSuccess(res, tasks)
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
    const userId = requireUserId(req)

    // Dipendente must own at least one of the two linked tasks
    if (req.user?.role === 'dipendente') {
      const dep = requireResource(await taskService.getTaskDependencyById(dependencyId), 'Dependency')

      const [pred, succ] = await Promise.all([
        taskService.getTaskById(dep.predecessorId),
        taskService.getTaskById(dep.successorId),
      ])

      const ownsPred = pred && (pred.createdById === userId || pred.assigneeId === userId)
      const ownsSucc = succ && (succ.createdById === userId || succ.assigneeId === userId)
      if (!ownsPred && !ownsSucc) {
        throw new AppError('You do not have permission to delete this dependency', 403)
      }
    }

    requireResource(await taskService.deleteTaskDependency(dependencyId, userId), 'Dependency')

    sendSuccess(res, { message: 'Dependency deleted successfully' })
  } catch (error) {
    next(error)
  }
}

/**
 * Clones a task
 * @route POST /api/tasks/:id/clone
 */
export async function cloneTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = requireUserId(req)

    const { id } = req.params
    const { includeSubtasks } = cloneTaskSchema.parse(req.body)

    const cloned = await taskService.cloneTask(id, userId, { includeSubtasks })

    sendCreated(res, cloned)
  } catch (error) {
    if (error instanceof Error && error.message === 'Task not found') {
      return next(new AppError('Task not found', 404))
    }
    next(error)
  }
}
