/**
 * Analytics Routes - Dashboard analytics endpoints
 * @module routes/analyticsRoutes
 */

import { Router, Request, Response, NextFunction } from 'express'
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js'
import { analyticsService } from '../services/analyticsService.js'
import { logger } from '../utils/logger.js'
import { sendSuccess, sendError } from '../utils/responseHelpers.js'

const router = Router()

// All analytics routes require authentication
router.use(authMiddleware)

// ============================================================
// Routes accessible to ALL authenticated users
// ============================================================

// GET /api/analytics/my-weekly-hours?weekStart=2026-02-16
router.get('/my-weekly-hours', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId
    let weekStart: Date
    if (req.query.weekStart) {
      weekStart = new Date(req.query.weekStart as string)
    } else {
      // Default to current week's Monday
      const now = new Date()
      const dayOfWeek = now.getDay()
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      weekStart = new Date(now)
      weekStart.setDate(now.getDate() - diff)
      weekStart.setHours(0, 0, 0, 0)
    }
    const data = await analyticsService.getWeeklyHoursByUser(userId, weekStart)
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
})

// ============================================================
// Routes restricted to admin/direzione
// ============================================================
router.use(requireRole('admin', 'direzione'))

// GET /api/analytics/overview
router.get('/overview', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getOverview()
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
})

// GET /api/analytics/overview-with-delta
router.get('/overview-with-delta', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [overview, previousWeek] = await Promise.all([
      analyticsService.getOverview(),
      analyticsService.getPreviousWeekOverview(),
    ])
    sendSuccess(res, { ...overview, previousWeek })
  } catch (error) {
    next(error)
  }
})

// GET /api/analytics/team-workload?weekStart=2026-02-16
router.get('/team-workload', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let weekStart: Date
    if (req.query.weekStart) {
      weekStart = new Date(req.query.weekStart as string)
    } else {
      const now = new Date()
      const dayOfWeek = now.getDay()
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      weekStart = new Date(now)
      weekStart.setDate(now.getDate() - diff)
      weekStart.setHours(0, 0, 0, 0)
    }
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const data = await analyticsService.getTeamWorkload(weekStart, weekEnd)
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
})

// GET /api/analytics/tasks-by-status
router.get('/tasks-by-status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getTasksByStatus()
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
})

// GET /api/analytics/hours-by-project
router.get('/hours-by-project', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getHoursByProject()
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
})

// GET /api/analytics/task-completion-trend?days=28
router.get('/task-completion-trend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30
    const data = await analyticsService.getTaskCompletionTrend(days)
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
})

// GET /api/analytics/top-contributors
router.get('/top-contributors', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getTopContributors()
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
})

// GET /api/analytics/project-health
router.get('/project-health', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getProjectHealth()
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
})

// GET /api/analytics/burndown/:projectId?days=30
router.get('/burndown/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(projectId)) {
      sendError(res, 'ID progetto non valido', 400)
      return
    }
    const daysParam = parseInt(req.query.days as string)
    const days = isNaN(daysParam) ? 30 : Math.max(7, Math.min(365, daysParam))
    const data = await analyticsService.getBurndownData(projectId, days)
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
})

// GET /api/analytics/delivery-forecast
router.get('/delivery-forecast', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getDeliveryForecast()
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
})

// GET /api/analytics/budget-overview
router.get('/budget-overview', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getBudgetOverview()
    sendSuccess(res, data)
  } catch (error) {
    logger.error('Error fetching budget overview', { error })
    next(error)
  }
})

export default router
