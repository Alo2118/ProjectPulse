/**
 * Time Entry Zod Schemas - Shared validation for time tracking CRUD operations
 * @module schemas/timeEntrySchemas
 */

import { z } from 'zod'
import { paginationSchema } from './commonSchemas.js'

// ============================================================
// TIME ENTRY SCHEMAS
// ============================================================

export const startTimerSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  description: z.string().nullish(),
})

export const createTimeEntrySchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  description: z.string().nullish(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().nullish(),
  duration: z.number().int().positive().nullish(),
})

export const updateTimeEntrySchema = z.object({
  description: z.string().nullish(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().nullish(),
  duration: z.number().int().positive().nullish(),
})

export const timeEntryQuerySchema = paginationSchema.extend({
  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
  taskId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
})

export const reportQuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
})

export const teamReportQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  projectId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
})

export const approvalQuerySchema = paginationSchema.extend({
  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
  userId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
})

export const bulkApproveSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID required'),
})

export const bulkRejectSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID required'),
  rejectionNote: z.string().max(500).optional(),
})

export const exportTimeEntryQuerySchema = z.object({
  taskId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD')
    .optional(),
})
