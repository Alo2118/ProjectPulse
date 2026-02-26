/**
 * Note Service - Business logic for polymorphic notes
 * Notes can be attached to: projects, tasks, time_entries
 * @module services/noteService
 */

import { Prisma } from '@prisma/client'
import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import { auditService } from './auditService.js'
import { notificationService } from './notificationService.js'
import { parseMentionedUserIds } from '../utils/mentions.js'
import {
  CreateNoteInput,
  UpdateNoteInput,
  NoteQueryParams,
  PaginatedResponse,
  EntityType,
  NoteableEntityType,
} from '../types/index.js'

const noteSelectFields = {
  id: true,
  content: true,
  entityType: true,
  entityId: true,
  isInternal: true,
  isDeleted: true,
  parentId: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
}

const noteWithRelationsSelect = {
  ...noteSelectFields,
  user: {
    select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, role: true },
  },
  replies: {
    where: { isDeleted: false },
    select: {
      id: true,
      content: true,
      createdAt: true,
      userId: true,
      user: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
}

/**
 * Verifies that an entity exists and is not deleted
 * @param entityType - Type of entity
 * @param entityId - Entity ID
 * @returns True if entity exists
 */
async function verifyEntityExists(entityType: NoteableEntityType, entityId: string): Promise<boolean> {
  switch (entityType) {
    case 'project':
      return !!(await prisma.project.findFirst({ where: { id: entityId, isDeleted: false } }))
    case 'task':
      return !!(await prisma.task.findFirst({ where: { id: entityId, isDeleted: false } }))
    case 'time_entry':
      return !!(await prisma.timeEntry.findFirst({ where: { id: entityId, isDeleted: false } }))
    default:
      return false
  }
}

/**
 * Creates a new note on an entity
 * @param data - Note data
 * @param userId - User creating the note
 * @returns Created note
 */
export async function createNote(data: CreateNoteInput, userId: string) {
  // Verify entity exists
  const entityExists = await verifyEntityExists(data.entityType, data.entityId)
  if (!entityExists) {
    throw new Error(`${data.entityType} not found`)
  }

  // Verify parent note exists if provided
  if (data.parentId) {
    const parentNote = await prisma.note.findFirst({
      where: { id: data.parentId, isDeleted: false },
    })
    if (!parentNote) {
      throw new Error('Parent note not found')
    }
  }

  const note = await prisma.$transaction(async (tx) => {
    const newNote = await tx.note.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        userId,
        content: data.content,
        isInternal: data.isInternal || false,
        parentId: data.parentId,
      },
      select: noteWithRelationsSelect,
    })

    await auditService.logCreate(
      EntityType.NOTE,
      newNote.id,
      userId,
      { content: data.content, entityType: data.entityType, entityId: data.entityId },
      tx
    )

    return newNote
  })

  logger.info(`Note created on ${data.entityType}`, {
    noteId: note.id,
    entityType: data.entityType,
    entityId: data.entityId,
    userId,
  })

  // Send @mention notifications (outside transaction so Socket.io works)
  try {
    const mentionedIds = await parseMentionedUserIds(data.content, userId)
    if (mentionedIds.length > 0) {
      const [author, entityLabel] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true },
        }),
        resolveEntityLabel(data.entityType, data.entityId),
      ])
      const authorName = author ? `${author.firstName} ${author.lastName}` : 'Qualcuno'
      const truncated = data.content.substring(0, 100) + (data.content.length > 100 ? '...' : '')
      const notifData = { noteId: note.id, entityType: data.entityType, entityId: data.entityId }

      for (const mentionedId of mentionedIds) {
        await notificationService.createNotification({
          userId: mentionedId,
          type: 'note_mention',
          title: 'Sei stato menzionato in una nota',
          message: `${authorName} ti ha menzionato in una nota su ${entityLabel}: ${truncated}`,
          data: notifData,
        })
      }
    }
  } catch (err) {
    logger.error('Failed to send note mention notifications', { error: err, noteId: note.id })
  }

  return note
}

/**
 * Resolves a human-readable label for the entity (used in mention notifications)
 */
