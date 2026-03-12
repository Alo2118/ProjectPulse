/**
 * Dashboard Controller - HTTP request handling for dashboard endpoints
 * @module controllers/dashboardController
 */

import type { Request, Response, NextFunction } from 'express'
import { dashboardService } from '../services/dashboardService.js'
import { attentionQuerySchema, activityQuerySchema } from '../schemas/dashboardSchemas.js'
import { requireUserId } from '../utils/controllerHelpers.js'
import { sendSuccess } from '../utils/responseHelpers.js'

// ============================================================
// CONTROLLER FUNCTIONS
// ============================================================

/**
 * Returns KPI statistics for the dashboard
 * @route GET /api/dashboard/stats
 */
export async function getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = requireUserId(req)
    const role = req.user?.role ?? 'dipendente'

    const stats = await dashboardService.getStats(userId, role)

    sendSuccess(res, stats)
  } catch (error) {
    next(error)
  }
}

/**
 * Returns items requiring immediate attention
 * @route GET /api/dashboard/attention
 */
export async function getAttention(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { limit } = attentionQuerySchema.parse(req.query)
    const userId = requireUserId(req)
    const role = req.user?.role ?? 'dipendente'

    const items = await dashboardService.getAttentionItems(userId, role, limit)

    sendSuccess(res, items)
  } catch (error) {
    next(error)
  }
}

/**
 * Returns today's total tracked time and running timer for the current user
 * @route GET /api/dashboard/today-total
 */
export async function getTodayTotal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = requireUserId(req)

    const total = await dashboardService.getTodayTotal(userId)

    sendSuccess(res, total)
  } catch (error) {
    next(error)
  }
}

/**
 * Returns tasks assigned to the current user that are relevant for today
 * @route GET /api/dashboard/my-tasks-today
 */
export async function getMyTasksToday(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = requireUserId(req)
    const days = req.query.days ? Number(req.query.days) : 1

    const tasks = await dashboardService.getMyTasksToday(userId, days)

    sendSuccess(res, tasks)
  } catch (error) {
    next(error)
  }
}

/**
 * Returns recent audit activity feed
 * @route GET /api/dashboard/recent-activity
 */
export async function getRecentActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { limit } = activityQuerySchema.parse(req.query)
    const userId = requireUserId(req)
    const role = req.user?.role ?? 'dipendente'

    const activity = await dashboardService.getRecentActivity(userId, role, limit)

    sendSuccess(res, activity)
  } catch (error) {
    next(error)
  }
}
