/**
 * Document Controller - HTTP request handling for documents
 * @module controllers/documentController
 */

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { documentService } from '../services/documentService.js'
import { AppError } from '../middleware/errorMiddleware.js'
import { DocumentType, DocumentStatus } from '../types/index.js'

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const createDocumentSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().nullish(),
  type: z
    .enum(['design_input', 'design_output', 'verification_report', 'validation_report', 'change_control'])
    .default('design_input'),
})

const updateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullish(),
  type: z
    .enum(['design_input', 'design_output', 'verification_report', 'validation_report', 'change_control'])
    .optional(),
})

const querySchema = z.object({
  projectId: z.string().uuid().optional(),
  type: z
    .enum(['design_input', 'design_output', 'verification_report', 'validation_report', 'change_control'])
    .optional(),
  status: z.enum(['draft', 'review', 'approved', 'obsolete']).optional(),
  search: z.string().optional(),
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .default('1'),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .default('20'),
})

const statusChangeSchema = z.object({
  status: z.enum(['draft', 'review', 'approved', 'obsolete']),
})

// ============================================================
// CONTROLLER FUNCTIONS
// ============================================================

/**
 * Gets paginated list of documents
 * @route GET /api/documents
 */
export async function getDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = querySchema.parse(req.query)

    const result = await documentService.getDocuments({
      projectId: params.projectId,
      type: params.type as DocumentType,
      status: params.status as DocumentStatus,
      search: params.search,
      page: params.page,
      limit: params.limit,
    })

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    })
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
    res.json({ success: true, data: documents })
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
    const document = await documentService.getDocumentById(id)

    if (!document) {
      throw new AppError('Document not found', 404)
    }

    res.json({ success: true, data: document })
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
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

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

    res.status(201).json({ success: true, data: document })
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
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const document = await documentService.updateDocument(
      id,
      {
        title: data.title,
        description: data.description ?? undefined,
        type: data.type as DocumentType | undefined,
      },
      userId
    )

    if (!document) {
      throw new AppError('Document not found', 404)
    }

    res.json({ success: true, data: document })
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
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    if (!req.file) {
      throw new AppError('No file uploaded', 400)
    }

    const document = await documentService.updateDocumentFile(id, userId, {
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
    })

    if (!document) {
      throw new AppError('Document not found', 404)
    }

    res.json({ success: true, data: document })
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
    const { status } = statusChangeSchema.parse(req.body)
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const document = await documentService.changeDocumentStatus(id, status as DocumentStatus, userId)

    if (!document) {
      throw new AppError('Document not found', 404)
    }

    res.json({ success: true, data: document })
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
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const deleted = await documentService.deleteDocument(id, userId)

    if (!deleted) {
      throw new AppError('Document not found', 404)
    }

    res.json({ success: true, message: 'Document deleted successfully' })
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
    res.json({ success: true, data: stats })
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
    const document = await documentService.getDocumentById(id)

    if (!document) {
      throw new AppError('Document not found', 404)
    }

    if (!document.filePath) {
      throw new AppError('No file attached to this document', 404)
    }

    res.download(document.filePath, `${document.code}-${document.title}`)
  } catch (error) {
    next(error)
  }
}
