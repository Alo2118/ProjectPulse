/**
 * Activity Schemas - Zod validation for activity timeline endpoints
 * @module schemas/activitySchemas
 */

import { z } from 'zod'

export const activityParamSchema = z.object({
  entityType: z.enum(['project', 'task', 'risk', 'document', 'user']),
  entityId: z.string().uuid(),
})

export const activityQuerySchema = z.object({
  limit: z.preprocess(
    (v) => (v === '' || v === undefined ? 20 : Number(v)),
    z.number().int().min(1).max(100).default(20)
  ),
})
