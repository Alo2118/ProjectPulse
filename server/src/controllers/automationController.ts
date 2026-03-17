/**
 * Automation Controller - HTTP handlers for automation rule management (Feature 4.4)
 * Validates input with Zod, delegates to automationService, returns standard API responses.
 *
 * Global routes (admin/direzione):
 *   GET    /api/automations          - List all rules
 *   GET    /api/automations/:id      - Get single rule
 *   GET    /api/automations/:id/logs - Get execution logs
 *   POST   /api/automations          - Create rule
 *   PUT    /api/automations/:id      - Update rule
 *   DELETE /api/automations/:id      - Soft-delete rule
 *
 * Project-scoped routes (any authenticated user with project access):
 *   GET    /api/projects/:projectId/automations - List project rules
 *   POST   /api/projects/:projectId/automations - Create project rule
 *
 * @module controllers/automationController
 */

import { Request, Response, NextFunction } from 'express'
import * as automationService from '../services/automationService.js'
import * as recommendationService from '../services/automation/recommendationService.js'
import { AUTOMATION_TEMPLATES, AUTOMATION_PACKAGES } from '../services/automationTemplates.js'
import { assertProjectCapability } from '../services/permissionService.js'
import { AppError } from '../middleware/errorMiddleware.js'
import { logger } from '../utils/logger.js'
import type { TriggerConfig, ConditionConfig, ActionConfig } from '../services/automation/types.js'
import { sendSuccess, sendCreated, sendError } from '../utils/responseHelpers.js'
import { requireUserId } from '../utils/controllerHelpers.js'
import {
  createAutomationSchema,
  updateAutomationSchema,
  automationLogsQuerySchema,
  toggleAutomationSchema,
  fromTemplateSchema,
} from '../schemas/automationSchemas.js'

// ============================================================
// HANDLERS - GLOBAL (admin / direzione)
// ============================================================

/**
 * GET /api/automations
 * Returns all automation rules (not project-scoped).
 */
export async function getAutomations(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rules = await automationService.getAutomationRules()
    sendSuccess(res, rules)
  } catch (error) {
    logger.error('Error fetching automation rules', { error })
    next(error)
  }
}

/**
 * GET /api/automations/:id
 * Returns a single automation rule by ID.
 */
export async function getAutomation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rule = await automationService.getAutomationRule(req.params['id']!)
    if (!rule) {
      return next(new AppError('Automation rule not found', 404))
    }
    sendSuccess(res, rule)
  } catch (error) {
    logger.error('Error fetching automation rule', { error, ruleId: req.params['id'] })
    next(error)
  }
}

/**
 * GET /api/automations/:id/logs
 * Returns paginated execution logs for an automation rule.
 */
export async function getAutomationLogs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { page, limit } = automationLogsQuerySchema.parse(req.query)
    const result = await automationService.getAutomationLogs(req.params['id']!, page, limit)
    sendSuccess(res, result)
  } catch (error) {
    logger.error('Error fetching automation logs', { error, ruleId: req.params['id'] })
    next(error)
  }
}

/**
 * POST /api/automations
 * Creates a new global (or project-specific) automation rule.
 */
export async function createAutomation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = requireUserId(req)
    const data = createAutomationSchema.parse(req.body)
    const rule = await automationService.createAutomationRule(data, userId)
    sendCreated(res, rule)
  } catch (error) {
    logger.error('Error creating automation rule', { error })
    next(error)
  }
}

/**
 * PUT /api/automations/:id
 * Updates an existing automation rule.
 */
export async function updateAutomation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = requireUserId(req)
    const data = updateAutomationSchema.parse(req.body)
    const rule = await automationService.updateAutomationRule(
      req.params['id']!,
      data,
      userId
    )
    sendSuccess(res, rule)
  } catch (error) {
    logger.error('Error updating automation rule', { error, ruleId: req.params['id'] })
    next(error)
  }
}

/**
 * DELETE /api/automations/:id
 * Soft-deletes an automation rule.
 */
export async function deleteAutomation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await automationService.deleteAutomationRule(req.params['id']!)
    sendSuccess(res, null)
  } catch (error) {
    logger.error('Error deleting automation rule', { error, ruleId: req.params['id'] })
    next(error)
  }
}

