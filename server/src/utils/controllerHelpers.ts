/**
 * Controller Helpers - Shared utilities for Express route handlers
 * Reduces boilerplate for common patterns across all controllers
 * @module utils/controllerHelpers
 */

import type { Request } from 'express'
import { AppError } from '../middleware/errorMiddleware.js'

// ============================================================
// AUTHENTICATION HELPERS
// ============================================================

/**
 * Extracts the authenticated user's ID from the request.
 * Throws a 401 AppError if the user is not authenticated.
 * @example const userId = requireUserId(req)
 */
export function requireUserId(req: Request): string {
  const userId = req.user?.userId
  if (!userId) {
    throw new AppError('User not authenticated', 401)
  }
  return userId
}

// ============================================================
// RESOURCE HELPERS
// ============================================================

/**
 * Asserts a resource exists and narrows the type to non-null.
 * Throws a 404 AppError if the resource is null/undefined.
 * @example const project = requireResource(await service.getById(id), 'Project')
 */
export function requireResource<T>(resource: T | null | undefined, name: string): T {
  if (resource == null) {
    throw new AppError(`${name} not found`, 404)
  }
  return resource
}
