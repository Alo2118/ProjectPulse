import { Router } from 'express'
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  updateProfile,
  updateTheme,
  deleteUser,
} from '../controllers/userController.js'
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js'

const router = Router()

router.use(authMiddleware)

// Read access for all authenticated users (needed for assignee dropdowns)
router.get('/', getUsers)
router.get('/:id', getUser)

// Self-profile updates: any authenticated user can update their own profile (except role)
router.put('/me', updateProfile)
router.patch('/me/theme', updateTheme)

// Write access: admin only
router.post('/', requireRole('admin'), createUser)
router.put('/:id', requireRole('admin'), updateUser)
router.delete('/:id', requireRole('admin'), deleteUser)

export default router
