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

// POST /api/projects - Create project (all roles, dipendente can only own their projects)
router.post('/', requireRole('admin', 'direzione', 'dipendente'), createProject)

// PUT /api/projects/:id - Update project (dipendente only own projects)
router.put('/:id', requireRole('admin', 'direzione', 'dipendente'), updateProject)

// PATCH /api/projects/:id/status - Change project status (dipendente only own projects)
router.patch('/:id/status', requireRole('admin', 'direzione', 'dipendente'), changeStatus)

// DELETE /api/projects/:id - Soft delete project (dipendente only own projects)
router.delete('/:id', requireRole('admin', 'direzione', 'dipendente'), deleteProject)

export default router
