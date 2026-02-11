/**
 * Weekly Report Routes - HTTP routes for weekly reports
 * @module routes/weeklyReportRoutes
 */

import { Router } from 'express'
import {
  getWeeklyPreview,
  generateReport,
  getMyReports,
  getReportById,
  getTeamReports,
  getCurrentWeekInfo,
} from '../controllers/weeklyReportController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

// All routes require authentication (Rule 7)
router.use(authMiddleware)

// GET /api/reports/weekly/current-week - Get current week info
router.get('/current-week', getCurrentWeekInfo)

// GET /api/reports/weekly/preview - Get live preview for current week
router.get('/preview', getWeeklyPreview)

// GET /api/reports/weekly/team - Get team reports (same project colleagues)
router.get('/team', getTeamReports)

// POST /api/reports/weekly/generate - Generate and save report
router.post('/generate', generateReport)

// GET /api/reports/weekly - Get user's report history
router.get('/', getMyReports)

// GET /api/reports/weekly/:id - Get single report by ID
router.get('/:id', getReportById)

export default router
