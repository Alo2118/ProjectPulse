/**
 * Risk Controller - HTTP request handling for risks
 * @module controllers/riskController
 */

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { riskService } from '../services/riskService.js'
import { AppError } from '../middleware/errorMiddleware.js'
import { RiskCategory, RiskProbability, RiskImpact, RiskStatus } from '../types/index.js'

// ============================================================
// VALIDATION SCHEMAS (Rule 6: Input Validation)
// ============================================================

const createRiskSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().nullish(),
  category: z.enum(['technical', 'regulatory', 'resource', 'schedule']).default('technical'),
  probability: z.enum(['low', 'medium', 'high']).default('medium'),
  impact: z.enum(['low', 'medium', 'high']).default('medium'),
  mitigationPlan: z.string().nullish(),
  ownerId: z.string().uuid('Invalid owner ID').nullish(),
})

const updateRiskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullish(),
  category: z.enum(['technical', 'regulatory', 'resource', 'schedule']).optional(),
  probability: z.enum(['low', 'medium', 'high']).optional(),
  impact: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['open', 'mitigated', 'accepted', 'closed']).optional(),
  mitigationPlan: z.string().nullish(),
  ownerId: z.string().uuid().nullish(),
})

const querySchema = z.object({
  projectId: z.string().uuid().optional(),
  category: z.enum(['technical', 'regulatory', 'resource', 'schedule']).optional(),
  status: z.enum(['open', 'mitigated', 'accepted', 'closed']).optional(),
  probability: z.enum(['low', 'medium', 'high']).optional(),
  impact: z.enum(['low', 'medium', 'high']).optional(),
  ownerId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
})

const statusChangeSchema = z.object({
  status: z.enum(['open', 'mitigated', 'accepted', 'closed']),
})

// ============================================================
// CONTROLLER FUNCTIONS
// ============================================================

/**
 * Gets paginated list of risks
 * @route GET /api/risks
 */
export async function getRisks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = querySchema.parse(req.query)

    const result = await riskService.getRisks({
      projectId: params.projectId,
      category: params.category as RiskCategory,
      status: params.status as RiskStatus,
      probability: params.probability as RiskProbability,
      impact: params.impact as RiskImpact,
      ownerId: params.ownerId,
      search: params.search,
      page: params.page,
      limit: params.limit,
    })

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    })
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

    res.json({ success: true, data: risks })
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

    const risk = await riskService.getRiskById(id)

    if (!risk) {
      throw new AppError('Risk not found', 404)
    }

    res.json({ success: true, data: risk })
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
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const risk = await riskService.createRisk(
      {
        projectId: data.projectId,
        title: data.title,
        description: data.description ?? undefined,
        category: data.category as RiskCategory,
        probability: data.probability as RiskProbability,
        impact: data.impact as RiskImpact,
        mitigationPlan: data.mitigationPlan ?? undefined,
        ownerId: data.ownerId ?? undefined,
      },
      userId
    )

    res.status(201).json({ success: true, data: risk })
  } catch (error) {
    if (error instanceof Error && error.message === 'Project not found') {
      next(new AppError('Project not found', 404))
    } else {
      next(error)
    }
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
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const risk = await riskService.updateRisk(
      id,
      {
        title: data.title,
        description: data.description ?? undefined,
        category: data.category as RiskCategory,
        probability: data.probability as RiskProbability,
        impact: data.impact as RiskImpact,
        status: data.status as RiskStatus,
        mitigationPlan: data.mitigationPlan ?? undefined,
        ownerId: data.ownerId ?? undefined,
      },
      userId
    )

    if (!risk) {
      throw new AppError('Risk not found', 404)
    }

    res.json({ success: true, data: risk })
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
    const { status } = statusChangeSchema.parse(req.body)
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const risk = await riskService.changeRiskStatus(id, status as RiskStatus, userId)

    if (!risk) {
      throw new AppError('Risk not found', 404)
    }

    res.json({ success: true, data: risk })
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
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const deleted = await riskService.deleteRisk(id, userId)

    if (!deleted) {
      throw new AppError('Risk not found', 404)
    }

    res.json({ success: true, message: 'Risk deleted successfully' })
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

    res.json({ success: true, data: stats })
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

    res.json({ success: true, data: matrix })
  } catch (error) {
    next(error)
  }
}