async function resolveEntityLabel(entityType: NoteableEntityType, entityId: string): Promise<string> {
  try {
    if (entityType === 'task') {
      const task = await prisma.task.findUnique({ where: { id: entityId }, select: { code: true, title: true } })
      return task ? `${task.code} – ${task.title}` : 'un task'
    }
    if (entityType === 'project') {
      const project = await prisma.project.findUnique({ where: { id: entityId }, select: { code: true, name: true } })
      return project ? `${project.code} – ${project.name}` : 'un progetto'
    }
    return 'una voce di tempo'
  } catch {
    return 'un elemento'
  }
}

/**
 * Gets notes for an entity with pagination
 * @param params - Query params including entityType and entityId
 * @param userRole - User role for filtering internal notes
 * @returns Paginated notes
 */
export async function getEntityNotes(
  params: NoteQueryParams,
  userRole: string
): Promise<PaginatedResponse<unknown>> {
  const { entityType, entityId, page = 1, limit = 50 } = params

  const where: Prisma.NoteWhereInput = {
    entityType,
    entityId,
    isDeleted: false,
    parentId: null, // Only top-level notes, replies are included via relation
  }

  // Non-direzione/admin users cannot see internal notes
  if (userRole === 'dipendente') {
    where.isInternal = false
  }

  const skip = (page - 1) * limit

  const [notes, total] = await Promise.all([
    prisma.note.findMany({
      where,
      select: noteWithRelationsSelect,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.note.count({ where }),
  ])

  return {
    data: notes,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}

/**
 * Gets a single note by ID
 * @param noteId - Note ID
 * @returns Note or null
 */
export async function getNoteById(noteId: string) {
  return prisma.note.findFirst({
    where: { id: noteId, isDeleted: false },
    select: noteWithRelationsSelect,
  })
}

/**
 * Updates a note
 * @param noteId - Note ID
 * @param data - Update data
 * @param userId - User making update
 * @returns Updated note or null
 */
export async function updateNote(noteId: string, data: UpdateNoteInput, userId: string) {
  // Users can only edit their own notes
  const existing = await prisma.note.findFirst({
    where: { id: noteId, userId, isDeleted: false },
  })

  if (!existing) {
    return null
  }

  const note = await prisma.$transaction(async (tx) => {
    const updated = await tx.note.update({
      where: { id: noteId },
      data: {
        content: data.content,
        isInternal: data.isInternal,
        updatedAt: new Date(),
      },
      select: noteWithRelationsSelect,
    })

    await auditService.logUpdate(
      EntityType.NOTE,
      noteId,
      userId,
      { content: existing.content },
      { content: data.content },
      tx
    )

    return updated
  })

  logger.info(`Note updated`, { noteId, userId })

  return note
}

/**
 * Soft deletes a note (Rule 11)
 * @param noteId - Note ID
 * @param userId - User deleting
 * @param userRole - User role (admin can delete any)
 * @returns True if deleted
 */
export async function deleteNote(noteId: string, userId: string, userRole: string): Promise<boolean> {
  const where: Prisma.NoteWhereInput = {
    id: noteId,
    isDeleted: false,
  }

  // Non-admin users can only delete their own notes
  if (userRole !== 'admin') {
    where.userId = userId
  }

  const existing = await prisma.note.findFirst({ where })

  if (!existing) {
    return false
  }

  await prisma.$transaction(async (tx) => {
    // Soft delete the note
    await tx.note.update({
      where: { id: noteId },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    })

    // Also soft delete any replies
    await tx.note.updateMany({
      where: { parentId: noteId },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    })

    await auditService.logDelete(EntityType.NOTE, noteId, userId, { content: existing.content }, tx)
  })

  logger.info(`Note soft deleted`, { noteId, userId })

  return true
}

/**
 * Gets note count for an entity
 * @param entityType - Entity type
 * @param entityId - Entity ID
 * @returns Note count
 */
export async function getNoteCount(entityType: NoteableEntityType, entityId: string): Promise<number> {
  return prisma.note.count({
    where: {
      entityType,
      entityId,
      isDeleted: false,
      parentId: null, // Only count top-level notes
    },
  })
}

export const noteService = {
  createNote,
  getEntityNotes,
  getNoteById,
  updateNote,
  deleteNote,
  getNoteCount,
}
