/**
 * Auth Service - Business logic for authentication
 * @module services/authService
 */

import bcrypt from 'bcrypt'
import jwt, { SignOptions } from 'jsonwebtoken'
import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import { auditService } from './auditService.js'
import { JwtPayload, UserWithoutPassword, Theme } from '../types/index.js'

const BCRYPT_ROUNDS = 12
if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET environment variables are required')
}

const JWT_SECRET = process.env.JWT_SECRET
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET
const JWT_OPTIONS: SignOptions = { expiresIn: '8h' }
const JWT_REFRESH_OPTIONS: SignOptions = { expiresIn: '7d' }

/**
 * User data returned after successful authentication
 */
interface AuthResult {
  user: UserWithoutPassword
  token: string
  refreshToken: string
}

/**
 * Authenticates a user with email and password
 * @param email - User email
 * @param password - User password
 * @param ipAddress - Request IP address
 * @param userAgent - Request user agent
 * @returns Auth result with tokens or null if invalid
 */
export async function login(
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<AuthResult | null> {
  const user = await prisma.user.findFirst({
    where: { email, isDeleted: false },
  })

  if (!user || !user.isActive) {
    logger.warn(`Login failed: user not found or inactive`, { email })
    return null
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash)

  if (!isValidPassword) {
    logger.warn(`Login failed: invalid password`, { email })
    return null
  }

  // Generate tokens
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

  // Log to audit trail
  await auditService.logLogin(user.id, ipAddress, userAgent)

  logger.info(`User logged in: ${user.email}`, { userId: user.id })

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      theme: user.theme as Theme,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLoginAt: new Date(),
    },
    token,
    refreshToken,
  }
}

/**
 * Refreshes access token using refresh token
 * @param refreshToken - Refresh token
 * @returns New tokens or null if invalid
 */
export async function refresh(refreshToken: string): Promise<{ token: string; refreshToken: string } | null> {
  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string }

    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId: decoded.userId,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    })

    if (!storedToken || !storedToken.user.isActive) {
      return null
    }

    const user = storedToken.user

    // Generate new tokens
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

    logger.info(`Token refreshed for user: ${user.email}`, { userId: user.id })

    return {
      token: newToken,
      refreshToken: newRefreshToken,
    }
  } catch (error) {
    logger.warn(`Token refresh failed`, { error })
    return null
  }
}

/**
 * Logs out a user by invalidating refresh tokens
 * @param userId - User ID
 */
export async function logout(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { userId },
  })

  await auditService.logLogout(userId)

  logger.info(`User logged out`, { userId })
}

/**
 * Gets current user data
 * @param userId - User ID
 * @returns User data without password
 */
export async function getCurrentUser(userId: string): Promise<UserWithoutPassword | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      avatarUrl: true,
      theme: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
    },
  })

  if (!user) return null

  return {
    ...user,
    theme: user.theme as Theme,
  }
}

/**
 * Verifies a JWT token
 * @param token - JWT token
 * @returns Decoded payload or null if invalid
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}

/**
 * Hashes a password
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

/**
 * Changes user password
 * @param userId - User ID
 * @param currentPassword - Current password
 * @param newPassword - New password
 * @returns True if successful
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    return false
  }

  const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash)

  if (!isValidPassword) {
    return false
  }

  const newPasswordHash = await hashPassword(newPassword)

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  })

  // Invalidate all refresh tokens
  await prisma.refreshToken.deleteMany({
    where: { userId },
  })

  logger.info(`Password changed for user`, { userId })

  return true
}

export const authService = {
  login,
  refresh,
  logout,
  getCurrentUser,
  verifyToken,
  hashPassword,
  changePassword,
}
