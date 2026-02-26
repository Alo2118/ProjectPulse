/**
 * Audit Routes - HTTP routes for audit trail log access
 * @module routes/auditRoutes
 */

import { Router } from 'express'
import {
  getAuditLogsHandler,
  getEntityHistoryHandler,
  getStatusTimelineHandler,
  getProjectActivityHandler,
} from '../controllers/auditController.js'
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js'

const router = Router()

// All audit routes require authentication and admin/direzione role
router.use(authMiddleware)
router.use(requireRole('admin', 'direzione'))

// GET /api/audit - List audit logs with pagination and filters
router.get('/', getAuditLogsHandler)

// GET /api/audit/entity/:entityType/:entityId - History for a specific entity
router.get('/entity/:entityType/:entityId', getEntityHistoryHandler)

// GET /api/audit/timeline/:entityId - Status change timeline for an entity
router.get('/timeline/:entityId', getStatusTimelineHandler)

// GET /api/audit/project/:projectId - Recent activity across a project
router.get('/project/:projectId', getProjectActivityHandler)

export default router
