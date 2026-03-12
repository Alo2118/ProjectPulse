/**
 * Activity Routes - Unified timeline endpoints
 * @module routes/activityRoutes
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import * as activityController from '../controllers/activityController.js'

const router = Router()

router.use(authMiddleware)

router.get('/:entityType/:entityId', activityController.getEntityActivity)

export default router
