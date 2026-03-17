/**
 * Document Controller - HTTP request handling for documents
 * @module controllers/documentController
 */

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { documentService } from '../services/documentService.js'
import { AppError } from '../middleware/errorMiddleware.js'
import { DocumentType, DocumentStatus } from '../types/index.js'
import {
  createDocumentSchema,
  updateDocumentSchema,
  documentQuerySchema,
  documentStatusChangeSchema,
} from '../schemas/documentSchemas.js'
import { sendSuccess, sendCreated, sendPaginated } from '../utils/responseHelpers.js'
import { requireUserId, requireResource } from '../utils/controllerHelpers.js'

// ============================================================
// CONTROLLER FUNCTIONS
// ============================================================

/**
 * Gets paginated list of documents
 * @route GET /api/documents
 */
export async function getDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = documentQuerySchema.parse(req.query)

    const result = await documentService.getDocuments({
      projectId: params.projectId,
      type: params.type as DocumentType,
      status: params.status as DocumentStatus,
      search: params.search,
      page: params.page,
      limit: params.limit,
      userId: req.user?.userId,
      role: req.user?.role,
    })

    sendPaginated(res, result)
  } catch (error) {
    next(error)
  }
}

/**
 * Gets documents for a specific project
 * @route GET /api/documents/project/:projectId
 */
export async function getProjectDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params
    const documents = await documentService.getProjectDocuments(projectId)
    sendSuccess(res, documents)
  } catch (error) {
    next(error)
  }
}

/**
 * Gets a single document by ID
 * @route GET /api/documents/:id
 */
export async function getDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const document = requireResource(await documentService.getDocumentById(id), 'Document')

    sendSuccess(res, document)
  } catch (error) {
    next(error)
  }
}

/**
 * Creates a new document (with optional file upload)
 * @route POST /api/documents
 */
export async function createDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createDocumentSchema.parse(req.body)
    const userId = requireUserId(req)

    const file = req.file
      ? {
          path: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype,
        }
      : undefined

    const document = await documentService.createDocument(
      {
        projectId: data.projectId,
        title: data.title,
        description: data.description ?? undefined,
        type: data.type as DocumentType,
      },
      userId,
      file
    )

    sendCreated(res, document)
  } catch (error) {
    if (error instanceof Error && error.message === 'Project not found') {
      next(new AppError('Project not found', 404))
    } else {
      next(error)
    }
  }
}

/**
 * Updates a document
 * @route PUT /api/documents/:id
 */
export async function updateDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const data = updateDocumentSchema.parse(req.body)
    const userId = requireUserId(req)

    const document = await documentService.updateDocument(
      id,
      {
        title: data.title,
        description: data.description ?? undefined,
        type: data.type as DocumentType | undefined,
      },
      userId
    )

    requireResource(document, 'Document')

    sendSuccess(res, document)
  } catch (error) {
    next(error)
  }
}

/**
 * Uploads/replaces document file (creates new version)
 * @route POST /api/documents/:id/upload
 */
export async function uploadDocumentFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const userId = requireUserId(req)

    if (!req.file) {
      throw new AppError('No file uploaded', 400)
    }

    const document = requireResource(await documentService.updateDocumentFile(id, userId, {
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
    }), 'Document')

    sendSuccess(res, document)
  } catch (error) {
    next(error)
  }
}

/**
 * Changes document status (approval workflow)
 * @route PATCH /api/documents/:id/status
 */
export async function changeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const { status } = documentStatusChangeSchema.parse(req.body)
    const userId = requireUserId(req)

    const document = requireResource(await documentService.changeDocumentStatus(id, status as DocumentStatus, userId), 'Document')

    sendSuccess(res, document)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid status transition')) {
      next(new AppError(error.message, 400))
    } else {
      next(error)
    }
  }
}

/**
 * Soft deletes a document
 * @route DELETE /api/documents/:id
 */
export async function deleteDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const userId = requireUserId(req)

    requireResource(await documentService.deleteDocument(id, userId), 'Document')

    sendSuccess(res, { message: 'Document deleted successfully' })
  } catch (error) {
    next(error)
  }
}

/**
 * Gets document statistics for a project
 * @route GET /api/documents/project/:projectId/stats
 */
export async function getProjectDocumentStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params
    const stats = await documentService.getProjectDocumentStats(projectId)
    sendSuccess(res, stats)
  } catch (error) {
    next(error)
  }
}

/**
 * Downloads a document file
 * @route GET /api/documents/:id/download
 */
export async function downloadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const document = requireResource(await documentService.getDocumentById(id), 'Document')

    if (!document.filePath) {
      throw new AppError('No file attached to this document', 404)
    }

    res.download(document.filePath, `${document.code}-${document.title}`)
  } catch (error) {
    next(error)
  }
}

/**
 * Gets version history for a document
 * @route GET /api/documents/:id/versions
 */
export async function getVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireUserId(req)
    const { id } = req.params

    // Ensure document exists
    requireResource(await documentService.getDocumentById(id), 'Document')

    const versions = await documentService.getDocumentVersions(id)
    sendSuccess(res, versions)
  } catch (error) {
    next(error)
  }
}

/**
 * Downloads a specific version of a document
 * @route GET /api/documents/:id/versions/:versionId/download
 */
export async function downloadVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireUserId(req)
    const { id, versionId } = z.object({
      id: z.string().uuid(),
      versionId: z.string().uuid(),
    }).parse(req.params)

    const version = await documentService.getDocumentVersion(id, versionId)

    if (!version) {
      throw new AppError('Version not found', 404)
    }

    res.download(version.filePath, `v${version.version}-${version.filePath.split(/[\\/]/).pop()}`)
  } catch (error) {
    next(error)
  }
}
