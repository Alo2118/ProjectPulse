/**
 * Automation Engine V2 - Type definitions
 * All types for the registry-based automation engine.
 * @module services/automation/types
 */

// ============================================================
// DOMAIN
// ============================================================

export type AutomationDomain = 'task' | 'risk' | 'document' | 'project'

// ============================================================
// TRIGGER TYPES (per domain)
// ============================================================

export type TaskTriggerType =
  | 'task_status_changed'
  | 'task_created'
  | 'task_assigned'
  | 'task_updated'
  | 'task_commented'
  | 'task_idle'
  | 'all_subtasks_completed'
  | 'task_overdue'
  | 'task_deadline_approaching'

export type RiskTriggerType =
  | 'risk_created'
  | 'risk_status_changed'
  | 'risk_level_changed'

export type DocumentTriggerType =
  | 'document_created'
  | 'document_status_changed'
  | 'document_review_due'

export type ProjectTriggerType =
  | 'project_status_changed'
  | 'project_deadline_approaching'

export type TriggerType =
  | TaskTriggerType
  | RiskTriggerType
  | DocumentTriggerType
  | ProjectTriggerType

// ============================================================
// CONDITION TYPES
// ============================================================

export type ConditionType =
  // Task conditions (existing)
  | 'task_priority_is'
  | 'task_type_is'
  | 'task_has_assignee'
  | 'task_in_project'
  | 'task_has_subtasks'
  | 'task_field_equals'
  // Risk conditions
  | 'risk_probability_is'
  | 'risk_impact_is'
  | 'risk_category_is'
  // Document conditions
  | 'document_type_is'
  | 'document_status_is'
  // Project conditions
  | 'project_status_is'
  | 'project_priority_is'

// ============================================================
// ACTION TYPES
// ============================================================

export type ActionType =
  // Notification actions (existing)
  | 'notify_user'
  | 'notify_assignee'
  | 'notify_project_owner'
  // Task actions (existing)
  | 'update_parent_status'
  | 'set_task_field'
  | 'create_comment'
  | 'assign_to_user'
  // New risk/document actions
  | 'set_risk_field'
  | 'set_document_field'

// ============================================================
// CONFIG INTERFACES
// ============================================================

export interface TriggerConfig {
  type: TriggerType
  params: Record<string, unknown>
}

export interface ConditionConfig {
  type: ConditionType
  params: Record<string, unknown>
}

export interface ActionConfig {
  type: ActionType
  params: Record<string, unknown>
}

// ============================================================
// CONTEXT - Unified context loaded by providers
// ============================================================

export interface TaskContextData {
  id: string
  code: string
  title: string
  taskType: string
  status: string
  priority: string
  assigneeId: string | null
  parentTaskId: string | null
  projectId: string | null
  departmentId: string | null
  dueDate: Date | null
  estimatedHours: number | null
  actualHours: number | null
}

export interface RiskContextData {
  id: string
  code: string
  title: string
  category: string
  probability: string
  impact: string
  status: string
  ownerId: string | null
  projectId: string
}

export interface DocumentContextData {
  id: string
  code: string
  title: string
  type: string
  status: string
  version: number
  createdById: string
  projectId: string
  reviewDueDate: Date | null
  reviewFrequencyDays: number | null
}

export interface ProjectContextData {
  id: string
  code: string
  name: string
  status: string
  priority: string
  ownerId: string
  startDate: Date | null
  targetEndDate: Date | null
  budget: number | null
}

export interface UserContextData {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
}

export interface AutomationContext {
  domain: AutomationDomain
  entityId: string
  projectId: string | null

  task?: TaskContextData
  risk?: RiskContextData
  document?: DocumentContextData
  project?: ProjectContextData

  /** The assignee (task) or owner (risk) or creator (document) */
  assignee?: UserContextData
  /** The project owner */
  projectOwner?: UserContextData
}

// ============================================================
// TRIGGER EVENT - What callers build to fire the engine
// ============================================================

export interface TriggerEvent {
  domain: AutomationDomain
  type: TriggerType
  entityId: string
  projectId: string | null
  userId: string
  data: Record<string, unknown>
}

// ============================================================
// REGISTRY HANDLER INTERFACES
// ============================================================

/**
 * TriggerHandler: validates whether an incoming event matches
 * the trigger configuration stored in the rule.
 */
export interface TriggerHandler {
  type: TriggerType
  domain: AutomationDomain
  /** Returns true if the event matches the trigger config */
  matches(config: TriggerConfig, event: TriggerEvent, context: AutomationContext): boolean
}

/**
 * ConditionEvaluator: checks a single condition against the context.
 * May be async (e.g. for DB lookups).
 */
export interface ConditionEvaluator {
  type: ConditionType
  domain: AutomationDomain | '*'
  /** Returns true if the condition is satisfied */
  evaluate(config: ConditionConfig, context: AutomationContext): Promise<boolean>
}

/**
 * ActionExecutor: executes a single action.
 * May trigger chained automation events via the `fireEvent` callback.
 */
export interface ActionExecutor {
  type: ActionType
  domain: AutomationDomain | '*'
  /** Executes the action. Must not throw; return void on success. */
  execute(
    config: ActionConfig,
    event: TriggerEvent,
    context: AutomationContext,
    fireEvent: (childEvent: TriggerEvent) => Promise<void>
  ): Promise<void>
}

/**
 * ContextProvider: loads the full context for a given domain/entity.
 */
export interface ContextProvider {
  domain: AutomationDomain
  /** Loads entity + project + assignee/owner from the database */
  load(entityId: string): Promise<AutomationContext | null>
}
