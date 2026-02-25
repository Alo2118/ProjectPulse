/**
 * Automation List Page - Admin page for managing automation rules
 * @module pages/admin/AutomationListPage
 */

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap,
  Plus,
  Edit,
  Trash2,
  ScrollText,
  Loader2,
  Globe,
  FolderKanban,
  Clock,
  Activity,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  AlertTriangle,
  FileText,
  Lightbulb,
  Package,
  RefreshCw,
  ThumbsDown,
} from 'lucide-react'
import { toast } from '@stores/toastStore'
import { useAutomationStore, AutomationRule, AutomationDomain, AutomationRecommendation } from '@stores/automationStore'
import { useProjectStore } from '@stores/projectStore'
import { useAuthStore } from '@stores/authStore'
import { ConfirmDialog } from '@components/common/ConfirmDialog'

// ============================================================
// CONSTANTS
// ============================================================

const TRIGGER_LABELS: Record<string, string> = {
  // Task triggers
  task_status_changed: 'Cambio Status',
  task_created: 'Task Creato',
  task_assigned: 'Task Assegnato',
  all_subtasks_completed: 'Subtask Completati',
  task_overdue: 'Task Scaduto',
  task_deadline_approaching: 'Scadenza Imminente',
  task_updated: 'Task Aggiornato',
  task_commented: 'Nuovo Commento',
  task_idle: 'Task Inattivo',
  // Risk triggers
  risk_created: 'Rischio Creato',
  risk_status_changed: 'Cambio Stato Rischio',
  risk_level_changed: 'Cambio Livello Rischio',
  // Document triggers
  document_created: 'Documento Creato',
  document_status_changed: 'Cambio Stato Documento',
  document_review_due: 'Revisione in Scadenza',
  // Project triggers
  project_status_changed: 'Cambio Stato Progetto',
  project_deadline_approaching: 'Scadenza Progetto',
}

const ACTION_LABELS: Record<string, string> = {
  notify_user: 'Notifica Utente',
  notify_assignee: 'Notifica Assegnatario',
  notify_project_owner: 'Notifica Project Owner',
  update_parent_status: 'Aggiorna Status Parent',
  set_task_field: 'Modifica Campo Task',
  create_comment: 'Crea Commento',
  assign_to_user: 'Assegna a Utente',
  set_risk_field: 'Modifica Campo Rischio',
  set_document_field: 'Modifica Campo Documento',
  set_project_field: 'Modifica Campo Progetto',
  create_task: 'Crea Task',
  send_email: 'Invia Email',
}

const TRIGGER_COLORS: Record<string, string> = {
  // Task triggers
  task_status_changed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  task_created: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  task_assigned: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  all_subtasks_completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  task_overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  task_deadline_approaching: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  task_updated: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  task_commented: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  task_idle: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  // Risk triggers
  risk_created: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  risk_status_changed: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  risk_level_changed: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  // Document triggers
  document_created: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  document_status_changed: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  document_review_due: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  // Project triggers
  project_status_changed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  project_deadline_approaching: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
}

const DOMAIN_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckSquare }> = {
  task: { label: 'Task', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckSquare },
  risk: { label: 'Rischi', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle },
  document: { label: 'Documenti', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: FileText },
  project: { label: 'Progetti', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: FolderKanban },
}

const RECOMMENDATION_PATTERN_LABELS: Record<string, string> = {
  idle_tasks: 'Task inattivi da troppo tempo',
  overdue_pattern: 'Pattern di ritardi ricorrenti',
  blocked_chain: 'Catena di blocchi frequente',
  high_risk_no_action: 'Rischi alti senza mitigazione',
  review_overdue: 'Revisioni documenti in ritardo',
  unassigned_tasks: 'Task non assegnati troppo a lungo',
}

