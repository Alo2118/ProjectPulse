/**
 * Comment Zod Schemas - Shared validation for comment CRUD operations
 * @module schemas/commentSchemas
 */

import { z } from 'zod'
import { paginationSchema } from './commonSchemas.js'

// ============================================================
// COMMENT SCHEMAS
// ============================================================

export const createCommentSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  content: z.string().min(1, 'Content is required').max(10000),
  isInternal: z.boolean().default(false),
  parentId: z.string().uuid('Invalid parent comment ID').optional(),
})

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  isInternal: z.boolean().optional(),
})

export const commentQuerySchema = paginationSchema.extend({
  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
})
