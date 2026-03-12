/**
 * Stats Routes - KPI strip and summary endpoints
 * @module routes/statsRoutes
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import * as statsController from '../controllers/statsController.js'

const router = Router()

router.use(authMiddleware)

// Specific routes BEFORE parametric :domain
router.get('/project/:id/summary', statsController.getProjectSummary)
router.get('/task/:id/summary', statsController.getTaskSummary)
router.get('/:domain', statsController.getDomainStats)

export default router
