/**
 * Activity Controller - Unified timeline endpoints
 * @module controllers/activityController
 */

import type { Request, Response, NextFunction } from 'express'
import { requireUserId } from '../utils/controllerHelpers.js'
import { sendSuccess } from '../utils/responseHelpers.js'
import { activityParamSchema, activityQuerySchema } from '../schemas/activitySchemas.js'
import * as activityService from '../services/activityService.js'

export async function getEntityActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireUserId(req)
    const { entityType, entityId } = activityParamSchema.parse(req.params)
    const { limit } = activityQuerySchema.parse(req.query)

    let items
    if (entityType === 'user') {
      items = await activityService.getUserActivity(entityId, limit)
    } else {
      items = await activityService.getEntityActivity(entityType, entityId, limit)
    }

    sendSuccess(res, items)
  } catch (error) {
    next(error)
  }
}
