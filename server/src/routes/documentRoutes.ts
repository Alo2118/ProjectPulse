/**
 * Document Routes - HTTP routes for document management
 * @module routes/documentRoutes
 */

import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { randomUUID } from 'crypto'
import {
  getDocuments,
  getDocument,
  getProjectDocuments,
  createDocument,
  updateDocument,
  uploadDocumentFile,
  changeStatus,
  deleteDocument,
  getProjectDocumentStats,
  downloadDocument,
} from '../controllers/documentController.js'
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js'

// Multer configuration for document uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads', 'documents'))
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
    'text/plain',
  ]

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('File type not allowed. Supported: PDF, DOCX, XLSX, PNG, JPEG, TXT'))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
})

const router = Router()

// All routes require authentication
router.use(authMiddleware)

// GET /api/documents/project/:projectId/stats
router.get('/project/:projectId/stats', getProjectDocumentStats)

// GET /api/documents/project/:projectId
router.get('/project/:projectId', getProjectDocuments)

// GET /api/documents
router.get('/', getDocuments)

// GET /api/documents/:id
router.get('/:id', getDocument)

// GET /api/documents/:id/download
router.get('/:id/download', downloadDocument)

// POST /api/documents (with optional file upload, direzione/admin only)
router.post('/', requireRole('admin', 'direzione'), upload.single('file'), createDocument)

// PUT /api/documents/:id (direzione/admin only)
router.put('/:id', requireRole('admin', 'direzione'), updateDocument)

// POST /api/documents/:id/upload (new version file, direzione/admin only)
router.post('/:id/upload', requireRole('admin', 'direzione'), upload.single('file'), uploadDocumentFile)

// PATCH /api/documents/:id/status (approval workflow, direzione/admin only)
router.patch('/:id/status', requireRole('admin', 'direzione'), changeStatus)

// DELETE /api/documents/:id (admin only)
router.delete('/:id', requireRole('admin'), deleteDocument)

export default router
