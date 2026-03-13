/**
 * errorMiddleware unit tests
 *
 * Tests the AppError class and the errorMiddleware handler function.
 * - AppError: statusCode, isOperational flag, message
 * - Handler: correct HTTP status for AppError, 500 for unknown errors, ZodError → 400
 */

import { Request, Response, NextFunction } from 'express'
import { ZodError, ZodIssue } from 'zod'
import { AppError, errorMiddleware } from '../../../src/middleware/errorMiddleware'

// ---- Helpers to create mock Express objects ----
function mockResponse(): Response {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response
  return res
}

const mockReq = {} as Request
const mockNext = jest.fn() as NextFunction

describe('AppError class', () => {
  it('should create an error with statusCode and isOperational=true', () => {
    const err = new AppError('Not found', 404)

    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AppError)
    expect(err.message).toBe('Not found')
    expect(err.statusCode).toBe(404)
    expect(err.isOperational).toBe(true)
  })

  it('should capture a stack trace', () => {
    const err = new AppError('Server error', 500)
    expect(err.stack).toBeDefined()
  })
})

describe('errorMiddleware handler', () => {
  it('should respond with the correct status code for AppError (4xx)', () => {
    const err = new AppError('Forbidden', 403)
    const res = mockResponse()

    errorMiddleware(err, mockReq, res, mockNext)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Forbidden',
    })
  })

  it('should respond with the correct status code for AppError (5xx)', () => {
    const err = new AppError('Internal failure', 500)
    const res = mockResponse()

    errorMiddleware(err, mockReq, res, mockNext)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal failure',
    })
  })

  it('should respond 400 for ZodError with field path', () => {
    const issue: ZodIssue = {
      code: 'invalid_type',
      expected: 'string',
      received: 'number',
      path: ['email'],
      message: 'Expected string, received number',
    }
    const err = new ZodError([issue])
    const res = mockResponse()

    errorMiddleware(err, mockReq, res, mockNext)

    expect(res.status).toHaveBeenCalledWith(400)
    const body = (res.json as jest.Mock).mock.calls[0][0]
    expect(body.success).toBe(false)
    expect(body.message).toContain('email')
  })

  it('should respond 500 for an unknown Error', () => {
    const err = new Error('Something unexpected')
    const res = mockResponse()

    errorMiddleware(err, mockReq, res, mockNext)

    expect(res.status).toHaveBeenCalledWith(500)
    const body = (res.json as jest.Mock).mock.calls[0][0]
    expect(body.success).toBe(false)
  })

  it('should respond 401 for JsonWebTokenError', () => {
    const err = new Error('jwt malformed')
    err.name = 'JsonWebTokenError'
    const res = mockResponse()

    errorMiddleware(err, mockReq, res, mockNext)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid token',
    })
  })

  it('should respond 401 for TokenExpiredError', () => {
    const err = new Error('jwt expired')
    err.name = 'TokenExpiredError'
    const res = mockResponse()

    errorMiddleware(err, mockReq, res, mockNext)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Token expired',
    })
  })
})