/**
 * PATCH /api/automations/:id/toggle
 * Toggles the isActive flag on an automation rule.
 */
export async function toggleAutomation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { isActive } = toggleAutomationSchema.parse(req.body)
    const rule = await automationService.toggleAutomationRule(req.params['id']!, isActive)
    sendSuccess(res, rule)
  } catch (error) {
    logger.error('Error toggling automation rule', { error, ruleId: req.params['id'] })
    next(error)
  }
}

// ============================================================
// HANDLERS - PROJECT-SCOPED
// ============================================================

/**
 * GET /api/projects/:projectId/automations
 * Returns automation rules for a specific project (plus global rules).
 * Requires view_project capability.
 */
export async function getProjectAutomations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = requireUserId(req)
    const { projectId } = req.params

    // Admin and direzione bypass capability check
    if (req.user!.role !== 'admin' && req.user!.role !== 'direzione') {
      await assertProjectCapability(userId, req.user!.role, projectId!, 'view_project')
    }

    const rules = await automationService.getAutomationRules(projectId)
    sendSuccess(res, rules)
  } catch (error) {
    logger.error('Error fetching project automation rules', {
      error,
      projectId: req.params['projectId'],
    })
    next(error)
  }
}

/**
 * POST /api/projects/:projectId/automations
 * Creates a project-scoped automation rule.
 * Requires configure_workflow capability.
 */
export async function createProjectAutomation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = requireUserId(req)
    const { projectId } = req.params

    // Admin and direzione bypass capability check
    if (req.user!.role !== 'admin' && req.user!.role !== 'direzione') {
      await assertProjectCapability(userId, req.user!.role, projectId!, 'configure_workflow')
    }

    const body = createAutomationSchema.parse({ ...req.body, projectId })
    const rule = await automationService.createAutomationRule(body, userId)
    sendCreated(res, rule)
  } catch (error) {
    logger.error('Error creating project automation rule', {
      error,
      projectId: req.params['projectId'],
    })
    next(error)
  }
}

// ============================================================
// HANDLERS - TEMPLATES
// ============================================================

/**
 * GET /api/automations/templates
 * Returns all predefined automation templates.
 * Available to admin and direzione roles.
 */
export async function getAutomationTemplatesHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    sendSuccess(res, AUTOMATION_TEMPLATES)
  } catch (error) {
    logger.error('Error fetching automation templates', { error })
    next(error)
  }
}

// ============================================================
// HANDLERS - REGISTRY METADATA
// ============================================================

/**
 * GET /api/automations/registry
 * Returns metadata about all registered triggers, conditions, and actions from the V2 registry.
 */
export async function getRegistryMetadata(_req: Request, res: Response) {
  try {
    const { registry } = await import('../services/automation/index.js')
    const triggers = registry.getAllTriggers()
    const conditions = registry.getAllConditions()
    const actions = registry.getAllActions()

    sendSuccess(res, {
      triggers: triggers.map(t => ({ type: t.type, domain: t.domain })),
      conditions: conditions.map(c => ({ type: c.type, domain: c.domain })),
      actions: actions.map(a => ({ type: a.type, domain: a.domain })),
    })
  } catch (error) {
    logger.error('Error fetching registry metadata', { error })
    sendError(res, 'Failed to load registry metadata', 500)
  }
}

/**
 * POST /api/automations/from-template
 * Creates an automation rule from a predefined template.
 * Supports optional overrides to customise action params (e.g. supply a userId).
 * Available to admin and direzione roles.
 */
export async function createFromTemplateHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = requireUserId(req)

    const parsed = fromTemplateSchema.parse(req.body)
    const { templateKey, name, projectId, isActive, priority, overrides } = parsed

    const template = AUTOMATION_TEMPLATES.find((t) => t.key === templateKey)
    if (!template) {
      return next(new AppError(`Template '${templateKey}' not found`, 404))
    }

    // Merge overrides into each action's params when provided
    const actions = overrides
      ? template.actions.map((action) => ({
          ...action,
          params: { ...action.params, ...overrides },
        }))
      : template.actions

    const input = createAutomationSchema.parse({
      name: name ?? template.name,
      description: template.description,
      projectId,
      trigger: template.trigger,
      conditions: template.conditions,
      actions,
      isActive,
      priority,
      domain: template.domain,
      cooldownMinutes: template.cooldownMinutes ?? 0,
    })

    const rule = await automationService.createAutomationRule(input, userId)

    logger.info('Automation rule created from template', {
      templateKey,
      ruleId: rule.id,
      createdBy: userId,
    })

    sendCreated(res, rule)
  } catch (error) {
    logger.error('Error creating automation rule from template', { error })
    next(error)
  }
}

