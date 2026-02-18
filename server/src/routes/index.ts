/**
 * API Routes Index - Main router configuration
 * @module routes
 */

import { Router } from 'express'
import authRoutes from './authRoutes.js'
import projectRoutes from './projectRoutes.js'
import taskRoutes from './taskRoutes.js'
import userRoutes from './userRoutes.js'
import timeEntryRoutes from './timeEntryRoutes.js'
import commentRoutes from './commentRoutes.js'
import riskRoutes from './riskRoutes.js'
import userInputRoutes from './userInputRoutes.js'
import documentRoutes from './documentRoutes.js'
import analyticsRoutes from './analyticsRoutes.js'
import notificationRoutes from './notificationRoutes.js'
import weeklyReportRoutes from './weeklyReportRoutes.js'
import taskTreeRoutes from './taskTreeRoutes.js'
import noteRoutes from './noteRoutes.js'
import attachmentRoutes from './attachmentRoutes.js'
import tagRoutes from './tagRoutes.js'
import auditRoutes from './auditRoutes.js'
import templateRoutes from './templateRoutes.js'

const router = Router()

// Mount route modules
router.use('/auth', authRoutes)
router.use('/projects', projectRoutes)
router.use('/tasks', taskRoutes)
router.use('/users', userRoutes)
router.use('/time-entries', timeEntryRoutes)
router.use('/comments', commentRoutes)
router.use('/risks', riskRoutes)
router.use('/inputs', userInputRoutes)
router.use('/documents', documentRoutes)
router.use('/analytics', analyticsRoutes)
router.use('/notifications', notificationRoutes)
router.use('/reports/weekly', weeklyReportRoutes)
router.use('/task-tree', taskTreeRoutes)
router.use('/notes', noteRoutes)
router.use('/attachments', attachmentRoutes)
router.use('/tags', tagRoutes)
router.use('/audit', auditRoutes)
router.use('/templates', templateRoutes)

export default router
