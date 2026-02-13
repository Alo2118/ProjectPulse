/**
 * Tag Service - Business logic for tag management
 * Tags can be assigned to: tasks, documents
 * @module services/tagService
 */

import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import { auditService } from './auditService.js'
import {
  CreateTagInput,
  UpdateTagInput,
  TaggableEntityType,
  TagQueryParams,
  EntityType,
} from '../types/index.js'

const tagSelectFields = {
  id: true,
  name: true,
  color: true,
  createdById: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
}

const tagWithCreatorSelect = {
  ...tagSelectFields,
  createdBy: {
    select: { id: true, firstName: true, lastName: true },
  },
}

/**
 * Verifies that a taggable entity exists and is not deleted
 */
async function verifyEntityExists(entityType: TaggableEntityType, entityId: string): Promise<boolean> {
  switch (entityType) {
    case 'task': {
      const task = await prisma.task.findFirst({
        where: { id: entityId, isDeleted: false },
        select: { id: true },
      })
      return !!task
    }
    case 'document': {
      const doc = await prisma.document.findFirst({
        where: { id: entityId, isDeleted: false },
        select: { id: true },
      })
      return !!doc
    }
    default:
      return false
  }
}

/**
 * Gets all tags with optional search and pagination
 */
export async function getTags(params: TagQueryParams) {
  const { search, page = 1, limit = 50 } = params

  const where: { isDeleted: boolean; name?: { contains: string } } = {
    isDeleted: false,
  }

  if (search) {
    where.name = { contains: search }
  }

  const skip = (page - 1) * limit

  const [tags, total] = await Promise.all([
    prisma.tag.findMany({
      where,
      select: tagWithCreatorSelect,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
    }),
    prisma.tag.count({ where }),
  ])

  return {
    data: tags,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}

/**
 * Gets a single tag by ID
 */
export async function getTagById(tagId: string) {
  return prisma.tag.findFirst({
    where: { id: tagId, isDeleted: false },
    select: tagWithCreatorSelect,
  })
}

/**
 * Creates a new tag
 */
export async function createTag(data: CreateTagInput, userId: string) {
  const tag = await prisma.$transaction(async (tx) => {
    const newTag = await tx.tag.create({
      data: {
        name: data.name.trim(),
        color: data.color ?? '#6B7280',
        createdById: userId,
      },
      select: tagWithCreatorSelect,
    })

    await auditService.logCreate(EntityType.TAG, newTag.id, userId, { name: newTag.name, color: newTag.color }, tx)

    return newTag
  })

  logger.info(`Tag created: ${tag.name}`, { tagId: tag.id, userId })
  return tag
}

/**
 * Updates a tag (name and/or color)
 */
export async function updateTag(tagId: string, data: UpdateTagInput, userId: string) {
  const existing = await prisma.tag.findFirst({
    where: { id: tagId, isDeleted: false },
    select: tagSelectFields,
  })

  if (!existing) return null

  const tag = await prisma.$transaction(async (tx) => {
    const updated = await tx.tag.update({
      where: { id: tagId },
      data: {
        name: data.name?.trim(),
        color: data.color,
        updatedAt: new Date(),
      },
      select: tagWithCreatorSelect,
    })

    await auditService.logUpdate(EntityType.TAG, tagId, userId, { ...existing }, { ...updated }, tx)

    return updated
  })

  logger.info(`Tag updated: ${tag.name}`, { tagId, userId })
  return tag
}

/**
 * Soft deletes a tag and removes all its assignments
 */
export async function deleteTag(tagId: string, userId: string): Promise<boolean> {
  const existing = await prisma.tag.findFirst({
    where: { id: tagId, isDeleted: false },
    select: tagSelectFields,
  })

  if (!existing) return false

  await prisma.$transaction(async (tx) => {
    // Remove all assignments for this tag
    await tx.tagAssignment.deleteMany({
      where: { tagId },
    })

    // Soft delete the tag
    await tx.tag.update({
      where: { id: tagId },
      data: { isDeleted: true, updatedAt: new Date() },
    })

    await auditService.logDelete(EntityType.TAG, tagId, userId, { ...existing }, tx)
  })

  logger.info(`Tag soft deleted: ${existing.name}`, { tagId, userId })
  return true
}

/**
 * Assigns a tag to an entity (task or document)
 */
export async function assignTag(tagId: string, entityType: TaggableEntityType, entityId: string, userId: string) {
  // Verify tag exists
  const tag = await prisma.tag.findFirst({
    where: { id: tagId, isDeleted: false },
    select: { id: true, name: true },
  })
  if (!tag) throw new Error('Tag not found')

  // Verify entity exists
  const exists = await verifyEntityExists(entityType, entityId)
  if (!exists) throw new Error(`${entityType} not found`)

  // Create assignment (unique constraint will prevent duplicates)
  const assignment = await prisma.tagAssignment.create({
    data: {
      tagId,
      entityType,
      entityId,
    },
    select: {
      id: true,
      tagId: true,
      entityType: true,
      entityId: true,
      createdAt: true,
      tag: {
        select: { id: true, name: true, color: true },
      },
    },
  })

  logger.info(`Tag "${tag.name}" assigned to ${entityType} ${entityId}`, { userId })
  return assignment
}

/**
 * Removes a tag assignment from an entity
 */
export async function unassignTag(tagId: string, entityType: TaggableEntityType, entityId: string, userId: string): Promise<boolean> {
  const assignment = await prisma.tagAssignment.findFirst({
    where: { tagId, entityType, entityId },
    select: { id: true },
  })

  if (!assignment) return false

  await prisma.tagAssignment.delete({
    where: { id: assignment.id },
  })

  logger.info(`Tag unassigned from ${entityType} ${entityId}`, { tagId, userId })
  return true
}

/**
 * Gets all tags for a specific entity
 */
export async function getTagsByEntity(entityType: TaggableEntityType, entityId: string) {
  const assignments = await prisma.tagAssignment.findMany({
    where: { entityType, entityId },
    select: {
      id: true,
      createdAt: true,
      tag: {
        select: { id: true, name: true, color: true, isDeleted: true },
      },
    },
    orderBy: { tag: { name: 'asc' } },
  })

  // Filter out deleted tags
  return assignments
    .filter((a) => !a.tag.isDeleted)
    .map((a) => ({
      id: a.tag.id,
      name: a.tag.name,
      color: a.tag.color,
      assignedAt: a.createdAt,
    }))
}

/**
 * Finds or creates a tag by name, then assigns it to an entity
 */
export async function getOrCreateAndAssign(
  name: string,
  color: string | undefined,
  entityType: TaggableEntityType,
  entityId: string,
  userId: string
) {
  // Find existing tag by name
  let tag = await prisma.tag.findFirst({
    where: { name: name.trim(), isDeleted: false },
    select: { id: true, name: true, color: true },
  })

  // Create if not exists
  if (!tag) {
    tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        color: color ?? '#6B7280',
        createdById: userId,
      },
      select: { id: true, name: true, color: true },
    })
    logger.info(`Tag auto-created: ${tag.name}`, { tagId: tag.id, userId })
  }

  // Check if already assigned
  const existing = await prisma.tagAssignment.findFirst({
    where: { tagId: tag.id, entityType, entityId },
    select: { id: true },
  })

  if (existing) {
    return { tag, alreadyAssigned: true }
  }

  // Assign
  await prisma.tagAssignment.create({
    data: { tagId: tag.id, entityType, entityId },
  })

  logger.info(`Tag "${tag.name}" assigned to ${entityType} ${entityId}`, { userId })
  return { tag, alreadyAssigned: false }
}

export const tagService = {
  getTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
  assignTag,
  unassignTag,
  getTagsByEntity,
  getOrCreateAndAssign,
}
