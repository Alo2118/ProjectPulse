/**
 * Risk Form Page - Create or edit a risk
 * @module pages/risks/RiskFormPage
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRiskStore } from '@stores/riskStore'
import { useProjectStore } from '@stores/projectStore'
import api from '@services/api'
import {
  Loader2,
  Save,
  AlertTriangle,
  ChevronDown,
  Users,
  BarChart2,
  FileText,
} from 'lucide-react'
import {
  RISK_CATEGORY_OPTIONS,
  RISK_PROBABILITY_OPTIONS,
  RISK_IMPACT_OPTIONS,
  RISK_STATUS_OPTIONS,
  RISK_LEVEL_COLORS,
} from '@/constants'
import { RiskCategory, RiskProbability, RiskImpact, RiskStatus, User } from '@/types'
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

export default function RiskFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEditing = Boolean(id)

  const { currentRisk, isLoading, fetchRisk, createRisk, updateRisk, clearCurrentRisk } = useRiskStore()
  const { projects, fetchProjects } = useProjectStore()
  const [users, setUsers] = useState<User[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [formData, setFormData] = useState({
    projectId: '',
    title: '',
    description: '',
    category: 'technical' as RiskCategory,
    probability: 'medium' as RiskProbability,
    impact: 'medium' as RiskImpact,
    status: 'open' as RiskStatus,
    mitigationPlan: '',
    ownerId: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchProjects()
    const loadUsers = async () => {
      try {
        const response = await api.get<{ success: boolean; data: User[] }>('/users?limit=100')
        if (response.data.success) {
          setUsers(response.data.data)
        }
      } catch {
        // silently ignore
      }
    }
    loadUsers()
    if (id) {
      fetchRisk(id)
    }
    return () => clearCurrentRisk()
  }, [id, fetchProjects, fetchRisk, clearCurrentRisk])

  useEffect(() => {
    if (isEditing && currentRisk) {
      setFormData({
        projectId: currentRisk.projectId,
        title: currentRisk.title,
        description: currentRisk.description || '',
        category: currentRisk.category,
        probability: currentRisk.probability,
        impact: currentRisk.impact,
        status: currentRisk.status,
        mitigationPlan: currentRisk.mitigationPlan || '',
        ownerId: currentRisk.ownerId || '',
      })
    }
  }, [isEditing, currentRisk])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.projectId) {
      newErrors.projectId = 'Seleziona un progetto'
    }
    if (!formData.title.trim()) {
      newErrors.title = 'Il titolo è obbligatorio'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSaving(true)
    try {
      if (isEditing && id) {
        await updateRisk(id, {
          title: formData.title,
          description: formData.description || undefined,
          category: formData.category,
          probability: formData.probability,
          impact: formData.impact,
          status: formData.status,
          mitigationPlan: formData.mitigationPlan || undefined,
          ownerId: formData.ownerId || undefined,
        })
        navigate(`/risks/${id}`)
      } else {
        const newRisk = await createRisk({
          projectId: formData.projectId,
          title: formData.title,
          description: formData.description || undefined,
          category: formData.category,
          probability: formData.probability,
          impact: formData.impact,
          mitigationPlan: formData.mitigationPlan || undefined,
          ownerId: formData.ownerId || undefined,
        })
        navigate(`/risks/${newRisk.id}`)
      }
    } catch {
      // silently ignore
    } finally {
      setIsSaving(false)
    }
  }

  const riskLevel = calculateRiskLevel(formData.probability, formData.impact)

  if (isLoading && isEditing) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="skeleton w-10 h-10 rounded-lg" />
          <div className="skeleton h-7 w-48" />
        </div>
        <div className="card p-6 space-y-4">
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-32 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <DetailPageHeader
        title={isEditing ? 'Modifica Rischio' : 'Nuovo Rischio'}
        backTo="/risks"
      />

      <form onSubmit={handleSubmit}>
        <div className="card p-6 space-y-6">

          {/* ── Section: Progetto e Titolo ── */}
          <div className="form-section-header flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Dettagli Rischio
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Progetto <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              className={`input ${errors.projectId ? 'input-error' : ''}`}
              disabled={isEditing}
            >
              <option value="">Seleziona...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            {errors.projectId && (
              <p className="mt-1 text-sm text-red-400">{errors.projectId}</p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Titolo <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`input ${errors.title ? 'input-error' : ''}`}
              placeholder="Descrivi il rischio..."
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-400">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Descrizione <span className="text-slate-400 dark:text-slate-500 font-normal">(opzionale)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="input resize-none"
              placeholder="Descrivi il rischio in dettaglio..."
            />
          </div>

          {/* ── Section: Valutazione ── */}
          <div className="form-section-header flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5" />
            Valutazione
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Probabilità
              </label>
              <select
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: e.target.value as RiskProbability })}
                className="input"
              >
                {RISK_PROBABILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Impatto
              </label>
              <select
                value={formData.impact}
                onChange={(e) => setFormData({ ...formData, impact: e.target.value as RiskImpact })}
                className="input"
              >
                {RISK_IMPACT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Risk Level Preview */}
          <div className={`flex items-center gap-3 p-3 rounded-lg ${RISK_LEVEL_COLORS[riskLevel.label]}`}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Livello di rischio: {riskLevel.level}</p>
              <p className="text-xs opacity-80">
                {riskLevel.label === 'low' && 'Rischio basso — monitorare'}
                {riskLevel.label === 'medium' && 'Rischio medio — pianificare mitigazione'}
                {riskLevel.label === 'high' && 'Rischio alto — azione immediata richiesta'}
              </p>
            </div>
          </div>

          {/* ── Section: Assegnazione ── */}
          <div className="form-section-header flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Assegnazione
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Responsabile <span className="text-slate-400 dark:text-slate-500 font-normal">(opzionale)</span>
              </label>
              <select
                value={formData.ownerId}
                onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                className="input"
              >
                <option value="">Non assegnato</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Categoria
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as RiskCategory })}
                className="input"
              >
                {RISK_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stato — only in edit mode, in the essential area */}
          {isEditing && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Stato
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as RiskStatus })}
                className="input"
              >
                {RISK_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ── Opzioni avanzate: Piano di Mitigazione (collapsible) ── */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full flex items-center justify-between text-xs uppercase tracking-widest
              font-medium text-slate-500 dark:text-slate-400
              border-b border-slate-200 dark:border-cyan-500/15 pb-2 pt-1
              hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Piano di Mitigazione
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
            />
          </button>

          {showAdvanced && (
            <div className="pt-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Piano di mitigazione <span className="text-slate-400 dark:text-slate-500 font-normal">(opzionale)</span>
              </label>
              <textarea
                value={formData.mitigationPlan}
                onChange={(e) => setFormData({ ...formData, mitigationPlan: e.target.value })}
                rows={5}
                className="input resize-none"
                placeholder="Descrivi le azioni per mitigare questo rischio..."
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-cyan-500/10">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-tertiary"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEditing ? 'Salva Modifiche' : 'Crea Rischio'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
