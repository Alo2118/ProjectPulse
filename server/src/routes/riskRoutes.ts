/**
 * Risk Routes - HTTP routes for risk management
 * @module routes/riskRoutes
 */

import { Router } from 'express'
import {
  getRisks,
  getRisk,
  getProjectRisks,
  createRisk,
  updateRisk,
  deleteRisk,
  changeStatus,
  getProjectRiskStats,
  getRiskMatrix,
} from '../controllers/riskController.js'
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js'

const router = Router()

// All routes require authentication (Rule 7)
router.use(authMiddleware)

// GET /api/risks/project/:projectId/stats - Get risk statistics for project
router.get('/project/:projectId/stats', getProjectRiskStats)

// GET /api/risks/project/:projectId/matrix - Get risk matrix for project
router.get('/project/:projectId/matrix', getRiskMatrix)

// GET /api/risks/project/:projectId - Get risks for a project
router.get('/project/:projectId', getProjectRisks)

// GET /api/risks - List risks with pagination
router.get('/', getRisks)

// GET /api/risks/:id - Get single risk
router.get('/:id', getRisk)

// POST /api/risks - Create risk (direzione/admin only)
router.post('/', requireRole('admin', 'direzione'), createRisk)

// PUT /api/risks/:id - Update risk (direzione/admin only)
router.put('/:id', requireRole('admin', 'direzione'), updateRisk)

// PATCH /api/risks/:id/status - Change risk status (direzione/admin only)
router.patch('/:id/status', requireRole('admin', 'direzione'), changeStatus)

// DELETE /api/risks/:id - Soft delete risk (admin only)
router.delete('/:id', requireRole('admin'), deleteRisk)

export default router
