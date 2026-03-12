/**
 * Related Controller - Polymorphic related entities endpoint
 * @module controllers/relatedController
 */

import type { Request, Response, NextFunction } from 'express'
import { requireUserId } from '../utils/controllerHelpers.js'
import { sendSuccess } from '../utils/responseHelpers.js'
import { relatedParamSchema, relatedQuerySchema } from '../schemas/relatedSchemas.js'
import * as relatedEntitiesService from '../services/relatedEntitiesService.js'

export async function getRelated(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireUserId(req)
    const { entityType, entityId } = relatedParamSchema.parse(req.params)
    const { include, limit } = relatedQuerySchema.parse(req.query)
    const result = await relatedEntitiesService.getRelated({ entityType, entityId, include, limit })
    sendSuccess(res, result)
  } catch (error) {
    next(error)
  }
}
