import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { prisma } from '../models/prismaClient.js'
import { AppError } from '../middleware/errorMiddleware.js'

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(['admin', 'direzione', 'dipendente']).default('dipendente'),
  avatarUrl: z.string().url().nullable().optional(),
})

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'direzione', 'dipendente']).optional(),
  isActive: z.boolean().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  avatarUrl: z.string().url().nullable().optional(),
})

const updateProfileSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
})

const updateThemeSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
})

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, isActive, search, page = '1', limit = '20' } = req.query

    const where: Record<string, unknown> = {
      isDeleted: false,
    }

    if (role) {
      const roleStr = role as string
      if (roleStr.includes(',')) {
        where.role = { in: roleStr.split(',') }
      } else {
        where.role = roleStr
      }
    }
    if (isActive !== undefined) where.isActive = isActive === 'true'
    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
    const take = parseInt(limit as string)

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ])

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    const user = await prisma.user.findFirst({
      where: { id, isDeleted: false },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        avatarUrl: true,
        theme: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    res.json({ success: true, data: user })
  } catch (error) {
    next(error)
  }
}

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createUserSchema.parse(req.body)

    // Check if email already exists (including soft-deleted)
    const existing = await prisma.user.findFirst({ where: { email: data.email, isDeleted: false } })
    if (existing) {
      throw new AppError('Email already in use', 400)
    }

    const passwordHash = await bcrypt.hash(data.password, 12)

    const { password, ...createData } = data
    
    const user = await prisma.user.create({
      data: {
        ...createData,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        avatarUrl: true,
        createdAt: true,
      },
    })

    res.status(201).json({ success: true, data: user })
  } catch (error) {
    next(error)
  }
}

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const data = updateUserSchema.parse(req.body)

    const existing = await prisma.user.findFirst({ where: { id, isDeleted: false } })
    if (!existing) {
      throw new AppError('User not found', 404)
    }

    // Check if email is being changed and already exists
    if (data.email && data.email !== existing.email) {
      const emailExists = await prisma.user.findFirst({ where: { email: data.email, isDeleted: false } })
      if (emailExists) {
        throw new AppError('Email already in use', 400)
      }
    }

    // Prepare update data, hash password if provided
    const { password, ...updateData } = data
    const finalData: Record<string, unknown> = { ...updateData }

    if (password) {
      finalData.passwordHash = await bcrypt.hash(password, 12)
    }

    const user = await prisma.user.update({
      where: { id },
      data: finalData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        theme: true,
        avatarUrl: true,
        updatedAt: true,
      },
    })

    res.json({ success: true, data: user })
  } catch (error) {
    next(error)
  }
}

export const updateTheme = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id
    if (!userId) {
      throw new AppError('Unauthorized', 401)
    }

    const { theme } = updateThemeSchema.parse(req.body)

    const user = await prisma.user.update({
      where: { id: userId },
      data: { theme },
      select: {
        id: true,
        theme: true,
      },
    })

    res.json({ success: true, data: user })
  } catch (error) {
    next(error)
  }
}

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id
    if (!userId) {
      throw new AppError('Unauthorized', 401)
    }

    const data = updateProfileSchema.parse(req.body)

    const existing = await prisma.user.findFirst({ where: { id: userId, isDeleted: false } })
    if (!existing) {
      throw new AppError('User not found', 404)
    }

    // Check if email is being changed and already exists
    if (data.email && data.email !== existing.email) {
      const emailExists = await prisma.user.findFirst({ where: { email: data.email, isDeleted: false } })
      if (emailExists) {
        throw new AppError('Email already in use', 400)
      }
    }

    const { password, ...updateData } = data
    const finalData: Record<string, unknown> = { ...updateData }

    if (password) {
      finalData.passwordHash = await bcrypt.hash(password, 12)
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: finalData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        theme: true,
        updatedAt: true,
      },
    })

    res.json({ success: true, data: user })
  } catch (error) {
    next(error)
  }
}

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    const existing = await prisma.user.findFirst({ where: { id, isDeleted: false } })
    if (!existing) {
      throw new AppError('User not found', 404)
    }

    // Don't allow deleting the last admin
    if (existing.role === 'admin') {
      const adminCount = await prisma.user.count({ where: { role: 'admin', isDeleted: false } })
      if (adminCount <= 1) {
        throw new AppError('Cannot delete the last admin user', 400)
      }
    }

    // Soft delete - mark as deleted instead of removing from DB
    await prisma.user.update({
      where: { id },
      data: {
        isDeleted: true,
        isActive: false,
        updatedAt: new Date(),
      },
    })

    res.json({ success: true, message: 'User deleted successfully' })
  } catch (error) {
    next(error)
  }
}

