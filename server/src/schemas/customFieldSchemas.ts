/**
 * Custom Field Zod Schemas - Shared validation for custom field definition and value operations
 * @module schemas/customFieldSchemas
 */

import { z } from 'zod'

// ============================================================
// CONSTANTS
// ============================================================

export const VALID_FIELD_TYPES = ['text', 'number', 'dropdown', 'date', 'checkbox'] as const

// ============================================================
// CUSTOM FIELD SCHEMAS
// ============================================================

export const createDefinitionSchema = z.object({
  name: z.string().min(1, 'Il nome è obbligatorio').max(100),
  fieldType: z.enum(VALID_FIELD_TYPES, {
    errorMap: () => ({ message: 'Tipo campo non valido' }),
  }),
  options: z.array(z.string().min(1)).optional(),
  projectId: z.string().uuid('ID progetto non valido').optional(),
  isRequired: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
})

export const updateDefinitionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  fieldType: z.enum(VALID_FIELD_TYPES).optional(),
  options: z.array(z.string().min(1)).optional(),
  isRequired: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export const definitionQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  includeGlobal: z
    .string()
    .optional()
    .transform((v) => v !== 'false'),
  includeInactive: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
})

export const setValueSchema = z.object({
  definitionId: z.string().uuid('ID definizione non valido'),
  value: z.string().nullish(),
})
