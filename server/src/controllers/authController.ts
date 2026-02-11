import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import jwt, { SignOptions } from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../models/prismaClient.js'
import { AppError } from '../middleware/errorMiddleware.js'
import { logger } from '../utils/logger.js'

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret'
const JWT_OPTIONS: SignOptions = { expiresIn: '8h' }
const JWT_REFRESH_OPTIONS: SignOptions = { expiresIn: '7d' }

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body)

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user || !user.isActive) {
      throw new AppError('Invalid credentials', 401)
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash)

    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401)
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      JWT_OPTIONS
    )

    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_REFRESH_SECRET,
      JWT_REFRESH_OPTIONS
    )

    // Save refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    logger.info(`User logged in: ${user.email}`)

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      token,
      refreshToken,
    })
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

    const decoded = jwt.verify(
      refreshToken,
      JWT_REFRESH_SECRET
    ) as { userId: string }

    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId: decoded.userId,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    })

    if (!storedToken) {
      throw new AppError('Invalid refresh token', 401)
    }

    const user = storedToken.user

    const newToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      JWT_OPTIONS
    )

    const newRefreshToken = jwt.sign(
      { userId: user.id },
      JWT_REFRESH_SECRET,
      JWT_REFRESH_OPTIONS
    )

    // Delete old refresh token and create new one
    await prisma.refreshToken.delete({ where: { id: storedToken.id } })
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    res.json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken,
    })
  } catch (error) {
    next(error)
  }
}

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId

    if (userId) {
      await prisma.refreshToken.deleteMany({
        where: { userId },
      })
    }

    res.json({ success: true, message: 'Logged out successfully' })
  } catch (error) {
    next(error)
  }
}

export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    res.json({ success: true, user })
  } catch (error) {
    next(error)
  }
}
