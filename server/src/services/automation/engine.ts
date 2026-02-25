/**
 * Automation Engine V2 - Core evaluateRules function
 * Registry-based evaluation: fetches matching rules, loads context,
 * checks triggers, evaluates conditions (AND/OR), executes actions.
 * Resilient by design: never throws from evaluateRules, all errors are logged.
 * @module services/automation/engine
 */

import { prisma } from '../../models/prismaClient.js'
import { logger } from '../../utils/logger.js'
import { registry } from './registry.js'
import { isInCooldown, recordCooldown } from './cooldown.js'
import type {
  TriggerEvent,
  TriggerConfig,
  ConditionConfig,
  ActionConfig,
  AutomationContext,
  AutomationDomain,
  TriggerType,
  ConditionType,
  ActionType,
} from './types.js'

/** Maximum recursion depth for chained automation actions */
const MAX_DEPTH = 3

/**
 * Evaluate all matching automation rules for a trigger event.
 * Called from service hooks (taskService, riskService, etc.) or the scheduler.
 * Never throws - all errors are caught and logged internally.
 *
 * @param event  - The trigger event to evaluate
 * @param depth  - Current recursion depth (prevents infinite loops)
 */
export async function evaluateRules(event: TriggerEvent, depth: number = 0): Promise<void> {
  if (depth >= MAX_DEPTH) {
    logger.warn('Automation V2 depth limit reached', {
      depth,
      event: event.type,
      entityId: event.entityId,
      domain: event.domain,
    })
    return
  }

  try {
    // 1. Fetch matching rules from the database
    const rules = await getMatchingRules(event.domain, event.type, event.projectId)

    if (rules.length === 0) return

    // 2. Load context via the domain's context provider
    const contextProvider = registry.getContext(event.domain)
    if (!contextProvider) {
      logger.warn('No context provider registered for domain', { domain: event.domain })
      return
    }

    const context = await contextProvider.load(event.entityId)
    if (!context) {
      logger.warn('Context provider returned null', {
        domain: event.domain,
        entityId: event.entityId,
      })
      return
    }

    // 3. Process each rule
    for (const rule of rules) {
      await processRule(rule, event, context, depth)
    }
  } catch (err) {
    logger.error('Automation V2 evaluation failed', {
      error: err,
      event: event.type,
      entityId: event.entityId,
      domain: event.domain,
    })
  }
}

// ============================================================
// PRIVATE HELPERS
// ============================================================

interface MatchedRule {
  id: string
  name: string
  trigger: string
  conditions: string
  actions: string
  conditionLogic: string
  cooldownMinutes: number
}

/**
 * Fetches active, non-deleted rules for the given domain + trigger type.
 * Includes both project-specific rules and global rules (projectId = null).
 */
async function getMatchingRules(
  domain: AutomationDomain,
  _triggerType: TriggerType,
  projectId: string | null
): Promise<MatchedRule[]> {
  const projectFilter: Array<{ projectId: string | null }> = [{ projectId: null }]
  if (projectId) {
    projectFilter.push({ projectId })
  }

  return prisma.automationRule.findMany({
    where: {
      isActive: true,
      isDeleted: false,
      domain,
      OR: projectFilter,
    },
    orderBy: { priority: 'asc' },
    select: {
      id: true,
      name: true,
      trigger: true,
      conditions: true,
      actions: true,
      conditionLogic: true,
      cooldownMinutes: true,
    },
  })
}

/**
 * Processes a single rule: parse JSON, match trigger, check cooldown,
 * evaluate conditions, execute actions, record stats.
 */
