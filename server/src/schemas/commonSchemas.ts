/**
 * Common Zod Schemas - Reusable validation primitives shared across all domains
 * Extracted to avoid duplicating page/limit and UUID patterns in every schema file
 * @module schemas/commonSchemas
 */

import { z } from 'zod'

// ============================================================
// PAGINATION
// ============================================================

/**
 * Reusable pagination query params.
 * Accepts numeric strings from URL query params and transforms them to numbers.
 * @example GET /api/tasks?page=2&limit=50
 */
export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(100)).default('20'),
})

// ============================================================
// QUERY HELPERS
// ============================================================

/**
 * Wraps a Zod enum schema so that empty strings (from query params) become undefined.
 * Use this in GET query schemas where the browser sends `?priority=` as `""`.
 * @example optionalQueryEnum(taskPrioritySchema)
 */
export function optionalQueryEnum<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((val) => (val === '' ? undefined : val), schema.optional())
}

/**
 * Same as optionalQueryEnum but for UUID query params (e.g. `?projectId=`).
 */
export const optionalQueryUuid = z.preprocess(
  (val) => (val === '' ? undefined : val),
  z.string().uuid().optional()
)

// ============================================================
// UUID
// ============================================================

/**
 * Validates that a value is a well-formed UUID string.
 * @example uuidSchema.parse('550e8400-e29b-41d4-a716-446655440000')
 */
export const uuidSchema = z.string().uuid()

/**
 * Route param schema for endpoints with a single :id UUID segment.
 * @example const { id } = uuidParamSchema.parse(req.params)
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid(),
})
