import { Router } from 'express'
import { login, refresh, logout, me } from '../controllers/authController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

router.post('/login', login)
router.post('/refresh', refresh)
router.post('/logout', authMiddleware, logout)
router.get('/me', authMiddleware, me)

export default router
