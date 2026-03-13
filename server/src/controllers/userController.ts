import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '../models/prismaClient.js'
import { AppError } from '../middleware/errorMiddleware.js'
import {
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
  updateThemeSchema,
} from '../schemas/userSchemas.js'
import { sendSuccess, sendCreated, sendPaginated } from '../utils/responseHelpers.js'
import { requireUserId, requireResource } from '../utils/controllerHelpers.js'

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

    sendPaginated(res, {
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
        themeStyle: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    requireResource(user, 'User')

    sendSuccess(res, user)
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

    sendCreated(res, user)
  } catch (error) {
    next(error)
  }
}

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const data = updateUserSchema.parse(req.body)

    const existing = requireResource(await prisma.user.findFirst({ where: { id, isDeleted: false } }), 'User')

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
        themeStyle: true,
        avatarUrl: true,
        updatedAt: true,
      },
    })

    sendSuccess(res, user)
  } catch (error) {
    next(error)
  }
}

export const updateTheme = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req)

    const { theme, themeStyle } = updateThemeSchema.parse(req.body)

    const data: Record<string, string> = {}
    if (theme) data.theme = theme
    if (themeStyle) data.themeStyle = themeStyle

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        theme: true,
        themeStyle: true,
      },
    })

    sendSuccess(res, user)
  } catch (error) {
    next(error)
  }
}

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req)

    const data = updateProfileSchema.parse(req.body)

    const existing = requireResource(await prisma.user.findFirst({ where: { id: userId, isDeleted: false } }), 'User')

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
        themeStyle: true,
        updatedAt: true,
      },
    })

    sendSuccess(res, user)
  } catch (error) {
    next(error)
  }
}

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    const existing = requireResource(await prisma.user.findFirst({ where: { id, isDeleted: false } }), 'User')

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

    sendSuccess(res, { message: 'User deleted successfully' })
  } catch (error) {
    next(error)
  }
}

export const hardDeleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const requestingUserId = requireUserId(req)

    const existing = requireResource(await prisma.user.findUnique({ where: { id } }), 'User')

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

    sendSuccess(res, { message: `User ${existing.email} permanently deleted` })
  } catch (error) {
    next(error)
  }
}
