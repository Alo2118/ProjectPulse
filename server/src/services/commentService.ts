/**
 * Comment Service - Business logic for task comments
 * @module services/commentService
 */

import { Prisma } from '@prisma/client'
import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import { auditService } from './auditService.js'
import { notificationService } from './notificationService.js'
import { evaluateRules } from './automation/index.js'
import { parseMentionedUserIds } from '../utils/mentions.js'
import { getIO } from '../socket/socketManager.js'
import {
  emitCommentCreated,
  emitCommentUpdated,
  emitCommentDeleted,
} from '../socket/index.js'
import {
  CreateCommentInput,
  UpdateCommentInput,
  PaginationParams,
  PaginatedResponse,
  EntityType,
} from '../types/index.js'

const commentSelectFields = {
  id: true,
  content: true,
  isInternal: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
  taskId: true,
  userId: true,
  parentId: true,
}

const commentWithRelationsSelect = {
  ...commentSelectFields,
  user: {
    select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, role: true },
  },
  task: {
    select: {
      id: true,
      code: true,
      title: true,
      assigneeId: true,
      project: {
        select: { id: true, code: true, name: true, ownerId: true },
      },
    },
  },
}

/** Select shape for threaded root comments (includes replies nested 1 level) */
const rootCommentThreadedSelect = {
  id: true,
  content: true,
  isInternal: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
  taskId: true,
  userId: true,
  parentId: true,
  user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  replies: {
    where: { isDeleted: false },
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      content: true,
      isInternal: true,
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
      taskId: true,
      userId: true,
      parentId: true,
      user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
  },
}

/**
 * Creates a new comment on a task
 * @param data - Comment data
 * @param userId - User creating the comment
 * @returns Created comment
 */
export async function createComment(data: CreateCommentInput, userId: string) {
  // Verify task exists
  const task = await prisma.task.findFirst({
    where: { id: data.taskId, isDeleted: false },
    select: {
      id: true,
      code: true,
      title: true,
      assigneeId: true,
      project: {
        select: { id: true, ownerId: true },
      },
    },
  })

  if (!task) {
    throw new Error('Task not found')
  }

  // Create comment + audit in a transaction (notifications handled separately for Socket.io)
  const comment = await prisma.$transaction(async (tx) => {
    const newComment = await tx.comment.create({
      data: {
        taskId: data.taskId,
        userId,
        content: data.content,
        isInternal: data.isInternal || false,
        ...(data.parentId ? { parentId: data.parentId } : {}),
      },
      select: commentWithRelationsSelect,
    })

    await auditService.logCreate(EntityType.COMMENT, newComment.id, userId, { content: data.content }, tx)

    return newComment
  })

  // Send notifications outside the transaction so Socket.io emission works correctly
  try {
    // Determine recipients: assignee and project owner get 'new_comment'
    const notifyNewComment = new Set<string>()
    const notifyMention = new Set<string>()

    if (task.assigneeId && task.assigneeId !== userId) {
      notifyNewComment.add(task.assigneeId)
    }
    if (data.isInternal && task.project?.ownerId && task.project.ownerId !== userId) {
      notifyNewComment.add(task.project.ownerId)
    }

    // @mentioned users get the dedicated 'mention' type (takes priority over generic comment)
    const mentionedIds = await parseMentionedUserIds(data.content, userId)
    for (const mid of mentionedIds) {
      notifyMention.add(mid)
      notifyNewComment.delete(mid)
    }

    const truncated = data.content.substring(0, 100) + (data.content.length > 100 ? '...' : '')
    const notifData = { taskId: task.id, taskCode: task.code, commentId: comment.id }

    // Generic comment notifications
    for (const notifyUserId of notifyNewComment) {
      await notificationService.createNotification({
        userId: notifyUserId,
        type: 'new_comment',
        title: 'Nuovo Commento',
        message: `Nuovo commento su ${task.code}: ${truncated}`,
        data: notifData,
      })
    }

    // Mention notifications: include commenter name for context
    if (notifyMention.size > 0) {
      const commenter = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      })
      const commenterName = commenter ? `${commenter.firstName} ${commenter.lastName}` : 'Qualcuno'

      for (const mentionedId of notifyMention) {
        await notificationService.createNotification({
          userId: mentionedId,
          type: 'mention',
          title: 'Sei stato menzionato',
          message: `${commenterName} ti ha menzionato in ${task.code}: ${truncated}`,
          data: notifData,
        })
      }
    }
  } catch (notifError) {
    logger.error('Failed to send comment notifications', { error: notifError, taskId: data.taskId })
  }

  logger.info(`Comment created on task ${task.code}`, { commentId: comment.id, taskId: data.taskId, userId })

  // Emit real-time event to everyone viewing the task (fire-and-forget)
  const ioCreate = getIO()
  if (ioCreate) {
    emitCommentCreated(ioCreate, { comment, taskId: data.taskId })
  }

  // Fire task_commented automation trigger
  if (task.project) {
    const mentionedIds = await parseMentionedUserIds(data.content, userId)
    evaluateRules({
      type: 'task_commented',
      domain: 'task',
      entityId: data.taskId,
      projectId: task.project.id,
      userId,
      data: {
        commentId: comment.id,
        ...(mentionedIds.length > 0 ? { mentionedUserIds: mentionedIds } : {}),
      },
    }).catch(err => logger.error('Automation task_commented failed', { error: err }))
  }

  return comment
}