const IMPACT_CONFIG: Record<string, { label: string; color: string }> = {
  high: { label: 'Alto', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  medium: { label: 'Medio', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  low: { label: 'Basso', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
}

// ============================================================
// HELPERS
// ============================================================

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Mai'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Adesso'
  if (diffMins < 60) return `${diffMins} min fa`
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'ora' : 'ore'} fa`
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'giorno' : 'giorni'} fa`
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ============================================================
// TOGGLE SWITCH
// ============================================================

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  ariaLabel?: string
}

function ToggleSwitch({ checked, onChange, disabled = false, ariaLabel }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-5 w-9 items-center rounded-full
        transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-1
        dark:focus:ring-offset-gray-800
        disabled:opacity-40 disabled:cursor-not-allowed
        ${checked
          ? 'bg-primary-600 dark:bg-primary-500'
          : 'bg-gray-200 dark:bg-gray-600'
        }
      `}
    >
      <span
        className={`
          inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm
          transition-transform duration-200
          ${checked ? 'translate-x-5' : 'translate-x-0.5'}
        `}
      />
    </button>
  )
}

// ============================================================
// RULE CARD
// ============================================================

interface RuleCardProps {
  rule: AutomationRule
  onEdit: (id: string) => void
  onDelete: (id: string, name: string) => void
  onViewLogs: (id: string) => void
  onToggle: (id: string, isActive: boolean) => void
  isToggling: boolean
}

function RuleCard({ rule, onEdit, onDelete, onViewLogs, onToggle, isToggling }: RuleCardProps) {
  const triggerLabel = TRIGGER_LABELS[rule.trigger.type] ?? rule.trigger.type
  const triggerColorClass = TRIGGER_COLORS[rule.trigger.type] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  const domainConf = DOMAIN_CONFIG[rule.domain ?? 'task']
  const DomainIcon = domainConf?.icon ?? CheckSquare

  return (
    <div
      className={`card p-5 flex flex-col gap-3 transition-opacity duration-200 ${
        !rule.isActive ? 'opacity-60' : ''
      }`}
    >
      {/* Top row: name + toggle */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
            {rule.name}
          </h3>
          {rule.description && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
              {rule.description}
            </p>
          )}
        </div>
        <ToggleSwitch
          checked={rule.isActive}
          onChange={(val) => onToggle(rule.id, val)}
          disabled={isToggling}
          ariaLabel={rule.isActive ? 'Disattiva regola' : 'Attiva regola'}
        />
      </div>

      {/* Domain badge + Trigger badge + project */}
      <div className="flex flex-wrap items-center gap-2">
        {domainConf && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${domainConf.color}`}>
            <DomainIcon className="w-3 h-3" />
            {domainConf.label}
          </span>
        )}
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${triggerColorClass}`}>
          {triggerLabel}
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          {rule.project ? (
            <>
              <FolderKanban className="w-3 h-3 flex-shrink-0" />
              <span className="truncate max-w-[140px]">
                {rule.project.name}
              </span>
            </>
          ) : (
            <>
              <Globe className="w-3 h-3 flex-shrink-0" />
              <span>Globale</span>
            </>
          )}
        </span>
      </div>

      {/* Actions summary */}
      {rule.actions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {rule.actions.slice(0, 3).map((action, i) => (
            <span
              key={i}
              className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
            >
              {ACTION_LABELS[action.type] ?? action.type}
            </span>
          ))}
          {rule.actions.length > 3 && (
            <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
              +{rule.actions.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Stats + actions footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700 mt-auto">
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(rule.lastTriggeredAt)}
          </span>
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            {rule.triggerCount} {rule.triggerCount === 1 ? 'volta' : 'volte'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onViewLogs(rule.id)}
            title="Visualizza log"
            aria-label="Visualizza log esecuzioni"
            className="btn-icon text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <ScrollText className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(rule.id)}
            title="Modifica regola"
            aria-label="Modifica regola"
            className="btn-icon text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(rule.id, rule.name)}
            title="Elimina regola"
            aria-label="Elimina regola"
            className="btn-icon text-gray-400 hover:text-red-600 dark:hover:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// LOGS MODAL
// ============================================================

interface LogsModalProps {
  ruleId: string
  ruleName: string
  onClose: () => void
}

function LogsModal({ ruleId, ruleName, onClose }: LogsModalProps) {
  const { logs, isLoading, fetchLogs } = useAutomationStore()

  useEffect(() => {
    void fetchLogs(ruleId)
  }, [ruleId, fetchLogs])

  const statusConfig = {
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    skipped: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  } as const

  const statusLabels = { success: 'Successo', error: 'Errore', skipped: 'Saltato' } as const

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Log esecuzioni: ${ruleName}`}
          className="relative w-full max-w-2xl modal-panel p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-primary-500" />
                Log Esecuzioni
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{ruleName}</p>
            </div>
            <button
              onClick={onClose}
              className="btn-icon"
              aria-label="Chiudi"
            >
              <span className="text-gray-500 dark:text-gray-400 text-xl leading-none">&times;</span>
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center">
              <ScrollText className="w-10 h-10 mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Nessuna esecuzione registrata per questa regola.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <li key={log.id} className="py-3 flex items-start gap-3">
                  <span
                    className={`mt-0.5 shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig[log.status]}`}
                  >
                    {statusLabels[log.status]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(log.createdAt).toLocaleString('it-IT')}
                    </p>
                    {log.details && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 truncate">
                        {typeof log.details === 'object'
                          ? JSON.stringify(log.details)
                          : String(log.details)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// RECOMMENDATION CARD
// ============================================================

interface RecommendationCardProps {
  recommendation: AutomationRecommendation
  onApply: (id: string) => void
  onDismiss: (id: string) => void
  isApplying: boolean
}

function RecommendationCard({ recommendation, onApply, onDismiss, isApplying }: RecommendationCardProps) {
  const impactConf = IMPACT_CONFIG[recommendation.impact] ?? IMPACT_CONFIG.low
  const patternLabel = RECOMMENDATION_PATTERN_LABELS[recommendation.pattern] ?? recommendation.pattern

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{patternLabel}</p>
          {recommendation.project && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
              <FolderKanban className="w-3 h-3 flex-shrink-0" />
              {recommendation.project.name}
            </p>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${impactConf.color}`}>
          {impactConf.label}
        </span>
      </div>

      {recommendation.evidence && Object.keys(recommendation.evidence).length > 0 && (
        <div className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2.5">
          {Object.entries(recommendation.evidence).slice(0, 3).map(([key, value]) => (
            <div key={key} className="flex justify-between gap-2">
              <span className="text-gray-500 dark:text-gray-400">{key}:</span>
              <span className="font-medium">{String(value)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-auto">
        <button
          onClick={() => onApply(recommendation.id)}
          disabled={isApplying}
          className="flex-1 px-3 py-1.5 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
        >
          {isApplying ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <Zap className="w-3.5 h-3.5" />
              Attiva
            </>
          )}
        </button>
        <button
          onClick={() => onDismiss(recommendation.id)}
          className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1.5"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
          Ignora
        </button>
      </div>
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function AutomationListPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    rules, templates, recommendations, packages,
    isLoading, fetchRules, deleteRule, toggleRule, fetchTemplates, createFromTemplate,
    fetchRecommendations, applyRecommendation, dismissRecommendation, generateRecommendations,
    fetchPackages, activatePackage,
  } = useAutomationStore()
  const { projects, fetchProjects } = useProjectStore()
  const [showTemplates, setShowTemplates] = useState(false)
  const [showPackages, setShowPackages] = useState(false)
  const [activatingTemplate, setActivatingTemplate] = useState<string | null>(null)
  const [activatingPackage, setActivatingPackage] = useState<string | null>(null)
  const [applyingRecommendation, setApplyingRecommendation] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const [filterProjectId, setFilterProjectId] = useState<string>('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')
  const [filterDomain, setFilterDomain] = useState<AutomationDomain | ''>('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [logsModal, setLogsModal] = useState<{ id: string; name: string } | null>(null)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    void fetchRules(filterProjectId || undefined)
  }, [fetchRules, filterProjectId])

  useEffect(() => {
    void fetchProjects()
    void fetchTemplates()
    void fetchRecommendations()
    void fetchPackages()
  }, [fetchProjects, fetchTemplates, fetchRecommendations, fetchPackages])

  const handleApplyRecommendation = useCallback(async (id: string) => {
    setApplyingRecommendation(id)
    try {
      await applyRecommendation(id)
      toast.success('Suggerimento applicato come nuova regola')
    } catch {
      toast.error('Errore nell\'applicazione del suggerimento')
    } finally {
      setApplyingRecommendation(null)
    }
  }, [applyRecommendation])

  const handleDismissRecommendation = useCallback(async (id: string) => {
    try {
      await dismissRecommendation(id)
    } catch {
      toast.error('Errore nella dismissione del suggerimento')
    }
  }, [dismissRecommendation])

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    try {
      await generateRecommendations()
      toast.success('Suggerimenti rigenerati')
    } catch {
      toast.error('Errore nella rigenerazione')
    } finally {
      setIsGenerating(false)
    }
  }, [generateRecommendations])

  const handleActivatePackage = useCallback(async (key: string) => {
    setActivatingPackage(key)
    try {
      await activatePackage(key, filterProjectId || undefined)
      toast.success('Pacchetto attivato con successo')
    } catch {
      toast.error('Errore nell\'attivazione del pacchetto')
    } finally {
      setActivatingPackage(null)
    }
  }, [activatePackage, filterProjectId])

  const handleToggle = useCallback(
    async (id: string, isActive: boolean) => {
      setTogglingId(id)
      try {
        await toggleRule(id, isActive)
      } catch {
        // error handled by store
      } finally {
        setTogglingId(null)
      }
    },
    [toggleRule]
  )

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setIsDeleting(true)
    try {
      await deleteRule(deleteConfirm.id)
      setDeleteConfirm(null)
    } catch {
      // error handled by store
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredRules = rules.filter((rule) => {
    if (filterActive === 'active' && !rule.isActive) return false
    if (filterActive === 'inactive' && rule.isActive) return false
    if (filterDomain && (rule.domain ?? 'task') !== filterDomain) return false
    return true
  })

  if (isLoading && rules.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary-500" />
            Automazioni
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configura regole automatiche basate su eventi nei tuoi progetti
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => navigate('/admin/automations/new')}
            className="btn-primary flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Nuova Regola
          </button>
        )}
      </div>

      {/* Templates section */}
      {templates.length > 0 && isAdmin && (
        <div className="bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-900/10 rounded-xl border border-primary-200/50 dark:border-primary-800/30 overflow-hidden">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="w-full px-5 py-3 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Modelli Rapidi
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {templates.length} disponibili
              </span>
            </div>
            {showTemplates ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {showTemplates && (
            <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {templates.map((template) => (
                <div
                  key={template.key}
                  className="flex items-center gap-3 p-3 rounded-lg card"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{template.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{template.description}</p>
                  </div>
                  <button
                    onClick={async () => {
                      setActivatingTemplate(template.key)
                      try {
                        await createFromTemplate(template.key)
                        toast.success(`"${template.name}" creata come regola globale`)
                      } catch {
                        toast.error('Errore nella creazione')
                      } finally {
                        setActivatingTemplate(null)
                      }
                    }}
                    disabled={activatingTemplate === template.key}
                    className="flex-shrink-0 px-3 py-1.5 text-xs bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
                  >
                    {activatingTemplate === template.key ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      'Crea'
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recommendations section */}
      {recommendations.length > 0 && isAdmin && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Suggerimenti ({recommendations.length})
            </h2>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Rigenera
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onApply={handleApplyRecommendation}
                onDismiss={handleDismissRecommendation}
                isApplying={applyingRecommendation === rec.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* Packages section */}
      {packages.length > 0 && isAdmin && (
        <div className="bg-gradient-to-r from-violet-50 to-purple-100/50 dark:from-violet-900/20 dark:to-purple-900/10 rounded-xl border border-violet-200/50 dark:border-violet-800/30 overflow-hidden">
          <button
            onClick={() => setShowPackages(!showPackages)}
            className="w-full px-5 py-3 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Pacchetti Automazione
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {packages.length} disponibili
              </span>
            </div>
            {showPackages ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {showPackages && (
            <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {packages.map((pkg) => (
                <div
                  key={pkg.key}
                  className="flex items-start gap-3 p-4 rounded-lg card"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{pkg.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{pkg.description}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {pkg.templates.length} {pkg.templates.length === 1 ? 'regola' : 'regole'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleActivatePackage(pkg.key)}
                    disabled={activatingPackage === pkg.key}
                    className="flex-shrink-0 px-3 py-1.5 text-xs bg-violet-500 text-white rounded-lg hover:bg-violet-600 disabled:opacity-50 transition-colors"
                  >
                    {activatingPackage === pkg.key ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      'Attiva pacchetto'
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Project filter */}
        <select
          value={filterProjectId}
          onChange={(e) => setFilterProjectId(e.target.value)}
          aria-label="Filtra per progetto"
          className="input text-sm w-auto"
        >
          <option value="">Tutti i progetti</option>
          <option value="__global__">Solo globali</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Domain filter */}
        <select
          value={filterDomain}
          onChange={(e) => setFilterDomain(e.target.value as AutomationDomain | '')}
          aria-label="Filtra per dominio"
          className="input text-sm w-auto"
        >
          <option value="">Tutti i domini</option>
          <option value="task">Task</option>
          <option value="risk">Rischi</option>
          <option value="document">Documenti</option>
          <option value="project">Progetti</option>
        </select>

        {/* Active/inactive filter */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {(['all', 'active', 'inactive'] as const).map((val) => (
            <button
              key={val}
              onClick={() => setFilterActive(val)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
                filterActive === val
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {val === 'all' ? 'Tutte' : val === 'active' ? 'Attive' : 'Inattive'}
            </button>
          ))}
        </div>

        {/* Summary count */}
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {filteredRules.length} {filteredRules.length === 1 ? 'regola' : 'regole'}
        </span>
      </div>

      {/* Rules list */}
      {filteredRules.length === 0 ? (
        <div className="card p-12 text-center">
          <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {rules.length === 0 ? 'Nessuna automazione' : 'Nessuna regola corrisponde ai filtri'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {rules.length === 0
              ? 'Crea la prima regola per automatizzare i processi del tuo team'
              : 'Modifica i filtri per vedere le regole esistenti'}
          </p>
          {isAdmin && rules.length === 0 && (
            <button
              onClick={() => navigate('/admin/automations/new')}
              className="btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crea Regola
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onEdit={(id) => navigate(`/admin/automations/${id}/edit`)}
              onDelete={(id, name) => setDeleteConfirm({ id, name })}
              onViewLogs={(id) => setLogsModal({ id, name: rule.name })}
              onToggle={handleToggle}
              isToggling={togglingId === rule.id}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Elimina regola"
        message={`Sei sicuro di voler eliminare la regola "${deleteConfirm?.name}"? L'operazione non può essere annullata e tutti i log associati verranno rimossi.`}
        confirmLabel="Elimina"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Logs modal */}
      {logsModal && (
        <LogsModal
          ruleId={logsModal.id}
          ruleName={logsModal.name}
          onClose={() => setLogsModal(null)}
        />
      )}
    </div>
  )
}
