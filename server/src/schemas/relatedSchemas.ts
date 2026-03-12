/**
 * Related Schemas - Zod validation for related entities endpoints
 * @module schemas/relatedSchemas
 */

import { z } from 'zod'

export const relatedParamSchema = z.object({
  entityType: z.enum(['project', 'task', 'risk', 'document', 'user']),
  entityId: z.string().uuid(),
})

export const relatedQuerySchema = z.object({
  include: z.preprocess(
    (v) => (typeof v === 'string' ? v.split(',').map(s => s.trim()) : []),
    z.array(z.enum(['tasks', 'risks', 'documents', 'team', 'projects', 'milestones', 'versions'])).min(1)
  ),
  limit: z.preprocess(
    (v) => (v === '' || v === undefined ? 10 : Number(v)),
    z.number().int().min(1).max(50).default(10)
  ),
})
