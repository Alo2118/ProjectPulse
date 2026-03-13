import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { logger } from '../utils/logger.js'

export class AppError extends Error {
  statusCode: number
  isOperational: boolean

  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}

export const errorMiddleware = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // AppError — operational errors with known status code
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { statusCode: err.statusCode, stack: err.stack })
    } else {
      logger.warn(err.message, { statusCode: err.statusCode })
    }
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    })
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const firstError = err.errors[0]
    logger.warn('Validation error', { errors: err.errors })
    return res.status(400).json({
      success: false,
      message: firstError ? `${firstError.path.join('.')}: ${firstError.message}` : 'Validation failed',
      errors: err.errors,
    })
  }

  // Prisma errors — parse specific error codes
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as Error & { code?: string; meta?: Record<string, unknown> }
    const code = prismaErr.code

    if (code === 'P2002') {
      // Unique constraint violation
      const target = (prismaErr.meta?.target as string[])?.join(', ') ?? 'field'
      logger.warn(`Prisma unique constraint: ${target}`, { code, meta: prismaErr.meta })
      return res.status(409).json({
        success: false,
        message: `A record with this ${target} already exists`,
      })
    }

    if (code === 'P2025') {
      // Record not found
      logger.warn('Prisma record not found', { code, meta: prismaErr.meta })
      return res.status(404).json({
        success: false,
        message: 'Record not found',
      })
    }

    if (code === 'P2003') {
      // Foreign key constraint
      logger.warn('Prisma foreign key constraint', { code, meta: prismaErr.meta })
      return res.status(400).json({
        success: false,
        message: 'Referenced record does not exist',
      })
    }

    logger.error('Prisma error', { code, error: err })
    return res.status(400).json({
      success: false,
      message: 'Database operation failed',
    })
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    logger.warn('Invalid JWT token')
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    })
  }

  if (err.name === 'TokenExpiredError') {
    logger.warn('Expired JWT token')
    return res.status(401).json({
      success: false,
      message: 'Token expired',
    })
  }

  // Default — unexpected errors
  logger.error('Unhandled error', { name: err.name, message: err.message, stack: err.stack })
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  })
}
