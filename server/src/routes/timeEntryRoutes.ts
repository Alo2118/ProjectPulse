/**
 * Time Entry Routes - HTTP routes for time tracking
 * @module routes/timeEntryRoutes
 */

import { Router } from 'express'
import {
  startTimer,
  stopTimer,
  stopCurrentTimer,
  getRunningTimer,
  createTimeEntry,
  getTimeEntries,
  updateTimeEntry,
  deleteTimeEntry,
  getMyTimeReport,
  getMyDailySummary,
  getTeamTimeReport,
} from '../controllers/timeEntryController.js'
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js'

const router = Router()

// All routes require authentication (Rule 7)
router.use(authMiddleware)

// POST /api/time-entries/start - Start a timer
router.post('/start', startTimer)

// POST /api/time-entries/stop - Stop current running timer (no ID needed)
router.post('/stop', stopCurrentTimer)

// GET /api/time-entries/running - Get running timer
router.get('/running', getRunningTimer)

// GET /api/time-entries/my/report - Get user's time report
router.get('/my/report', getMyTimeReport)

// GET /api/time-entries/my/daily - Get user's daily summary
router.get('/my/daily', getMyDailySummary)

// GET /api/time-entries/team - Get team time report (admin/direzione only)
router.get('/team', requireRole('admin', 'direzione'), getTeamTimeReport)

// GET /api/time-entries - List time entries
router.get('/', getTimeEntries)

// POST /api/time-entries - Create manual time entry
router.post('/', createTimeEntry)

// POST /api/time-entries/:id/stop - Stop a running timer
router.post('/:id/stop', stopTimer)

// PUT /api/time-entries/:id - Update time entry
router.put('/:id', updateTimeEntry)

// DELETE /api/time-entries/:id - Delete time entry
router.delete('/:id', deleteTimeEntry)

export default router
