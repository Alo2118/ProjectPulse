/**
 * Attachment Service - Business logic for polymorphic attachments
 * Attachments can be attached to: projects, tasks, time_entries
 * @module services/attachmentService
 */

import { Prisma } from '@prisma/client'
import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import { auditService } from './auditService.js'
import {
  CreateAttachmentInput,
  AttachmentQueryParams,
  PaginatedResponse,
  EntityType,
  AttachableEntityType,
  DocumentType,
} from '../types/index.js'

// Document code generator (same as documentService)
async function generateDocumentCode(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `DOC-${year}-`

  const lastDoc = await prisma.document.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
    select: { code: true },
  })

  let nextNumber = 1
  if (lastDoc?.code) {
    const parts = lastDoc.code.split('-')
    if (parts.length === 3) {
      nextNumber = parseInt(parts[2], 10) + 1
    }
  }

  return `${prefix}${String(nextNumber).padStart(3, '0')}`
}

const attachmentSelectFields = {
  id: true,
  entityType: true,
  entityId: true,
  fileName: true,
  filePath: true,
  fileSize: true,
  mimeType: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
  uploadedById: true,
}

const attachmentWithRelationsSelect = {
  ...attachmentSelectFields,
  uploadedBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
}

/**
 * Verifies that an entity exists and is not deleted
 * @param entityType - Type of entity
 * @param entityId - Entity ID
 * @returns True if entity exists
 */
async function verifyEntityExists(entityType: AttachableEntityType, entityId: string): Promise<boolean> {
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
 * Creates a new attachment on an entity
 * @param data - Attachment data
 * @param userId - User uploading the attachment
 * @returns Created attachment
 */
export async function createAttachment(data: CreateAttachmentInput, userId: string) {
  // Verify entity exists
  const entityExists = await verifyEntityExists(data.entityType, data.entityId)
  if (!entityExists) {
    throw new Error(`${data.entityType} not found`)
  }

  const attachment = await prisma.$transaction(async (tx) => {
    const newAttachment = await tx.attachment.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        fileName: data.fileName,
        filePath: data.filePath,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        uploadedById: userId,
      },
      select: attachmentWithRelationsSelect,
    })

    await auditService.logCreate(
      EntityType.ATTACHMENT,
      newAttachment.id,
      userId,
      {
        fileName: data.fileName,
        entityType: data.entityType,
        entityId: data.entityId,
        fileSize: data.fileSize,
      },
      tx
    )

    return newAttachment
  })

  logger.info(`Attachment created on ${data.entityType}`, {
    attachmentId: attachment.id,
    fileName: data.fileName,
    entityType: data.entityType,
    entityId: data.entityId,
    userId,
  })

  return attachment
}

/**
 * Gets attachments for an entity with pagination
 * @param params - Query params including entityType and entityId
 * @returns Paginated attachments
 */
