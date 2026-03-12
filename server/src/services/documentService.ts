/**
 * Document Service - Business logic for document management (ISO 13485)
 * @module services/documentService
 */

import { Prisma } from '@prisma/client'
import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import { auditService } from './auditService.js'
import { notificationService } from './notificationService.js'
import { evaluateRules } from './automation/index.js'
import { documentWithRelationsSelect } from '../utils/selectFields.js'
import { buildPagination } from '../utils/paginate.js'
import { generateDocumentCode } from '../utils/codeGenerator.js'
import { EntityType, PaginatedResponse, PaginationParams, DocumentType, DocumentStatus } from '../types/index.js'
import { AppError } from '../middleware/errorMiddleware.js'

// ============================================================
// TYPES
// ============================================================

export interface CreateDocumentInput {
  projectId: string
  title: string
  description?: string
  type?: DocumentType
}

export interface UpdateDocumentInput {
  title?: string
  description?: string
  type?: DocumentType
}

export interface DocumentQueryParams extends PaginationParams {
  projectId?: string
  type?: string
  status?: string
  search?: string
}


// ============================================================
// UTILITY FUNCTIONS
// ============================================================

// ============================================================
// CRUD OPERATIONS
// ============================================================

/**
 * Creates a new document with audit logging
 */
export async function createDocument(
  data: CreateDocumentInput,
  userId: string,
  file?: { path: string; size: number; mimetype: string }
) {
  const project = await prisma.project.findFirst({
    where: { id: data.projectId, isDeleted: false },
    select: { id: true, code: true, ownerId: true },
  })

  if (!project) {
    throw new AppError('Project not found', 404)
  }

  const code = await generateDocumentCode()

  const document = await prisma.$transaction(async (tx) => {
    const newDoc = await tx.document.create({
      data: {
        code,
        title: data.title,
        description: data.description,
        projectId: data.projectId,
        type: data.type || 'design_input',
        filePath: file?.path || null,
        fileSize: file?.size || null,
        mimeType: file?.mimetype || null,
        createdById: userId,
      },
      select: documentWithRelationsSelect,
    })

    await auditService.logCreate(EntityType.DOCUMENT, newDoc.id, userId, { ...newDoc }, tx)

    return newDoc
  })

  logger.info(`Document created: ${document.code}`, { documentId: document.id, projectId: data.projectId, userId })

  // Fire document_created automation trigger
  evaluateRules({
    type: 'document_created',
    domain: 'document',
    entityId: document.id,
    projectId: data.projectId,
    userId,
    data: { documentType: document.type },
  }).catch(err => logger.error('Automation document_created failed', { error: err }))

  return document
}

/**
 * Retrieves documents with pagination and filters
 */
export async function getDocuments(
  params: DocumentQueryParams
): Promise<PaginatedResponse<Prisma.DocumentGetPayload<{ select: typeof documentWithRelationsSelect }>>> {
  const { page = 1, limit = 20, projectId, type, status, search } = params

  const where: Prisma.DocumentWhereInput = {
    isDeleted: false,
  }

  if (projectId) where.projectId = projectId
  if (type) where.type = type as DocumentType
  if (status) where.status = status as DocumentStatus
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { code: { contains: search } },
      { description: { contains: search } },
    ]
  }

  const skip = (page - 1) * limit

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      select: documentWithRelationsSelect,
      skip,
      take: limit,
      orderBy: [{ createdAt: 'desc' }],
    }),
    prisma.document.count({ where }),
  ])

  return {
    data: documents,
    pagination: buildPagination(page, limit, total),
  }
}

/**
 * Gets documents for a specific project
 */
export async function getProjectDocuments(projectId: string) {
  return prisma.document.findMany({
    where: { projectId, isDeleted: false },
    select: documentWithRelationsSelect,
    orderBy: [{ createdAt: 'desc' }],
  })
}

/**
 * Retrieves a single document by ID
 */
