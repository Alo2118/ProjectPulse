/**
 * Time Entry Controller - HTTP request handling for time tracking
 * @module controllers/timeEntryController
 */

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { timeEntryService } from '../services/timeEntryService.js'
import { AppError } from '../middleware/errorMiddleware.js'

// ============================================================
// VALIDATION SCHEMAS (Rule 6: Input Validation)
// ============================================================

const startTimerSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  description: z.string().nullish(),
})

const createTimeEntrySchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  description: z.string().nullish(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().nullish(),
  duration: z.number().int().positive().nullish(),
})

const updateTimeEntrySchema = z.object({
  description: z.string().nullish(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().nullish(),
  duration: z.number().int().positive().nullish(),
})

const querySchema = z.object({
  taskId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
})

const reportQuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
})

const teamReportQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  projectId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
})

// ============================================================
// CONTROLLER FUNCTIONS
// ============================================================

/**
 * Starts a new timer for a task
 * @route POST /api/time-entries/start
 */
export async function startTimer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = startTimerSchema.parse(req.body)
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const timeEntry = await timeEntryService.startTimer(data.taskId, userId, data.description ?? undefined)

    res.status(201).json({ success: true, data: timeEntry })
  } catch (error) {
    if (error instanceof Error && error.message === 'Task not found') {
      next(new AppError('Task not found', 404))
    } else {
      next(error)
    }
  }
}

/**
 * Stops a running timer by ID
 * @route POST /api/time-entries/:id/stop
 */
export async function stopTimer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const timeEntry = await timeEntryService.stopTimer(id, userId)

    res.json({ success: true, data: timeEntry })
  } catch (error) {
    if (error instanceof Error && error.message === 'Running timer not found') {
      next(new AppError('Running timer not found', 404))
    } else {
      next(error)
    }
  }
}

/**
 * Stops the current running timer for the user (no ID needed)
 * @route POST /api/time-entries/stop
 */
export async function stopCurrentTimer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const timeEntry = await timeEntryService.stopCurrentTimer(userId)

    if (!timeEntry) {
      res.json({ success: true, data: null, message: 'No running timer' })
      return
    }

    res.json({ success: true, data: timeEntry })
  } catch (error) {
    next(error)
  }
}

/**
 * Gets the currently running timer for the user
 * @route GET /api/time-entries/running
 */
export async function getRunningTimer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const timeEntry = await timeEntryService.getRunningTimer(userId)

    res.json({ success: true, data: timeEntry })
  } catch (error) {
    next(error)
  }
}

/**
 * Creates a manual time entry
 * @route POST /api/time-entries
 */
export async function createTimeEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createTimeEntrySchema.parse(req.body)
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const timeEntry = await timeEntryService.createTimeEntry(
      {
        taskId: data.taskId,
        description: data.description ?? undefined,
        startTime: new Date(data.startTime),
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        duration: data.duration ?? undefined,
      },
      userId
    )

    res.status(201).json({ success: true, data: timeEntry })
  } catch (error) {
    if (error instanceof Error && error.message === 'Task not found') {
      next(new AppError('Task not found', 404))
    } else {
      next(error)
    }
  }
}

/**
 * Gets time entries with filters and pagination
 * @route GET /api/time-entries
 */
export async function getTimeEntries(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = querySchema.parse(req.query)

    // Support both fromDate/toDate (YYYY-MM-DD) and startDate/endDate (ISO datetime)
    const fromDateStr = params.fromDate || params.startDate
    const toDateStr = params.toDate || params.endDate

    const startDate = fromDateStr ? new Date(fromDateStr) : undefined
    // If toDate is YYYY-MM-DD, set to end of day
    const endDate = toDateStr
      ? toDateStr.length === 10
        ? new Date(toDateStr + 'T23:59:59.999Z')
        : new Date(toDateStr)
      : undefined

    // Dipendente can only see their own time entries
    const effectiveUserId = req.user?.role === 'dipendente'
      ? req.user?.userId
      : params.userId

    const result = await timeEntryService.getTimeEntries({
      taskId: params.taskId,
      userId: effectiveUserId,
      projectId: params.projectId,
      startDate,
      endDate,
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
 * Updates a time entry
 * @route PUT /api/time-entries/:id
 */
export async function updateTimeEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const data = updateTimeEntrySchema.parse(req.body)
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const timeEntry = await timeEntryService.updateTimeEntry(
      id,
      {
        description: data.description ?? undefined,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        duration: data.duration ?? undefined,
      },
      userId
    )

    if (!timeEntry) {
      throw new AppError('Time entry not found', 404)
    }

    res.json({ success: true, data: timeEntry })
  } catch (error) {
    next(error)
  }
}

/**
 * Deletes a time entry
 * @route DELETE /api/time-entries/:id
 */
export async function deleteTimeEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const deleted = await timeEntryService.deleteTimeEntry(id, userId)

    if (!deleted) {
      throw new AppError('Time entry not found', 404)
    }

    res.json({ success: true, message: 'Time entry deleted successfully' })
  } catch (error) {
    next(error)
  }
}

/**
 * Gets time report for current user
 * @route GET /api/time-entries/my/report
 */
export async function getMyTimeReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const params = reportQuerySchema.parse(req.query)

    const report = await timeEntryService.getUserTimeReport(
      userId,
      new Date(params.startDate),
      new Date(params.endDate)
    )

    res.json({ success: true, data: report })
  } catch (error) {
    next(error)
  }
}

/**
 * Gets daily summary for current user
 * @route GET /api/time-entries/my/daily
 */
export async function getMyDailySummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const date = req.query.date
      ? new Date(req.query.date as string)
      : new Date()

    const summary = await timeEntryService.getDailySummary(userId, date)

    res.json({ success: true, data: summary })
  } catch (error) {
    next(error)
  }
}

/**
 * Gets team-wide time report (admin/direzione only)
 * @route GET /api/time-entries/team
 */
export async function getTeamTimeReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = teamReportQuerySchema.parse(req.query)

    const report = await timeEntryService.getTeamTimeReport({
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
      projectId: params.projectId,
      userId: params.userId,
    })

    res.json({ success: true, data: report })
  } catch (error) {
    next(error)
  }
}
