/**
 * Tag Zod Schemas - Shared validation for tag CRUD and assignment operations
 * @module schemas/tagSchemas
 */

import { z } from 'zod'
import { paginationSchema } from './commonSchemas.js'

// ============================================================
// TAG SCHEMAS
// ============================================================

export const createTagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
})

export const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
})

export const assignTagSchema = z.object({
  tagId: z.string().uuid('Invalid tag ID'),
  entityType: z.enum(['task', 'document']),
  entityId: z.string().uuid('Invalid entity ID'),
})

export const unassignTagSchema = z.object({
  tagId: z.string().uuid('Invalid tag ID'),
  entityType: z.enum(['task', 'document']),
  entityId: z.string().uuid('Invalid entity ID'),
})

export const tagQuerySchema = paginationSchema.extend({
  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
  search: z.string().optional(),
})
