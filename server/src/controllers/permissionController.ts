/**
 * Permission Controller - Handles HTTP requests for permission policy management
 * @module controllers/permissionController
 */

import { Request, Response, NextFunction } from 'express'
import * as permissionService from '../services/permissionService.js'
import { updatePoliciesSchema } from '../schemas/permissionSchemas.js'
import { sendSuccess } from '../utils/responseHelpers.js'

export const getPolicies = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const policies = await permissionService.getAllPolicies()
    sendSuccess(res, policies)
  } catch (error) {
    next(error)
  }
}

export const updatePolicies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { policies } = updatePoliciesSchema.parse(req.body)
    const result = await permissionService.upsertPolicies(policies)
    sendSuccess(res, result)
  } catch (error) {
    next(error)
  }
}

export const resetPolicies = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await permissionService.seedDefaults()
    const policies = await permissionService.getAllPolicies()
    sendSuccess(res, policies)
  } catch (error) {
    next(error)
  }
}
