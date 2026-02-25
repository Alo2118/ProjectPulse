/**
 * Document Detail Page - View document with approval workflow
 * @module pages/documents/DocumentDetailPage
 */

import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useDocumentStore } from '@stores/documentStore'
import { useAuthStore } from '@stores/authStore'
import {
  ArrowLeft,
  Loader2,
  Edit2,
  Trash2,
  FolderOpen,
  FileText,
  Download,
  Upload,
  CheckCircle,
  ChevronDown,
  User,
  CalendarClock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_COLORS,
  DOCUMENT_STATUS_TRANSITIONS,
} from '@/constants'
import { DocumentStatus } from '@/types'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    currentDocument,
    isLoading,
    fetchDocument,
    changeDocumentStatus,
    uploadFile,
    deleteDocument,
    clearCurrentDocument,
  } = useDocumentStore()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (id) {
      fetchDocument(id)
    }
    return () => clearCurrentDocument()
  }, [id, fetchDocument, clearCurrentDocument])

  const canManageDocuments = user?.role === 'admin' || user?.role === 'direzione'
  const canDelete = user?.role === 'admin'

  const handleStatusChange = async (newStatus: DocumentStatus) => {
    if (!id) return
    try {
      await changeDocumentStatus(id, newStatus)
    } catch {
      // silently ignore
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!id || !e.target.files?.[0]) return
    setIsUploading(true)
    try {
      await uploadFile(id, e.target.files[0])
    } catch {
      // silently ignore
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async () => {
    if (!id || isDeleting) return
    setIsDeleting(true)
    try {
      await deleteDocument(id)
      navigate('/documents')
    } catch {
      setIsDeleting(false)
    }
  }

  if (isLoading || !currentDocument) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  const allowedTransitions = DOCUMENT_STATUS_TRANSITIONS[currentDocument.status] || []

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="card p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0 mt-0.5"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-500 dark:text-gray-400">{currentDocument.code}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">v{currentDocument.version}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${DOCUMENT_STATUS_COLORS[currentDocument.status]}`}>
                  {DOCUMENT_STATUS_LABELS[currentDocument.status]}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${DOCUMENT_TYPE_COLORS[currentDocument.type]}`}>
                  {DOCUMENT_TYPE_LABELS[currentDocument.type]}
                </span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {currentDocument.title}
              </h1>

              {/* Inline Info */}
              <div className="flex items-center gap-4 mt-2 flex-wrap text-sm">
                {currentDocument.project && (
                  <Link
                    to={`/projects/${currentDocument.project.id}`}
                    className="flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    <FolderOpen className="w-4 h-4" />
                    {currentDocument.project.name}
                  </Link>
                )}
                {currentDocument.createdBy && (
                  <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <User className="w-4 h-4" />
                    {currentDocument.createdBy.firstName} {currentDocument.createdBy.lastName}
                  </span>
                )}
                <span className="text-gray-500 dark:text-gray-400">
                  Creato {formatDate(currentDocument.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {canManageDocuments && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => navigate(`/documents/${id}/edit`)}
                className="btn-secondary text-sm py-1.5"
              >
                <Edit2 className="w-4 h-4 mr-1.5" />
                Modifica
              </button>
              {canDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn-danger text-sm py-1.5"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Elimina
                </button>
              )}
            </div>
          )}
        </div>

        {/* Approval info if approved */}
        {currentDocument.approvedBy && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Approvato da{' '}
              <strong>
                {currentDocument.approvedBy.firstName} {currentDocument.approvedBy.lastName}
              </strong>
              {currentDocument.approvedAt && (
                <span className="text-gray-500 dark:text-gray-400">
                  {' '}il {formatDate(currentDocument.approvedAt)}
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Review Info */}
      {(currentDocument.reviewDueDate || currentDocument.reviewFrequencyDays) && (
        <div className="card p-4">
          <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-primary-500" />
            Revisione Periodica
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            {currentDocument.reviewDueDate && (() => {
              const dueDate = new Date(currentDocument.reviewDueDate)
              const isOverdue = dueDate < new Date()
              return (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Prossima revisione:</span>
                  <span className={`text-sm font-medium ${
                    isOverdue
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {formatDate(currentDocument.reviewDueDate)}
                  </span>
                  {isOverdue && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                      <AlertCircle className="w-3 h-3" />
                      Scaduta
                    </span>
                  )}
                </div>
              )
            })()}
            {currentDocument.reviewFrequencyDays && (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Frequenza: ogni <span className="font-medium text-gray-900 dark:text-white">{currentDocument.reviewFrequencyDays}</span> giorni
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Description - Collapsible */}
      {currentDocument.description && (
        <div className="card">
          <button
            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <span className="font-medium text-gray-900 dark:text-white">Descrizione</span>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                isDescriptionExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>
          {isDescriptionExpanded && (
            <div className="px-4 pb-4">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {currentDocument.description}
              </p>
            </div>
          )}
        </div>
      )}

      {/* File Section */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-900 dark:text-white">File Allegato</h2>
          {canManageDocuments && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="btn-secondary text-sm py-1.5"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Caricamento...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-1.5" />
                    {currentDocument.filePath ? 'Nuova Versione' : 'Carica File'}
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {currentDocument.filePath ? (
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {currentDocument.code}-v{currentDocument.version}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {currentDocument.mimeType} · {formatFileSize(currentDocument.fileSize)}
                </p>
              </div>
            </div>
            <a
              href={`${import.meta.env.VITE_API_URL || '/api'}/documents/${currentDocument.id}/download`}
              className="btn-secondary text-sm py-1.5"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Scarica
            </a>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            Nessun file allegato
          </p>
        )}

        {canManageDocuments && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Il caricamento di un nuovo file incrementa la versione e riporta lo stato a Bozza
          </p>
        )}
      </div>

      {/* Workflow Approval */}
      {canManageDocuments && allowedTransitions.length > 0 && (
        <div className="card p-4">
          <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Workflow Approvazione
          </h2>
          <div className="flex flex-wrap gap-2">
            {allowedTransitions.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  status === 'approved'
                    ? 'bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400'
                    : status === 'obsolete'
                      ? 'bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400'
                      : 'bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {status === 'approved' && <CheckCircle className="w-4 h-4 mr-1 inline" />}
                {DOCUMENT_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        title="Conferma eliminazione"
        message="Sei sicuro di voler eliminare il documento"
        itemName={currentDocument.title}
        isDeleting={isDeleting}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
