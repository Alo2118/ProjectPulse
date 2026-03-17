/**
 * Checklist Zod Schemas - Shared validation for checklist item operations
 * @module schemas/checklistSchemas
 */

import { z } from 'zod'

// ============================================================
// CHECKLIST SCHEMAS
// ============================================================

export const createChecklistItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
})

export const updateChecklistItemSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  isChecked: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
})

export const reorderChecklistSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int().min(0),
    })
  ),
})
