/**
 * Search Routes - Global search endpoint
 * @module routes/searchRoutes
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { search } from '../controllers/searchController.js'

const router = Router()

router.get('/', authMiddleware, search)

export default router
