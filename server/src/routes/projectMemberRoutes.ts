/**
 * Project Member Routes
 * Mounted at /api/projects/:projectId/members via mergeParams
 * All routes require authentication; authorization is enforced in the controller.
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import * as projectMemberController from '../controllers/projectMemberController.js'

// mergeParams: true gives access to :projectId from the parent router
const router = Router({ mergeParams: true })

router.use(authMiddleware)

router.get('/', projectMemberController.getMembers)
router.post('/', projectMemberController.addMember)
router.put('/:memberId', projectMemberController.updateMember)
router.delete('/:memberId', projectMemberController.removeMember)

export default router
