/**
 * Task Trigger Handlers - Ported from V1 automationEngine.ts
 * Each handler validates whether an incoming event matches
 * the trigger configuration stored on the automation rule.
 * @module services/automation/triggers/taskTriggers
 */

import type { TriggerHandler } from '../types.js'

/**
 * Fires when a task's status changes.
 * Optional params: fromStatus, toStatus, taskType.
 */
export const taskStatusChangedTrigger: TriggerHandler = {
  type: 'task_status_changed',
  domain: 'task',

  matches(config, event, _context) {
    if (config.type !== event.type) return false

    const params = config.params
    const data = event.data

    if (params['fromStatus'] !== undefined && params['fromStatus'] !== data['oldStatus']) {
      return false
    }
    if (params['toStatus'] !== undefined && params['toStatus'] !== data['newStatus']) {
      return false
    }
    if (params['taskType'] !== undefined && _context.task && params['taskType'] !== _context.task.taskType) {
      return false
    }

    return true
  },
}

/**
 * Fires when a new task is created.
 * Optional params: taskType.
 */
export const taskCreatedTrigger: TriggerHandler = {
  type: 'task_created',
  domain: 'task',

  matches(config, event, _context) {
    if (config.type !== event.type) return false

    const params = config.params
    if (params['taskType'] !== undefined && _context.task && params['taskType'] !== _context.task.taskType) {
      return false
    }

    return true
  },
}

/**
 * Fires when a task is assigned or reassigned.
 * Optional params: taskType.
 */
export const taskAssignedTrigger: TriggerHandler = {
  type: 'task_assigned',
  domain: 'task',

  matches(config, event, _context) {
    if (config.type !== event.type) return false

    const params = config.params
    if (params['taskType'] !== undefined && _context.task && params['taskType'] !== _context.task.taskType) {
      return false
    }

    return true
  },
}

/**
 * Fires when all subtasks of a parent task are completed.
 * No additional params.
 */
export const allSubtasksCompletedTrigger: TriggerHandler = {
  type: 'all_subtasks_completed',
  domain: 'task',

  matches(config, event, _context) {
    return config.type === event.type
  },
}

/**
 * Fires when a task is overdue.
 * Optional params: overdueHours.
 */
export const taskOverdueTrigger: TriggerHandler = {
  type: 'task_overdue',
  domain: 'task',

  matches(config, event, _context) {
    if (config.type !== event.type) return false

    const params = config.params
    if (params['overdueHours'] !== undefined && params['overdueHours'] !== event.data['overdueHours']) {
      return false
    }

    return true
  },
}

/**
 * Fires when a task deadline is approaching.
 * Optional params: daysBeforeDeadline.
 */
export const taskDeadlineApproachingTrigger: TriggerHandler = {
  type: 'task_deadline_approaching',
  domain: 'task',

  matches(config, event, _context) {
    if (config.type !== event.type) return false

    const params = config.params
    if (
      params['daysBeforeDeadline'] !== undefined &&
      params['daysBeforeDeadline'] !== event.data['daysBeforeDeadline']
    ) {
      return false
    }

    return true
  },
}

/** All task trigger handlers for bulk registration */
export const allTaskTriggers: TriggerHandler[] = [
  taskStatusChangedTrigger,
  taskCreatedTrigger,
  taskAssignedTrigger,
  allSubtasksCompletedTrigger,
  taskOverdueTrigger,
  taskDeadlineApproachingTrigger,
]
