/**
 * Department Routes
 * GET /api/departments - All authenticated users
 * POST/PUT/DELETE - Admin only (enforced in controller)
 */

import { Router } from 'express'
import {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/departmentController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

router.use(authMiddleware)

router.get('/', getDepartments)
router.get('/:id', getDepartment)
router.post('/', createDepartment)
router.put('/:id', updateDepartment)
router.delete('/:id', deleteDepartment)

export default router
