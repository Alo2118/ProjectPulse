/**
 * Auth Controller - Thin HTTP handler delegating to authService
 * @module controllers/authController
 */

import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authService } from '../services/authService.js'
import { AppError } from '../middleware/errorMiddleware.js'
import { sendSuccess } from '../utils/responseHelpers.js'
import { requireUserId, requireResource } from '../utils/controllerHelpers.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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

    sendSuccess(res, { user: result.user, token: result.token, refreshToken: result.refreshToken })
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

    sendSuccess(res, { token: result.token, refreshToken: result.refreshToken })
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

    sendSuccess(res, { message: 'Logged out successfully' })
  } catch (error) {
    next(error)
  }
}

export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req)

    const user = requireResource(await authService.getCurrentUser(userId), 'User')

    sendSuccess(res, user)
  } catch (error) {
    next(error)
  }
}
