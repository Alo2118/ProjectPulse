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
import departmentRoutes from './departmentRoutes.js'
import searchRoutes from './searchRoutes.js'
import checklistRoutes from './checklistRoutes.js'
import customFieldRoutes from './customFieldRoutes.js'
import savedViewRoutes from './savedViewRoutes.js'
import exportRoutes from './exportRoutes.js'
import importRoutes from './importRoutes.js'
import projectMemberRoutes from './projectMemberRoutes.js'
import invitationRoutes from './invitationRoutes.js'
import workflowRoutes from './workflowRoutes.js'
import automationRoutes from './automationRoutes.js'
import planningRoutes from './planningRoutes.js'
import permissionRoutes from './permissionRoutes.js'
import statsRoutes from './statsRoutes.js'
import dashboardRoutes from './dashboardRoutes.js'

const router = Router()

// Mount route modules
router.use('/auth', authRoutes)
// Project member routes MUST be mounted before /projects to avoid param conflicts
router.use('/projects/:projectId/members', projectMemberRoutes)
// Invitation routes mix public and protected paths across /projects and /invitations
// Mounted at root so the router sees the full paths
router.use('/', invitationRoutes)
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
router.use('/departments', departmentRoutes)
router.use('/search', searchRoutes)
router.use('/checklist', checklistRoutes)
router.use('/custom-fields', customFieldRoutes)
router.use('/views', savedViewRoutes)
router.use('/export', exportRoutes)
router.use('/import', importRoutes)
router.use('/', workflowRoutes)
router.use('/', automationRoutes)
router.use('/planning', planningRoutes)
router.use('/permissions', permissionRoutes)
router.use('/stats', statsRoutes)
router.use('/dashboard', dashboardRoutes)

export default router
