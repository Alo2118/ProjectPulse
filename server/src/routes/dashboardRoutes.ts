/**
 * Dashboard Routes - API endpoints for dashboard data
 * @module routes/dashboardRoutes
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import * as dashboardController from '../controllers/dashboardController.js'

const router = Router()

router.use(authMiddleware)

router.get('/stats', dashboardController.getStats)
router.get('/attention', dashboardController.getAttention)
router.get('/today-total', dashboardController.getTodayTotal)
router.get('/my-tasks-today', dashboardController.getMyTasksToday)
router.get('/recent-activity', dashboardController.getRecentActivity)

export default router
