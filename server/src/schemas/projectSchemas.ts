/**
 * Project Zod Schemas - Shared validation for project CRUD operations
 * Extracted from projectController to be reusable across controllers/routes
 * @module schemas/projectSchemas
 */

import { z } from 'zod'
import { datePreprocess, numberPreprocess } from '../utils/validation.js'

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
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
})

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullish(),
  ownerId: z.string().uuid().optional(),
  status: z
    .enum(['planning', 'design', 'verification', 'validation', 'transfer', 'maintenance', 'completed', 'on_hold', 'cancelled'])
    .optional(),
  startDate: z.preprocess(datePreprocess, z.string().datetime().nullish()),
  targetEndDate: z.preprocess(datePreprocess, z.string().datetime().nullish()),
  actualEndDate: z.preprocess(datePreprocess, z.string().datetime().nullish()),
  budget: z.preprocess(numberPreprocess, z.number().positive().nullish()),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
})

export const projectQuerySchema = z.object({
  status: z
    .enum(['planning', 'design', 'verification', 'validation', 'transfer', 'maintenance', 'completed', 'on_hold', 'cancelled'])
    .optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  ownerId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
})

export const projectStatusChangeSchema = z.object({
  status: z.enum([
    'planning',
    'design',
    'verification',
    'validation',
    'transfer',
    'maintenance',
    'completed',
    'on_hold',
    'cancelled',
  ]),
})
