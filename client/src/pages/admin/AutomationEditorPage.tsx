/**
 * Automation Editor Page - Step-by-step rule builder for automation rules
 * @module pages/admin/AutomationEditorPage
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Zap,
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Save,
  ChevronRight,
  CheckSquare,
  AlertTriangle,
  FileText,
  FolderKanban,
} from 'lucide-react'
import {
  useAutomationStore,
  AutomationDomain,
  TriggerType,
  ActionType,
  ConditionType,
  TriggerConfig,
  ConditionConfig,
  ActionConfig,
} from '@stores/automationStore'
import { useProjectStore } from '@stores/projectStore'
import { useUserStore } from '@stores/userStore'

// ============================================================
// CONSTANTS
// ============================================================

const DOMAIN_OPTIONS: { value: AutomationDomain; label: string; description: string; icon: typeof CheckSquare }[] = [
  { value: 'task', label: 'Task', description: 'Automazioni su task, subtask e milestone', icon: CheckSquare },
  { value: 'risk', label: 'Rischi', description: 'Automazioni su rischi di progetto', icon: AlertTriangle },
  { value: 'document', label: 'Documenti', description: 'Automazioni su documenti e revisioni', icon: FileText },
  { value: 'project', label: 'Progetti', description: 'Automazioni su stati e scadenze progetto', icon: FolderKanban },
]

const TRIGGER_OPTIONS_BY_DOMAIN: Record<AutomationDomain, { value: TriggerType; label: string; description: string }[]> = {
  task: [
    { value: 'task_status_changed', label: 'Cambio stato', description: 'Quando lo stato cambia' },
    { value: 'task_created', label: 'Task creato', description: 'Quando un task viene creato' },
    { value: 'task_assigned', label: 'Task assegnato', description: 'Quando viene assegnato' },
    { value: 'all_subtasks_completed', label: 'Subtask completati', description: 'Quando tutti i subtask sono completati' },
    { value: 'task_overdue', label: 'Task scaduto', description: 'Quando supera la scadenza' },
    { value: 'task_deadline_approaching', label: 'Scadenza imminente', description: 'Quando la scadenza si avvicina' },
    { value: 'task_updated', label: 'Task aggiornato', description: 'Quando un campo cambia' },
    { value: 'task_commented', label: 'Nuovo commento', description: 'Quando viene aggiunto un commento' },
    { value: 'task_idle', label: 'Task inattivo', description: 'Quando un task non viene aggiornato' },
  ],
  risk: [
    { value: 'risk_created', label: 'Rischio creato', description: 'Quando un rischio viene creato' },
    { value: 'risk_status_changed', label: 'Cambio stato rischio', description: 'Quando lo stato cambia' },
    { value: 'risk_level_changed', label: 'Cambio livello', description: 'Quando probabilita/impatto cambia' },
  ],
  document: [
    { value: 'document_created', label: 'Documento creato', description: 'Quando un documento viene creato' },
    { value: 'document_status_changed', label: 'Cambio stato', description: 'Quando lo stato cambia' },
    { value: 'document_review_due', label: 'Revisione in scadenza', description: 'Quando la revisione si avvicina' },
  ],
  project: [
    { value: 'project_status_changed', label: 'Cambio stato progetto', description: 'Quando lo stato cambia' },
    { value: 'project_deadline_approaching', label: 'Scadenza progetto', description: 'Quando la scadenza si avvicina' },
  ],
}

// Flat list for backwards compat / lookup
const ALL_TRIGGER_OPTIONS = Object.values(TRIGGER_OPTIONS_BY_DOMAIN).flat()

const ACTION_OPTIONS_BY_DOMAIN: Record<AutomationDomain, { value: ActionType; label: string }[]> = {
  task: [
    { value: 'notify_user', label: 'Notifica Utente' },
    { value: 'notify_assignee', label: 'Notifica Assegnatario' },
    { value: 'notify_project_owner', label: 'Notifica Project Owner' },
    { value: 'update_parent_status', label: 'Aggiorna Status Parent' },
    { value: 'set_task_field', label: 'Modifica Campo Task' },
    { value: 'create_comment', label: 'Crea Commento' },
    { value: 'assign_to_user', label: 'Assegna a Utente' },
    { value: 'create_task', label: 'Crea Task' },
    { value: 'send_email', label: 'Invia Email' },
  ],
  risk: [
    { value: 'notify_user', label: 'Notifica Utente' },
    { value: 'notify_project_owner', label: 'Notifica Project Owner' },
    { value: 'set_risk_field', label: 'Modifica Campo Rischio' },
    { value: 'create_comment', label: 'Crea Commento' },
    { value: 'create_task', label: 'Crea Task' },
    { value: 'send_email', label: 'Invia Email' },
  ],
  document: [
    { value: 'notify_user', label: 'Notifica Utente' },
    { value: 'notify_project_owner', label: 'Notifica Project Owner' },
    { value: 'set_document_field', label: 'Modifica Campo Documento' },
    { value: 'create_comment', label: 'Crea Commento' },
    { value: 'send_email', label: 'Invia Email' },
  ],
  project: [
    { value: 'notify_user', label: 'Notifica Utente' },
    { value: 'notify_project_owner', label: 'Notifica Project Owner' },
    { value: 'set_project_field', label: 'Modifica Campo Progetto' },
    { value: 'create_task', label: 'Crea Task' },
    { value: 'send_email', label: 'Invia Email' },
  ],
}

// Flat list for lookup
const ALL_ACTION_OPTIONS = Object.values(ACTION_OPTIONS_BY_DOMAIN).flat()

const CONDITION_OPTIONS_BY_DOMAIN: Record<AutomationDomain, { value: ConditionType; label: string }[]> = {
  task: [
    { value: 'task_priority_is', label: 'Priorita\' task uguale a' },
    { value: 'task_type_is', label: 'Tipo task uguale a' },
    { value: 'task_has_assignee', label: 'Task ha un assegnatario' },
    { value: 'task_in_project', label: 'Task appartiene al progetto' },
    { value: 'task_has_subtasks', label: 'Task ha subtask' },
    { value: 'task_field_equals', label: 'Campo task uguale a' },
  ],
  risk: [
    { value: 'risk_probability_is', label: 'Probabilita\' uguale a' },
    { value: 'risk_impact_is', label: 'Impatto uguale a' },
    { value: 'risk_category_is', label: 'Categoria uguale a' },
  ],
  document: [
    { value: 'document_type_is', label: 'Tipo documento uguale a' },
  ],
  project: [
    { value: 'project_status_is', label: 'Stato progetto uguale a' },
    { value: 'project_priority_is', label: 'Priorita\' progetto uguale a' },
  ],
}

const STATUS_OPTIONS = [
  { value: 'todo', label: 'Da fare' },
  { value: 'in_progress', label: 'In corso' },
  { value: 'review', label: 'In revisione' },
  { value: 'done', label: 'Completato' },
  { value: 'blocked', label: 'Bloccato' },
  { value: 'cancelled', label: 'Annullato' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Bassa' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Critica' },
]

const TASK_TYPE_OPTIONS = [
  { value: 'milestone', label: 'Milestone' },
  { value: 'task', label: 'Task' },
  { value: 'subtask', label: 'Subtask' },
]

const TASK_FIELD_OPTIONS = [
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priorità' },
]

const STEPS = [
  { number: 1, label: 'Dominio' },
  { number: 2, label: 'Info Base' },
  { number: 3, label: 'Trigger' },
  { number: 4, label: 'Condizioni' },
  { number: 5, label: 'Azioni' },
  { number: 6, label: 'Riepilogo' },
]

const COOLDOWN_PRESETS = [
  { value: 0, label: 'Nessuno' },
  { value: 60, label: '1 ora' },
  { value: 1440, label: '1 giorno' },
  { value: 10080, label: '1 settimana' },
]

// ============================================================
// FORM STATE TYPES
// ============================================================

interface StepDomainData {
  domain: AutomationDomain
}

interface Step1Data {
  name: string
  description: string
  projectId: string
}

interface Step2Data {
  triggerType: TriggerType
  triggerParams: Record<string, string>
}

interface Step3Data {
  conditions: Array<{
    type: ConditionType
    params: Record<string, string>
  }>
  conditionLogic: 'AND' | 'OR'
}

interface Step4Data {
  actions: Array<{
    type: ActionType
    params: Record<string, string>
  }>
}

interface Step5Data {
  isActive: boolean
  priority: number
  cooldownMinutes: number
}


// ============================================================
// STEP INDICATOR
// ============================================================

interface StepIndicatorProps {
  currentStep: number
  onStepClick: (step: number) => void
  completedUpTo: number
}

function StepIndicator({ currentStep, onStepClick, completedUpTo }: StepIndicatorProps) {
  return (
    <nav aria-label="Fasi del wizard" className="card p-4">
      <ol className="flex items-center gap-0">
        {STEPS.map((step, index) => {
          const isActive = step.number === currentStep
          const isCompleted = step.number < currentStep
          const isClickable = step.number <= completedUpTo + 1

          return (
            <li key={step.number} className="flex items-center flex-1 min-w-0">
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step.number)}
                disabled={!isClickable}
                aria-current={isActive ? 'step' : undefined}
                className={`flex flex-col items-center gap-1 w-full transition-opacity duration-150 ${
                  isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'
                }`}
              >
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                    transition-colors duration-200
                    ${isActive
                      ? 'bg-cyan-600 text-white ring-4 ring-cyan-100 dark:ring-cyan-900/50'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400'
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={`text-xs hidden sm:block font-medium ${
                    isActive
                      ? 'text-cyan-600 dark:text-cyan-400'
                      : isCompleted
                      ? 'text-slate-700 dark:text-slate-300'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
              </button>

              {/* Connector line (except after last step) */}
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-colors duration-200 ${
                    step.number < currentStep
                      ? 'bg-cyan-600'
                      : 'bg-slate-200 dark:bg-slate-600'
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// ============================================================
// STEP 1 - DOMINIO
// ============================================================

interface StepDomainProps {
  data: StepDomainData
  onChange: (data: StepDomainData) => void
}

function StepDomainForm({ data, onChange }: StepDomainProps) {
  return (
    <div className="card space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Dominio</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Scegli su quale area agisce questa automazione
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Dominio automazione">
        {DOMAIN_OPTIONS.map((opt) => {
          const Icon = opt.icon
          const isSelected = data.domain === opt.value
          return (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all duration-150 ${
                isSelected
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <input
                type="radio"
                name="domain"
                value={opt.value}
                checked={isSelected}
                onChange={() => onChange({ domain: opt.value })}
                className="mt-0.5 text-cyan-600 focus:ring-cyan-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{opt.label}</p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{opt.description}</p>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// STEP 2 - INFORMAZIONI BASE
// ============================================================

interface Step1Props {
  data: Step1Data
  onChange: (data: Step1Data) => void
  errors: Partial<Record<keyof Step1Data, string>>
  projects: Array<{ id: string; code: string; name: string }>
}

function Step1Form({ data, onChange, errors, projects }: Step1Props) {
  return (
    <div className="card space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Informazioni Base</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Dai un nome alla regola e specifica il suo ambito
        </p>
      </div>

      {/* Name */}
      <div>
        <label htmlFor="rule-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Nome <span className="text-red-500">*</span>
        </label>
        <input
          id="rule-name"
          type="text"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder="es. Notifica manager su task bloccati"
          maxLength={200}
          className={`input ${errors.name ? 'input-error' : ''}`}
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-500">{errors.name}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="rule-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Descrizione
        </label>
        <textarea
          id="rule-description"
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          rows={3}
          placeholder="Descrizione opzionale della regola..."
          maxLength={1000}
          className="input resize-none"
        />
      </div>

      {/* Project scope */}
      <div>
        <label htmlFor="rule-project" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Progetto
        </label>
        <select
          id="rule-project"
          value={data.projectId}
          onChange={(e) => onChange({ ...data, projectId: e.target.value })}
          className="input"
        >
          <option value="">Globale (tutti i progetti)</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Lascia vuoto per applicare la regola a tutti i progetti
        </p>
      </div>
    </div>
  )
}

// ============================================================
// STEP 3 - TRIGGER
// ============================================================

interface Step2Props {
  data: Step2Data
  onChange: (data: Step2Data) => void
  errors: Partial<Record<string, string>>
  domain: AutomationDomain
}

function Step2Form({ data, onChange, errors, domain }: Step2Props) {
  const updateParam = (key: string, value: string) => {
    onChange({ ...data, triggerParams: { ...data.triggerParams, [key]: value } })
  }

  const handleTriggerTypeChange = (type: TriggerType) => {
    onChange({ triggerType: type, triggerParams: {} })
  }

  const triggerOptions = TRIGGER_OPTIONS_BY_DOMAIN[domain] ?? []

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Trigger</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Scegli quale evento avvia questa automazione
        </p>
      </div>

      {/* Trigger type selection */}
      <div className="space-y-2" role="radiogroup" aria-label="Tipo di trigger">
        {triggerOptions.map((opt) => {
          const isSelected = data.triggerType === opt.value
          return (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all duration-150 ${
                isSelected
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <input
                type="radio"
                name="triggerType"
                value={opt.value}
                checked={isSelected}
                onChange={() => handleTriggerTypeChange(opt.value)}
                className="mt-0.5 text-cyan-600 focus:ring-cyan-500"
              />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{opt.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{opt.description}</p>
              </div>
            </label>
          )
        })}
      </div>

      {errors.triggerType && (
        <p className="text-xs text-red-500">{errors.triggerType}</p>
      )}

      {/* Trigger-specific params */}
      {data.triggerType === 'task_status_changed' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Da status (opzionale)</label>
            <select
              value={data.triggerParams.fromStatus ?? ''}
              onChange={(e) => updateParam('fromStatus', e.target.value)}
              className="input"
            >
              <option value="">Qualsiasi status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">A status (opzionale)</label>
            <select
              value={data.triggerParams.toStatus ?? ''}
              onChange={(e) => updateParam('toStatus', e.target.value)}
              className="input"
            >
              <option value="">Qualsiasi status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {data.triggerType === 'task_deadline_approaching' && (
        <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Giorni prima della scadenza <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            max={30}
            value={data.triggerParams.daysBeforeDeadline ?? 1}
            onChange={(e) => updateParam('daysBeforeDeadline', e.target.value)}
            className="input"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            L'automazione si attivera' questo numero di giorni prima della scadenza del task
          </p>
        </div>
      )}

      {data.triggerType === 'task_created' && (
        <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo task (opzionale)</label>
          <select
            value={data.triggerParams.taskType ?? ''}
            onChange={(e) => updateParam('taskType', e.target.value)}
            className="input"
          >
            <option value="">Qualsiasi tipo</option>
            {TASK_TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      )}

      {data.triggerType === 'task_idle' && (
        <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Giorni di inattivita <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            max={90}
            value={data.triggerParams.idleDays ?? 7}
            onChange={(e) => updateParam('idleDays', e.target.value)}
            className="input max-w-xs"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Il task viene considerato inattivo dopo questo numero di giorni senza aggiornamenti
          </p>
        </div>
      )}

      {data.triggerType === 'document_review_due' && (
        <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Giorni prima della scadenza revisione
          </label>
          <input
            type="number"
            min={1}
            max={30}
            value={data.triggerParams.daysBeforeReview ?? 3}
            onChange={(e) => updateParam('daysBeforeReview', e.target.value)}
            className="input max-w-xs"
          />
        </div>
      )}

      {data.triggerType === 'project_deadline_approaching' && (
        <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Giorni prima della scadenza progetto
          </label>
          <input
            type="number"
            min={1}
            max={60}
            value={data.triggerParams.daysBeforeDeadline ?? 7}
            onChange={(e) => updateParam('daysBeforeDeadline', e.target.value)}
            className="input max-w-xs"
          />
        </div>
      )}
    </div>
  )
}

// ============================================================
// STEP 4 - CONDIZIONI
// ============================================================

interface Step3Props {
  data: Step3Data
  onChange: (data: Step3Data) => void
  projects: Array<{ id: string; code: string; name: string }>
  domain: AutomationDomain
}

function Step3Form({ data, onChange, projects, domain }: Step3Props) {
  const conditionOptions = CONDITION_OPTIONS_BY_DOMAIN[domain] ?? []
  const defaultConditionType = conditionOptions[0]?.value ?? 'task_priority_is'

  const addCondition = () => {
    onChange({
      ...data,
      conditions: [...data.conditions, { type: defaultConditionType, params: {} }],
    })
  }

  const removeCondition = (index: number) => {
    onChange({
      ...data,
      conditions: data.conditions.filter((_, i) => i !== index),
    })
  }

  const updateConditionType = (index: number, type: ConditionType) => {
    const updated = [...data.conditions]
    updated[index] = { type, params: {} }
    onChange({ ...data, conditions: updated })
  }

  const updateConditionParam = (index: number, key: string, value: string) => {
    const updated = [...data.conditions]
    updated[index] = { ...updated[index], params: { ...updated[index].params, [key]: value } }
    onChange({ ...data, conditions: updated })
  }

  return (
    <div className="card space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Condizioni
            <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">(opzionale)</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Aggiungi filtri per limitare quando la regola si attiva
          </p>
        </div>
        <button
          type="button"
          onClick={addCondition}
          className="btn-secondary flex items-center gap-1.5 text-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Aggiungi
        </button>
      </div>

      {/* AND/OR toggle */}
      {data.conditions.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 dark:text-slate-400">Logica:</span>
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => onChange({ ...data, conditionLogic: 'AND' })}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                data.conditionLogic === 'AND'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              AND
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...data, conditionLogic: 'OR' })}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                data.conditionLogic === 'OR'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              OR
            </button>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {data.conditionLogic === 'AND' ? 'Tutte le condizioni devono essere vere' : 'Almeno una condizione deve essere vera'}
          </span>
        </div>
      )}

      {data.conditions.length === 0 ? (
        <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nessuna condizione. La regola si attiva per qualsiasi evento del trigger selezionato.
          </p>
          <button
            type="button"
            onClick={addCondition}
            className="mt-3 text-sm text-cyan-600 dark:text-cyan-400 hover:underline"
          >
            Aggiungi una condizione
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {data.conditions.map((condition, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
            >
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Condition type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Condizione</label>
                  <select
                    value={condition.type}
                    onChange={(e) => updateConditionType(index, e.target.value as ConditionType)}
                    className="input"
                  >
                    {conditionOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Condition params */}
                {condition.type === 'task_priority_is' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Priorità</label>
                    <select
                      value={(condition.params.value as string) ?? ''}
                      onChange={(e) => updateConditionParam(index, 'value', e.target.value)}
                      className="input"
                    >
                      <option value="">Seleziona...</option>
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {condition.type === 'task_type_is' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo task</label>
                    <select
                      value={(condition.params.value as string) ?? ''}
                      onChange={(e) => updateConditionParam(index, 'value', e.target.value)}
                      className="input"
                    >
                      <option value="">Seleziona...</option>
                      {TASK_TYPE_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {condition.type === 'task_in_project' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Progetto</label>
                    <select
                      value={(condition.params.projectId as string) ?? ''}
                      onChange={(e) => updateConditionParam(index, 'projectId', e.target.value)}
                      className="input"
                    >
                      <option value="">Seleziona...</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {condition.type === 'task_has_assignee' && (
                  <div className="flex items-end pb-2">
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                      Nessun parametro richiesto
                    </p>
                  </div>
                )}

                {condition.type === 'task_has_subtasks' && (
                  <div className="flex items-end pb-2">
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                      Nessun parametro richiesto
                    </p>
                  </div>
                )}

                {condition.type === 'task_field_equals' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Campo</label>
                      <select
                        value={(condition.params.field as string) ?? ''}
                        onChange={(e) => updateConditionParam(index, 'field', e.target.value)}
                        className="input"
                      >
                        <option value="">Seleziona campo...</option>
                        <option value="status">Stato</option>
                        <option value="priority">Priorita'</option>
                        <option value="taskType">Tipo task</option>
                        <option value="assigneeId">Assegnatario ID</option>
                        <option value="projectId">Progetto ID</option>
                        <option value="departmentId">Reparto ID</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valore</label>
                      <input
                        type="text"
                        value={(condition.params.value as string) ?? ''}
                        onChange={(e) => updateConditionParam(index, 'value', e.target.value)}
                        placeholder="Valore da confrontare"
                        className="input"
                      />
                    </div>
                  </div>
                )}

                {/* Risk domain conditions */}
                {condition.type === 'risk_probability_is' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Probabilita</label>
                    <select
                      value={(condition.params.value as string) ?? ''}
                      onChange={(e) => updateConditionParam(index, 'value', e.target.value)}
                      className="input"
                    >
                      <option value="">Seleziona...</option>
                      <option value="low">Bassa</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>
                )}

                {condition.type === 'risk_impact_is' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Impatto</label>
                    <select
                      value={(condition.params.value as string) ?? ''}
                      onChange={(e) => updateConditionParam(index, 'value', e.target.value)}
                      className="input"
                    >
                      <option value="">Seleziona...</option>
                      <option value="low">Basso</option>
                      <option value="medium">Medio</option>
                      <option value="high">Alto</option>
                    </select>
                  </div>
                )}

                {condition.type === 'risk_category_is' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                    <select
                      value={(condition.params.value as string) ?? ''}
                      onChange={(e) => updateConditionParam(index, 'value', e.target.value)}
                      className="input"
                    >
                      <option value="">Seleziona...</option>
                      <option value="technical">Tecnico</option>
                      <option value="regulatory">Normativo</option>
                      <option value="resource">Risorse</option>
                      <option value="schedule">Tempistica</option>
                    </select>
                  </div>
                )}

                {/* Document domain conditions */}
                {condition.type === 'document_type_is' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo documento</label>
                    <select
                      value={(condition.params.value as string) ?? ''}
                      onChange={(e) => updateConditionParam(index, 'value', e.target.value)}
                      className="input"
                    >
                      <option value="">Seleziona...</option>
                      <option value="design_input">Design Input</option>
                      <option value="design_output">Design Output</option>
                      <option value="verification_report">Report Verifica</option>
                      <option value="validation_report">Report Validazione</option>
                      <option value="change_control">Change Control</option>
                    </select>
                  </div>
                )}

                {/* Project domain conditions */}
                {condition.type === 'project_status_is' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Stato progetto</label>
                    <select
                      value={(condition.params.value as string) ?? ''}
                      onChange={(e) => updateConditionParam(index, 'value', e.target.value)}
                      className="input"
                    >
                      <option value="">Seleziona...</option>
                      <option value="planning">Pianificazione</option>
                      <option value="design">Design</option>
                      <option value="verification">Verifica</option>
                      <option value="validation">Validazione</option>
                      <option value="transfer">Trasferimento</option>
                      <option value="maintenance">Manutenzione</option>
                      <option value="completed">Completato</option>
                      <option value="on_hold">In pausa</option>
                    </select>
                  </div>
                )}

                {condition.type === 'project_priority_is' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Priorita progetto</label>
                    <select
                      value={(condition.params.value as string) ?? ''}
                      onChange={(e) => updateConditionParam(index, 'value', e.target.value)}
                      className="input"
                    >
                      <option value="">Seleziona...</option>
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeCondition(index)}
                aria-label="Rimuovi condizione"
                className="mt-6 btn-icon text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// STEP 5 - AZIONI
// ============================================================

interface Step4Props {
  data: Step4Data
  onChange: (data: Step4Data) => void
  errors: Partial<Record<string, string>>
  users: Array<{ id: string; firstName: string; lastName: string }>
  domain: AutomationDomain
}

function Step4Form({ data, onChange, errors, users, domain }: Step4Props) {
  const actionOptions = ACTION_OPTIONS_BY_DOMAIN[domain] ?? []
  const addAction = () => {
    onChange({
      actions: [...data.actions, { type: 'notify_assignee', params: {} }],
    })
  }

  const removeAction = (index: number) => {
    onChange({
      actions: data.actions.filter((_, i) => i !== index),
    })
  }

  const updateActionType = (index: number, type: ActionType) => {
    const updated = [...data.actions]
    updated[index] = { type, params: {} }
    onChange({ actions: updated })
  }

  const updateActionParam = (index: number, key: string, value: string) => {
    const updated = [...data.actions]
    updated[index] = { ...updated[index], params: { ...updated[index].params, [key]: value } }
    onChange({ actions: updated })
  }

  return (
    <div className="card space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Azioni
            <span className="ml-2 text-xs font-normal text-red-400">almeno 1 richiesta</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Definisci cosa deve succedere quando la regola si attiva
          </p>
        </div>
        <button
          type="button"
          onClick={addAction}
          className="btn-secondary flex items-center gap-1.5 text-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Aggiungi
        </button>
      </div>

      {errors.actions && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {errors.actions}
        </p>
      )}

      {data.actions.length === 0 ? (
        <div className="py-8 text-center border-2 border-dashed border-red-200 dark:border-red-800/50 rounded-lg bg-red-50/50 dark:bg-red-900/10">
          <p className="text-sm text-red-500 dark:text-red-400">
            Aggiungi almeno un'azione da eseguire
          </p>
          <button
            type="button"
            onClick={addAction}
            className="mt-3 text-sm text-cyan-600 dark:text-cyan-400 hover:underline"
          >
            Aggiungi un'azione
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {data.actions.map((action, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
            >
              <div className="flex-1 space-y-3">
                {/* Action type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo azione</label>
                  <select
                    value={action.type}
                    onChange={(e) => updateActionType(index, e.target.value as ActionType)}
                    className="input"
                  >
                    {actionOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Action-specific params */}
                {action.type === 'notify_user' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Utente <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={(action.params.userId as string) ?? ''}
                        onChange={(e) => updateActionParam(index, 'userId', e.target.value)}
                        className="input"
                      >
                        <option value="">Seleziona utente...</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.firstName} {u.lastName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Messaggio</label>
                      <input
                        type="text"
                        value={(action.params.message as string) ?? ''}
                        onChange={(e) => updateActionParam(index, 'message', e.target.value)}
                        placeholder="Testo della notifica (opzionale)"
                        className="input"
                      />
                    </div>
                  </div>
                )}

                {(action.type === 'notify_assignee' || action.type === 'notify_project_owner') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Messaggio</label>
                    <textarea
                      value={(action.params.message as string) ?? ''}
                      onChange={(e) => updateActionParam(index, 'message', e.target.value)}
                      rows={2}
                      placeholder="Testo della notifica (opzionale)"
                      className="input resize-none"
                    />
                  </div>
                )}

                {action.type === 'update_parent_status' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Nuovo status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={(action.params.status as string) ?? ''}
                      onChange={(e) => updateActionParam(index, 'status', e.target.value)}
                      className="input"
                    >
                      <option value="">Seleziona status...</option>
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {action.type === 'set_task_field' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Campo <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={(action.params.field as string) ?? ''}
                        onChange={(e) => updateActionParam(index, 'field', e.target.value)}
                        className="input"
                      >
                        <option value="">Seleziona campo...</option>
                        {TASK_FIELD_OPTIONS.map((f) => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Valore <span className="text-red-500">*</span>
                      </label>
                      {action.params.field === 'status' ? (
                        <select
                          value={(action.params.value as string) ?? ''}
                          onChange={(e) => updateActionParam(index, 'value', e.target.value)}
                          className="input"
                        >
                          <option value="">Seleziona valore...</option>
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      ) : action.params.field === 'priority' ? (
                        <select
                          value={(action.params.value as string) ?? ''}
                          onChange={(e) => updateActionParam(index, 'value', e.target.value)}
                          className="input"
                        >
                          <option value="">Seleziona valore...</option>
                          {PRIORITY_OPTIONS.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={(action.params.value as string) ?? ''}
                          onChange={(e) => updateActionParam(index, 'value', e.target.value)}
                          placeholder="Valore..."
                          className="input"
                        />
                      )}
                    </div>
                  </div>
                )}

                {action.type === 'create_comment' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Testo commento <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={(action.params.message as string) ?? ''}
                      onChange={(e) => updateActionParam(index, 'message', e.target.value)}
                      rows={3}
                      placeholder="Testo del commento che verrà aggiunto..."
                      className="input resize-none"
                    />
                  </div>
                )}

                {action.type === 'assign_to_user' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Utente <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={(action.params.userId as string) ?? ''}
                      onChange={(e) => updateActionParam(index, 'userId', e.target.value)}
                      className="input"
                    >
                      <option value="">Seleziona utente...</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.firstName} {u.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {action.type === 'send_email' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Destinatario <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={(action.params.recipientType as string) ?? 'assignee'}
                        onChange={(e) => updateActionParam(index, 'recipientType', e.target.value)}
                        className="input"
                      >
                        <option value="assignee">Assegnatario</option>
                        <option value="project_owner">Project Owner</option>
                        <option value="specific_user">Utente specifico</option>
                      </select>
                    </div>
                    {action.params.recipientType === 'specific_user' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Utente</label>
                        <select
                          value={(action.params.userId as string) ?? ''}
                          onChange={(e) => updateActionParam(index, 'userId', e.target.value)}
                          className="input"
                        >
                          <option value="">Seleziona utente...</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Messaggio</label>
                      <textarea
                        value={(action.params.message as string) ?? ''}
                        onChange={(e) => updateActionParam(index, 'message', e.target.value)}
                        rows={2}
                        placeholder="Testo dell'email..."
                        className="input resize-none"
                      />
                    </div>
                  </div>
                )}

                {(action.type === 'set_risk_field' || action.type === 'set_document_field' || action.type === 'set_project_field') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Campo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={(action.params.field as string) ?? ''}
                        onChange={(e) => updateActionParam(index, 'field', e.target.value)}
                        placeholder="Nome campo..."
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Valore <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={(action.params.value as string) ?? ''}
                        onChange={(e) => updateActionParam(index, 'value', e.target.value)}
                        placeholder="Valore..."
                        className="input"
                      />
                    </div>
                  </div>
                )}

                {action.type === 'create_task' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Titolo task <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={(action.params.title as string) ?? ''}
                        onChange={(e) => updateActionParam(index, 'title', e.target.value)}
                        placeholder="Titolo del task da creare..."
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assegnatario</label>
                      <select
                        value={(action.params.assigneeId as string) ?? ''}
                        onChange={(e) => updateActionParam(index, 'assigneeId', e.target.value)}
                        className="input"
                      >
                        <option value="">Non assegnato</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeAction(index)}
                aria-label="Rimuovi azione"
                disabled={data.actions.length === 1}
                className="mt-6 btn-icon text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// STEP 6 - RIEPILOGO
// ============================================================

interface SummaryRowProps {
  label: string
  value: string
}

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <span className="text-sm text-slate-500 dark:text-slate-400 w-28 shrink-0">{label}</span>
      <span className="text-sm text-slate-900 dark:text-white font-medium flex-1">{value}</span>
    </div>
  )
}

interface Step5Props {
  stepDomain: StepDomainData
  step1: Step1Data
  step2: Step2Data
  step3: Step3Data
  step4: Step4Data
  data: Step5Data
  onChange: (data: Step5Data) => void
  projects: Array<{ id: string; code: string; name: string }>
  isEditMode: boolean
  isSubmitting: boolean
  submitError: string | null
  onSave: () => void
}

function Step5Summary({
  stepDomain,
  step1,
  step2,
  step3,
  step4,
  data,
  onChange,
  projects,
  isEditMode,
  isSubmitting,
  submitError,
  onSave,
}: Step5Props) {
  const triggerLabel = ALL_TRIGGER_OPTIONS.find((t) => t.value === step2.triggerType)?.label ?? step2.triggerType
  const domainLabel = DOMAIN_OPTIONS.find((d) => d.value === stepDomain.domain)?.label ?? stepDomain.domain
  const projectLabel = step1.projectId
    ? (() => {
        const p = projects.find((p) => p.id === step1.projectId)
        return p ? p.name : step1.projectId
      })()
    : 'Globale'

  return (
    <div className="space-y-4">
      {/* Rule summary */}
      <div className="card space-y-1">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">
          Riepilogo Regola
        </h2>
        <SummaryRow label="Dominio" value={domainLabel} />
        <SummaryRow label="Nome" value={step1.name || '—'} />
        <SummaryRow label="Progetto" value={projectLabel} />
        <SummaryRow label="Trigger" value={triggerLabel} />
        <SummaryRow
          label="Condizioni"
          value={
            step3.conditions.length === 0
              ? 'Nessuna condizione'
              : `${step3.conditions.length} condizione${step3.conditions.length > 1 ? 'i' : 'e'} (${step3.conditionLogic})`
          }
        />
        <SummaryRow
          label="Azioni"
          value={
            step4.actions.length === 0
              ? 'Nessuna azione'
              : step4.actions
                  .map((a) => ALL_ACTION_OPTIONS.find((opt) => opt.value === a.type)?.label ?? a.type)
                  .join(', ')
          }
        />
        {step1.description && (
          <SummaryRow label="Descrizione" value={step1.description} />
        )}
      </div>

      {/* Settings */}
      <div className="card space-y-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Impostazioni</h2>

        {/* Active toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Attiva regola</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Le regole inattive non vengono eseguite
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={data.isActive}
            onClick={() => onChange({ ...data, isActive: !data.isActive })}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full
              transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2
              dark:focus:ring-offset-slate-800
              ${data.isActive ? 'bg-cyan-600 dark:bg-cyan-500' : 'bg-slate-200 dark:bg-slate-600'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white shadow
                transition-transform duration-200
                ${data.isActive ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {/* Priority */}
        <div>
          <label htmlFor="rule-priority" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Priorità di esecuzione
          </label>
          <input
            id="rule-priority"
            type="number"
            min={0}
            max={9999}
            value={data.priority}
            onChange={(e) => onChange({ ...data, priority: parseInt(e.target.value, 10) || 0 })}
            className="input max-w-xs"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Regole con priorità più alta vengono eseguite prima (0 = default)
          </p>
        </div>

        {/* Cooldown */}
        <div>
          <label htmlFor="rule-cooldown" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Cooldown (minuti)
          </label>
          <div className="flex items-center gap-3">
            <input
              id="rule-cooldown"
              type="number"
              min={0}
              max={525600}
              value={data.cooldownMinutes}
              onChange={(e) => onChange({ ...data, cooldownMinutes: parseInt(e.target.value, 10) || 0 })}
              className="input max-w-[140px]"
            />
            <div className="flex gap-1.5">
              {COOLDOWN_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onChange({ ...data, cooldownMinutes: preset.value })}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                    data.cooldownMinutes === preset.value
                      ? 'bg-cyan-100 border-cyan-300 text-cyan-700 dark:bg-cyan-900/40 dark:border-cyan-700 dark:text-cyan-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Tempo minimo tra due esecuzioni consecutive (0 = nessun limite)
          </p>
        </div>
      </div>

      {/* Submit error */}
      {submitError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">{submitError}</p>
        </div>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={isSubmitting}
          className="btn-primary flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvataggio...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {isEditMode ? 'Salva Modifiche' : 'Crea Regola'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function AutomationEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentRule, isLoading, fetchRule, createRule, updateRule } = useAutomationStore()
  const { projects, fetchProjects } = useProjectStore()
  const { users, fetchUsers } = useUserStore()

  const isEditMode = Boolean(id)

  // Step state
  const [currentStep, setCurrentStep] = useState(1)
  const [highestStep, setHighestStep] = useState(1)

  // Form data per step
  const [stepDomain, setStepDomain] = useState<StepDomainData>({ domain: 'task' })
  const [step1, setStep1] = useState<Step1Data>({ name: '', description: '', projectId: '' })
  const [step2, setStep2] = useState<Step2Data>({ triggerType: 'task_status_changed', triggerParams: {} })
  const [step3, setStep3] = useState<Step3Data>({ conditions: [], conditionLogic: 'AND' })
  const [step4, setStep4] = useState<Step4Data>({ actions: [{ type: 'notify_assignee', params: {} }] })
  const [step5, setStep5] = useState<Step5Data>({ isActive: true, priority: 0, cooldownMinutes: 0 })

  // Errors
  const [step1Errors, setStep1Errors] = useState<Partial<Record<keyof Step1Data, string>>>({})
  const [step2Errors, setStep2Errors] = useState<Partial<Record<string, string>>>({})
  const [step4Errors, setStep4Errors] = useState<Partial<Record<string, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load data
  useEffect(() => {
    void fetchProjects()
    void fetchUsers({ limit: 200 })
  }, [fetchProjects, fetchUsers])

  useEffect(() => {
    if (isEditMode && id) {
      void fetchRule(id)
    }
  }, [id, isEditMode, fetchRule])

  // Populate form from existing rule in edit mode
  useEffect(() => {
    if (isEditMode && currentRule) {
      setStepDomain({
        domain: currentRule.domain ?? 'task',
      })
      setStep1({
        name: currentRule.name,
        description: currentRule.description ?? '',
        projectId: currentRule.projectId ?? '',
      })
      setStep2({
        triggerType: currentRule.trigger.type,
        triggerParams: Object.fromEntries(
          Object.entries(currentRule.trigger.params ?? {}).map(([k, v]) => [k, String(v)])
        ),
      })
      setStep3({
        conditions: currentRule.conditions.map((c) => ({
          type: c.type,
          params: Object.fromEntries(
            Object.entries(c.params ?? {}).map(([k, v]) => [k, String(v)])
          ),
        })),
        conditionLogic: currentRule.conditionLogic ?? 'AND',
      })
      setStep4({
        actions: currentRule.actions.map((a) => ({
          type: a.type,
          params: Object.fromEntries(
            Object.entries(a.params ?? {}).map(([k, v]) => [k, String(v)])
          ),
        })),
      })
      setStep5({
        isActive: currentRule.isActive,
        priority: currentRule.priority,
        cooldownMinutes: currentRule.cooldownMinutes ?? 0,
      })
      setHighestStep(6)
    }
  }, [isEditMode, currentRule])

  // Validation per step
  const validateStep1 = useCallback((): boolean => {
    const errors: Partial<Record<keyof Step1Data, string>> = {}
    if (!step1.name.trim()) {
      errors.name = 'Il nome è obbligatorio'
    } else if (step1.name.trim().length < 2) {
      errors.name = 'Il nome deve avere almeno 2 caratteri'
    }
    setStep1Errors(errors)
    return Object.keys(errors).length === 0
  }, [step1])

  const validateStep2 = useCallback((): boolean => {
    const errors: Partial<Record<string, string>> = {}
    if (!step2.triggerType) {
      errors.triggerType = 'Seleziona un trigger'
    }
    setStep2Errors(errors)
    return Object.keys(errors).length === 0
  }, [step2])

  const validateStep4 = useCallback((): boolean => {
    const errors: Partial<Record<string, string>> = {}
    if (step4.actions.length === 0) {
      errors.actions = 'Aggiungi almeno un\'azione'
    }
    setStep4Errors(errors)
    return Object.keys(errors).length === 0
  }, [step4])

  const canProceed = useCallback(
    (fromStep: number): boolean => {
      if (fromStep === 1) return true // domain step always valid
      if (fromStep === 2) return validateStep1()
      if (fromStep === 3) return validateStep2()
      if (fromStep === 5) return validateStep4()
      return true
    },
    [validateStep1, validateStep2, validateStep4]
  )

  const goToStep = useCallback(
    (step: number) => {
      // Validate current before going forward
      if (step > currentStep && !canProceed(currentStep)) return
      setCurrentStep(step)
      setHighestStep((prev) => Math.max(prev, step))
    },
    [currentStep, canProceed]
  )

  const handleNext = () => {
    if (!canProceed(currentStep)) return
    const next = Math.min(currentStep + 1, 6)
    setCurrentStep(next)
    setHighestStep((prev) => Math.max(prev, next))
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const buildPayload = useCallback(() => {
    const trigger: TriggerConfig = {
      type: step2.triggerType,
      params: Object.fromEntries(
        Object.entries(step2.triggerParams).filter(([, v]) => v !== '')
      ),
    }

    const conditions: ConditionConfig[] = step3.conditions.map((c) => ({
      type: c.type,
      params: Object.fromEntries(
        Object.entries(c.params).filter(([, v]) => v !== '')
      ),
    }))

    const actions: ActionConfig[] = step4.actions.map((a) => ({
      type: a.type,
      params: Object.fromEntries(
        Object.entries(a.params).filter(([, v]) => v !== '')
      ),
    }))

    return {
      name: step1.name.trim(),
      description: step1.description.trim() || undefined,
      domain: stepDomain.domain,
      projectId: step1.projectId || undefined,
      trigger,
      conditions,
      conditionLogic: step3.conditionLogic,
      actions,
      isActive: step5.isActive,
      priority: step5.priority,
      cooldownMinutes: step5.cooldownMinutes,
    }
  }, [stepDomain, step1, step2, step3, step4, step5])

  const handleSave = async () => {
    if (!validateStep1() || !validateStep2() || !validateStep4()) return
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const payload = buildPayload()
      if (isEditMode && id) {
        await updateRule(id, payload)
      } else {
        await createRule(payload)
      }
      navigate('/admin/automations')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Errore durante il salvataggio')
    } finally {
      setIsSubmitting(false)
    }
  }

  const completedUpTo = useMemo(() => {
    return Math.max(highestStep - 1, currentStep - 1)
  }, [highestStep, currentStep])

  // Loading state for edit mode
  if (isEditMode && isLoading && !currentRule) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    )
  }

  // Rule not found
  if (isEditMode && !isLoading && !currentRule) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
          Regola non trovata
        </h3>
        <p className="text-slate-500 dark:text-slate-400 mb-4">
          La regola richiesta non esiste o è stata eliminata.
        </p>
        <button onClick={() => navigate('/admin/automations')} className="btn-primary">
          Torna alle Automazioni
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
        <button
          onClick={() => navigate('/admin/automations')}
          className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          Automazioni
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <span className="text-slate-900 dark:text-white font-medium">
          {isEditMode ? 'Modifica Regola' : 'Nuova Regola'}
        </span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/automations')}
          aria-label="Torna alle automazioni"
          className="btn-icon"
        >
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </button>
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-cyan-500" />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {isEditMode ? 'Modifica Regola' : 'Nuova Regola'}
          </h1>
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator
        currentStep={currentStep}
        onStepClick={goToStep}
        completedUpTo={completedUpTo}
      />

      {/* Step content */}
      {currentStep === 1 && (
        <StepDomainForm
          data={stepDomain}
          onChange={(data) => {
            // When domain changes, reset trigger to first option for new domain
            if (data.domain !== stepDomain.domain) {
              const firstTrigger = TRIGGER_OPTIONS_BY_DOMAIN[data.domain]?.[0]
              if (firstTrigger) {
                setStep2({ triggerType: firstTrigger.value, triggerParams: {} })
              }
              setStep3({ conditions: [], conditionLogic: 'AND' })
              const firstAction = ACTION_OPTIONS_BY_DOMAIN[data.domain]?.[0]
              if (firstAction) {
                setStep4({ actions: [{ type: firstAction.value, params: {} }] })
              }
            }
            setStepDomain(data)
          }}
        />
      )}

      {currentStep === 2 && (
        <Step1Form
          data={step1}
          onChange={setStep1}
          errors={step1Errors}
          projects={projects}
        />
      )}

      {currentStep === 3 && (
        <Step2Form
          data={step2}
          onChange={setStep2}
          errors={step2Errors}
          domain={stepDomain.domain}
        />
      )}

      {currentStep === 4 && (
        <Step3Form
          data={step3}
          onChange={setStep3}
          projects={projects}
          domain={stepDomain.domain}
        />
      )}

      {currentStep === 5 && (
        <Step4Form
          data={step4}
          onChange={setStep4}
          errors={step4Errors}
          users={users}
          domain={stepDomain.domain}
        />
      )}

      {currentStep === 6 && (
        <Step5Summary
          stepDomain={stepDomain}
          step1={step1}
          step2={step2}
          step3={step3}
          step4={step4}
          data={step5}
          onChange={setStep5}
          projects={projects}
          isEditMode={isEditMode}
          isSubmitting={isSubmitting}
          submitError={submitError}
          onSave={handleSave}
        />
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 1}
          className="btn-secondary flex items-center gap-2 disabled:opacity-40"
        >
          <ArrowLeft className="w-4 h-4" />
          Indietro
        </button>

        <span className="text-sm text-slate-500 dark:text-slate-400">
          Passo {currentStep} di {STEPS.length}
        </span>

        {currentStep < 6 ? (
          <button
            type="button"
            onClick={handleNext}
            className="btn-primary flex items-center gap-2"
          >
            Avanti
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="btn-primary flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditMode ? 'Salva Modifiche' : 'Crea Regola'}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
