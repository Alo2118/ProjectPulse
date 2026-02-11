/**
 * Project Routes - HTTP routes for project management
 * @module routes/projectRoutes
 */

import { Router } from 'express'
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  changeStatus,
  getProjectStats,
} from '../controllers/projectController.js'
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js'

const router = Router()

// All routes require authentication (Rule 7)
router.use(authMiddleware)

// GET /api/projects - List projects with pagination
router.get('/', getProjects)

// GET /api/projects/:id - Get single project
router.get('/:id', getProject)

// GET /api/projects/:id/stats - Get project statistics
router.get('/:id/stats', getProjectStats)

// POST /api/projects - Create project (direzione/admin only)
router.post('/', requireRole('admin', 'direzione'), createProject)

// PUT /api/projects/:id - Update project (direzione/admin only)
router.put('/:id', requireRole('admin', 'direzione'), updateProject)

// PATCH /api/projects/:id/status - Change project status (direzione/admin only)
router.patch('/:id/status', requireRole('admin', 'direzione'), changeStatus)

// DELETE /api/projects/:id - Soft delete project (admin only)
router.delete('/:id', requireRole('admin'), deleteProject)

export default router
