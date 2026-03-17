/**
 * Permission Routes - Admin-only endpoints for permission policy management
 * @module routes/permissionRoutes
 */

import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js'
import * as ctrl from '../controllers/permissionController.js'

const router = Router()
router.use(authMiddleware)
router.use(requireRole('admin'))

router.get('/policies', ctrl.getPolicies)
router.put('/policies', ctrl.updatePolicies)
router.post('/policies/reset', ctrl.resetPolicies)

export default router
