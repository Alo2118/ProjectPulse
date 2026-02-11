import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AppError } from './errorMiddleware.js'

export interface JwtPayload {
  userId: string
  email: string
  role: 'admin' | 'direzione' | 'dipendente'
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export const authMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('No token provided', 401)
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as JwtPayload

    req.user = decoded
    next()
  } catch {
    throw new AppError('Invalid token', 401)
  }
}

export const requireRole = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401)
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError('Forbidden: insufficient permissions', 403)
    }

    next()
  }
}
