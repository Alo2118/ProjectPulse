/**
 * Task Condition Evaluators - Ported from V1 automationEngine.ts
 * Each evaluator checks a single condition against the automation context.
 * @module services/automation/conditions/taskConditions
 */

import { prisma } from '../../../models/prismaClient.js'
import { logger } from '../../../utils/logger.js'
import type { ConditionEvaluator } from '../types.js'

/** Allowlist of task fields that can be compared in `task_field_equals` */
const CONDITION_FIELD_ALLOWLIST = new Set([
  'status',
  'priority',
  'taskType',
  'assigneeId',
  'projectId',
  'departmentId',
])

/**
 * Checks if the task's priority matches the expected value.
 * Params: { value: string }
 */
export const taskPriorityIsCondition: ConditionEvaluator = {
  type: 'task_priority_is',
  domain: 'task',

  async evaluate(config, context) {
    if (!context.task) return false
    return context.task.priority === config.params['value']
  },
}

/**
 * Checks if the task's type matches the expected value.
 * Params: { value: string }
 */
export const taskTypeIsCondition: ConditionEvaluator = {
  type: 'task_type_is',
  domain: 'task',

  async evaluate(config, context) {
    if (!context.task) return false
    return context.task.taskType === config.params['value']
  },
}

/**
 * Checks if the task has an assignee.
 * No params.
 */
export const taskHasAssigneeCondition: ConditionEvaluator = {
  type: 'task_has_assignee',
  domain: 'task',

  async evaluate(_config, context) {
    if (!context.task) return false
    return context.task.assigneeId !== null
  },
}

/**
 * Checks if the task belongs to a specific project.
 * Params: { projectId: string }
 */
export const taskInProjectCondition: ConditionEvaluator = {
  type: 'task_in_project',
  domain: 'task',

  async evaluate(config, context) {
    if (!context.task) return false
    return context.task.projectId === config.params['projectId']
  },
}

/**
 * Checks if the task has at least one non-deleted subtask.
 * No params. Requires DB lookup.
 */
export const taskHasSubtasksCondition: ConditionEvaluator = {
  type: 'task_has_subtasks',
  domain: 'task',

  async evaluate(_config, context) {
    if (!context.task) return false
    const subtaskCount = await prisma.task.count({
      where: { parentTaskId: context.task.id, isDeleted: false },
    })
    return subtaskCount > 0
  },
}

/**
 * Checks if a specific task field equals a given value.
 * Params: { field: string, value: unknown }
 * The field must be in the allowlist.
 */
export const taskFieldEqualsCondition: ConditionEvaluator = {
  type: 'task_field_equals',
  domain: 'task',

  async evaluate(config, context) {
    if (!context.task) return false

    const field = config.params['field']
    const expectedValue = config.params['value']

    if (typeof field !== 'string' || !CONDITION_FIELD_ALLOWLIST.has(field)) {
      logger.warn('task_field_equals: field not in allowlist or missing', {
        field,
        entityId: context.entityId,
      })
      return false
    }

    const taskData = context.task as unknown as Record<string, unknown>
    return taskData[field] === expectedValue
  },
}

/** All task condition evaluators for bulk registration */
export const allTaskConditions: ConditionEvaluator[] = [
  taskPriorityIsCondition,
  taskTypeIsCondition,
  taskHasAssigneeCondition,
  taskInProjectCondition,
  taskHasSubtasksCondition,
  taskFieldEqualsCondition,
]
