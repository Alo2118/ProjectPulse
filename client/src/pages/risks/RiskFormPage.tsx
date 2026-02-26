/**
 * Risk Form Page - Create or edit a risk
 * @module pages/risks/RiskFormPage
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRiskStore } from '@stores/riskStore'
import { useProjectStore } from '@stores/projectStore'
import api from '@services/api'
import { ArrowLeft, Loader2, Save, AlertTriangle } from 'lucide-react'
import {
  RISK_CATEGORY_OPTIONS,
  RISK_PROBABILITY_OPTIONS,
  RISK_IMPACT_OPTIONS,
  RISK_STATUS_OPTIONS,
  RISK_LEVEL_COLORS,
} from '@/constants'
import { RiskCategory, RiskProbability, RiskImpact, RiskStatus, User } from '@/types'
import { Breadcrumb } from '@/components/common/Breadcrumb'

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
    // Load users for owner select
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
      newErrors.title = 'Il titolo e obbligatorio'
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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Rischi', href: '/risks' },
          { label: isEditing ? 'Modifica Rischio' : 'Nuovo Rischio' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          {isEditing ? 'Modifica Rischio' : 'Nuovo Rischio'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Selection */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Progetto
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Seleziona progetto *
            </label>
            <select
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              className={`input ${errors.projectId ? 'border-red-500' : ''}`}
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
              <p className="mt-1 text-sm text-red-500">{errors.projectId}</p>
            )}
          </div>
        </div>

        {/* Risk Details */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Dettagli Rischio
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Titolo *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`input ${errors.title ? 'border-red-500' : ''}`}
                placeholder="Descrivi il rischio..."
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-500">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descrizione
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="input"
                placeholder="Descrivi il rischio in dettaglio..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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

              {isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Responsabile
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
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Valutazione Rischio
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Probabilita
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
            <div className={`flex items-center gap-3 p-4 rounded-lg ${RISK_LEVEL_COLORS[riskLevel.label]}`}>
              <AlertTriangle className="w-5 h-5" />
              <div>
                <p className="font-medium">Livello di rischio calcolato: {riskLevel.level}</p>
                <p className="text-sm opacity-80">
                  {riskLevel.label === 'low' && 'Rischio basso - monitorare'}
                  {riskLevel.label === 'medium' && 'Rischio medio - pianificare mitigazione'}
                  {riskLevel.label === 'high' && 'Rischio alto - azione immediata richiesta'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mitigation Plan */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Piano di Mitigazione
          </h2>
          <textarea
            value={formData.mitigationPlan}
            onChange={(e) => setFormData({ ...formData, mitigationPlan: e.target.value })}
            rows={6}
            className="input"
            placeholder="Descrivi le azioni per mitigare questo rischio..."
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Annulla
          </button>
          <button type="submit" disabled={isSaving} className="btn-primary flex items-center">
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isEditing ? 'Salva Modifiche' : 'Crea Rischio'}
          </button>
        </div>
      </form>
    </div>
  )
}
