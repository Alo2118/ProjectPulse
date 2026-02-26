/**
 * Auth Controller - Thin HTTP handler delegating to authService
 * @module controllers/authController
 */

import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authService } from '../services/authService.js'
import { AppError } from '../middleware/errorMiddleware.js'
import { sendSuccess } from '../utils/responseHelpers.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body)

    const result = await authService.login(
      email,
      password,
      req.ip,
      req.headers['user-agent']
    )

    if (!result) {
      throw new AppError('Invalid credentials', 401)
    }

    res.json({ success: true, user: result.user, token: result.token, refreshToken: result.refreshToken })
  } catch (error) {
    next(error)
  }
}

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      throw new AppError('Refresh token required', 400)
    }

    const result = await authService.refresh(refreshToken)

    if (!result) {
      throw new AppError('Invalid refresh token', 401)
    }

    res.json({ success: true, token: result.token, refreshToken: result.refreshToken })
  } catch (error) {
    next(error)
  }
}

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId

    if (userId) {
      await authService.logout(userId)
    }

    res.json({ success: true, message: 'Logged out successfully' })
  } catch (error) {
    next(error)
  }
}

export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const user = await authService.getCurrentUser(userId)

    if (!user) {
      throw new AppError('User not found', 404)
    }

    sendSuccess(res, user)
  } catch (error) {
    next(error)
  }
}
