/**
 * Automation Engine V2 - Registry
 * Singleton registry for triggers, conditions, actions, and context providers.
 * All handlers are registered at startup and looked up by type at runtime.
 * @module services/automation/registry
 */

import { logger } from '../../utils/logger.js'
import type {
  AutomationDomain,
  TriggerType,
  ConditionType,
  ActionType,
  TriggerHandler,
  ConditionEvaluator,
  ActionExecutor,
  ContextProvider,
} from './types.js'

class AutomationRegistry {
  private triggers = new Map<TriggerType, TriggerHandler>()
  private conditions = new Map<ConditionType, ConditionEvaluator>()
  private actions = new Map<ActionType, ActionExecutor>()
  private contexts = new Map<AutomationDomain, ContextProvider>()

  // ── Triggers ──────────────────────────────────────────────

  registerTrigger(handler: TriggerHandler): void {
    if (this.triggers.has(handler.type)) {
      logger.warn('Overwriting trigger handler', { type: handler.type })
    }
    this.triggers.set(handler.type, handler)
    logger.debug('Registered trigger handler', { type: handler.type, domain: handler.domain })
  }

  getTrigger(type: TriggerType): TriggerHandler | undefined {
    return this.triggers.get(type)
  }

  getAllTriggers(): TriggerHandler[] {
    return Array.from(this.triggers.values())
  }

  getTriggersForDomain(domain: AutomationDomain): TriggerHandler[] {
    return Array.from(this.triggers.values()).filter((h) => h.domain === domain)
  }

  // ── Conditions ────────────────────────────────────────────

  registerCondition(evaluator: ConditionEvaluator): void {
    if (this.conditions.has(evaluator.type)) {
      logger.warn('Overwriting condition evaluator', { type: evaluator.type })
    }
    this.conditions.set(evaluator.type, evaluator)
    logger.debug('Registered condition evaluator', { type: evaluator.type, domain: evaluator.domain })
  }

  getCondition(type: ConditionType): ConditionEvaluator | undefined {
    return this.conditions.get(type)
  }

  getAllConditions(): ConditionEvaluator[] {
    return Array.from(this.conditions.values())
  }

  getConditionsForDomain(domain: AutomationDomain): ConditionEvaluator[] {
    return Array.from(this.conditions.values()).filter(
      (e) => e.domain === domain || e.domain === '*'
    )
  }

  // ── Actions ───────────────────────────────────────────────

  registerAction(executor: ActionExecutor): void {
    if (this.actions.has(executor.type)) {
      logger.warn('Overwriting action executor', { type: executor.type })
    }
    this.actions.set(executor.type, executor)
    logger.debug('Registered action executor', { type: executor.type, domain: executor.domain })
  }

  getAction(type: ActionType): ActionExecutor | undefined {
    return this.actions.get(type)
  }

  getAllActions(): ActionExecutor[] {
    return Array.from(this.actions.values())
  }

  getActionsForDomain(domain: AutomationDomain): ActionExecutor[] {
    return Array.from(this.actions.values()).filter(
      (e) => e.domain === domain || e.domain === '*'
    )
  }

  // ── Context Providers ─────────────────────────────────────

  registerContext(provider: ContextProvider): void {
    if (this.contexts.has(provider.domain)) {
      logger.warn('Overwriting context provider', { domain: provider.domain })
    }
    this.contexts.set(provider.domain, provider)
    logger.debug('Registered context provider', { domain: provider.domain })
  }

  getContext(domain: AutomationDomain): ContextProvider | undefined {
    return this.contexts.get(domain)
  }

  getAllContexts(): ContextProvider[] {
    return Array.from(this.contexts.values())
  }

  // ── Diagnostics ───────────────────────────────────────────

  /** Returns a summary of all registered handlers for debugging */
  getSummary(): {
    triggers: string[]
    conditions: string[]
    actions: string[]
    contexts: string[]
  } {
    return {
      triggers: Array.from(this.triggers.keys()),
      conditions: Array.from(this.conditions.keys()),
      actions: Array.from(this.actions.keys()),
      contexts: Array.from(this.contexts.keys()),
    }
  }
}

/** Singleton registry instance */
export const registry = new AutomationRegistry()