export async function getEntityAttachments(
  params: AttachmentQueryParams
): Promise<PaginatedResponse<unknown>> {
  const { entityType, entityId, page = 1, limit = 50 } = params

  const where: Prisma.AttachmentWhereInput = {
    entityType,
    entityId,
    isDeleted: false,
  }

  const skip = (page - 1) * limit

  const [attachments, total] = await Promise.all([
    prisma.attachment.findMany({
      where,
      select: attachmentWithRelationsSelect,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.attachment.count({ where }),
  ])

  return {
    data: attachments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}

/**
 * Gets a single attachment by ID
 * @param attachmentId - Attachment ID
 * @returns Attachment or null
 */
export async function getAttachmentById(attachmentId: string) {
  return prisma.attachment.findFirst({
    where: { id: attachmentId, isDeleted: false },
    select: attachmentWithRelationsSelect,
  })
}

/**
 * Soft deletes an attachment (Rule 11)
 * @param attachmentId - Attachment ID
 * @param userId - User deleting
 * @param userRole - User role (admin can delete any)
 * @returns True if deleted
 */
export async function deleteAttachment(
  attachmentId: string,
  userId: string,
  userRole: string
): Promise<boolean> {
  const where: Prisma.AttachmentWhereInput = {
    id: attachmentId,
    isDeleted: false,
  }

  // Non-admin users can only delete their own attachments
  if (userRole !== 'admin') {
    where.uploadedById = userId
  }

  const existing = await prisma.attachment.findFirst({ where })

  if (!existing) {
    return false
  }

  await prisma.$transaction(async (tx) => {
    await tx.attachment.update({
      where: { id: attachmentId },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    })

    await auditService.logDelete(
      EntityType.ATTACHMENT,
      attachmentId,
      userId,
      { fileName: existing.fileName, filePath: existing.filePath },
      tx
    )
  })

  logger.info(`Attachment soft deleted`, { attachmentId, userId })

  return true
}

/**
 * Gets attachment count for an entity
 * @param entityType - Entity type
 * @param entityId - Entity ID
 * @returns Attachment count
 */
export async function getAttachmentCount(
  entityType: AttachableEntityType,
  entityId: string
): Promise<number> {
  return prisma.attachment.count({
    where: {
      entityType,
      entityId,
      isDeleted: false,
    },
  })
}

/**
 * Gets total file size for an entity's attachments
 * @param entityType - Entity type
 * @param entityId - Entity ID
 * @returns Total file size in bytes
 */
export async function getTotalFileSize(
  entityType: AttachableEntityType,
  entityId: string
): Promise<number> {
  const result = await prisma.attachment.aggregate({
    where: {
      entityType,
      entityId,
      isDeleted: false,
    },
    _sum: {
      fileSize: true,
    },
  })

  return result._sum.fileSize || 0
}

/**
 * Converts an attachment to a registered document
 * @param attachmentId - Attachment ID
 * @param userId - User performing the conversion
 * @param documentData - Additional document data (title, type, description)
 * @returns Created document
 */
export async function convertToDocument(
  attachmentId: string,
  userId: string,
  documentData: {
    title: string
    type?: DocumentType
    description?: string
  }
) {
  // Get the attachment
  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, isDeleted: false },
  })

  if (!attachment) {
    throw new Error('Attachment not found')
  }

  // Determine projectId based on entityType
  let projectId: string | null = null

  switch (attachment.entityType) {
    case 'project':
      projectId = attachment.entityId
      break
    case 'task': {
      const task = await prisma.task.findFirst({
        where: { id: attachment.entityId, isDeleted: false },
        select: { projectId: true },
      })
      if (!task?.projectId) {
        throw new Error('Task has no associated project')
      }
      projectId = task.projectId
      break
    }
    case 'time_entry': {
      const timeEntry = await prisma.timeEntry.findFirst({
        where: { id: attachment.entityId, isDeleted: false },
        select: { task: { select: { projectId: true } } },
      })
      if (!timeEntry?.task?.projectId) {
        throw new Error('Time entry has no associated project')
      }
      projectId = timeEntry.task.projectId
      break
    }
    default:
      throw new Error('Cannot determine project for this attachment type')
  }

  // Generate document code
  const code = await generateDocumentCode()

  // Create document in transaction
  const document = await prisma.$transaction(async (tx) => {
    const newDoc = await tx.document.create({
      data: {
        code,
        title: documentData.title,
        description: documentData.description || `Convertito da allegato: ${attachment.fileName}`,
        projectId,
        type: documentData.type || 'design_input',
        filePath: attachment.filePath,
        fileSize: attachment.fileSize,
        mimeType: attachment.mimeType,
        createdById: userId,
      },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        type: true,
        filePath: true,
        fileSize: true,
        mimeType: true,
        version: true,
        status: true,
        projectId: true,
        createdAt: true,
        project: {
          select: { id: true, code: true, name: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    })

    // Log audit for document creation
    await auditService.logCreate(
      EntityType.DOCUMENT,
      newDoc.id,
      userId,
      {
        code: newDoc.code,
        title: newDoc.title,
        convertedFromAttachment: attachmentId,
        originalFileName: attachment.fileName,
      },
      tx
    )

    return newDoc
  })

  logger.info(`Attachment converted to document`, {
    attachmentId,
    documentId: document.id,
    documentCode: document.code,
    userId,
  })

  return document
}

export const attachmentService = {
  createAttachment,
  getEntityAttachments,
  getAttachmentById,
  deleteAttachment,
  getAttachmentCount,
  getTotalFileSize,
  convertToDocument,
}
