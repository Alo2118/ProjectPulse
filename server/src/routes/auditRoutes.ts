/**
 * Audit Routes - HTTP routes for audit trail log access
 * @module routes/auditRoutes
 */

import { Router } from 'express'
import { getAuditLogsHandler } from '../controllers/auditController.js'
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js'

const router = Router()

// All audit routes require authentication and admin/direzione role
router.use(authMiddleware)
router.use(requireRole('admin', 'direzione'))

// GET /api/audit - List audit logs with pagination and filters
router.get('/', getAuditLogsHandler)

export default router
