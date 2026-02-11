/**
 * Attachment Controller - HTTP request handling for polymorphic attachments
 * @module controllers/attachmentController
 */

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import fs from 'fs'
import { attachmentService } from '../services/attachmentService.js'
import { AppError } from '../middleware/errorMiddleware.js'

// ============================================================
// VALIDATION SCHEMAS (Rule 6: Input Validation)
// ============================================================

const entityTypeSchema = z.enum(['project', 'task', 'time_entry'])

const createAttachmentSchema = z.object({
  entityType: entityTypeSchema,
  entityId: z.string().uuid('Invalid entity ID'),
})

const querySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
})

// ============================================================
// CONTROLLER FUNCTIONS
// ============================================================

/**
 * Creates a new attachment on an entity (file upload handled by multer middleware)
 * @route POST /api/attachments
 */
export async function createAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parseResult = createAttachmentSchema.safeParse(req.body)
    if (!parseResult.success) {
      throw new AppError(`Validation failed: ${parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`, 400)
    }

    const data = parseResult.data
    const userId = req.user?.userId
    const file = req.file

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    if (!file) {
      throw new AppError('No file uploaded', 400)
    }

    const attachment = await attachmentService.createAttachment(
      {
        entityType: data.entityType,
        entityId: data.entityId,
        fileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
      userId
    )

    res.status(201).json({ success: true, data: attachment })
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlink(req.file.path, () => {})
    }

    if (error instanceof AppError) {
      next(error)
    } else if (error instanceof Error && error.message.includes('not found')) {
      next(new AppError(error.message, 404))
    } else {
      console.error('Attachment creation error:', error)
      next(error)
    }
  }
}

/**
 * Gets attachments for an entity
 * @route GET /api/attachments/:entityType/:entityId
 */
export async function getEntityAttachments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { entityType, entityId } = req.params
    const params = querySchema.parse(req.query)

    // Validate entityType
    const validatedEntityType = entityTypeSchema.parse(entityType)

    const result = await attachmentService.getEntityAttachments({
      entityType: validatedEntityType,
      entityId,
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
 * Gets a single attachment by ID
 * @route GET /api/attachments/:id
 */
export async function getAttachmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params

    const attachment = await attachmentService.getAttachmentById(id)

    if (!attachment) {
      throw new AppError('Attachment not found', 404)
    }

    res.json({ success: true, data: attachment })
  } catch (error) {
    next(error)
  }
}

/**
 * Downloads an attachment file
 * @route GET /api/attachments/:id/download
 */
export async function downloadAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params

    const attachment = await attachmentService.getAttachmentById(id)

    if (!attachment) {
      throw new AppError('Attachment not found', 404)
    }

    // Check if file exists
    if (!fs.existsSync(attachment.filePath)) {
      throw new AppError('File not found on server', 404)
    }

    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`)
    res.setHeader('Content-Type', attachment.mimeType)
    res.setHeader('Content-Length', attachment.fileSize)

    // Stream the file
    const fileStream = fs.createReadStream(attachment.filePath)
    fileStream.pipe(res)
  } catch (error) {
    next(error)
  }
}

/**
 * Deletes an attachment
 * @route DELETE /api/attachments/:id
 */
export async function deleteAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const userId = req.user?.userId
    const userRole = req.user?.role || 'dipendente'

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const deleted = await attachmentService.deleteAttachment(id, userId, userRole)

    if (!deleted) {
      throw new AppError('Attachment not found or you do not have permission to delete it', 404)
    }

    // Note: We keep the file on disk for audit purposes
    // If you want to delete the file, uncomment:
    // if (attachment && fs.existsSync(attachment.filePath)) {
    //   fs.unlinkSync(attachment.filePath)
    // }

    res.json({ success: true, message: 'Attachment deleted successfully' })
  } catch (error) {
    next(error)
  }
}

/**
 * Gets attachment count for an entity
 * @route GET /api/attachments/:entityType/:entityId/count
 */
export async function getAttachmentCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { entityType, entityId } = req.params

    // Validate entityType
    const validatedEntityType = entityTypeSchema.parse(entityType)

    const count = await attachmentService.getAttachmentCount(validatedEntityType, entityId)

    res.json({ success: true, data: { count } })
  } catch (error) {
    next(error)
  }
}

// Validation schema for convert to document
const convertToDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  type: z.enum(['design_input', 'design_output', 'verification_report', 'validation_report', 'change_control']).optional(),
  description: z.string().max(2000).optional(),
})

/**
 * Converts an attachment to a registered document
 * @route POST /api/attachments/:id/convert-to-document
 */
export async function convertToDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('User not authenticated', 401)
    }

    const data = convertToDocumentSchema.parse(req.body)

    const document = await attachmentService.convertToDocument(id, userId, {
      title: data.title,
      type: data.type,
      description: data.description,
    })

    res.status(201).json({ success: true, data: document })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      next(new AppError(error.message, 404))
    } else if (error instanceof Error && error.message.includes('no associated project')) {
      next(new AppError(error.message, 400))
    } else {
      next(error)
    }
  }
}
