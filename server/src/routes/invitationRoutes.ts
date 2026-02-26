/**
 * Invitation Routes
 * Feature 4.2: Guest Users
 *
 * Public routes (no auth):
 *   GET  /api/invitations/:token         — validate an invitation token
 *   POST /api/invitations/:token/accept  — accept an invitation
 *
 * Protected routes (auth required):
 *   POST   /api/projects/:projectId/invite        — create invitation
 *   GET    /api/projects/:projectId/invitations   — list pending invitations
 *   DELETE /api/invitations/:id                   — cancel invitation
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import {
  createInvitation,
  validateInvitation,
  acceptInvitation,
  listInvitations,
  cancelInvitation,
} from '../controllers/invitationController.js'

const router = Router({ mergeParams: true })

// ---- Public routes (no authentication required) ----
router.get('/invitations/:token', validateInvitation)
router.post('/invitations/:token/accept', acceptInvitation)

// ---- Protected routes ----
router.use(authMiddleware)
router.post('/projects/:projectId/invite', createInvitation)
router.get('/projects/:projectId/invitations', listInvitations)
router.delete('/invitations/:id', cancelInvitation)

export default router
