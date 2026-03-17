/**
 * Risk Zod Schemas - Shared validation for risk CRUD operations
 * @module schemas/riskSchemas
 */

import { z } from 'zod'
import { paginationSchema, optionalQueryEnum } from './commonSchemas.js'
import {
  riskCategorySchema,
  riskScaleSchema,
  riskStatusSchema,
} from '../constants/enums.js'

// ============================================================
// RISK SCHEMAS
// ============================================================

export const createRiskSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().nullish(),
  category: riskCategorySchema.default('technical'),
  probability: riskScaleSchema.default(3),
  impact: riskScaleSchema.default(3),
  mitigationPlan: z.string().nullish(),
  ownerId: z.string().uuid('Invalid owner ID').nullish(),
})

export const updateRiskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullish(),
  category: riskCategorySchema.optional(),
  probability: riskScaleSchema.optional(),
  impact: riskScaleSchema.optional(),
  status: riskStatusSchema.optional(),
  mitigationPlan: z.string().nullish(),
  ownerId: z.string().uuid().nullish(),
})

export const riskQuerySchema = paginationSchema.extend({
  projectId: z.preprocess((v) => (v === '' ? undefined : v), z.string().uuid().optional()),
  category: optionalQueryEnum(riskCategorySchema),
  status: optionalQueryEnum(riskStatusSchema),
  probability: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    riskScaleSchema.optional()
  ),
  impact: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    riskScaleSchema.optional()
  ),
  ownerId: z.preprocess((v) => (v === '' ? undefined : v), z.string().uuid().optional()),
  search: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
})

export const riskStatusChangeSchema = z.object({
  status: riskStatusSchema,
})
