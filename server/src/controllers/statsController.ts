/**
 * Stats Controller - KPI strip and summary endpoints
 * @module controllers/statsController
 */

import type { Request, Response, NextFunction } from 'express'
import { requireUserId } from '../utils/controllerHelpers.js'
import { sendSuccess } from '../utils/responseHelpers.js'
import { statsDomainParamSchema, summaryParamSchema } from '../schemas/statsSchemas.js'
import { uuidParamSchema } from '../schemas/commonSchemas.js'
import * as statsService from '../services/statsService.js'
import type { KpiCard } from '../types/index.js'

const DOMAIN_HANDLERS: Record<string, (userId?: string, role?: string) => Promise<KpiCard[]>> = {
  projects: statsService.getProjectStats,
  tasks: statsService.getTaskKpis,
  risks: statsService.getRiskStats,
  documents: statsService.getDocumentStats,
  users: statsService.getUserStats,
}

export async function getDomainStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = requireUserId(req)
    const role = req.user?.role ?? 'dipendente'
    const { domain } = statsDomainParamSchema.parse(req.params)
    const handler = DOMAIN_HANDLERS[domain]
    const stats = await handler(userId, role)
    sendSuccess(res, stats)
  } catch (error) {
    next(error)
  }
}

export async function getProjectSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireUserId(req)
    const { id } = summaryParamSchema.parse(req.params)
    const summary = await statsService.getProjectSummary(id)
    sendSuccess(res, summary)
  } catch (error) {
    next(error)
  }
}

export async function getTaskSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireUserId(req)
    const { id } = summaryParamSchema.parse(req.params)
    const summary = await statsService.getTaskSummary(id)
    sendSuccess(res, summary)
  } catch (error) {
    next(error)
  }
}

export async function getBudgetBreakdown(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireUserId(req)
    const { id } = uuidParamSchema.parse(req.params)
    const breakdown = await statsService.getBudgetBreakdown(id)
    sendSuccess(res, breakdown)
  } catch (error) {
    next(error)
  }
}
