/**
 * Task Zod Schemas - Shared validation for task CRUD operations
 * Extracted from taskController to be reusable across controllers/routes
 * @module schemas/taskSchemas
 */

import { z } from 'zod'
import { datePreprocess, numberPreprocess } from '../utils/validation.js'

// ============================================================
// INTERNAL HELPERS
// ============================================================

/** Converts empty string to undefined before UUID validation */
const emptyStringToUndefined = z.preprocess((val) => {
  if (val === '') return undefined
  return val
}, z.string().uuid('Invalid ID'))

// ============================================================
// TASK SCHEMAS
// ============================================================

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().nullable().optional(),
  projectId: emptyStringToUndefined.nullable().optional(),
  parentTaskId: emptyStringToUndefined.nullable().optional(),
  assigneeId: emptyStringToUndefined.nullable().optional(),
  departmentId: emptyStringToUndefined.nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  taskType: z.enum(['milestone', 'task', 'subtask']).default('task'),
  startDate: z.preprocess(datePreprocess, z.string().datetime().nullable().optional()),
  dueDate: z.preprocess(datePreprocess, z.string().datetime().nullable().optional()),
  estimatedHours: z.preprocess(numberPreprocess, z.number().positive('Estimated hours must be positive').nullable().optional()),
  isRecurring: z.boolean().optional(),
  blockedReason: z.string().max(1000).nullable().optional(),
  recurrencePattern: z.string().nullable().optional(),
  position: z.preprocess(numberPreprocess, z.number().int().nonnegative().nullable().optional()),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  projectId: emptyStringToUndefined.nullable().optional(),
  parentTaskId: emptyStringToUndefined.nullable().optional(),
  assigneeId: emptyStringToUndefined.nullable().optional(),
  departmentId: emptyStringToUndefined.nullable().optional(),
  assignToSubtasks: z.boolean().optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'blocked', 'done', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  taskType: z.enum(['milestone', 'task', 'subtask']).optional(),
  startDate: z.preprocess(datePreprocess, z.string().datetime().nullable().optional()),
  dueDate: z.preprocess(datePreprocess, z.string().datetime().nullable().optional()),
  estimatedHours: z.preprocess(numberPreprocess, z.number().positive().nullable().optional()),
  actualHours: z.preprocess(numberPreprocess, z.number().positive().nullable().optional()),
  isRecurring: z.boolean().optional(),
  blockedReason: z.string().max(1000).nullable().optional(),
  recurrencePattern: z.string().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
})

export const taskStatusChangeSchema = z
  .object({
    status: z.enum(['todo', 'in_progress', 'review', 'blocked', 'done', 'cancelled']),
    blockedReason: z.string().min(1).max(1000).optional(),
  })
  .refine(
    (data) => {
      if (data.status === 'blocked') {
        return !!data.blockedReason?.trim()
      }
      return true
    },
    {
      message: 'Blocked reason is required when setting status to blocked',
      path: ['blockedReason'],
    }
  )

export const taskQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assigneeId: z.string().uuid().optional(),
  search: z.string().optional(),
  standalone: z.string().transform((v) => v === 'true').optional(),
  parentTaskId: z.string().uuid().optional(),
  includeSubtasks: z.string().transform((v) => v === 'true').optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
})

export const ganttQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  startDateFrom: z.preprocess(datePreprocess, z.string().datetime().optional()),
  startDateTo: z.preprocess(datePreprocess, z.string().datetime().optional()),
})

export const bulkUpdateTaskSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one task ID required').max(100, 'Maximum 100 tasks per bulk operation'),
  update: z
    .object({
      status: z.enum(['todo', 'in_progress', 'review', 'blocked', 'done', 'cancelled']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      assigneeId: z.string().uuid().optional(),
    })
    .refine((obj) => Object.keys(obj).length > 0, {
      message: 'At least one field to update is required',
    }),
})

export const bulkDeleteTaskSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one task ID required').max(100, 'Maximum 100 tasks per bulk operation'),
})

export const reorderTaskSchema = z.object({
  tasks: z.array(
    z.object({
      taskId: z.string().uuid(),
      position: z.number().int().min(0),
    })
  ),
})

export const createTaskDependencySchema = z.object({
  predecessorId: z.string().uuid('Invalid predecessor task ID'),
  successorId: z.string().uuid('Invalid successor task ID'),
  dependencyType: z.enum(['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish']).default('finish_to_start'),
  lagDays: z.number().int().default(0),
})

export const cloneTaskSchema = z.object({
  includeSubtasks: z.boolean().optional().default(false),
})

export const calendarQuerySchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  projectId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
})
