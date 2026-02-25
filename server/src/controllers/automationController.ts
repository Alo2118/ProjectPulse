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
import { z } from 'zod'
import * as automationService from '../services/automationService.js'
import * as recommendationService from '../services/automation/recommendationService.js'
import { AUTOMATION_TEMPLATES, AUTOMATION_PACKAGES } from '../services/automationTemplates.js'
import { assertProjectCapability } from '../services/permissionService.js'
import { AppError } from '../middleware/errorMiddleware.js'
import { logger } from '../utils/logger.js'
import type { TriggerConfig, ConditionConfig, ActionConfig } from '../services/automation/types.js'

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const triggerConfigSchema = z.object({
  type: z.enum([
    // Task triggers
    'task_status_changed',
    'task_created',
    'task_assigned',
    'task_updated',
    'task_commented',
    'task_idle',
    'all_subtasks_completed',
    'task_overdue',
    'task_deadline_approaching',
    // Risk triggers
    'risk_created',
    'risk_status_changed',
    'risk_level_changed',
    // Document triggers
    'document_created',
    'document_status_changed',
    'document_review_due',
    // Project triggers
    'project_status_changed',
    'project_deadline_approaching',
  ]),
  params: z.record(z.unknown()).default({}),
})

const conditionConfigSchema = z.object({
  type: z.enum([
    // Task conditions
    'task_priority_is',
    'task_type_is',
    'task_has_assignee',
    'task_in_project',
    'task_has_subtasks',
    'task_field_equals',
    // Risk conditions
    'risk_probability_is',
    'risk_impact_is',
    'risk_category_is',
    // Document conditions
    'document_type_is',
    'document_status_is',
    // Project conditions
    'project_status_is',
    'project_priority_is',
    // Cross-domain conditions
    'entity_in_project',
    'time_since_last_update',
    'user_workload_above',
  ]),
  params: z.record(z.unknown()).default({}),
})

const actionConfigSchema = z.object({
  type: z.enum([
    // Notification actions
    'notify_user',
    'notify_assignee',
    'notify_project_owner',
    // Task actions
    'update_parent_status',
    'set_task_field',
    'create_comment',
    'assign_to_user',
    // Entity actions
    'set_due_date',
    'create_subtask',
    // Email action
    'send_email',
    // Risk/Document actions
    'set_risk_field',
    'set_document_field',
    // Integration actions
    'webhook',
    // Escalation action
    'escalate',
  ]),
  params: z.record(z.unknown()).default({}),
})

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  projectId: z.string().uuid('Invalid project ID').optional(),
  trigger: triggerConfigSchema,
  conditions: z.array(conditionConfigSchema).default([]),
  actions: z.array(actionConfigSchema).min(1, 'At least one action is required'),
  isActive: z.boolean().default(true),
  priority: z.number().int().min(0).max(100).default(0),
  domain: z.enum(['task', 'risk', 'document', 'project']).default('task'),
  conditionLogic: z.enum(['AND', 'OR']).default('AND'),
  cooldownMinutes: z.number().int().min(0).default(0),
})

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  projectId: z.string().uuid().nullable().optional(),
  trigger: triggerConfigSchema.optional(),
  conditions: z.array(conditionConfigSchema).optional(),
  actions: z.array(actionConfigSchema).min(1).optional(),
  isActive: z.boolean().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  domain: z.enum(['task', 'risk', 'document', 'project']).optional(),
  conditionLogic: z.enum(['AND', 'OR']).optional(),
  cooldownMinutes: z.number().int().min(0).optional(),
})

const logsQuerySchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .default('1'),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .default('50'),
})

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
    res.json({ success: true, data: rules })
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
    res.json({ success: true, data: rule })
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
    const { page, limit } = logsQuerySchema.parse(req.query)
    const result = await automationService.getAutomationLogs(req.params['id']!, page, limit)
    res.json({ success: true, data: result })
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
    if (!req.user) {
      return next(new AppError('Unauthorized', 401))
    }

    const data = createSchema.parse(req.body)
    const rule = await automationService.createAutomationRule(data, req.user.userId)
    res.status(201).json({ success: true, data: rule })
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
    if (!req.user) {
      return next(new AppError('Unauthorized', 401))
    }

    const data = updateSchema.parse(req.body)
    const rule = await automationService.updateAutomationRule(
      req.params['id']!,
      data,
      req.user.userId
    )
    res.json({ success: true, data: rule })
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
    res.json({ success: true, data: null })
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
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body)
    const rule = await automationService.toggleAutomationRule(req.params['id']!, isActive)
    res.json({ success: true, data: rule })
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
    if (!req.user) {
      return next(new AppError('Unauthorized', 401))
    }

    const { projectId } = req.params

    // Admin and direzione bypass capability check
    if (req.user.role !== 'admin' && req.user.role !== 'direzione') {
      await assertProjectCapability(req.user.userId, req.user.role, projectId!, 'view_project')
    }

    const rules = await automationService.getAutomationRules(projectId)
    res.json({ success: true, data: rules })
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
    if (!req.user) {
      return next(new AppError('Unauthorized', 401))
    }

    const { projectId } = req.params

    // Admin and direzione bypass capability check
    if (req.user.role !== 'admin' && req.user.role !== 'direzione') {
      await assertProjectCapability(req.user.userId, req.user.role, projectId!, 'configure_workflow')
    }

    const body = createSchema.parse({ ...req.body, projectId })
    const rule = await automationService.createAutomationRule(body, req.user.userId)
    res.status(201).json({ success: true, data: rule })
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
    res.json({ success: true, data: AUTOMATION_TEMPLATES })
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

    res.json({
      success: true,
      data: {
        triggers: triggers.map(t => ({ type: t.type, domain: t.domain })),
        conditions: conditions.map(c => ({ type: c.type, domain: c.domain })),
        actions: actions.map(a => ({ type: a.type, domain: a.domain })),
      }
    })
  } catch (error) {
    logger.error('Error fetching registry metadata', { error })
    res.status(500).json({ success: false, error: 'Failed to load registry metadata' })
  }
}

const fromTemplateSchema = z.object({
  templateKey: z.string().min(1, 'templateKey is required'),
  name: z.string().min(1).max(200).optional(),
  projectId: z.string().uuid('Invalid project ID').optional(),
  isActive: z.boolean().default(true),
  priority: z.number().int().min(0).max(100).default(0),
  /**
   * Partial overrides merged into each action's params.
   * For example: { userId: 'abc-123' } to fill in a userId for assign_to_user.
   */
  overrides: z.record(z.unknown()).optional(),
})

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
    if (!req.user) {
      return next(new AppError('Unauthorized', 401))
    }

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

    const input = createSchema.parse({
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

    const rule = await automationService.createAutomationRule(input, req.user.userId)

    logger.info('Automation rule created from template', {
      templateKey,
      ruleId: rule.id,
      createdBy: req.user.userId,
    })

    res.status(201).json({ success: true, data: rule })
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
    res.json({ success: true, data: recommendations })
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
    res.json({ success: true, data: { generated: count } })
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
    if (!req.user) {
      return next(new AppError('Unauthorized', 401))
    }

    const rule = await recommendationService.applyRecommendation(
      req.params['id']!,
      req.user.userId
    )
    res.json({ success: true, data: rule })
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
    if (!req.user) {
      return next(new AppError('Unauthorized', 401))
    }

    await recommendationService.dismissRecommendation(
      req.params['id']!,
      req.user.userId
    )
    res.json({ success: true })
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
    res.json({ success: true, data: AUTOMATION_PACKAGES })
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
    if (!req.user) {
      return next(new AppError('Unauthorized', 401))
    }

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
        req.user.userId
      )
      createdRules.push(rule)
    }

    logger.info('Automation package activated', {
      packageKey: key,
      rulesCreated: createdRules.length,
      projectId,
      activatedBy: req.user.userId,
    })

    res.json({
      success: true,
      data: { package: pkg.name, rulesCreated: createdRules.length, rules: createdRules },
    })
  } catch (error) {
    logger.error('Error activating automation package', {
      error,
      packageKey: req.params['key'],
    })
    next(error)
  }
}