async function processRule(
  rule: MatchedRule,
  event: TriggerEvent,
  context: AutomationContext,
  depth: number
): Promise<void> {
  let trigger: TriggerConfig
  let conditions: ConditionConfig[]
  let actions: ActionConfig[]

  // Parse JSON fields
  try {
    trigger = JSON.parse(rule.trigger) as TriggerConfig
    conditions = JSON.parse(rule.conditions) as ConditionConfig[]
    actions = JSON.parse(rule.actions) as ActionConfig[]
  } catch (parseErr) {
    logger.error('Automation V2 rule JSON parse failed', {
      ruleId: rule.id,
      error: parseErr,
    })
    return
  }

  // Check trigger match via registry handler
  const triggerHandler = registry.getTrigger(trigger.type)
  if (!triggerHandler) {
    logger.warn('No trigger handler registered', {
      type: trigger.type,
      ruleId: rule.id,
    })
    return
  }

  if (!triggerHandler.matches(trigger, event, context)) return

  // Check cooldown
  if (rule.cooldownMinutes > 0) {
    const coolingDown = await isInCooldown(rule.id, event.entityId, rule.cooldownMinutes)
    if (coolingDown) {
      logger.debug('Automation V2 rule skipped (cooldown)', {
        ruleId: rule.id,
        entityId: event.entityId,
        cooldownMinutes: rule.cooldownMinutes,
      })
      await logExecution(rule.id, event.entityId, 'skipped', { reason: 'cooldown' })
      return
    }
  }

  // Evaluate conditions (AND/OR logic)
  const conditionLogic = rule.conditionLogic === 'OR' ? 'OR' : 'AND'
  const conditionsPass = await checkConditions(conditions, context, conditionLogic)
  if (!conditionsPass) return

  // All checks passed - execute actions
  logger.info('Automation V2 rule matched', {
    ruleId: rule.id,
    ruleName: rule.name,
    event: event.type,
    entityId: event.entityId,
    domain: event.domain,
  })

  for (const action of actions) {
    await executeAction(action, event, context, depth, rule.id)
  }

  // Record cooldown if configured
  if (rule.cooldownMinutes > 0) {
    await recordCooldown(rule.id, event.entityId)
  }

  // Update trigger stats (best effort)
  try {
    await prisma.automationRule.update({
      where: { id: rule.id },
      data: {
        lastTriggeredAt: new Date(),
        triggerCount: { increment: 1 },
      },
    })
  } catch (statsErr) {
    logger.warn('Failed to update automation V2 trigger stats', {
      ruleId: rule.id,
      error: statsErr,
    })
  }
}

/**
 * Evaluates conditions using AND or OR logic.
 * AND: all conditions must pass. OR: at least one must pass.
 * An empty conditions array always passes.
 */
async function checkConditions(
  conditions: ConditionConfig[],
  context: AutomationContext,
  logic: 'AND' | 'OR'
): Promise<boolean> {
  if (conditions.length === 0) return true

  if (logic === 'OR') {
    for (const condition of conditions) {
      const result = await evaluateSingleCondition(condition, context)
      if (result) return true
    }
    return false
  }

  // AND logic (default)
  for (const condition of conditions) {
    const result = await evaluateSingleCondition(condition, context)
    if (!result) return false
  }
  return true
}

/**
 * Evaluates a single condition via its registered evaluator.
 * Unknown condition types are treated as failing (conservative default).
 */
async function evaluateSingleCondition(
  condition: ConditionConfig,
  context: AutomationContext
): Promise<boolean> {
  const evaluator = registry.getCondition(condition.type as ConditionType)
  if (!evaluator) {
    logger.warn('No condition evaluator registered', { type: condition.type })
    return false
  }

  try {
    return await evaluator.evaluate(condition, context)
  } catch (err) {
    logger.error('Condition evaluation failed', {
      type: condition.type,
      error: err,
    })
    return false
  }
}

/**
 * Executes a single action via its registered executor.
 * All errors are caught and logged, never thrown.
 */
async function executeAction(
  action: ActionConfig,
  event: TriggerEvent,
  context: AutomationContext,
  depth: number,
  ruleId: string
): Promise<void> {
  const executor = registry.getAction(action.type as ActionType)
  if (!executor) {
    logger.warn('No action executor registered', { type: action.type, ruleId })
    await logExecution(ruleId, event.entityId, 'error', {
      action: action.type,
      error: `No executor registered for action type: ${action.type}`,
    })
    return
  }

  try {
    await executor.execute(action, event, context, (childEvent) =>
      evaluateRules(childEvent, depth + 1)
    )
    await logExecution(ruleId, event.entityId, 'success', { action: action.type })
  } catch (actionErr) {
    const message = actionErr instanceof Error ? actionErr.message : 'Unknown error'
    await logExecution(ruleId, event.entityId, 'error', {
      action: action.type,
      error: message,
    })
    logger.error('Automation V2 action failed', {
      ruleId,
      action: action.type,
      error: message,
    })
  }
}

/**
 * Persists an automation execution log entry.
 * Soft-fails on error to avoid disrupting the action pipeline.
 */
async function logExecution(
  ruleId: string,
  triggerId: string,
  status: 'success' | 'error' | 'skipped',
  details: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.automationLog.create({
      data: {
        ruleId,
        triggerId,
        status,
        details: JSON.stringify(details),
      },
    })
  } catch (err) {
    logger.warn('Failed to write automation V2 log', {
      ruleId,
      triggerId,
      status,
      error: err,
    })
  }
}
