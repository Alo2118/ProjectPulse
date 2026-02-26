/**
 * Planning Routes - Planning assistant endpoints
 * @module routes/planningRoutes
 */

import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js'
import {
  getEstimationMetrics,
  getTeamCapacity,
  suggestTimeline,
  getBottlenecks,
  generatePlan,
  commitPlan,
  autoSchedule,
  suggestReassignments,
  whatIfAnalysis,
} from '../controllers/planningController.js'

const router = Router()

// All planning routes require authentication + admin or direzione role
router.use(authMiddleware)
router.use(requireRole('admin', 'direzione'))

// GET /api/planning/estimation-metrics?projectId=&userId=&taskType=
router.get('/estimation-metrics', getEstimationMetrics)

// GET /api/planning/team-capacity?weekStart=2026-02-17T00:00:00.000Z
router.get('/team-capacity', getTeamCapacity)

// POST /api/planning/suggest-timeline
router.post('/suggest-timeline', suggestTimeline)

// GET /api/planning/bottlenecks/:projectId
router.get('/bottlenecks/:projectId', getBottlenecks)

// POST /api/planning/generate-plan
router.post('/generate-plan', generatePlan)

// POST /api/planning/commit-plan
router.post('/commit-plan', commitPlan)

// POST /api/planning/auto-schedule/:projectId
router.post('/auto-schedule/:projectId', autoSchedule)

// GET /api/planning/suggest-reassignments/:projectId
router.get('/suggest-reassignments/:projectId', suggestReassignments)

// POST /api/planning/what-if/:projectId
router.post('/what-if/:projectId', whatIfAnalysis)

export default router
