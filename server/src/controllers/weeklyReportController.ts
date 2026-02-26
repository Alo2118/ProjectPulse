/**
 * Weekly Report Controller - HTTP request handling for weekly reports
 * @module controllers/weeklyReportController
 */

import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { weeklyReportService } from '../services/weeklyReportService.js'
import { AppError } from '../middleware/errorMiddleware.js'
import { logger } from '../utils/logger.js'
import { sendSuccess, sendCreated, sendPaginated } from '../utils/responseHelpers.js'

// ============================================================
// VALIDATION SCHEMAS (Rule 6: Input Validation)
// ============================================================

const generateReportSchema = z.object({
  weekStartDate: z.string().datetime().optional(),
  weekEndDate: z.string().datetime().optional(),
})

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  year: z.coerce.number().int().optional(),
  weekNumber: z.coerce.number().int().optional(),
})

// ============================================================
// CONTROLLER FUNCTIONS
// ============================================================

/**
 * Gets current week preview (live data, not saved)
 * @route GET /api/reports/weekly/preview
 * @query allUsers - if 'true' and user is admin/direzione, returns team-wide preview
 */
export async function getWeeklyPreview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId
    const userRole = req.user?.role

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const allUsers = req.query.allUsers === 'true'
    const isAdmin = userRole === 'admin' || userRole === 'direzione'

    let preview
    if (allUsers && isAdmin) {
      preview = await weeklyReportService.generateTeamReportPreview()
    } else {
      preview = await weeklyReportService.generateReportPreview(userId)
    }

    logger.debug('Weekly report preview generated', {
      hasTimeTracking: !!preview.timeTracking,
      entriesCount: preview.timeTracking.entries?.length || 0,
      byProjectCount: preview.timeTracking.byProject.length,
    })

    sendSuccess(res, preview)
  } catch (error) {
    next(error)
  }
}

/**
 * Generates and saves a weekly report for the current user
 * @route POST /api/reports/weekly/generate
 */
export async function generateReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const data = generateReportSchema.parse(req.body)

    const weekStart = data.weekStartDate ? new Date(data.weekStartDate) : undefined
    const weekEnd = data.weekEndDate ? new Date(data.weekEndDate) : undefined

    const report = await weeklyReportService.generateAndSaveReport(
      userId,
      weekStart,
      weekEnd
    )

    sendCreated(res, report)
  } catch (error) {
    next(error)
  }
}

/**
 * Gets the current user's report history
 * @route GET /api/reports/weekly
 */
export async function getMyReports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const params = querySchema.parse(req.query)

    const result = await weeklyReportService.getMyReports(userId, {
      page: params.page,
      limit: params.limit,
      year: params.year,
      weekNumber: params.weekNumber,
    })

    sendPaginated(res, result)
  } catch (error) {
    next(error)
  }
}

/**
 * Gets a single report by ID
 * @route GET /api/reports/weekly/:id
 */
export async function getReportById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const userId = req.user?.userId
    const userRole = req.user?.role

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const isAdmin = userRole === 'admin' || userRole === 'direzione'
    const report = await weeklyReportService.getReportById(id, userId, isAdmin)

    if (!report) {
      throw new AppError('Report not found', 404)
    }

    sendSuccess(res, report)
  } catch (error) {
    next(error)
  }
}

/**
 * Gets team reports (reports from teammates in same projects)
 * @route GET /api/reports/weekly/team
 */
export async function getTeamReports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const params = querySchema.parse(req.query)

    const result = await weeklyReportService.getTeamReports(userId, {
      page: params.page,
      limit: params.limit,
      year: params.year,
      weekNumber: params.weekNumber,
    })

    sendPaginated(res, result)
  } catch (error) {
    next(error)
  }
}

/**
 * Gets current week info (bounds, week number)
 * @route GET /api/reports/weekly/current-week
 */
export async function getCurrentWeekInfo(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const weekInfo = weeklyReportService.getCurrentWeekBounds()

    sendSuccess(res, {
      weekNumber: weekInfo.weekNumber,
      year: weekInfo.year,
      weekStartDate: weekInfo.weekStart.toISOString(),
      weekEndDate: weekInfo.weekEnd.toISOString(),
    })
  } catch (error) {
    next(error)
  }
}