// ============================================================
// HANDLERS - RECOMMENDATIONS
// ============================================================

/**
 * GET /api/automations/recommendations?projectId=...
 * Returns all pending automation recommendations, optionally filtered by project.
 */
export async function getRecommendationsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const projectId = req.query['projectId'] as string | undefined
    const recommendations =
      await recommendationService.getRecommendations(projectId)
    sendSuccess(res, recommendations)
  } catch (error) {
    logger.error('Error fetching automation recommendations', { error })
    next(error)
  }
}

/**
 * POST /api/automations/recommendations/generate
 * Triggers pattern analysis and generates new recommendations.
 */
export async function generateRecommendationsHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const count = await recommendationService.generateRecommendations()
    sendSuccess(res, { generated: count })
  } catch (error) {
    logger.error('Error generating automation recommendations', { error })
    next(error)
  }
}

/**
 * POST /api/automations/recommendations/:id/apply
 * Applies a recommendation by creating the suggested automation rule.
 */
export async function applyRecommendationHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = requireUserId(req)
    const rule = await recommendationService.applyRecommendation(
      req.params['id']!,
      userId
    )
    sendSuccess(res, rule)
  } catch (error) {
    logger.error('Error applying automation recommendation', {
      error,
      recommendationId: req.params['id'],
    })
    next(error)
  }
}

/**
 * POST /api/automations/recommendations/:id/dismiss
 * Dismisses a recommendation so it no longer shows up.
 */
export async function dismissRecommendationHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = requireUserId(req)
    await recommendationService.dismissRecommendation(
      req.params['id']!,
      userId
    )
    sendSuccess(res, { message: 'Recommendation dismissed' })
  } catch (error) {
    logger.error('Error dismissing automation recommendation', {
      error,
      recommendationId: req.params['id'],
    })
    next(error)
  }
}

// ============================================================
// HANDLERS - PACKAGES
// ============================================================

/**
 * GET /api/automations/packages
 * Returns all available automation packages.
 */
export async function getPackagesHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    sendSuccess(res, AUTOMATION_PACKAGES)
  } catch (error) {
    logger.error('Error fetching automation packages', { error })
    next(error)
  }
}

/**
 * POST /api/automations/packages/:key/activate?projectId=...
 * Activates all templates in a package, creating automation rules for each.
 */
export async function activatePackageHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = requireUserId(req)
    const { key } = req.params
    const projectId = req.query['projectId'] as string | undefined

    const pkg = AUTOMATION_PACKAGES.find((p) => p.key === key)
    if (!pkg) {
      return next(new AppError('Package not found', 404))
    }

    const createdRules = []
    for (const templateKey of pkg.templates) {
      const template = AUTOMATION_TEMPLATES.find((t) => t.key === templateKey)
      if (!template) continue

      const rule = await automationService.createAutomationRule(
        {
          name: template.name,
          description: template.description,
          projectId,
          domain: template.domain,
          trigger: template.trigger as TriggerConfig,
          conditions: template.conditions as ConditionConfig[],
          actions: template.actions as ActionConfig[],
          isActive: true,
          priority: 0,
          conditionLogic: 'AND',
          cooldownMinutes: template.cooldownMinutes ?? 0,
        },
        userId
      )
      createdRules.push(rule)
    }

    logger.info('Automation package activated', {
      packageKey: key,
      rulesCreated: createdRules.length,
      projectId,
      activatedBy: userId,
    })

    sendSuccess(res, { package: pkg.name, rulesCreated: createdRules.length, rules: createdRules })
  } catch (error) {
    logger.error('Error activating automation package', {
      error,
      packageKey: req.params['key'],
    })
    next(error)
  }
}
