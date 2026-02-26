/**
 * Department Service - Business logic for department management
 * Departments are organizational units (e.g., "Qualità", "Produzione") that are
 * assigned to tasks as executing teams, but do not have system login credentials.
 * @module services/departmentService
 */

import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import { auditService } from './auditService.js'
import {
  CreateDepartmentInput,
  UpdateDepartmentInput,
  DepartmentQueryParams,
  EntityType,
} from '../types/index.js'

const departmentSelectFields = {
  id: true,
  name: true,
  description: true,
  color: true,
  isActive: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
}

/**
 * Gets all departments with optional search and pagination
 */
async function getDepartments(params: DepartmentQueryParams = {}) {
  const { search, includeInactive = false, page = 1, limit = 50 } = params
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {
    isDeleted: false,
  }

  if (!includeInactive) {
    where.isActive = true
  }

  if (search) {
    where.name = { contains: search }
  }

  const [departments, total] = await Promise.all([
    prisma.department.findMany({
      where,
      select: departmentSelectFields,
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.department.count({ where }),
  ])

  return {
    data: departments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}

/**
 * Gets a single department by ID
 */
async function getDepartmentById(id: string) {
  return prisma.department.findFirst({
    where: { id, isDeleted: false },
    select: departmentSelectFields,
  })
}

/**
 * Creates a new department
 */
async function createDepartment(data: CreateDepartmentInput, userId: string) {
  const department = await prisma.$transaction(async (tx) => {
    const existing = await tx.department.findFirst({
      where: { name: data.name, isDeleted: false },
      select: { id: true },
    })
    if (existing) {
      throw new Error(`Un reparto con nome "${data.name}" esiste già`)
    }

    const created = await tx.department.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        color: data.color ?? '#6B7280',
      },
      select: departmentSelectFields,
    })

    await auditService.logCreate(EntityType.DEPARTMENT, created.id, userId, created as Record<string, unknown>, tx)

    return created
  })

  logger.info('Department created', { departmentId: department.id, name: department.name, userId })
  return department
}

/**
 * Updates an existing department
 */
async function updateDepartment(id: string, data: UpdateDepartmentInput, userId: string) {
  const existing = await prisma.department.findFirst({
    where: { id, isDeleted: false },
    select: departmentSelectFields,
  })
  if (!existing) return null

  // Check name uniqueness if changing name
  if (data.name && data.name !== existing.name) {
    const nameConflict = await prisma.department.findFirst({
      where: { name: data.name, isDeleted: false, id: { not: id } },
      select: { id: true },
    })
    if (nameConflict) {
      throw new Error(`Un reparto con nome "${data.name}" esiste già`)
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.department.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      select: departmentSelectFields,
    })

    await auditService.logUpdate(EntityType.DEPARTMENT, id, userId, existing as Record<string, unknown>, result as Record<string, unknown>, tx)

    return result
  })

  logger.info('Department updated', { departmentId: id, userId })
  return updated
}

/**
 * Soft-deletes a department.
 * Tasks that reference this department retain the FK until manually cleared.
 */
async function deleteDepartment(id: string, userId: string): Promise<boolean> {
  const existing = await prisma.department.findFirst({
    where: { id, isDeleted: false },
    select: departmentSelectFields,
  })
  if (!existing) return false

  await prisma.$transaction(async (tx) => {
    await tx.department.update({
      where: { id },
      data: { isDeleted: true, isActive: false },
    })

    await auditService.logDelete(EntityType.DEPARTMENT, id, userId, existing as Record<string, unknown>, tx)
  })

  logger.info('Department soft-deleted', { departmentId: id, userId })
  return true
}

export const departmentService = {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
}
