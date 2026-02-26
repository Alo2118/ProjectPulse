/**
 * User Input Detail Page - Shows single input details with actions
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
  Info,
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
import { TabSection } from '@components/common/TabSection'

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
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  const detailsTabContent = (
    <div className="space-y-6">
      {/* Description */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Descrizione</h3>
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">
          {currentInput.description || 'Nessuna descrizione fornita.'}
        </p>
      </div>

      {/* Metadata */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Informazioni</h3>
        <dl className="space-y-3">
          <div className="flex items-start gap-3">
            <dt className="text-sm text-gray-500 dark:text-gray-400 w-32 flex-shrink-0">Stato</dt>
            <dd>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${INPUT_STATUS_COLORS[currentInput.status] || ''}`}>
                {INPUT_STATUS_LABELS[currentInput.status] || currentInput.status}
              </span>
            </dd>
          </div>
          <div className="flex items-start gap-3">
            <dt className="text-sm text-gray-500 dark:text-gray-400 w-32 flex-shrink-0">Categoria</dt>
            <dd>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${INPUT_CATEGORY_COLORS[currentInput.category] || ''}`}>
                {INPUT_CATEGORY_LABELS[currentInput.category] || currentInput.category}
              </span>
            </dd>
          </div>
          <div className="flex items-start gap-3">
            <dt className="text-sm text-gray-500 dark:text-gray-400 w-32 flex-shrink-0">Priorita'</dt>
            <dd>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${TASK_PRIORITY_COLORS[currentInput.priority] || ''}`}>
                {TASK_PRIORITY_LABELS[currentInput.priority] || currentInput.priority}
              </span>
            </dd>
          </div>
          <div className="flex items-center gap-3">
            <dt className="text-sm text-gray-500 dark:text-gray-400 w-32 flex-shrink-0 flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              Creato da
            </dt>
            <dd className="text-sm text-gray-900 dark:text-white">
              {currentInput.createdBy
                ? `${currentInput.createdBy.firstName} ${currentInput.createdBy.lastName}`
                : '-'}
            </dd>
          </div>
          <div className="flex items-center gap-3">
            <dt className="text-sm text-gray-500 dark:text-gray-400 w-32 flex-shrink-0 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Creato il
            </dt>
            <dd className="text-sm text-gray-900 dark:text-white">
              {formatDate(currentInput.createdAt)}
            </dd>
          </div>
          {currentInput.processedBy && (
            <div className="flex items-center gap-3">
              <dt className="text-sm text-gray-500 dark:text-gray-400 w-32 flex-shrink-0 flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                Elaborato da
              </dt>
              <dd className="text-sm text-gray-900 dark:text-white">
                {currentInput.processedBy.firstName} {currentInput.processedBy.lastName}
              </dd>
            </div>
          )}
          {currentInput.processedAt && (
            <div className="flex items-center gap-3">
              <dt className="text-sm text-gray-500 dark:text-gray-400 w-32 flex-shrink-0 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Elaborato il
              </dt>
              <dd className="text-sm text-gray-900 dark:text-white">
                {formatDate(currentInput.processedAt)}
              </dd>
            </div>
          )}
          {currentInput.resolvedAt && (
            <div className="flex items-center gap-3">
              <dt className="text-sm text-gray-500 dark:text-gray-400 w-32 flex-shrink-0 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Risolto il
              </dt>
              <dd className="text-sm text-gray-900 dark:text-white">
                {formatDate(currentInput.resolvedAt)}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Resolution Info */}
      {isResolved && currentInput.resolutionType && (
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Risoluzione</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Tipo:</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${RESOLUTION_TYPE_COLORS[currentInput.resolutionType] || ''}`}>
                {RESOLUTION_TYPE_LABELS[currentInput.resolutionType]}
              </span>
            </div>
            {currentInput.resolutionNotes && (
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Note:</span>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                  {currentInput.resolutionNotes}
                </p>
              </div>
            )}
            {currentInput.convertedTask && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Task creato:</span>
                <Link
                  to={`/tasks/${currentInput.convertedTask.id}`}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center"
                >
                  {currentInput.convertedTask.code} - {currentInput.convertedTask.title}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Link>
              </div>
            )}
            {currentInput.convertedProject && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Progetto creato:</span>
                <Link
                  to={`/projects/${currentInput.convertedProject.id}`}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center"
                >
                  {currentInput.convertedProject.name}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions for managers */}
      {canManage && !isResolved && (
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Azioni</h3>
          <div className="flex flex-wrap gap-3">
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
        </div>
      )}
    </div>
  )

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

      {/* Tabbed content */}
      <TabSection
        tabs={[
          {
            id: 'dettagli',
            label: 'Dettagli',
            icon: Info,
            content: detailsTabContent,
          },
        ]}
        defaultTab="dettagli"
      />

      {/* Modals */}
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
            <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Rifiuta Segnalazione
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
