/**
 * Stats Schemas - Zod validation for stats endpoints
 * @module schemas/statsSchemas
 */

import { z } from 'zod'

export const statsDomainSchema = z.enum([
  'projects', 'documents', 'risks', 'users', 'tasks',
])

export const statsDomainParamSchema = z.object({
  domain: statsDomainSchema,
})

export const summaryParamSchema = z.object({
  id: z.string().uuid(),
})
