/**
 * Dashboard Schemas - Zod validation for dashboard query parameters
 * @module schemas/dashboardSchemas
 */

import { z } from 'zod'

export const attentionQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(50)).default('10'),
})

export const activityQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(50)).default('10'),
})
