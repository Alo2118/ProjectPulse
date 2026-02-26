/**
 * advancedFilterUtils - Client-side evaluation of AdvancedFilter rules against Task objects.
 *
 * evaluateAdvancedFilter(tasks, filter) returns the subset of tasks that
 * satisfy all (AND) or any (OR) of the rules in the filter.
 *
 * @module utils/advancedFilterUtils
 */

import type { Task } from '@/types'
import type { AdvancedFilter, FilterRule, FilterFieldKey } from '@/types'

// ---------------------------------------------------------------------------
// Single-rule evaluator
// ---------------------------------------------------------------------------

function evaluateRule(task: Task, rule: FilterRule): boolean {
  const { field, operator, value } = rule

  switch (field as FilterFieldKey) {
    case 'status': {
      const v = typeof value === 'string' ? value : ''
      if (!v) return true
      return operator === 'is' ? task.status === v : task.status !== v
    }

    case 'priority': {
      const v = typeof value === 'string' ? value : ''
      if (!v) return true
      return operator === 'is' ? task.priority === v : task.priority !== v
    }

    case 'taskType': {
      const v = typeof value === 'string' ? value : ''
      if (!v) return true
      return operator === 'is' ? task.taskType === v : task.taskType !== v
    }

    case 'assigneeId': {
      const v = typeof value === 'string' ? value : ''
      if (!v) return true
      if (operator === 'is') return task.assigneeId === v
      return task.assigneeId !== v
    }

    case 'projectId': {
      const v = typeof value === 'string' ? value : ''
      if (!v) return true
      if (operator === 'is') return task.projectId === v
      return task.projectId !== v
    }

    case 'departmentId': {
      const v = typeof value === 'string' ? value : ''
      if (!v) return true
      if (operator === 'is') return task.departmentId === v
      return task.departmentId !== v
    }

    case 'dueDate': {
      const taskDate = task.dueDate ? new Date(task.dueDate).getTime() : null

      if (operator === 'before') {
        const v = typeof value === 'string' ? value : ''
        if (!v || !taskDate) return true
        return taskDate < new Date(v).getTime()
      }

      if (operator === 'after') {
        const v = typeof value === 'string' ? value : ''
        if (!v || !taskDate) return true
        return taskDate > new Date(v).getTime()
      }

      if (operator === 'between') {
        const [from, to] = Array.isArray(value) ? value : ['', '']
        if ((!from && !to) || !taskDate) return true
        const fromTs = from ? new Date(from).getTime() : -Infinity
        const toTs = to ? new Date(to).getTime() : Infinity
        return taskDate >= fromTs && taskDate <= toTs
      }

      return true
    }

    case 'hasBlockedReason': {
      const hasReason = !!(task.blockedReason && task.blockedReason.trim().length > 0)
      if (operator === 'is_true') return hasReason
      if (operator === 'is_false') return !hasReason
      return true
    }

    default:
      return true
  }
}

// ---------------------------------------------------------------------------
// Filter evaluator
// ---------------------------------------------------------------------------

/**
 * Returns true if the task satisfies the advanced filter.
 * If there are no rules, always returns true.
 */
export function matchesAdvancedFilter(task: Task, filter: AdvancedFilter): boolean {
  if (filter.rules.length === 0) return true

  const results = filter.rules.map((rule) => evaluateRule(task, rule))

  return filter.logic === 'and' ? results.every(Boolean) : results.some(Boolean)
}

/**
 * Filters an array of tasks by the advanced filter.
 */
export function applyAdvancedFilter(tasks: Task[], filter: AdvancedFilter | null): Task[] {
  if (!filter || filter.rules.length === 0) return tasks
  return tasks.filter((task) => matchesAdvancedFilter(task, filter))
}

/**
 * Returns a human-readable summary of an active filter, e.g. "3 regole (AND)".
 */
export function describeAdvancedFilter(filter: AdvancedFilter | null): string | null {
  if (!filter || filter.rules.length === 0) return null
  const count = filter.rules.length
  const logic = filter.logic === 'and' ? 'AND' : 'OR'
  return `${count} ${count === 1 ? 'regola attiva' : 'regole attive'} (${logic})`
}
