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
  logger.error(err)

  if (err instanceof AppError) {
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

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    logger.error('Prisma error', { error: err })
    return res.status(400).json({
      success: false,
      message: 'Database operation failed',
    })
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    })
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
    })
  }

  // Default error
  logger.error('Unhandled error', { name: err.name, message: err.message, stack: err.stack })
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  })
}
