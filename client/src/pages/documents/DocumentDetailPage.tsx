/**
 * Document Detail Page - 2-column layout with metadata sidebar
 * @module pages/documents/DocumentDetailPage
 */

import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useDocumentStore } from '@stores/documentStore'
import { useAuthStore } from '@stores/authStore'
import {
  Loader2,
  Edit2,
  Trash2,
  FolderOpen,
  FileText,
  Download,
  Upload,
  CheckCircle,
  User,
  CalendarClock,
  AlertCircle,
  RefreshCw,
  Calendar,
  Tag as TagIcon,
  Hash,
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
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { DetailPageHeader } from '@/components/common/DetailPageHeader'
import { CollapsibleSection } from '@/components/common/CollapsibleSection'

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
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    )
  }

  const allowedTransitions = DOCUMENT_STATUS_TRANSITIONS[currentDocument.status] || []

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Documenti', href: '/documents' },
          ...(currentDocument.project
            ? [{ label: currentDocument.project.name, href: `/projects/${currentDocument.project.id}` }]
            : []),
          { label: currentDocument.title },
        ]}
      />

      {/* Page Header */}
      <DetailPageHeader title={currentDocument.title} subtitle={`${currentDocument.code} — v${currentDocument.version}`}>
        {canManageDocuments && (
          <button
            onClick={() => navigate(`/documents/${id}/edit`)}
            className="btn-secondary text-sm py-1.5"
          >
            <Edit2 className="w-4 h-4 mr-1.5" />
            Modifica
          </button>
        )}
        {canDelete && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-danger text-sm py-1.5"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Elimina
          </button>
        )}
      </DetailPageHeader>

      {/* ── Two-column grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ════════════════ LEFT COLUMN ════════════════ */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── Title + status badges ── */}
          <div className="card p-5 animate-section-reveal">
            <div className="flex items-start gap-3 flex-wrap mb-3">
              <h2 className="page-title flex-1 break-words">
                {currentDocument.title}
              </h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-slate-400">
                {currentDocument.code}
              </span>
              <span className="text-xs font-mono text-slate-500">
                v{currentDocument.version}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${DOCUMENT_STATUS_COLORS[currentDocument.status]}`}>
                {DOCUMENT_STATUS_LABELS[currentDocument.status]}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${DOCUMENT_TYPE_COLORS[currentDocument.type]}`}>
                {DOCUMENT_TYPE_LABELS[currentDocument.type]}
              </span>
            </div>

            {/* Project link */}
            {currentDocument.project && (
              <Link
                to={`/projects/${currentDocument.project.id}`}
                className="inline-flex items-center gap-1.5 mt-3 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
                {currentDocument.project.name}
              </Link>
            )}

            {/* Approval info */}
            {currentDocument.approvedBy && (
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Approvato da{' '}
                  <strong>
                    {currentDocument.approvedBy.firstName} {currentDocument.approvedBy.lastName}
                  </strong>
                  {currentDocument.approvedAt && (
                    <span className="text-slate-500 dark:text-slate-400">
                      {' '}il {formatDate(currentDocument.approvedAt)}
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* ── Description ── */}
          {currentDocument.description && (
            <div className="card p-5 animate-section-reveal" style={{ animationDelay: '50ms' }}>
              <CollapsibleSection
                title="Descrizione"
                icon={FileText}
                defaultExpanded={true}
                borderTop={false}
              >
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {currentDocument.description}
                </p>
              </CollapsibleSection>
            </div>
          )}

          {/* ── File Section ── */}
          <div className="card p-5 animate-section-reveal" style={{ animationDelay: '100ms' }}>
            <div className="hud-panel-header mb-4">
              <span>File Allegato</span>
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
                    className="btn-secondary text-xs py-1 px-2 ml-auto"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        Caricamento...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 mr-1" />
                        {currentDocument.filePath ? 'Nuova Versione' : 'Carica File'}
                      </>
                    )}
                  </button>
                </>
              )}
            </div>

            {currentDocument.filePath ? (
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {currentDocument.code}-v{currentDocument.version}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
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
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                Nessun file allegato
              </p>
            )}

            {canManageDocuments && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                Il caricamento di un nuovo file incrementa la versione e riporta lo stato a Bozza
              </p>
            )}
          </div>

          {/* ── Workflow Approval ── */}
          {canManageDocuments && allowedTransitions.length > 0 && (
            <div className="card p-5 animate-section-reveal" style={{ animationDelay: '150ms' }}>
              <div className="hud-panel-header mb-3">
                <span>Workflow Approvazione</span>
              </div>
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
                          : 'bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {status === 'approved' && <CheckCircle className="w-3.5 h-3.5 mr-1 inline" />}
                    {DOCUMENT_STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ════════════════ RIGHT SIDEBAR ════════════════ */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-20 space-y-4">

            {/* ── Metadata card ── */}
            <div className="card p-5 space-y-0 animate-section-reveal">
              <div className="hud-panel-header mb-2">
                <span>Informazioni</span>
              </div>

              {/* Stato */}
              <div className="meta-row">
                <span className="meta-row-label flex items-center gap-1.5">
                  <TagIcon className="w-3.5 h-3.5" />
                  Stato
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${DOCUMENT_STATUS_COLORS[currentDocument.status]}`}>
                  {DOCUMENT_STATUS_LABELS[currentDocument.status]}
                </span>
              </div>

              {/* Tipo */}
              <div className="meta-row">
                <span className="meta-row-label flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Tipo
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${DOCUMENT_TYPE_COLORS[currentDocument.type]}`}>
                  {DOCUMENT_TYPE_LABELS[currentDocument.type]}
                </span>
              </div>

              {/* Versione */}
              <div className="meta-row">
                <span className="meta-row-label flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" />
                  Versione
                </span>
                <span className="meta-row-value">
                  v{currentDocument.version}
                </span>
              </div>

              {/* Creato da */}
              {currentDocument.createdBy && (
                <div className="meta-row">
                  <span className="meta-row-label flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Creato da
                  </span>
                  <span className="meta-row-value">
                    {currentDocument.createdBy.firstName} {currentDocument.createdBy.lastName}
                  </span>
                </div>
              )}

              {/* Creato il */}
              <div className="meta-row">
                <span className="meta-row-label flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Creato il
                </span>
                <span className="meta-row-value">
                  {formatDate(currentDocument.createdAt)}
                </span>
              </div>

              {/* Approvato da */}
              {currentDocument.approvedBy && (
                <div className="meta-row">
                  <span className="meta-row-label flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Approvato da
                  </span>
                  <span className="meta-row-value">
                    {currentDocument.approvedBy.firstName} {currentDocument.approvedBy.lastName}
                  </span>
                </div>
              )}

              {/* Approvato il */}
              {currentDocument.approvedAt && (
                <div className="meta-row">
                  <span className="meta-row-label flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Approvato il
                  </span>
                  <span className="meta-row-value">
                    {formatDate(currentDocument.approvedAt)}
                  </span>
                </div>
              )}

              {/* Progetto */}
              {currentDocument.project && (
                <div className="meta-row">
                  <span className="meta-row-label flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5" />
                    Progetto
                  </span>
                  <Link
                    to={`/projects/${currentDocument.project.id}`}
                    className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors text-right truncate max-w-[9rem]"
                  >
                    {currentDocument.project.name}
                  </Link>
                </div>
              )}
            </div>

            {/* ── Review Info card ── */}
            {(currentDocument.reviewDueDate || currentDocument.reviewFrequencyDays) && (
              <div className="card p-5">
                <div className="hud-panel-header mb-3">
                  <span>Revisione Periodica</span>
                </div>
                <div className="space-y-3">
                  {currentDocument.reviewDueDate && (() => {
                    const dueDate = new Date(currentDocument.reviewDueDate)
                    const isOverdue = dueDate < new Date()
                    return (
                      <div className="meta-row">
                        <span className="meta-row-label flex items-center gap-1.5">
                          <CalendarClock className="w-3.5 h-3.5" />
                          Prossima revisione
                        </span>
                        <span className={`meta-row-value ${isOverdue ? 'text-red-500 dark:text-red-400' : ''}`}>
                          {formatDate(currentDocument.reviewDueDate)}
                          {isOverdue && (
                            <span className="ml-1 inline-flex items-center gap-0.5 text-xs text-red-500">
                              <AlertCircle className="w-3 h-3" />
                              Scaduta
                            </span>
                          )}
                        </span>
                      </div>
                    )
                  })()}
                  {currentDocument.reviewFrequencyDays && (
                    <div className="meta-row">
                      <span className="meta-row-label flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5" />
                        Frequenza
                      </span>
                      <span className="meta-row-value">
                        ogni {currentDocument.reviewFrequencyDays}gg
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Delete Modal ── */}
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