export async function getDocumentById(documentId: string) {
  return prisma.document.findFirst({
    where: { id: documentId, isDeleted: false },
    select: documentWithRelationsSelect,
  })
}

/**
 * Updates a document with audit logging
 */
export async function updateDocument(documentId: string, data: UpdateDocumentInput, userId: string) {
  const existing = await prisma.document.findFirst({
    where: { id: documentId, isDeleted: false },
  })

  if (!existing) {
    return null
  }

  const document = await prisma.$transaction(async (tx) => {
    const updated = await tx.document.update({
      where: { id: documentId },
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        updatedAt: new Date(),
      },
      select: documentWithRelationsSelect,
    })

    await auditService.logUpdate(EntityType.DOCUMENT, documentId, userId, { ...existing }, { ...updated }, tx)

    return updated
  })

  logger.info(`Document updated: ${document.code}`, { documentId, userId })

  return document
}

/**
 * Updates document file (new version upload)
 */
export async function updateDocumentFile(
  documentId: string,
  userId: string,
  file: { path: string; size: number; mimetype: string }
) {
  const existing = await prisma.document.findFirst({
    where: { id: documentId, isDeleted: false },
  })

  if (!existing) {
    return null
  }

  const document = await prisma.$transaction(async (tx) => {
    // Create version snapshot of current file before overwriting
    if (existing.filePath) {
      await tx.documentVersion.create({
        data: {
          documentId,
          version: existing.version,
          filePath: existing.filePath,
          fileSize: existing.fileSize ?? 0,
          mimeType: existing.mimeType ?? 'application/octet-stream',
          uploadedById: userId,
        },
      })
    }

    const updated = await tx.document.update({
      where: { id: documentId },
      data: {
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        version: existing.version + 1,
        status: 'draft',
        approvedById: null,
        approvedAt: null,
        updatedAt: new Date(),
      },
      select: documentWithRelationsSelect,
    })

    await auditService.logUpdate(
      EntityType.DOCUMENT,
      documentId,
      userId,
      { version: existing.version, filePath: existing.filePath },
      { version: updated.version, filePath: updated.filePath },
      tx
    )

    return updated
  })

  logger.info(`Document file updated: ${document.code} v${document.version}`, { documentId, userId })

  return document
}

/**
 * Changes document status with workflow validation
 * Draft -> Review -> Approved -> Obsolete
 */
export async function changeDocumentStatus(
  documentId: string,
  newStatus: DocumentStatus,
  userId: string
) {
  const existing = await prisma.document.findFirst({
    where: { id: documentId, isDeleted: false },
  })

  if (!existing) {
    return null
  }

  // Validate status transitions
  const validTransitions: Record<string, string[]> = {
    draft: ['review'],
    review: ['draft', 'approved'],
    approved: ['obsolete', 'review'],
    obsolete: [],
  }

  const currentStatus = existing.status
  if (!validTransitions[currentStatus]?.includes(newStatus)) {
    throw new AppError(`Invalid status transition from ${currentStatus} to ${newStatus}`, 400)
  }

  const document = await prisma.$transaction(async (tx) => {
    const updateData: Prisma.DocumentUpdateInput = {
      status: newStatus,
      updatedAt: new Date(),
    }

    // Set approval info when approving
    if (newStatus === 'approved') {
      updateData.approvedBy = { connect: { id: userId } }
      updateData.approvedAt = new Date()
    }

    // Clear approval when moving back to draft/review
    if (newStatus === 'draft' || newStatus === 'review') {
      updateData.approvedBy = { disconnect: true }
      updateData.approvedAt = null
    }

    const updated = await tx.document.update({
      where: { id: documentId },
      data: updateData,
      select: documentWithRelationsSelect,
    })

    await auditService.logStatusChange(EntityType.DOCUMENT, documentId, userId, currentStatus, newStatus, tx)

    // Notify project owner on approval
    if (newStatus === 'approved') {
      const project = await tx.project.findUnique({
        where: { id: existing.projectId },
        select: { ownerId: true },
      })
      if (project && project.ownerId !== userId) {
        await notificationService.createNotification(
          {
            userId: project.ownerId,
            type: 'document_approved',
            title: 'Documento Approvato',
            message: `Il documento "${updated.title}" è stato approvato`,
            data: { documentId: updated.id, documentCode: updated.code },
          },
          tx
        )
      }

      // Auto-compute reviewDueDate when approved and reviewFrequencyDays is set
      // Cast needed: reviewFrequencyDays/reviewDueDate exist in schema but Prisma client may not be regenerated yet
      const existingRecord = existing as Record<string, unknown>
      if (existingRecord['reviewFrequencyDays']) {
        const reviewDueDate = new Date()
        reviewDueDate.setDate(reviewDueDate.getDate() + (existingRecord['reviewFrequencyDays'] as number))
        await tx.document.update({
          where: { id: documentId },
          data: { reviewDueDate } as Record<string, unknown>,
        })
      }
    }

    return updated
  })

  logger.info(`Document status changed: ${currentStatus} → ${newStatus}`, { documentId, userId })

  // Fire document_status_changed automation trigger
  evaluateRules({
    type: 'document_status_changed',
    domain: 'document',
    entityId: documentId,
    projectId: existing.projectId,
    userId,
    data: { oldStatus: currentStatus, newStatus },
  }).catch(err => logger.error('Automation document_status_changed failed', { error: err }))

  return document
}

