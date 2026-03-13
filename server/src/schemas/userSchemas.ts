/**
 * User Zod Schemas - Shared validation for user CRUD and profile operations
 * @module schemas/userSchemas
 */

import { z } from 'zod'
import { systemRoleSchema, themeSchema, themeStyleSchema } from '../constants/enums.js'

// ============================================================
// USER SCHEMAS
// ============================================================

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: systemRoleSchema.default('dipendente'),
  avatarUrl: z.string().url().nullish(),
})

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: systemRoleSchema.optional(),
  isActive: z.boolean().optional(),
  theme: themeSchema.optional(),
  avatarUrl: z.string().url().nullish(),
})

export const updateProfileSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
})

export const updateThemeSchema = z
  .object({
    theme: themeSchema.optional(),
    themeStyle: themeStyleSchema.optional(),
  })
  .refine((data) => data.theme || data.themeStyle, {
    message: 'At least one of theme or themeStyle must be provided',
  })
