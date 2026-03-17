/**
 * Document Zod Schemas - Shared validation for document CRUD operations
 * @module schemas/documentSchemas
 */

import { z } from 'zod'
import { paginationSchema, optionalQueryEnum } from './commonSchemas.js'
import { documentTypeSchema, documentStatusSchema } from '../constants/enums.js'

// ============================================================
// DOCUMENT SCHEMAS
// ============================================================

export const createDocumentSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().nullish(),
  type: documentTypeSchema.default('design_input'),
})

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullish(),
  type: documentTypeSchema.optional(),
})

export const documentQuerySchema = paginationSchema.extend({
  projectId: z.preprocess((v) => (v === '' ? undefined : v), z.string().uuid().optional()),
  type: optionalQueryEnum(documentTypeSchema),
  status: optionalQueryEnum(documentStatusSchema),
  search: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
})

export const documentStatusChangeSchema = z.object({
  status: documentStatusSchema,
})
