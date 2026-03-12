/**
 * Response Helpers - Standardized HTTP response formatters
 * Eliminates duplicated res.json({ success: true, ... }) patterns across controllers
 * @module utils/responseHelpers
 */

import type { Response } from 'express'

/**
 * Sends a successful response with optional data payload
 * @example sendSuccess(res, task)
 * @example sendSuccess(res, stats, 200)
 */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({ success: true, data })
}

/**
 * Sends a 201 Created response with the newly created resource
 * @example sendCreated(res, newTask)
 */
export function sendCreated<T>(res: Response, data: T): void {
  res.status(201).json({ success: true, data })
}

/**
 * Sends a paginated list response.
 * Expects a result object that has { data: T[], pagination: PaginationMeta }.
 * @example sendPaginated(res, result)
 */
export function sendPaginated<T>(
  res: Response,
  result: {
    data: T[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }
): void {
  res.json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  })
}

/**
 * Sends an error response with a message and optional status code
 * @example sendError(res, 'Not found', 404)
 */
export function sendError(res: Response, message: string, statusCode = 500): void {
  res.status(statusCode).json({ success: false, message })
}
