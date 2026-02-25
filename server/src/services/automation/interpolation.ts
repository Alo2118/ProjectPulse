/**
 * Automation Engine V2 - Message Interpolation
 * Replaces template placeholders like {task.code}, {assignee.name}, etc.
 * with actual values from the automation context.
 * @module services/automation/interpolation
 */

import type { AutomationContext } from './types.js'

/**
 * Replaces all `{placeholder}` tokens in the template string with values
 * extracted from the automation context. Unknown placeholders are left as-is.
 *
 * Supported placeholders:
 * - {task.code}, {task.title}, {task.status}, {task.priority}, {task.taskType}
 * - {risk.code}, {risk.title}, {risk.status}, {risk.probability}, {risk.impact}, {risk.category}
 * - {document.code}, {document.title}, {document.status}, {document.type}, {document.version}
 * - {project.code}, {project.name}, {project.status}, {project.priority}
 * - {assignee.name}, {assignee.firstName}, {assignee.lastName}, {assignee.email}
 * - {projectOwner.name}, {projectOwner.firstName}, {projectOwner.lastName}, {projectOwner.email}
 * - {dueDate}, {entityId}, {domain}
 */
export function interpolateMessage(
  template: string,
  context: AutomationContext
): string {
  if (!template) return template

  return template.replace(/\{([^}]+)\}/g, (_match, key: string) => {
    const value = resolveKey(key.trim(), context)
    return value !== undefined && value !== null ? String(value) : `{${key}}`
  })
}

/**
 * Resolves a dot-notation key against the automation context.
 */
function resolveKey(key: string, context: AutomationContext): string | number | null | undefined {
  // Top-level convenience keys
  switch (key) {
    case 'entityId':
      return context.entityId
    case 'domain':
      return context.domain
    case 'dueDate':
      return context.task?.dueDate
        ? formatDate(context.task.dueDate)
        : undefined
  }

  const parts = key.split('.')
  if (parts.length !== 2) return undefined

  const [scope, field] = parts

  switch (scope) {
    case 'task':
      return resolveTaskField(field, context)
    case 'risk':
      return resolveRiskField(field, context)
    case 'document':
      return resolveDocumentField(field, context)
    case 'project':
      return resolveProjectField(field, context)
    case 'assignee':
      return resolveUserField(field, context.assignee)
    case 'projectOwner':
      return resolveUserField(field, context.projectOwner)
    default:
      return undefined
  }
}

function resolveTaskField(
  field: string,
  context: AutomationContext
): string | number | null | undefined {
  const task = context.task
  if (!task) return undefined

  switch (field) {
    case 'id': return task.id
    case 'code': return task.code
    case 'title': return task.title
    case 'status': return task.status
    case 'priority': return task.priority
    case 'taskType': return task.taskType
    case 'assigneeId': return task.assigneeId
    case 'parentTaskId': return task.parentTaskId
    case 'projectId': return task.projectId
    case 'departmentId': return task.departmentId
    case 'dueDate': return task.dueDate ? formatDate(task.dueDate) : null
    case 'estimatedHours': return task.estimatedHours
    case 'actualHours': return task.actualHours
    default: return undefined
  }
}

function resolveRiskField(
  field: string,
  context: AutomationContext
): string | null | undefined {
  const risk = context.risk
  if (!risk) return undefined

  switch (field) {
    case 'id': return risk.id
    case 'code': return risk.code
    case 'title': return risk.title
    case 'category': return risk.category
    case 'probability': return risk.probability
    case 'impact': return risk.impact
    case 'status': return risk.status
    case 'ownerId': return risk.ownerId
    case 'projectId': return risk.projectId
    default: return undefined
  }
}

function resolveDocumentField(
  field: string,
  context: AutomationContext
): string | number | null | undefined {
  const doc = context.document
  if (!doc) return undefined

  switch (field) {
    case 'id': return doc.id
    case 'code': return doc.code
    case 'title': return doc.title
    case 'type': return doc.type
    case 'status': return doc.status
    case 'version': return doc.version
    case 'createdById': return doc.createdById
    case 'projectId': return doc.projectId
    case 'reviewDueDate': return doc.reviewDueDate ? formatDate(doc.reviewDueDate) : null
    case 'reviewFrequencyDays': return doc.reviewFrequencyDays
    default: return undefined
  }
}

function resolveProjectField(
  field: string,
  context: AutomationContext
): string | number | null | undefined {
  const project = context.project
  if (!project) return undefined

  switch (field) {
    case 'id': return project.id
    case 'code': return project.code
    case 'name': return project.name
    case 'status': return project.status
    case 'priority': return project.priority
    case 'ownerId': return project.ownerId
    case 'startDate': return project.startDate ? formatDate(project.startDate) : null
    case 'targetEndDate': return project.targetEndDate ? formatDate(project.targetEndDate) : null
    case 'budget': return project.budget
    default: return undefined
  }
}

function resolveUserField(
  field: string,
  user: { id: string; firstName: string; lastName: string; email: string; role: string } | undefined
): string | undefined {
  if (!user) return undefined

  switch (field) {
    case 'id': return user.id
    case 'name': return `${user.firstName} ${user.lastName}`
    case 'firstName': return user.firstName
    case 'lastName': return user.lastName
    case 'email': return user.email
    case 'role': return user.role
    default: return undefined
  }
}

/**
 * Formats a Date to a locale-friendly string (ISO date part).
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}
