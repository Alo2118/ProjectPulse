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

const approvalQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
})

const bulkApproveSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID required'),
})

const bulkRejectSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID required'),
  rejectionNote: z.string().max(500).optional(),
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
 * Exports time entries as a CSV file (admin/direzione only)
 * @route GET /api/time-entries/export
 */
export async function exportTimeEntries(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const exportQuerySchema = z.object({
      taskId: z.string().uuid().optional(),
      userId: z.string().uuid().optional(),
      projectId: z.string().uuid().optional(),
      startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD')
        .optional(),
      endDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD')
        .optional(),
    })

    const params = exportQuerySchema.parse(req.query)

    const startDate = params.startDate ? new Date(params.startDate + 'T00:00:00.000Z') : undefined
    const endDate = params.endDate ? new Date(params.endDate + 'T23:59:59.999Z') : undefined

    const entries = await timeEntryService.getTimeEntriesForExport({
      taskId: params.taskId,
      userId: params.userId,
      projectId: params.projectId,
      startDate,
      endDate,
    })

    // Helper functions for formatting
    const padZero = (n: number): string => String(n).padStart(2, '0')

    const formatDate = (date: Date): string => {
      const d = padZero(date.getDate())
      const m = padZero(date.getMonth() + 1)
      const y = date.getFullYear()
      return `${d}/${m}/${y}`
    }

    const formatTime = (date: Date): string => {
      return `${padZero(date.getHours())}:${padZero(date.getMinutes())}`
    }

    const escapeCSV = (value: string | null | undefined): string => {
      if (value === null || value === undefined) return ''
      const str = String(value)
      // Wrap in quotes if the value contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    // Build CSV rows
    const headers = ['Data', 'Ora Inizio', 'Ora Fine', 'Durata (ore)', 'Utente', 'Progetto', 'Codice Task', 'Task', 'Descrizione']

    const rows = entries.map((entry) => {
      const startTime = new Date(entry.startTime)
      const endTime = entry.endTime ? new Date(entry.endTime) : null
      const durationHours = entry.duration != null ? (entry.duration / 60).toFixed(2) : '0.00'
      const userName = `${entry.user.firstName} ${entry.user.lastName}`
      const projectName = entry.task?.project?.name ?? ''
      const taskCode = entry.task?.code ?? ''
      const taskTitle = entry.task?.title ?? ''

      return [
        formatDate(startTime),
        formatTime(startTime),
        endTime ? formatTime(endTime) : '',
        durationHours,
        escapeCSV(userName),
        escapeCSV(projectName),
        escapeCSV(taskCode),
        escapeCSV(taskTitle),
        escapeCSV(entry.description),
      ].join(',')
    })

    const csvContent =
      '\ufeff' + // BOM for Excel UTF-8 compatibility
      headers.join(',') +
      '\n' +
      rows.join('\n')

    const today = new Date()
    const fileDate = `${today.getFullYear()}-${padZero(today.getMonth() + 1)}-${padZero(today.getDate())}`

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=time-entries-${fileDate}.csv`)
    res.status(200).send(csvContent)
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

/**
 * Gets pending time entries for approval (admin/direzione only)
 * @route GET /api/time-entries/pending
 */
export async function getPendingTimeEntries(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = approvalQuerySchema.parse(req.query)

    const result = await timeEntryService.getPendingTimeEntries({
      userId: params.userId,
      projectId: params.projectId,
      page: params.page,
      limit: params.limit,
    })

    res.json({ success: true, data: result.data, pagination: result.pagination })
  } catch (error) {
    next(error)
  }
}

/**
 * Bulk approve time entries (admin/direzione only)
 * @route PATCH /api/time-entries/approve
 */
export async function approveTimeEntries(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = bulkApproveSchema.parse(req.body)
    const approverId = req.user?.userId

    if (!approverId) {
      throw new AppError('User not authenticated', 401)
    }

    const result = await timeEntryService.approveTimeEntries(data.ids, approverId)

    res.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof Error && error.message === 'No eligible entries found') {
      next(new AppError('No eligible entries found', 404))
    } else {
      next(error)
    }
  }
}

/**
 * Bulk reject time entries (admin/direzione only)
 * @route PATCH /api/time-entries/reject
 */
export async function rejectTimeEntries(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = bulkRejectSchema.parse(req.body)
    const approverId = req.user?.userId

    if (!approverId) {
      throw new AppError('User not authenticated', 401)
    }

    const result = await timeEntryService.rejectTimeEntries(data.ids, approverId, data.rejectionNote)

    res.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof Error && error.message === 'No eligible entries found') {
      next(new AppError('No eligible entries found', 404))
    } else {
      next(error)
    }
  }
}
