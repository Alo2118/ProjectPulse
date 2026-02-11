/**
 * User Input Routes - HTTP routes for user inputs management
 * @module routes/userInputRoutes
 */

import { Router } from 'express'
import {
  getUserInputs,
  getMyUserInputs,
  getUserInput,
  createUserInput,
  updateUserInput,
  deleteUserInput,
  startProcessing,
  convertToTask,
  convertToProject,
  acknowledgeInput,
  rejectInput,
  getUserInputStats,
} from '../controllers/userInputController.js'
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js'

const router = Router()

// All routes require authentication (Rule 7)
router.use(authMiddleware)

// GET /api/inputs/stats - Get user input statistics (admin/direzione)
router.get('/stats', requireRole('admin', 'direzione'), getUserInputStats)

// GET /api/inputs/my - Get current user's inputs (all roles)
router.get('/my', getMyUserInputs)

// GET /api/inputs - List all inputs with pagination (admin/direzione can see all, others see their own)
router.get('/', getUserInputs)

// GET /api/inputs/:id - Get single input (all roles)
router.get('/:id', getUserInput)

// POST /api/inputs - Create input (all roles can create)
router.post('/', createUserInput)

// PUT /api/inputs/:id - Update input (owner if pending, or admin)
router.put('/:id', updateUserInput)

// DELETE /api/inputs/:id - Soft delete input (owner if pending, or admin)
router.delete('/:id', deleteUserInput)

// POST /api/inputs/:id/process - Start processing (admin/direzione/dipendente)
router.post('/:id/process', requireRole('admin', 'direzione', 'dipendente'), startProcessing)

// POST /api/inputs/:id/convert-to-task - Convert to task (admin/direzione)
router.post('/:id/convert-to-task', requireRole('admin', 'direzione'), convertToTask)

// POST /api/inputs/:id/convert-to-project - Convert to project (admin/direzione)
router.post('/:id/convert-to-project', requireRole('admin', 'direzione'), convertToProject)

// POST /api/inputs/:id/acknowledge - Acknowledge input (admin/direzione)
router.post('/:id/acknowledge', requireRole('admin', 'direzione'), acknowledgeInput)

// POST /api/inputs/:id/reject - Reject input (admin/direzione)
router.post('/:id/reject', requireRole('admin', 'direzione'), rejectInput)

export default router
