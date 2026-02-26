/**
 * Risk Detail Page - 2-column layout with metadata sidebar
 * @module pages/risks/RiskDetailPage
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useRiskStore } from '@stores/riskStore'
import { useAuthStore } from '@stores/authStore'
import {
  AlertTriangle,
  Loader2,
  Edit2,
  Trash2,
  FolderOpen,
  User,
  Shield,
  Calendar,
  BarChart2,
  Tag as TagIcon,
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
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { CollapsibleSection } from '@/components/common/CollapsibleSection'
import { DetailPageHeader } from '@/components/common/DetailPageHeader'

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
    } catch {
      // silently ignore
    }
  }

  const handleDelete = async () => {
    if (!id || isDeleting) return
    setIsDeleting(true)
    try {
      await deleteRisk(id)
      navigate('/risks')
    } catch {
      setIsDeleting(false)
    }
  }

  if (isLoading || !currentRisk) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    )
  }

  const riskLevel = calculateRiskLevel(currentRisk.probability, currentRisk.impact)

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Rischi', href: '/risks' },
          ...(currentRisk.project
            ? [{ label: currentRisk.project.name, href: `/projects/${currentRisk.project.id}` }]
            : []),
          { label: currentRisk.title },
        ]}
      />

      {/* Page Header */}
      <DetailPageHeader title={currentRisk.title} subtitle={currentRisk.code}>
        {canManageRisks && (
          <button
            onClick={() => navigate(`/risks/${id}/edit`)}
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

          {/* ── Title + Level badge ── */}
          <div className="card p-5 animate-section-reveal">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                    {currentRisk.code}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_STATUS_COLORS[currentRisk.status]}`}>
                    {RISK_STATUS_LABELS[currentRisk.status]}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_CATEGORY_COLORS[currentRisk.category]}`}>
                    {RISK_CATEGORY_LABELS[currentRisk.category]}
                  </span>
                </div>

                {/* Title */}
                <h2 className="page-title break-words">
                  {currentRisk.title}
                </h2>

                {/* Project link */}
                {currentRisk.project && (
                  <Link
                    to={`/projects/${currentRisk.project.id}`}
                    className="inline-flex items-center gap-1.5 mt-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <FolderOpen className="w-4 h-4" />
                    {currentRisk.project.name}
                  </Link>
                )}
              </div>

              {/* Risk Level Badge */}
              <div className={`flex-shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-xl ${RISK_LEVEL_COLORS[riskLevel.label]}`}>
                <AlertTriangle className="w-5 h-5" />
                <div className="text-2xl font-bold leading-none">{riskLevel.level}</div>
                <div className="text-xs opacity-80 uppercase tracking-wider">Livello</div>
              </div>
            </div>
          </div>

          {/* ── Description ── */}
          {currentRisk.description && (
            <div className="card p-5 animate-section-reveal" style={{ animationDelay: '50ms' }}>
              <div className="hud-panel-header mb-3">
                <span>Descrizione</span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {currentRisk.description}
              </p>
            </div>
          )}

          {/* ── Mitigation Plan ── */}
          <div className="card p-5 animate-section-reveal" style={{ animationDelay: '100ms' }}>
            <CollapsibleSection
              title="Piano di Mitigazione"
              icon={Shield}
              defaultExpanded={true}
              borderTop={false}
            >
              {currentRisk.mitigationPlan ? (
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {currentRisk.mitigationPlan}
                </p>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                  Nessun piano di mitigazione definito
                </p>
              )}
            </CollapsibleSection>
          </div>

          {/* ── Status change (managers only) ── */}
          {canManageRisks && (
            <div className="card p-5 animate-section-reveal" style={{ animationDelay: '150ms' }}>
              <div className="hud-panel-header mb-3">
                <span>Cambia Stato</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {RISK_STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleStatusChange(option.value)}
                    disabled={currentRisk.status === option.value}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      currentRisk.status === option.value
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {option.label}
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

              {/* Probabilita */}
              <div className="meta-row">
                <span className="meta-row-label flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5" />
                  Probabilita
                </span>
                <span className="meta-row-value">
                  {RISK_PROBABILITY_LABELS[currentRisk.probability]}
                </span>
              </div>

              {/* Impatto */}
              <div className="meta-row">
                <span className="meta-row-label flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Impatto
                </span>
                <span className="meta-row-value">
                  {RISK_IMPACT_LABELS[currentRisk.impact]}
                </span>
              </div>

              {/* Stato */}
              <div className="meta-row">
                <span className="meta-row-label flex items-center gap-1.5">
                  <TagIcon className="w-3.5 h-3.5" />
                  Stato
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_STATUS_COLORS[currentRisk.status]}`}>
                  {RISK_STATUS_LABELS[currentRisk.status]}
                </span>
              </div>

              {/* Categoria */}
              <div className="meta-row">
                <span className="meta-row-label flex items-center gap-1.5">
                  <TagIcon className="w-3.5 h-3.5" />
                  Categoria
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_CATEGORY_COLORS[currentRisk.category]}`}>
                  {RISK_CATEGORY_LABELS[currentRisk.category]}
                </span>
              </div>

              {/* Owner */}
              {currentRisk.owner && (
                <div className="meta-row">
                  <span className="meta-row-label flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Owner
                  </span>
                  <span className="meta-row-value">
                    {currentRisk.owner.firstName} {currentRisk.owner.lastName}
                  </span>
                </div>
              )}

              {/* Creato da */}
              {currentRisk.createdBy && (
                <div className="meta-row">
                  <span className="meta-row-label flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Creato da
                  </span>
                  <span className="meta-row-value">
                    {currentRisk.createdBy.firstName} {currentRisk.createdBy.lastName}
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
                  {formatDate(currentRisk.createdAt)}
                </span>
              </div>

              {/* Progetto */}
              {currentRisk.project && (
                <div className="meta-row">
                  <span className="meta-row-label flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5" />
                    Progetto
                  </span>
                  <Link
                    to={`/projects/${currentRisk.project.id}`}
                    className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors text-right truncate max-w-[9rem]"
                  >
                    {currentRisk.project.name}
                  </Link>
                </div>
              )}
            </div>

            {/* ── Risk level visual ── */}
            <div className="card p-5">
              <div className="hud-panel-header mb-3">
                <span>Matrice di Rischio</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-xs text-center">
                {/* Header row */}
                <div />
                <div className="text-slate-400 py-1">Prob.</div>
                <div className="text-slate-400 py-1">Score</div>
                {/* Probabilita row */}
                <div className="text-slate-400 flex items-center">Prob.</div>
                <div className="py-1.5 rounded bg-slate-800 dark:bg-slate-700/50 text-slate-200 font-medium">
                  {RISK_PROBABILITY_LABELS[currentRisk.probability]}
                </div>
                <div className="py-1.5 rounded font-bold text-lg leading-none flex items-center justify-center">
                  <span className={`px-2 py-0.5 rounded ${RISK_LEVEL_COLORS[riskLevel.label]}`}>
                    {riskLevel.level}
                  </span>
                </div>
                {/* Impatto row */}
                <div className="text-slate-400 flex items-center">Impatto</div>
                <div className="py-1.5 rounded bg-slate-800 dark:bg-slate-700/50 text-slate-200 font-medium">
                  {RISK_IMPACT_LABELS[currentRisk.impact]}
                </div>
                <div className="py-1.5 rounded text-slate-400 flex items-center justify-center">
                  P × I
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Delete Modal ── */}
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
