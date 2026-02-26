/**
 * Attachment Section - Displays and manages attachments for any entity
 * Reusable component for projects, tasks, and time entries
 * @module components/common/AttachmentSection
 */

import { useState, useRef } from 'react'
import {
  Loader2,
  Upload,
  Trash2,
  Paperclip,
  Download,
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  FileUp,
  X,
} from 'lucide-react'
import { Attachment, User, AttachableEntityType, Document } from '@/types'
import api from '@services/api'
import { toast } from '@stores/toastStore'

// Document types for conversion
const DOCUMENT_TYPES = [
  { value: 'design_input', label: 'Design Input' },
  { value: 'design_output', label: 'Design Output' },
  { value: 'verification_report', label: 'Report Verifica' },
  { value: 'validation_report', label: 'Report Validazione' },
  { value: 'change_control', label: 'Change Control' },
] as const

interface AttachmentSectionProps {
  entityType: AttachableEntityType
  entityId: string
  attachments: Attachment[]
  currentUser: User | null
  isLoading: boolean
  onAttachmentAdded: (attachment: Attachment) => void
  onAttachmentDeleted: (attachmentId: string) => void
  title?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return <FileImage className="w-5 h-5 text-green-500" />
  }
  if (mimeType.includes('pdf')) {
    return <FileText className="w-5 h-5 text-red-500" />
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
  }
  if (mimeType.includes('word') || mimeType.includes('document')) {
    return <FileText className="w-5 h-5 text-blue-500" />
  }
  return <File className="w-5 h-5 text-gray-500" />
}

export function AttachmentSection({
  entityType,
  entityId,
  attachments,
  currentUser,
  isLoading,
  onAttachmentAdded,
  onAttachmentDeleted,
  title = 'Allegati',
}: AttachmentSectionProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Convert to document modal state
  const [convertingAttachment, setConvertingAttachment] = useState<Attachment | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [convertForm, setConvertForm] = useState({
    title: '',
    type: 'design_input' as string,
    description: '',
  })

  // All authenticated users can convert attachments to documents
  const canConvertToDocument = !!currentUser

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0 || !entityId) return

    const file = files[0]

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('Il file e troppo grande. Massimo 10MB.')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('entityType', entityType)
      formData.append('entityId', entityId)

      // Don't set Content-Type header manually - axios will set it with correct boundary
      const response = await api.post<{ success: boolean; data: Attachment }>(
        '/attachments',
        formData
      )

      if (response.data.success) {
        onAttachmentAdded(response.data.data)
      } else {
        alert('Errore durante il caricamento del file')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto'
      alert(`Errore durante il caricamento del file: ${errorMessage}`)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDeleteAttachment = (attachmentId: string) => {
    // Find the attachment snapshot for undo restore
    const deleted = attachments.find((a) => a.id === attachmentId)

    // Optimistically remove from UI
    onAttachmentDeleted(attachmentId)

    toast.withUndo(
      'Allegato eliminato',
      async () => {
        try {
          await api.delete(`/attachments/${attachmentId}`)
        } catch {
          // Restore on API failure
          if (deleted) onAttachmentAdded(deleted)
          toast.error('Errore', 'Impossibile eliminare l\'allegato')
        }
      },
      () => {
        // Undo: restore the attachment
        if (deleted) onAttachmentAdded(deleted)
      }
    )
  }

  const handleDownload = (attachment: Attachment) => {
    window.open(`/api/attachments/${attachment.id}/download`, '_blank')
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const openConvertModal = (attachment: Attachment) => {
    setConvertingAttachment(attachment)
    setConvertForm({
      title: attachment.fileName.replace(/\.[^/.]+$/, ''), // Remove extension
      type: 'design_input',
      description: '',
    })
  }

  const closeConvertModal = () => {
    setConvertingAttachment(null)
    setConvertForm({ title: '', type: 'design_input', description: '' })
  }

  const handleConvertToDocument = async () => {
    if (!convertingAttachment || !convertForm.title.trim()) return

    setIsConverting(true)
    try {
      const response = await api.post<{ success: boolean; data: Document }>(
        `/attachments/${convertingAttachment.id}/convert-to-document`,
        {
          title: convertForm.title.trim(),
          type: convertForm.type,
          description: convertForm.description.trim() || undefined,
        }
      )

      if (response.data.success) {
        alert(`Documento creato: ${response.data.data.code}`)
        closeConvertModal()
      }
    } catch {
      alert('Errore durante la conversione in documento')
    } finally {
      setIsConverting(false)
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        <Paperclip className="w-5 h-5 mr-2" />
        {title} ({attachments.length})
      </h2>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mb-4 border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${
            isDragging
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt,.csv,.zip"
        />
        {isUploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Caricamento in corso...</p>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Trascina un file qui o{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-primary-600 dark:text-primary-400 hover:underline"
              >
                sfoglia
              </button>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              PDF, DOCX, XLSX, PNG, JPEG, TXT, CSV, ZIP - Max 10MB
            </p>
          </>
        )}
      </div>

      {/* Attachments List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : attachments.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Nessun allegato ancora
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
            >
              {getFileIcon(attachment.mimeType)}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {attachment.fileName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(attachment.fileSize)} •{' '}
                  {attachment.uploadedBy?.firstName} {attachment.uploadedBy?.lastName} •{' '}
                  {formatDateTime(attachment.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDownload(attachment)}
                  className="p-1.5 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 rounded"
                  title="Scarica"
                >
                  <Download className="w-4 h-4" />
                </button>
                {canConvertToDocument && (
                  <button
                    onClick={() => openConvertModal(attachment)}
                    className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded"
                    title="Registra Documento"
                  >
                    <FileUp className="w-4 h-4" />
                  </button>
                )}
                {(attachment.uploadedBy?.id === currentUser?.id ||
                  currentUser?.role === 'admin') && (
                  <button
                    onClick={() => handleDeleteAttachment(attachment.id)}
                    className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded"
                    title="Elimina"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Convert to Document Modal */}
      {convertingAttachment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={closeConvertModal}
            />
            <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileUp className="w-5 h-5 text-blue-500" />
                  Registra Documento
                </h3>
                <button
                  onClick={closeConvertModal}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    File: <span className="font-medium text-gray-900 dark:text-white">{convertingAttachment.fileName}</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {formatFileSize(convertingAttachment.fileSize)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Titolo Documento *
                  </label>
                  <input
                    type="text"
                    value={convertForm.title}
                    onChange={(e) => setConvertForm({ ...convertForm, title: e.target.value })}
                    className="input"
                    placeholder="Inserisci il titolo del documento"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo Documento
                  </label>
                  <select
                    value={convertForm.type}
                    onChange={(e) => setConvertForm({ ...convertForm, type: e.target.value })}
                    className="input"
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descrizione (opzionale)
                  </label>
                  <textarea
                    value={convertForm.description}
                    onChange={(e) => setConvertForm({ ...convertForm, description: e.target.value })}
                    className="input"
                    rows={3}
                    placeholder="Descrizione del documento..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={closeConvertModal}
                  className="btn-secondary"
                  disabled={isConverting}
                >
                  Annulla
                </button>
                <button
                  onClick={handleConvertToDocument}
                  disabled={!convertForm.title.trim() || isConverting}
                  className="btn-primary flex items-center disabled:opacity-50"
                >
                  {isConverting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileUp className="w-4 h-4 mr-2" />
                  )}
                  Crea Documento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
