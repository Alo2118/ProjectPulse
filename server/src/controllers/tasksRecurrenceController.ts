/**
 * Tasks Recurrence Controller - HTTP request handling for recurring tasks
 * @module controllers/tasksRecurrenceController
 */

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { logger } from '../utils/logger.js'
import { AppError } from '../middleware/errorMiddleware.js'
import { assertTaskOwnership } from '../utils/taskOwnership.js'
import * as recurrenceService from '../services/recurrenceService.js'
import { RecurrenceType } from '../types/index.js'
import { sendSuccess } from '../utils/responseHelpers.js'
import { requireUserId, requireResource } from '../utils/controllerHelpers.js'

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const recurrencePatternSchema = z.object({
  type: z.nativeEnum(RecurrenceType),
  interval: z.number().int().min(1, 'Interval must be >= 1'),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  endAfterOccurrences: z.number().int().min(1).optional(),
  recurrenceEnd: z.string().datetime().optional(),
})

const setRecurrenceSchema = z.object({
  isRecurring: z.boolean(),
  recurrencePattern: recurrencePatternSchema.optional(),
})

const completeOccurrenceSchema = z.object({
  notes: z.string().max(1000).optional(),
})

// ============================================================
// CONTROLLER FUNCTIONS
// ============================================================

/**
 * Mark a recurring task occurrence as complete
 * @route POST /api/tasks/:taskId/completions
 */
export async function completeOccurrence(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { taskId } = req.params
    const data = completeOccurrenceSchema.parse(req.body)
    const userId = requireUserId(req)

    await assertTaskOwnership(taskId, userId, req.user?.role)

    logger.info('Marking task occurrence as complete', {
      taskId,
      userId,
    })

    const completion = await recurrenceService.completeOccurrence(
      taskId,
      {
        taskId,
        completedBy: userId,
        notes: data.notes,
      },
      userId
    )

    sendSuccess(res, completion)
  } catch (error) {
    if (error instanceof Error && (error.message === 'Task not found' || error.message === 'Task is not recurring')) {
      next(new AppError(error.message, 404))
    } else {
      next(error)
    }
  }
}

/**
 * Get task completion history
 * @route GET /api/tasks/:taskId/completions
 */
export async function getCompletionHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { taskId } = req.params
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0

    logger.info('Fetching completion history', {
      taskId,
      limit,
      offset,
    })

    const result = await recurrenceService.getCompletionHistory(taskId, limit, offset)

    sendSuccess(res, {
      data: result.completions,
      pagination: {
        total: result.total,
        limit,
        offset,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get recurring task with completion info
 * @route GET /api/tasks/:taskId/recurring
 */
export async function getRecurringTask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { taskId } = req.params

    logger.info('Fetching recurring task details', { taskId })

    const task = requireResource(await recurrenceService.getRecurringTaskWithCompletions(taskId), 'Task')

    sendSuccess(res, task)
  } catch (error) {
    next(error)
  }
}

/**
 * Set or update recurrence for a task
 * @route POST /api/tasks/:taskId/recurrence
 */
export async function setRecurrence(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { taskId } = req.params
    const data = setRecurrenceSchema.parse(req.body)
    const userId = requireUserId(req)

    await assertTaskOwnership(taskId, userId, req.user?.role)

    logger.info('Setting task recurrence', {
      taskId,
      isRecurring: data.isRecurring,
      pattern: data.recurrencePattern,
    })

    const task = await recurrenceService.setRecurrence(
      taskId,
      data.isRecurring,
      data.recurrencePattern,
      userId
    )

    sendSuccess(res, task)
  } catch (error) {
    if (error instanceof Error && (error.message.includes('Recurrence') || error.message.includes('pattern'))) {
      next(new AppError(error.message, 400))
    } else {
      next(error)
    }
  }
}

/**
 * Purge old completions for a task
 * @route DELETE /api/tasks/:taskId/completions/old
 */
export async function purgeOldCompletions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { taskId } = req.params
    const keepCount = req.query.keep ? parseInt(req.query.keep as string, 10) : 10
    const userId = requireUserId(req)

    await assertTaskOwnership(taskId, userId, req.user?.role)

    logger.info('Purging old task completions', {
      taskId,
      keepCount,
    })

    const result = await recurrenceService.purgeOldCompletions(taskId, keepCount, userId)

    sendSuccess(res, result)
  } catch (error) {
    next(error)
  }
}