/**
 * Gets comments for a task with pagination
 * @param taskId - Task ID
 * @param params - Pagination params
 * @param userRole - User role for filtering internal comments
 * @returns Paginated comments
 */
export async function getTaskComments(
  taskId: string,
  params: PaginationParams,
  userRole: string
): Promise<PaginatedResponse<unknown>> {
  const { page = 1, limit = 50 } = params

  const where: Prisma.CommentWhereInput = {
    taskId,
    isDeleted: false,
    parentId: null, // Only root comments; replies are nested inside each root
  }

  // Non-direzione/admin users cannot see internal comments
  if (userRole === 'dipendente') {
    where.isInternal = false
  }

  const skip = (page - 1) * limit

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      select: rootCommentThreadedSelect,
      skip,
      take: limit,
      orderBy: { createdAt: 'asc' },
    }),
    prisma.comment.count({ where }),
  ])

  return {
    data: comments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}

/**
 * Gets a single comment by ID
 * @param commentId - Comment ID
 * @returns Comment or null
 */
export async function getCommentById(commentId: string) {
  return prisma.comment.findFirst({
    where: { id: commentId, isDeleted: false },
    select: commentWithRelationsSelect,
  })
}

/**
 * Updates a comment
 * @param commentId - Comment ID
 * @param data - Update data
 * @param userId - User making update
 * @returns Updated comment or null
 */
export async function updateComment(commentId: string, data: UpdateCommentInput, userId: string) {
  // Users can only edit their own comments
  const existing = await prisma.comment.findFirst({
    where: { id: commentId, userId, isDeleted: false },
  })

  if (!existing) {
    return null
  }

  const comment = await prisma.$transaction(async (tx) => {
    const updated = await tx.comment.update({
      where: { id: commentId },
      data: {
        content: data.content,
        isInternal: data.isInternal,
        updatedAt: new Date(),
      },
      select: commentWithRelationsSelect,
    })

    await auditService.logUpdate(
      EntityType.COMMENT,
      commentId,
      userId,
      { content: existing.content },
      { content: data.content },
      tx
    )

    return updated
  })

  logger.info(`Comment updated`, { commentId, userId })

  // Emit real-time event to everyone viewing the task
  const ioUpdate = getIO()
  if (ioUpdate) {
    emitCommentUpdated(ioUpdate, { comment, taskId: comment.taskId })
  }

  return comment
}

/**
 * Soft deletes a comment (Rule 11)
 * @param commentId - Comment ID
 * @param userId - User deleting
 * @param userRole - User role (admin can delete any)
 * @returns True if deleted
 */
export async function deleteComment(commentId: string, userId: string, userRole: string): Promise<boolean> {
  const where: Prisma.CommentWhereInput = {
    id: commentId,
    isDeleted: false,
  }

  // Non-admin users can only delete their own comments
  if (userRole !== 'admin') {
    where.userId = userId
  }

  const existing = await prisma.comment.findFirst({ where })

  if (!existing) {
    return false
  }

  await prisma.$transaction(async (tx) => {
    await tx.comment.update({
      where: { id: commentId },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    })

    await auditService.logDelete(EntityType.COMMENT, commentId, userId, { content: existing.content }, tx)
  })

  logger.info(`Comment soft deleted`, { commentId, userId })

  // Emit real-time deletion event to everyone viewing the task
  const ioDelete = getIO()
  if (ioDelete) {
    emitCommentDeleted(ioDelete, { commentId, taskId: existing.taskId })
  }

  return true
}

/**
 * Gets recent comments across all tasks for a user
 * @param userId - User ID
 * @param limit - Number of comments to return
 * @returns Recent comments
 */
export async function getRecentComments(userId: string, limit: number = 20) {
  // Get tasks the user is assigned to or owns projects for
  const userTasks = await prisma.task.findMany({
    where: {
      OR: [
        { assigneeId: userId },
        { project: { ownerId: userId } },
        { createdById: userId },
      ],
      isDeleted: false,
    },
    select: { id: true },
  })

  const taskIds = userTasks.map((t) => t.id)

  return prisma.comment.findMany({
    where: {
      taskId: { in: taskIds },
      isDeleted: false,
      userId: { not: userId }, // Exclude own comments
    },
    select: commentWithRelationsSelect,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export const commentService = {
  createComment,
  getTaskComments,
  getCommentById,
  updateComment,
  deleteComment,
  getRecentComments,
}
