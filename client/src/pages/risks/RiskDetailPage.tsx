/**
 * Risk Detail Page - View and edit a single risk
 * @module pages/risks/RiskDetailPage
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useRiskStore } from '@stores/riskStore'
import { useAuthStore } from '@stores/authStore'
import {
  ArrowLeft,
  AlertTriangle,
  Loader2,
  Edit2,
  Trash2,
  ChevronDown,
  FolderOpen,
  User,
  Shield,
} from 'lucide-react'
import {
  RISK_STATUS_LABELS,
  RISK_STATUS_COLORS,
  RISK_STATUS_OPTIONS,
  RISK_CATEGORY_LABELS,
  RISK_CATEGORY_COLORS,
  RISK_PROBABILITY_LABELS,
  RISK_IMPACT_LABELS,
  RISK_LEVEL_COLORS,
} from '@/constants'
import { RiskProbability, RiskImpact, RiskStatus } from '@/types'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'

function calculateRiskLevel(probability: RiskProbability, impact: RiskImpact): { level: number; label: 'low' | 'medium' | 'high' } {
  const probValue = { low: 1, medium: 2, high: 3 }
  const impactValue = { low: 1, medium: 2, high: 3 }
  const level = probValue[probability] * impactValue[impact]

  let label: 'low' | 'medium' | 'high' = 'low'
  if (level <= 2) label = 'low'
  else if (level <= 4) label = 'medium'
  else label = 'high'

  return { level, label }
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function RiskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { currentRisk, isLoading, fetchRisk, changeRiskStatus, deleteRisk, clearCurrentRisk } = useRiskStore()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [isMitigationExpanded, setIsMitigationExpanded] = useState(true)

  useEffect(() => {
    if (id) {
      fetchRisk(id)
    }
    return () => clearCurrentRisk()
  }, [id, fetchRisk, clearCurrentRisk])

  const canManageRisks = user?.role === 'admin' || user?.role === 'direzione'
  const canDelete = user?.role === 'admin'

  const handleStatusChange = async (newStatus: RiskStatus) => {
    if (!id) return
    try {
      await changeRiskStatus(id, newStatus)
    } catch (error) {
      console.error('Failed to change status:', error)
    }
  }

  const handleDelete = async () => {
    if (!id || isDeleting) return
    setIsDeleting(true)
    try {
      await deleteRisk(id)
      navigate('/risks')
    } catch (error) {
      console.error('Failed to delete risk:', error)
      setIsDeleting(false)
    }
  }

  if (isLoading || !currentRisk) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  const riskLevel = calculateRiskLevel(currentRisk.probability, currentRisk.impact)

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
                <span className="text-sm text-gray-500 dark:text-gray-400">{currentRisk.code}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_STATUS_COLORS[currentRisk.status]}`}>
                  {RISK_STATUS_LABELS[currentRisk.status]}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_CATEGORY_COLORS[currentRisk.category]}`}>
                  {RISK_CATEGORY_LABELS[currentRisk.category]}
                </span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {currentRisk.title}
              </h1>

              {/* Inline Info */}
              <div className="flex items-center gap-4 mt-2 flex-wrap text-sm">
                {currentRisk.project && (
                  <Link
                    to={`/projects/${currentRisk.project.id}`}
                    className="flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    <FolderOpen className="w-4 h-4" />
                    {currentRisk.project.code}
                  </Link>
                )}
                {currentRisk.owner && (
                  <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <User className="w-4 h-4" />
                    {currentRisk.owner.firstName} {currentRisk.owner.lastName}
                  </span>
                )}
                <span className="text-gray-500 dark:text-gray-400">
                  Creato {formatDate(currentRisk.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Risk Level Badge */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg flex-shrink-0 ${RISK_LEVEL_COLORS[riskLevel.label]}`}>
            <AlertTriangle className="w-5 h-5" />
            <div className="text-center">
              <div className="text-lg font-bold">{riskLevel.level}</div>
              <div className="text-xs opacity-80">Livello</div>
            </div>
          </div>
        </div>

        {/* Probability / Impact inline */}
        <div className="flex items-center gap-6 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Probabilità:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {RISK_PROBABILITY_LABELS[currentRisk.probability]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Impatto:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {RISK_IMPACT_LABELS[currentRisk.impact]}
            </span>
          </div>
          {currentRisk.createdBy && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-gray-500 dark:text-gray-400">Creato da:</span>
              <span className="text-sm text-gray-900 dark:text-white">
                {currentRisk.createdBy.firstName} {currentRisk.createdBy.lastName}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        {canManageRisks && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => navigate(`/risks/${id}/edit`)}
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

      {/* Description - Collapsible */}
      {currentRisk.description && (
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
                {currentRisk.description}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mitigation Plan - Collapsible */}
      <div className="card">
        <button
          onClick={() => setIsMitigationExpanded(!isMitigationExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-white">Piano di Mitigazione</span>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              isMitigationExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>
        {isMitigationExpanded && (
          <div className="px-4 pb-4">
            {currentRisk.mitigationPlan ? (
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {currentRisk.mitigationPlan}
              </p>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">
                Nessun piano di mitigazione definito
              </p>
            )}
          </div>
        )}
      </div>

      {/* Status Change */}
      {canManageRisks && (
        <div className="card p-4">
          <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Cambia Stato
          </h2>
          <div className="flex flex-wrap gap-2">
            {RISK_STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleStatusChange(option.value)}
                disabled={currentRisk.status === option.value}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  currentRisk.status === option.value
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        title="Conferma eliminazione"
        message="Sei sicuro di voler eliminare il rischio"
        itemName={currentRisk.title}
        isDeleting={isDeleting}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
