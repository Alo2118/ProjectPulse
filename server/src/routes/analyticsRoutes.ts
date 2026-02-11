/**
 * Analytics Routes - Dashboard analytics endpoints
 * @module routes/analyticsRoutes
 */

import { Router, Request, Response, NextFunction } from 'express'
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js'
import { analyticsService } from '../services/analyticsService.js'

const router = Router()

router.use(authMiddleware)
router.use(requireRole('admin', 'direzione'))

// GET /api/analytics/overview
router.get('/overview', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getOverview()
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
})

// GET /api/analytics/tasks-by-status
router.get('/tasks-by-status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getTasksByStatus()
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
})

// GET /api/analytics/hours-by-project
router.get('/hours-by-project', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getHoursByProject()
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
})

// GET /api/analytics/task-completion-trend
router.get('/task-completion-trend', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getTaskCompletionTrend()
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
})

// GET /api/analytics/top-contributors
router.get('/top-contributors', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getTopContributors()
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
})

// GET /api/analytics/project-health
router.get('/project-health', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getProjectHealth()
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
})

export default router
