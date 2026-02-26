/**
 * User Input Detail Page - 2-column layout with metadata sidebar
 * @module pages/inputs/UserInputDetailPage
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useUserInputStore } from '@stores/userInputStore'
import { useAuthStore } from '@stores/authStore'
import {
  Loader2,
  Edit,
  Trash2,
  Play,
  CheckCircle,
  XCircle,
  ArrowRightCircle,
  FolderPlus,
  User,
  Calendar,
  Clock,
  ExternalLink,
  AlertCircle,
  Tag as TagIcon,
} from 'lucide-react'
import {
  INPUT_STATUS_LABELS,
  INPUT_STATUS_COLORS,
  INPUT_CATEGORY_LABELS,
  INPUT_CATEGORY_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
  RESOLUTION_TYPE_LABELS,
  RESOLUTION_TYPE_COLORS,
} from '@/constants'
import UserInputFormModal from './UserInputFormModal'
import ConvertToTaskModal from './ConvertToTaskModal'
import ConvertToProjectModal from './ConvertToProjectModal'
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { ConfirmDialog } from '@components/common/ConfirmDialog'
import { DetailPageHeader } from '@components/common/DetailPageHeader'
import { CollapsibleSection } from '@components/common/CollapsibleSection'

export default function UserInputDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    currentInput,
    isLoading,
    fetchInput,
    deleteInput,
    startProcessing,
    acknowledgeInput,
    rejectInput,
    clearCurrentInput,
  } = useUserInputStore()

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isConvertToTaskOpen, setIsConvertToTaskOpen] = useState(false)
  const [isConvertToProjectOpen, setIsConvertToProjectOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    if (id) {
      fetchInput(id)
    }
    return () => clearCurrentInput()
  }, [id])

  const canManage = user?.role === 'admin' || user?.role === 'direzione'
  const isOwner = currentInput?.createdById === user?.id
  const isPending = currentInput?.status === 'pending'
  const isResolved = currentInput?.status === 'resolved'
  const canEdit = (isOwner && isPending) || user?.role === 'admin'
  const canDelete = (isOwner && isPending) || user?.role === 'admin'

  const handleDelete = async () => {
    if (!currentInput) return
    setIsDeleting(true)
    try {
      await deleteInput(currentInput.id)
      navigate('/inputs')
    } catch {
      setIsDeleting(false)
    }
  }

  const handleStartProcessing = async () => {
    if (!currentInput) return
    try {
      await startProcessing(currentInput.id)
    } catch {
      // error
    }
  }

  const handleAcknowledge = async () => {
    if (!currentInput) return
    try {
      await acknowledgeInput(currentInput.id, 'Preso visione')
    } catch {
      // error
    }
  }

  const handleReject = async () => {
    if (!currentInput || !rejectReason.trim()) return
    try {
      await rejectInput(currentInput.id, rejectReason)
      setIsRejectModalOpen(false)
      setRejectReason('')
    } catch {
      // error
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading || !currentInput) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Segnalazioni', href: '/inputs' },
          { label: currentInput.title },
        ]}
      />

      {/* Header */}
      <DetailPageHeader
        title={currentInput.title}
        subtitle={currentInput.code || undefined}
        backTo="/inputs"
      >
        {/* Status badge */}
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${INPUT_STATUS_COLORS[currentInput.status] || ''}`}>
          {INPUT_STATUS_LABELS[currentInput.status] || currentInput.status}
        </span>
        {canEdit && (
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="btn-secondary flex items-center"
          >
            <Edit className="w-4 h-4 mr-2" />
            Modifica
          </button>
        )}
        {canDelete && (
          <button onClick={() => setIsDeleteConfirmOpen(true)} className="btn-danger flex items-center">
            <Trash2 className="w-4 h-4 mr-2" />
            Elimina
          </button>
        )}
      </DetailPageHeader>

      {/* ── Two-column grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ════════════════ LEFT COLUMN ════════════════ */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── Title + description ── */}
          <div className="card p-5 animate-section-reveal">
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {currentInput.code && (
                <span className="text-xs font-mono text-slate-400">{currentInput.code}</span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full ${INPUT_STATUS_COLORS[currentInput.status] || ''}`}>
                {INPUT_STATUS_LABELS[currentInput.status] || currentInput.status}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${INPUT_CATEGORY_COLORS[currentInput.category] || ''}`}>
                {INPUT_CATEGORY_LABELS[currentInput.category] || currentInput.category}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${TASK_PRIORITY_COLORS[currentInput.priority] || ''}`}>
                {TASK_PRIORITY_LABELS[currentInput.priority] || currentInput.priority}
              </span>
            </div>

            <h2 className="page-title break-words mb-3">
              {currentInput.title}
            </h2>

            {/* Description */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <p className="section-heading mb-2">Descrizione</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {currentInput.description || 'Nessuna descrizione fornita.'}
              </p>
            </div>
          </div>

          {/* ── Resolution info ── */}
          {isResolved && currentInput.resolutionType && (
            <div className="card p-5 animate-section-reveal" style={{ animationDelay: '50ms' }}>
              <div className="hud-panel-header mb-3">
                <span>Risoluzione</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Tipo:</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${RESOLUTION_TYPE_COLORS[currentInput.resolutionType] || ''}`}>
                    {RESOLUTION_TYPE_LABELS[currentInput.resolutionType]}
                  </span>
                </div>
                {currentInput.resolutionNotes && (
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Note di risoluzione:</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {currentInput.resolutionNotes}
                    </p>
                  </div>
                )}
                {currentInput.convertedTask && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Task creato:</span>
                    <Link
                      to={`/tasks/${currentInput.convertedTask.id}`}
                      className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                    >
                      {currentInput.convertedTask.code} - {currentInput.convertedTask.title}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
                {currentInput.convertedProject && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Progetto creato:</span>
                    <Link
                      to={`/projects/${currentInput.convertedProject.id}`}
                      className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                    >
                      {currentInput.convertedProject.name}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Manager actions ── */}
          {canManage && !isResolved && (
            <div className="card p-5 animate-section-reveal" style={{ animationDelay: '100ms' }}>
              <CollapsibleSection
                title="Azioni disponibili"
                icon={AlertCircle}
                defaultExpanded={true}
                borderTop={false}
              >
                <div className="flex flex-wrap gap-3 pt-2">
                  {isPending && (
                    <button onClick={handleStartProcessing} className="btn-secondary flex items-center">
                      <Play className="w-4 h-4 mr-2" />
                      Avvia Elaborazione
                    </button>
                  )}
                  <button
                    onClick={() => setIsConvertToTaskOpen(true)}
                    className="btn-primary flex items-center"
                  >
                    <ArrowRightCircle className="w-4 h-4 mr-2" />
                    Converti in Task
                  </button>
                  <button
                    onClick={() => setIsConvertToProjectOpen(true)}
                    className="btn-secondary flex items-center"
                  >
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Converti in Progetto
                  </button>
                  <button onClick={handleAcknowledge} className="btn-secondary flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Prendi Visione
                  </button>
                  <button
                    onClick={() => setIsRejectModalOpen(true)}
                    className="btn-danger flex items-center"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Rifiuta
                  </button>
                </div>
              </CollapsibleSection>
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
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${INPUT_STATUS_COLORS[currentInput.status] || ''}`}>
                  {INPUT_STATUS_LABELS[currentInput.status] || currentInput.status}
                </span>
              </div>

              {/* Categoria */}
              <div className="meta-row">
                <span className="meta-row-label flex items-center gap-1.5">
                  <TagIcon className="w-3.5 h-3.5" />
                  Categoria
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${INPUT_CATEGORY_COLORS[currentInput.category] || ''}`}>
                  {INPUT_CATEGORY_LABELS[currentInput.category] || currentInput.category}
                </span>
              </div>

              {/* Priorita */}
              <div className="meta-row">
                <span className="meta-row-label flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Priorita
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TASK_PRIORITY_COLORS[currentInput.priority] || ''}`}>
                  {TASK_PRIORITY_LABELS[currentInput.priority] || currentInput.priority}
                </span>
              </div>

              {/* Creato da */}
              <div className="meta-row">
                <span className="meta-row-label flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Creato da
                </span>
                <span className="meta-row-value">
                  {currentInput.createdBy
                    ? `${currentInput.createdBy.firstName} ${currentInput.createdBy.lastName}`
                    : '-'}
                </span>
              </div>

              {/* Creato il */}
              <div className="meta-row">
                <span className="meta-row-label flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Creato il
                </span>
                <span className="meta-row-value text-right">
                  {formatDate(currentInput.createdAt)}
                </span>
              </div>

              {/* Elaborato da */}
              {currentInput.processedBy && (
                <div className="meta-row">
                  <span className="meta-row-label flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Elaborato da
                  </span>
                  <span className="meta-row-value">
                    {currentInput.processedBy.firstName} {currentInput.processedBy.lastName}
                  </span>
                </div>
              )}

              {/* Elaborato il */}
              {currentInput.processedAt && (
                <div className="meta-row">
                  <span className="meta-row-label flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Elaborato il
                  </span>
                  <span className="meta-row-value text-right">
                    {formatDate(currentInput.processedAt)}
                  </span>
                </div>
              )}

              {/* Risolto il */}
              {currentInput.resolvedAt && (
                <div className="meta-row">
                  <span className="meta-row-label flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Risolto il
                  </span>
                  <span className="meta-row-value text-right">
                    {formatDate(currentInput.resolvedAt)}
                  </span>
                </div>
              )}
            </div>

            {/* ── Converted links ── */}
            {(currentInput.convertedTask || currentInput.convertedProject) && (
              <div className="card p-5">
                <div className="hud-panel-header mb-3">
                  <span>Convertito in</span>
                </div>
                <div className="space-y-2">
                  {currentInput.convertedTask && (
                    <Link
                      to={`/tasks/${currentInput.convertedTask.id}`}
                      className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 text-sm text-slate-600 dark:text-slate-400 hover:text-cyan-400 dark:hover:text-cyan-400 transition-colors"
                    >
                      <ArrowRightCircle className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                      <span className="truncate">
                        {currentInput.convertedTask.code} - {currentInput.convertedTask.title}
                      </span>
                      <ExternalLink className="w-3 h-3 ml-auto flex-shrink-0" />
                    </Link>
                  )}
                  {currentInput.convertedProject && (
                    <Link
                      to={`/projects/${currentInput.convertedProject.id}`}
                      className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 text-sm text-slate-600 dark:text-slate-400 hover:text-cyan-400 dark:hover:text-cyan-400 transition-colors"
                    >
                      <FolderPlus className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <span className="truncate">{currentInput.convertedProject.name}</span>
                      <ExternalLink className="w-3 h-3 ml-auto flex-shrink-0" />
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <UserInputFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          setIsEditModalOpen(false)
          if (id) fetchInput(id)
        }}
        input={currentInput}
      />

      <ConvertToTaskModal
        isOpen={isConvertToTaskOpen}
        onClose={() => setIsConvertToTaskOpen(false)}
        inputId={currentInput.id}
        inputTitle={currentInput.title}
        onSuccess={() => {
          setIsConvertToTaskOpen(false)
          if (id) fetchInput(id)
        }}
      />

      <ConvertToProjectModal
        isOpen={isConvertToProjectOpen}
        onClose={() => setIsConvertToProjectOpen(false)}
        inputId={currentInput.id}
        inputTitle={currentInput.title}
        inputDescription={currentInput.description}
        onSuccess={() => {
          setIsConvertToProjectOpen(false)
          if (id) fetchInput(id)
        }}
      />

      {/* Reject Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setIsRejectModalOpen(false)} />
            <div className="relative w-full max-w-md modal-panel p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Rifiuta Segnalazione
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Motivo del rifiuto *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="input"
                  placeholder="Spiega il motivo del rifiuto..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsRejectModalOpen(false)} className="btn-secondary">
                  Annulla
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim()}
                  className="btn-danger"
                >
                  Rifiuta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Elimina segnalazione"
        message={`Sei sicuro di voler eliminare "${currentInput.title}"? L'operazione non puo' essere annullata.`}
        confirmLabel="Elimina"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}
