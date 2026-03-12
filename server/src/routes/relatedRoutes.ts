/**
 * Related Routes - Polymorphic related entities endpoint
 * @module routes/relatedRoutes
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import * as relatedController from '../controllers/relatedController.js'

const router = Router()

router.use(authMiddleware)

router.get('/:entityType/:entityId', relatedController.getRelated)

export default router
