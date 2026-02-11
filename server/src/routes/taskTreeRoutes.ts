/**
 * Task Tree Routes - Hierarchical task data endpoints
 * @module routes/taskTreeRoutes
 */

import { Router } from 'express'
import { taskTreeController } from '../controllers/taskTreeController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

// All routes require authentication but are accessible to all roles
router.use(authMiddleware)

/**
 * GET /api/task-tree
 * Get hierarchical task tree for all accessible projects
 * Query params: projectId (optional) - filter by specific project
 */
router.get('/', taskTreeController.getTaskTree)

export default router
