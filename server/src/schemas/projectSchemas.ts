/**
 * Project Zod Schemas - Shared validation for project CRUD operations
 * Extracted from projectController to be reusable across controllers/routes
 * @module schemas/projectSchemas
 */

import { z } from 'zod'
import { datePreprocess, numberPreprocess } from '../utils/validation.js'
import { projectStatusSchema, projectPrioritySchema } from '../constants/enums.js'
import { optionalQueryEnum } from './commonSchemas.js'

// ============================================================
// PROJECT SCHEMAS
// ============================================================

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().nullish(),
  ownerId: z.string().uuid('Invalid owner ID'),
  templateId: z.string().uuid('Invalid template ID').nullish(),
  startDate: z.preprocess(datePreprocess, z.string().datetime().nullish()),
  targetEndDate: z.preprocess(datePreprocess, z.string().datetime().nullish()),
  budget: z.preprocess(numberPreprocess, z.number().positive('Budget must be positive').nullish()),
  priority: projectPrioritySchema.default('medium'),
  phaseTemplateId: z.string().uuid('Invalid phase template ID').nullish(),
})

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullish(),
  ownerId: z.string().uuid().optional(),
  startDate: z.preprocess(datePreprocess, z.string().datetime().nullish()),
  targetEndDate: z.preprocess(datePreprocess, z.string().datetime().nullish()),
  actualEndDate: z.preprocess(datePreprocess, z.string().datetime().nullish()),
  budget: z.preprocess(numberPreprocess, z.number().positive().nullish()),
  priority: projectPrioritySchema.optional(),
})

export const projectQuerySchema = z.object({
  status: optionalQueryEnum(projectStatusSchema),
  priority: optionalQueryEnum(projectPrioritySchema),
  ownerId: z.preprocess((v) => (v === '' ? undefined : v), z.string().uuid().optional()),
  search: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
  sortBy: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.enum(['createdAt', 'name', 'targetEndDate', 'priority', 'status', 'sortOrder']).default('sortOrder')
  ),
  sortOrder: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.enum(['asc', 'desc']).default('asc')
  ),
})

export const projectStatusChangeSchema = z.object({
  status: z.enum(['active', 'on_hold', 'cancelled']),
})

export const reorderProjectsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    })
  ).min(1).max(100),
})

// ============================================================
// PHASE SCHEMAS
// ============================================================

export const projectPhaseSchema = z.object({
  key: z.string().min(1).max(50).regex(/^[a-z_]+$/, 'Phase key must be lowercase with underscores'),
  label: z.string().min(1).max(100),
  description: z.string().max(500).default(''),
  order: z.number().int().min(0),
  color: z.string().min(1).max(20),
  isFinal: z.boolean(),
  isInitial: z.boolean(),
})

export const updateProjectPhasesSchema = z.object({
  phases: z.array(projectPhaseSchema).min(1, 'At least one phase is required'),
  transitions: z.record(z.string(), z.array(z.string())),
})

export const advancePhaseSchema = z.object({
  targetPhaseKey: z.string().min(1).max(50),
})

export const savePhasesAsTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(200),
  description: z.string().max(1000).optional(),
})
