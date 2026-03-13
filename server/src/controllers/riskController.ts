/**
 * Risk Controller - HTTP request handling for risks
 * @module controllers/riskController
 */

import { Request, Response, NextFunction } from 'express'
import { riskService } from '../services/riskService.js'
import { RiskCategory, RiskStatus } from '../types/index.js'
import { sendSuccess, sendCreated, sendPaginated } from '../utils/responseHelpers.js'
import { requireUserId, requireResource } from '../utils/controllerHelpers.js'
import {
  createRiskSchema,
  updateRiskSchema,
  riskQuerySchema,
  riskStatusChangeSchema,
} from '../schemas/riskSchemas.js'

// ============================================================
// CONTROLLER FUNCTIONS
// ============================================================

/**
 * Gets paginated list of risks
 * @route GET /api/risks
 */
export async function getRisks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = riskQuerySchema.parse(req.query)

    const result = await riskService.getRisks({
      projectId: params.projectId,
      category: params.category as RiskCategory,
      status: params.status as RiskStatus,
      probability: params.probability,
      impact: params.impact,
      ownerId: params.ownerId,
      search: params.search,
      page: params.page,
      limit: params.limit,
    })

    sendPaginated(res, result)
  } catch (error) {
    next(error)
  }
}

/**
 * Gets risks for a specific project
 * @route GET /api/risks/project/:projectId
 */
export async function getProjectRisks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params

    const risks = await riskService.getProjectRisks(projectId)

    sendSuccess(res, risks)
  } catch (error) {
    next(error)
  }
}

/**
 * Gets a single risk by ID
 * @route GET /api/risks/:id
 */
export async function getRisk(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params

    const risk = requireResource(await riskService.getRiskById(id), 'Risk')

    sendSuccess(res, risk)
  } catch (error) {
    next(error)
  }
}

/**
 * Creates a new risk
 * @route POST /api/risks
 */
export async function createRisk(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createRiskSchema.parse(req.body)
    const userId = requireUserId(req)

    const risk = await riskService.createRisk(
      {
        projectId: data.projectId,
        title: data.title,
        description: data.description ?? undefined,
        category: data.category as RiskCategory,
        probability: data.probability,
        impact: data.impact,
        mitigationPlan: data.mitigationPlan ?? undefined,
        ownerId: data.ownerId ?? undefined,
      },
      userId
    )

    sendCreated(res, risk)
  } catch (error) {
    next(error)
  }
}

/**
 * Updates a risk
 * @route PUT /api/risks/:id
 */
export async function updateRisk(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const data = updateRiskSchema.parse(req.body)
    const userId = requireUserId(req)

    const risk = requireResource(await riskService.updateRisk(
      id,
      {
        title: data.title,
        description: data.description ?? undefined,
        category: data.category as RiskCategory,
        probability: data.probability,
        impact: data.impact,
        status: data.status as RiskStatus,
        mitigationPlan: data.mitigationPlan ?? undefined,
        ownerId: data.ownerId ?? undefined,
      },
      userId
    ), 'Risk')

    sendSuccess(res, risk)
  } catch (error) {
    next(error)
  }
}

/**
 * Changes risk status
 * @route PATCH /api/risks/:id/status
 */
export async function changeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const { status } = riskStatusChangeSchema.parse(req.body)
    const userId = requireUserId(req)

    const risk = requireResource(await riskService.changeRiskStatus(id, status as RiskStatus, userId), 'Risk')

    sendSuccess(res, risk)
  } catch (error) {
    next(error)
  }
}

/**
 * Soft deletes a risk (Rule 11: Soft Delete)
 * @route DELETE /api/risks/:id
 */
export async function deleteRisk(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const userId = requireUserId(req)

    await riskService.deleteRisk(id, userId)

    sendSuccess(res, { message: 'Risk deleted successfully' })
  } catch (error) {
    next(error)
  }
}

/**
 * Gets risk statistics for a project
 * @route GET /api/risks/project/:projectId/stats
 */
export async function getProjectRiskStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params

    const stats = await riskService.getProjectRiskStats(projectId)

    sendSuccess(res, stats)
  } catch (error) {
    next(error)
  }
}

/**
 * Gets risk matrix for a project
 * @route GET /api/risks/project/:projectId/matrix
 */
export async function getRiskMatrix(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params

    const matrix = await riskService.getRiskMatrix(projectId)

    sendSuccess(res, matrix)
  } catch (error) {
    next(error)
  }
}