/**
 * Soft deletes a document
 */
export async function deleteDocument(documentId: string, userId: string): Promise<boolean> {
  const existing = await prisma.document.findFirst({
    where: { id: documentId, isDeleted: false },
  })

  if (!existing) {
    return false
  }

  await prisma.$transaction(async (tx) => {
    await tx.document.update({
      where: { id: documentId },
      data: { isDeleted: true, updatedAt: new Date() },
    })

    await auditService.logDelete(EntityType.DOCUMENT, documentId, userId, { ...existing }, tx)
  })

  logger.info(`Document soft deleted: ${existing.code}`, { documentId, userId })

  return true
}

/**
 * Gets document statistics for a project
 */
export async function getProjectDocumentStats(projectId: string) {
  const [byStatus, byType, total] = await Promise.all([
    prisma.document.groupBy({
      by: ['status'],
      where: { projectId, isDeleted: false },
      _count: { id: true },
    }),
    prisma.document.groupBy({
      by: ['type'],
      where: { projectId, isDeleted: false },
      _count: { id: true },
    }),
    prisma.document.count({
      where: { projectId, isDeleted: false },
    }),
  ])

  const statusCounts = byStatus.reduce(
    (acc, item) => {
      acc[item.status] = item._count.id
      return acc
    },
    {} as Record<string, number>
  )

  const typeCounts = byType.reduce(
    (acc, item) => {
      acc[item.type] = item._count.id
      return acc
    },
    {} as Record<string, number>
  )

  return {
    total,
    byStatus: statusCounts,
    byType: typeCounts,
    approvedDocuments: statusCounts['approved'] || 0,
    draftDocuments: statusCounts['draft'] || 0,
  }
}

/**
 * Gets version history for a document
 */
export async function getDocumentVersions(documentId: string) {
  return prisma.documentVersion.findMany({
    where: { documentId },
    select: {
      id: true,
      version: true,
      filePath: true,
      fileSize: true,
      mimeType: true,
      note: true,
      createdAt: true,
      uploadedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { version: 'desc' },
  })
}

/**
 * Gets a specific document version by ID
 */
export async function getDocumentVersion(documentId: string, versionId: string) {
  return prisma.documentVersion.findFirst({
    where: { id: versionId, documentId },
  })
}

export const documentService = {
  createDocument,
  getDocuments,
  getProjectDocuments,
  getDocumentById,
  updateDocument,
  updateDocumentFile,
  changeDocumentStatus,
  deleteDocument,
  getProjectDocumentStats,
  getDocumentVersions,
  getDocumentVersion,
}