export const hardDeleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const requestingUserId = (req as Request & { user?: { id: string } }).user?.id

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError('User not found', 404)
    }

    // Prevent self-delete
    if (id === requestingUserId) {
      throw new AppError('Cannot delete your own account', 400)
    }

    // Don't allow deleting the last admin
    if (existing.role === 'admin') {
      const adminCount = await prisma.user.count({ where: { role: 'admin', isDeleted: false } })
      if (adminCount <= 1) {
        throw new AppError('Cannot delete the last admin user', 400)
      }
    }

    // Check for non-nullable FK dependencies that would block deletion
    const [ownedProjects, createdProjects, createdTasks, createdRisks, createdDocuments, createdInputs, createdTags] = await Promise.all([
      prisma.project.count({ where: { ownerId: id, isDeleted: false } }),
      prisma.project.count({ where: { createdById: id, isDeleted: false } }),
      prisma.task.count({ where: { createdById: id, isDeleted: false } }),
      prisma.risk.count({ where: { createdById: id, isDeleted: false } }),
      prisma.document.count({ where: { createdById: id, isDeleted: false } }),
      prisma.userInput.count({ where: { createdById: id, isDeleted: false } }),
      prisma.tag.count({ where: { createdById: id } }),
    ])

    const blockers: string[] = []
    if (ownedProjects > 0) blockers.push(`${ownedProjects} owned project(s)`)
    if (createdProjects > 0) blockers.push(`${createdProjects} created project(s)`)
    if (createdTasks > 0) blockers.push(`${createdTasks} created task(s)`)
    if (createdRisks > 0) blockers.push(`${createdRisks} created risk(s)`)
    if (createdDocuments > 0) blockers.push(`${createdDocuments} created document(s)`)
    if (createdInputs > 0) blockers.push(`${createdInputs} created user input(s)`)
    if (createdTags > 0) blockers.push(`${createdTags} created tag(s)`)

    if (blockers.length > 0) {
      throw new AppError(
        `Cannot hard delete: user has ${blockers.join(', ')}. Reassign or delete them first.`,
        409
      )
    }

    // Hard delete in transaction
    await prisma.$transaction(async (tx) => {
      // Nullify nullable FK references
      await tx.task.updateMany({ where: { assigneeId: id }, data: { assigneeId: null } })
      await tx.risk.updateMany({ where: { ownerId: id }, data: { ownerId: null } })
      await tx.document.updateMany({ where: { approvedById: id }, data: { approvedById: null } })
      await tx.userInput.updateMany({ where: { processedById: id }, data: { processedById: null } })

      // Delete records that belong to the user
      await tx.refreshToken.deleteMany({ where: { userId: id } })
      await tx.notification.deleteMany({ where: { userId: id } })
      await tx.timeEntry.deleteMany({ where: { userId: id } })
      await tx.comment.deleteMany({ where: { userId: id } })
      await tx.taskCompletion.deleteMany({ where: { completedBy: id } })
      await tx.weeklyReport.deleteMany({ where: { userId: id } })
      await tx.note.deleteMany({ where: { userId: id } })
      await tx.attachment.deleteMany({ where: { uploadedById: id } })
      await tx.auditLog.deleteMany({ where: { userId: id } })

      // Delete the user
      await tx.user.delete({ where: { id } })
    })

    res.json({ success: true, message: `User ${existing.email} permanently deleted` })
  } catch (error) {
    next(error)
  }
}
