/**
 * Task Tree Controller - API endpoints for hierarchical task data
 * @module controllers/taskTreeController
 */

import { Request, Response, NextFunction } from 'express'
import { taskTreeService } from '../services/taskTreeService.js'
import { logger } from '../utils/logger.js'
import { sendSuccess } from '../utils/responseHelpers.js'
import { requireUserId } from '../utils/controllerHelpers.js'

/**
 * GET /api/task-tree
 * Get hierarchical task tree for all accessible projects
 */
async function getTaskTree(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = requireUserId(req)
    const userRole = req.user!.role
    const projectId = req.query.projectId as string | undefined
    const parentTaskId = req.query.parentTaskId as string | undefined
    const myTasksOnly = req.query.myTasksOnly === 'true'
    const filterUserId = req.query.filterUserId as string | undefined
    const excludeCompleted = req.query.excludeCompleted === 'true'

    const data = await taskTreeService.getTaskTree(userId, userRole, {
      projectId,
      parentTaskId,
      myTasksOnly,
      filterUserId,
      excludeCompleted,
    })

    sendSuccess(res, data)
  } catch (error) {
    logger.error('Error fetching task tree', { error, userId: req.user?.userId })
    next(error)
  }
}

export const taskTreeController = {
  getTaskTree,
}
