/**
 * Attachment Routes - HTTP routes for polymorphic attachments
 * @module routes/attachmentRoutes
 */

import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { randomUUID } from 'crypto'
import {
  createAttachment,
  getEntityAttachments,
  getAttachmentById,
  downloadAttachment,
  deleteAttachment,
  getAttachmentCount,
  convertToDocument,
} from '../controllers/attachmentController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads', 'attachments')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Multer configuration for attachment uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${randomUUID()}${ext}`)
  },
})

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'image/gif',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed',
  ]

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('File type not allowed. Supported: PDF, DOCX, XLSX, PNG, JPEG, GIF, TXT, CSV, ZIP'))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
})

const router = Router()

// All routes require authentication (Rule 7)
router.use(authMiddleware)

// GET /api/attachments/:entityType/:entityId/count - Get attachment count for an entity
router.get('/:entityType/:entityId/count', getAttachmentCount)

// GET /api/attachments/:entityType/:entityId - Get attachments for an entity
router.get('/:entityType/:entityId', getEntityAttachments)

// GET /api/attachments/:id/download - Download attachment file
router.get('/:id/download', downloadAttachment)

// GET /api/attachments/:id - Get single attachment (must be after entity routes)
router.get('/:id', getAttachmentById)

// POST /api/attachments - Create attachment (with file upload)
router.post('/', upload.single('file'), createAttachment)

// POST /api/attachments/:id/convert-to-document - Convert attachment to document (all authenticated users)
router.post('/:id/convert-to-document', convertToDocument)

// DELETE /api/attachments/:id - Delete attachment (soft delete)
router.delete('/:id', deleteAttachment)

export default router
