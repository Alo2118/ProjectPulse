/**
 * Automation Zod Schemas - Shared validation for automation rule CRUD operations
 * @module schemas/automationSchemas
 */

import { z } from 'zod'
import { paginationSchema } from './commonSchemas.js'
import { automationDomainSchema, conditionLogicSchema } from '../constants/enums.js'

// ============================================================
// AUTOMATION SUB-CONFIG SCHEMAS
// ============================================================

export const triggerConfigSchema = z.object({
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

export const conditionConfigSchema = z.object({
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

export const actionConfigSchema = z.object({
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

// ============================================================
// AUTOMATION RULE SCHEMAS
// ============================================================

export const createAutomationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  projectId: z.string().uuid('Invalid project ID').optional(),
  trigger: triggerConfigSchema,
  conditions: z.array(conditionConfigSchema).default([]),
  actions: z.array(actionConfigSchema).min(1, 'At least one action is required'),
  isActive: z.boolean().default(true),
  priority: z.number().int().min(0).max(100).default(0),
  domain: automationDomainSchema.default('task'),
  conditionLogic: conditionLogicSchema.default('AND'),
  cooldownMinutes: z.number().int().min(0).default(0),
})

export const updateAutomationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  projectId: z.string().uuid().nullish(),
  trigger: triggerConfigSchema.optional(),
  conditions: z.array(conditionConfigSchema).optional(),
  actions: z.array(actionConfigSchema).min(1).optional(),
  isActive: z.boolean().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  domain: automationDomainSchema.optional(),
  conditionLogic: conditionLogicSchema.optional(),
  cooldownMinutes: z.number().int().min(0).optional(),
})

export const automationLogsQuerySchema = paginationSchema.extend({
  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
})

export const toggleAutomationSchema = z.object({
  isActive: z.boolean(),
})

export const fromTemplateSchema = z.object({
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
