/**
 * Workflow Routes - Feature 4.3: Customizable Workflows
 *
 * Workflow template CRUD:
 *   GET    /api/workflows          - All authenticated users
 *   GET    /api/workflows/:id      - All authenticated users
 *   POST   /api/workflows          - admin | direzione
 *   PUT    /api/workflows/:id      - admin | direzione
 *   DELETE /api/workflows/:id      - admin only
 *
 * Project workflow assignment:
 *   GET    /api/projects/:projectId/workflow - All authenticated users
 *   PUT    /api/projects/:projectId/workflow - configure_workflow capability (enforced in controller)
 */

import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js'
import * as workflowController from '../controllers/workflowController.js'

const router = Router({ mergeParams: true })

router.use(authMiddleware)

// Workflow template CRUD
router.get('/workflows', workflowController.getWorkflows)
router.get('/workflows/:id', workflowController.getWorkflow)
router.post('/workflows', requireRole('admin', 'direzione'), workflowController.createWorkflow)
router.put('/workflows/:id', requireRole('admin', 'direzione'), workflowController.updateWorkflow)
router.delete('/workflows/:id', requireRole('admin'), workflowController.deleteWorkflow)

// Project workflow assignment
router.get('/projects/:projectId/workflow', workflowController.getProjectWorkflow)
router.put('/projects/:projectId/workflow', workflowController.assignProjectWorkflow)

export default router
