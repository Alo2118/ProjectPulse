/**
 * Automation Engine V2 - Barrel & Initialization
 * Registers all triggers, conditions, actions, and context providers
 * into the singleton registry at startup.
 * @module services/automation
 */

import { logger } from '../../utils/logger.js'
import { registry } from './registry.js'

// Context providers
import {
  taskContextProvider,
  riskContextProvider,
  documentContextProvider,
  projectContextProvider,
} from './contexts/index.js'

// Triggers
import { allTaskTriggers } from './triggers/taskTriggers.js'
import { allRiskTriggers } from './triggers/riskTriggers.js'
import { allDocumentTriggers } from './triggers/documentTriggers.js'
import { allProjectTriggers } from './triggers/projectTriggers.js'

// Conditions
import { allTaskConditions } from './conditions/taskConditions.js'

// Actions
import { allNotifyActions } from './actions/notifyActions.js'
import { allTaskActions } from './actions/taskActions.js'

/**
 * Registers all V2 automation handlers into the global registry.
 * Must be called once at server startup (e.g. in app.ts or index.ts).
 */
export function initializeAutomationRegistry(): void {
  // Register context providers
  registry.registerContext(taskContextProvider)
  registry.registerContext(riskContextProvider)
  registry.registerContext(documentContextProvider)
  registry.registerContext(projectContextProvider)

  // Register triggers
  for (const trigger of allTaskTriggers) {
    registry.registerTrigger(trigger)
  }
  for (const trigger of allRiskTriggers) {
    registry.registerTrigger(trigger)
  }
  for (const trigger of allDocumentTriggers) {
    registry.registerTrigger(trigger)
  }
  for (const trigger of allProjectTriggers) {
    registry.registerTrigger(trigger)
  }

  // Register conditions
  for (const condition of allTaskConditions) {
    registry.registerCondition(condition)
  }

  // Register actions
  for (const action of allNotifyActions) {
    registry.registerAction(action)
  }
  for (const action of allTaskActions) {
    registry.registerAction(action)
  }

  const summary = registry.getSummary()
  logger.info('Automation V2 registry initialized', {
    triggers: summary.triggers.length,
    conditions: summary.conditions.length,
    actions: summary.actions.length,
    contexts: summary.contexts.length,
  })
}

// Re-export public API
export { evaluateRules } from './engine.js'
export { registry } from './registry.js'
export { interpolateMessage } from './interpolation.js'
export { isInCooldown, recordCooldown, cleanupStaleCooldowns } from './cooldown.js'
export type {
  AutomationDomain,
  TriggerType,
  ConditionType,
  ActionType,
  TriggerConfig,
  ConditionConfig,
  ActionConfig,
  TriggerEvent,
  AutomationContext,
  TriggerHandler,
  ConditionEvaluator,
  ActionExecutor,
  ContextProvider,
} from './types.js'
