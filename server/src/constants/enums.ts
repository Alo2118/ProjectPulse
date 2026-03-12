/**
 * Centralized enum constants for ProjectPulse backend.
 * SQL Server does not support native Prisma enums, so all enum values are
 * stored as strings and validated at the application layer.
 *
 * Each const array is the single source of truth for its domain.
 * Derived Zod validators are exported alongside so schema files can import
 * both the array (for runtime checks / type inference) and the validator.
 *
 * @module constants/enums
 */

import { z } from 'zod'

// ============================================================
// TASK
// ============================================================

export const TASK_STATUSES = [
  'todo',
  'in_progress',
  'review',
  'blocked',
  'done',
  'cancelled',
] as const

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const

export const TASK_TYPES = ['milestone', 'task', 'subtask'] as const

export const taskStatusSchema = z.enum(TASK_STATUSES)
export const taskPrioritySchema = z.enum(TASK_PRIORITIES)
export const taskTypeSchema = z.enum(TASK_TYPES)

// ============================================================
// PROJECT
// ============================================================

export const PROJECT_STATUSES = [
  'active',
  'on_hold',
  'cancelled',
  'completed',
] as const

export const PROJECT_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const

export const projectStatusSchema = z.enum(PROJECT_STATUSES)
export const projectPrioritySchema = z.enum(PROJECT_PRIORITIES)

// ============================================================
// WORKFLOW
// ============================================================

export const WORKFLOW_DOMAINS = ['task', 'project'] as const
export const workflowDomainSchema = z.enum(WORKFLOW_DOMAINS)

// ============================================================
// RISK
// ============================================================

export const RISK_STATUSES = ['open', 'mitigated', 'accepted', 'closed'] as const
export const RISK_CATEGORIES = ['technical', 'regulatory', 'resource', 'schedule'] as const

export const RISK_SCALE_MIN = 1
export const RISK_SCALE_MAX = 5
export const RISK_CRITICAL_THRESHOLD = 15
export const RISK_HIGH_THRESHOLD = 10
export const RISK_MEDIUM_THRESHOLD = 5

export const riskStatusSchema = z.enum(RISK_STATUSES)
export const riskCategorySchema = z.enum(RISK_CATEGORIES)
export const riskScaleSchema = z.number().int().min(RISK_SCALE_MIN).max(RISK_SCALE_MAX)

// ============================================================
// DOCUMENT
// ============================================================

export const DOCUMENT_TYPES = [
  'design_input',
  'design_output',
  'verification_report',
  'validation_report',
  'change_control',
] as const

export const DOCUMENT_STATUSES = ['draft', 'review', 'approved', 'obsolete'] as const

export const documentTypeSchema = z.enum(DOCUMENT_TYPES)
export const documentStatusSchema = z.enum(DOCUMENT_STATUSES)

// ============================================================
// USER
// ============================================================

/** All valid user roles, including guest (external users). */
export const USER_ROLES = ['admin', 'direzione', 'dipendente', 'guest'] as const

/** Internal system roles — excludes guest. Used when creating managed users. */
export const SYSTEM_ROLES = ['admin', 'direzione', 'dipendente'] as const

/** Roles with elevated/admin capabilities. */
export const PRIVILEGED_ROLES = ['admin', 'direzione'] as const

export const userRoleSchema = z.enum(USER_ROLES)
export const systemRoleSchema = z.enum(SYSTEM_ROLES)
export const privilegedRoleSchema = z.enum(PRIVILEGED_ROLES)

// ============================================================
// THEME
// ============================================================

export const THEMES = ['light', 'dark', 'system'] as const
export const THEME_STYLES = ['tech-hud', 'basic', 'classic'] as const

export const themeSchema = z.enum(THEMES)
export const themeStyleSchema = z.enum(THEME_STYLES)

// ============================================================
// USER INPUT
// ============================================================

export const INPUT_CATEGORIES = [
  'bug',
  'feature_request',
  'improvement',
  'question',
  'other',
] as const

export const INPUT_STATUSES = ['pending', 'processing', 'resolved'] as const

export const INPUT_RESOLUTION_TYPES = [
  'converted_to_task',
  'converted_to_project',
  'acknowledged',
  'rejected',
  'duplicate',
] as const

export const inputCategorySchema = z.enum(INPUT_CATEGORIES)
export const inputStatusSchema = z.enum(INPUT_STATUSES)
export const inputResolutionTypeSchema = z.enum(INPUT_RESOLUTION_TYPES)

// ============================================================
// AUTOMATION
// ============================================================

export const AUTOMATION_DOMAINS = ['task', 'risk', 'document', 'project'] as const
export const CONDITION_LOGICS = ['AND', 'OR'] as const

export const automationDomainSchema = z.enum(AUTOMATION_DOMAINS)
export const conditionLogicSchema = z.enum(CONDITION_LOGICS)

// ============================================================
// DEPENDENCY
// ============================================================

export const DEPENDENCY_TYPES = [
  'finish_to_start',
  'start_to_start',
  'finish_to_finish',
  'start_to_finish',
] as const

export const dependencyTypeSchema = z.enum(DEPENDENCY_TYPES)

// ============================================================
// PROJECT ROLES
// ============================================================

export const PROJECT_ROLES = ['owner', 'manager', 'member', 'viewer', 'guest'] as const

export const projectRoleSchema = z.enum(PROJECT_ROLES)
