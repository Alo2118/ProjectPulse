/**
 * Workflow Editor Page - Admin page to manage workflow templates
 * @module pages/admin/WorkflowEditorPage
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  GitBranch,
  Plus,
  Edit,
  Trash2,
  X,
  Check,
  Loader2,
  Lock,
  ArrowRight,
  ChevronDown,
  AlertCircle,
  Star,
} from 'lucide-react'
import { useWorkflowStore, WorkflowTemplate, WorkflowStatus } from '@stores/workflowStore'
import { useAuthStore } from '@stores/authStore'
import { ConfirmDialog } from '@components/common/ConfirmDialog'

// ============================================================
// CONSTANTS
// ============================================================

const WORKFLOW_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  gray: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
    dot: 'bg-gray-400',
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-300',
    dot: 'bg-yellow-500',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    dot: 'bg-red-500',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    dot: 'bg-green-500',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    dot: 'bg-purple-500',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    dot: 'bg-orange-500',
  },
}

const COLOR_OPTIONS = Object.keys(WORKFLOW_COLORS)

const COLOR_LABELS: Record<string, string> = {
  gray: 'Grigio',
  blue: 'Blu',
  yellow: 'Giallo',
  red: 'Rosso',
  green: 'Verde',
  purple: 'Viola',
  orange: 'Arancione',
}

// ============================================================
// TYPES
// ============================================================

interface StatusDraft extends WorkflowStatus {
  _tempId: string
  _isNew: boolean
}

interface WorkflowFormData {
  name: string
  description: string
  statuses: StatusDraft[]
  transitions: Record<string, string[]>
}

interface ValidationErrors {
  name?: string
  statuses?: string
  general?: string
}

// ============================================================
// HELPERS
// ============================================================

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 40)
}

function makeTempId(): string {
  return `_new_${Math.random().toString(36).slice(2, 9)}`
}

function buildEmptyForm(): WorkflowFormData {
  return {
    name: '',
    description: '',
    statuses: [],
    transitions: {},
  }
}

function templateToForm(template: WorkflowTemplate): WorkflowFormData {
  return {
    name: template.name,
    description: template.description ?? '',
    statuses: template.statuses.map((s) => ({
      ...s,
      _tempId: s.key,
      _isNew: false,
    })),
    transitions: { ...template.transitions },
  }
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

interface StatusChipProps {
  status: WorkflowStatus
}

function StatusChip({ status }: StatusChipProps) {
  const colors = WORKFLOW_COLORS[status.color] ?? WORKFLOW_COLORS.gray
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
      {status.label}
    </span>
  )
}

interface ColorSelectProps {
  value: string
  onChange: (color: string) => void
  disabled?: boolean
}

function ColorSelect({ value, onChange, disabled }: ColorSelectProps) {
  const [open, setOpen] = useState(false)
  const colors = WORKFLOW_COLORS[value] ?? WORKFLOW_COLORS.gray

  const handleSelect = (color: string) => {
    onChange(color)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-label="Seleziona colore"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-gray-200/50 dark:border-white/10 bg-white/60 dark:bg-surface-800/60 backdrop-blur-sm hover:bg-white dark:hover:bg-surface-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${colors.dot}`} />
        <span className={`text-xs font-medium ${colors.text}`}>{COLOR_LABELS[value] ?? value}</span>
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-1.5 min-w-[120px]">
            {COLOR_OPTIONS.map((color) => {
              const c = WORKFLOW_COLORS[color]
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleSelect(color)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    value === color
                      ? `${c.bg} ${c.text}`
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.dot}`} />
                  {COLOR_LABELS[color]}
                  {value === color && <Check className="w-3 h-3 ml-auto" />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================
// TEMPLATE CARD
// ============================================================

interface TemplateCardProps {
  template: WorkflowTemplate
  isSelected: boolean
  onEdit: () => void
  onDelete: () => void
}

function TemplateCard({ template, isSelected, onEdit, onDelete }: TemplateCardProps) {
  const isSystem = template.isSystem

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border transition-all duration-150 p-4 ${
        isSelected
          ? 'border-primary-500 ring-1 ring-primary-500/30 dark:border-primary-400'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {template.isDefault && (
            <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" aria-label="Template predefinito" />
          )}
          <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
            {template.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isSystem && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              <Lock className="w-2.5 h-2.5" />
              Sistema
            </span>
          )}
          <span
            className={`px-1.5 py-0.5 rounded text-xs font-medium ${
              template.isActive !== false
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            {template.isActive !== false ? 'Attivo' : 'Inattivo'}
          </span>
        </div>
      </div>

      {/* Description */}
      {template.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
          {template.description}
        </p>
      )}

      {/* Status badges */}
      {template.statuses.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {template.statuses.slice(0, 5).map((s) => (
            <StatusChip key={s.key} status={s} />
          ))}
          {template.statuses.length > 5 && (
            <span className="text-xs text-gray-400 dark:text-gray-500 self-center">
              +{template.statuses.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 pt-2 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={onEdit}
          disabled={isSystem}
          aria-label={isSystem ? 'Template di sistema non modificabile' : 'Modifica workflow'}
          title={isSystem ? 'I template di sistema non possono essere modificati' : 'Modifica'}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-primary-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
        >
          <Edit className="w-3.5 h-3.5" />
          Modifica
        </button>
        <button
          onClick={onDelete}
          disabled={isSystem}
          aria-label={isSystem ? 'Template di sistema non eliminabile' : 'Elimina workflow'}
          title={isSystem ? 'I template di sistema non possono essere eliminati' : 'Elimina'}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 ml-auto"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Elimina
        </button>
      </div>
    </div>
  )
}

// ============================================================
// TRANSITION MATRIX
// ============================================================

interface TransitionMatrixProps {
  statuses: StatusDraft[]
  transitions: Record<string, string[]>
  onChange: (transitions: Record<string, string[]>) => void
  disabled?: boolean
}

function TransitionMatrix({ statuses, transitions, onChange, disabled }: TransitionMatrixProps) {
  const validKeys = useMemo(() => statuses.map((s) => s.key).filter(Boolean), [statuses])

  const handleToggle = useCallback(
    (fromKey: string, toKey: string) => {
      const current = transitions[fromKey] ?? []
      const next = current.includes(toKey)
        ? current.filter((k) => k !== toKey)
        : [...current, toKey]
      onChange({ ...transitions, [fromKey]: next })
    },
    [transitions, onChange]
  )

  if (validKeys.length < 2) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
        Aggiungi almeno 2 stati per configurare le transizioni.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="w-8 border-b border-gray-200 dark:border-gray-700" aria-label="Da / A" />
            <th
              colSpan={validKeys.length}
              className="px-2 pb-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700"
            >
              <span className="flex items-center gap-1">
                A (destinazione)
                <ArrowRight className="w-3 h-3" />
              </span>
            </th>
          </tr>
          <tr>
            <th className="pr-2 pb-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
              Da
            </th>
            {validKeys.map((toKey) => {
              const status = statuses.find((s) => s.key === toKey)
              const colors = WORKFLOW_COLORS[status?.color ?? 'gray'] ?? WORKFLOW_COLORS.gray
              return (
                <th
                  key={toKey}
                  className="px-3 pb-2 text-center font-medium whitespace-nowrap"
                >
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs ${colors.bg} ${colors.text}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                    {status?.label ?? toKey}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {validKeys.map((fromKey) => {
            const fromStatus = statuses.find((s) => s.key === fromKey)
            const fromColors =
              WORKFLOW_COLORS[fromStatus?.color ?? 'gray'] ?? WORKFLOW_COLORS.gray
            const allowed = transitions[fromKey] ?? []

            return (
              <tr
                key={fromKey}
                className="group hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              >
                <td className="pr-3 py-2 text-right whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${fromColors.bg} ${fromColors.text}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${fromColors.dot}`} />
                    {fromStatus?.label ?? fromKey}
                  </span>
                </td>
                {validKeys.map((toKey) => {
                  const isSelf = fromKey === toKey
                  const isChecked = allowed.includes(toKey)

                  return (
                    <td key={toKey} className="px-3 py-2 text-center">
                      {isSelf ? (
                        <span
                          className="block w-5 h-5 mx-auto rounded bg-gray-100 dark:bg-gray-700"
                          aria-label="Transizione verso se stesso non permessa"
                          title="Impossibile transitare verso lo stesso stato"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggle(fromKey, toKey)}
                          disabled={disabled}
                          aria-label={`Consenti transizione da ${fromStatus?.label ?? fromKey} a ${statuses.find((s) => s.key === toKey)?.label ?? toKey}`}
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500/40 focus:ring-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                        />
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================
// STATUS ROW
// ============================================================

interface StatusRowProps {
  status: StatusDraft
  index: number
  allStatuses: StatusDraft[]
  onChange: (updated: StatusDraft) => void
  onRemove: () => void
  disabled?: boolean
}

function StatusRow({ status, index, allStatuses, onChange, onRemove, disabled }: StatusRowProps) {
  const handleLabelChange = (label: string) => {
    const updated: StatusDraft = { ...status, label }
    if (status._isNew) {
      updated.key = slugify(label)
    }
    onChange(updated)
  }

  const handleInitialChange = (checked: boolean) => {
    onChange({ ...status, isInitial: checked })
  }

  const handleFinalChange = (checked: boolean) => {
    onChange({ ...status, isFinal: checked })
  }

  const handleCommentChange = (checked: boolean) => {
    onChange({ ...status, requiresComment: checked })
  }

  const colors = WORKFLOW_COLORS[status.color] ?? WORKFLOW_COLORS.gray
  const hasKeyConflict =
    status.key.length > 0 &&
    allStatuses.filter((s) => s._tempId !== status._tempId && s.key === status.key).length > 0

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 items-start p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-700">
      {/* Label + key */}
      <div className="space-y-1 min-w-0">
        <input
          type="text"
          value={status.label}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder={`Stato ${index + 1}`}
          disabled={disabled}
          aria-label={`Nome stato ${index + 1}`}
          className="input w-full text-sm"
          maxLength={60}
        />
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-mono px-1.5 py-0.5 rounded ${
              hasKeyConflict
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
            title="Chiave interna (auto-generata)"
          >
            {status.key || 'chiave_auto'}
          </span>
          {hasKeyConflict && (
            <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-0.5">
              <AlertCircle className="w-3 h-3" />
              Duplicata
            </span>
          )}
          {status.isInitial && (
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Iniziale</span>
          )}
          {status.isFinal && (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">Finale</span>
          )}
        </div>
      </div>

      {/* Color */}
      <div className="pt-0.5">
        <ColorSelect
          value={status.color}
          onChange={(color) => onChange({ ...status, color })}
          disabled={disabled}
        />
      </div>

      {/* Is Initial */}
      <label className="flex flex-col items-center gap-1 cursor-pointer pt-1">
        <span className={`text-[10px] font-medium ${colors.text} uppercase tracking-wide`}>
          Inizio
        </span>
        <input
          type="checkbox"
          checked={status.isInitial}
          onChange={(e) => handleInitialChange(e.target.checked)}
          disabled={disabled}
          aria-label="Stato iniziale"
          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500/40 cursor-pointer disabled:cursor-not-allowed"
        />
      </label>

      {/* Is Final */}
      <label className="flex flex-col items-center gap-1 cursor-pointer pt-1">
        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Fine
        </span>
        <input
          type="checkbox"
          checked={status.isFinal}
          onChange={(e) => handleFinalChange(e.target.checked)}
          disabled={disabled}
          aria-label="Stato finale"
          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500/40 cursor-pointer disabled:cursor-not-allowed"
        />
      </label>

      {/* Requires Comment */}
      <label className="flex flex-col items-center gap-1 cursor-pointer pt-1">
        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Nota
        </span>
        <input
          type="checkbox"
          checked={status.requiresComment}
          onChange={(e) => handleCommentChange(e.target.checked)}
          disabled={disabled}
          aria-label="Richiede commento"
          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500/40 cursor-pointer disabled:cursor-not-allowed"
        />
      </label>

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label="Rimuovi stato"
        className="btn-icon text-gray-400 hover:text-red-600 dark:hover:text-red-400 mt-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// ============================================================
// TEMPLATE EDITOR
// ============================================================

interface TemplateEditorProps {
  editingTemplate: WorkflowTemplate | null
  isCreating: boolean
  onSave: (formData: WorkflowFormData) => Promise<void>
  onCancel: () => void
  isSaving: boolean
}

function TemplateEditor({
  editingTemplate,
  isCreating,
  onSave,
  onCancel,
  isSaving,
}: TemplateEditorProps) {
  const [form, setForm] = useState<WorkflowFormData>(() =>
    editingTemplate ? templateToForm(editingTemplate) : buildEmptyForm()
  )
  const [errors, setErrors] = useState<ValidationErrors>({})

  // Reset form when editing target changes
  useEffect(() => {
    if (editingTemplate) {
      setForm(templateToForm(editingTemplate))
    } else if (isCreating) {
      setForm(buildEmptyForm())
    }
    setErrors({})
  }, [editingTemplate, isCreating])

  const addStatus = useCallback(() => {
    const newStatus: StatusDraft = {
      _tempId: makeTempId(),
      _isNew: true,
      key: '',
      label: '',
      color: 'gray',
      isInitial: false,
      isFinal: false,
      requiresComment: false,
    }
    setForm((f) => ({ ...f, statuses: [...f.statuses, newStatus] }))
  }, [])

  const updateStatus = useCallback((tempId: string, updated: StatusDraft) => {
    setForm((f) => ({
      ...f,
      statuses: f.statuses.map((s) => (s._tempId === tempId ? updated : s)),
    }))
  }, [])

  const removeStatus = useCallback((tempId: string) => {
    setForm((f) => {
      const removed = f.statuses.find((s) => s._tempId === tempId)
      if (!removed) return f

      const nextStatuses = f.statuses.filter((s) => s._tempId !== tempId)

      // Clean up transitions referencing this key
      const nextTransitions: Record<string, string[]> = {}
      for (const [fromKey, toKeys] of Object.entries(f.transitions)) {
        if (fromKey !== removed.key) {
          nextTransitions[fromKey] = toKeys.filter((k) => k !== removed.key)
        }
      }

      return { ...f, statuses: nextStatuses, transitions: nextTransitions }
    })
  }, [])

  const updateTransitions = useCallback((transitions: Record<string, string[]>) => {
    setForm((f) => ({ ...f, transitions }))
  }, [])

  const validate = useCallback((): ValidationErrors => {
    const errs: ValidationErrors = {}

    if (!form.name.trim()) {
      errs.name = 'Il nome del workflow è obbligatorio'
    }

    if (form.statuses.length < 2) {
      errs.statuses = 'Sono richiesti almeno 2 stati'
      return errs
    }

    const emptyLabel = form.statuses.some((s) => !s.label.trim())
    if (emptyLabel) {
      errs.statuses = 'Tutti gli stati devono avere un nome'
      return errs
    }

    const emptyKey = form.statuses.some((s) => !s.key.trim())
    if (emptyKey) {
      errs.statuses = 'Inserisci un nome per generare la chiave di ogni stato'
      return errs
    }

    const keys = form.statuses.map((s) => s.key)
    const uniqueKeys = new Set(keys)
    if (uniqueKeys.size !== keys.length) {
      errs.statuses = 'Le chiavi degli stati devono essere univoche'
      return errs
    }

    const initialCount = form.statuses.filter((s) => s.isInitial).length
    if (initialCount === 0) {
      errs.statuses = 'Deve esserci esattamente uno stato iniziale'
      return errs
    }
    if (initialCount > 1) {
      errs.statuses = 'Può esserci un solo stato iniziale'
      return errs
    }

    const finalCount = form.statuses.filter((s) => s.isFinal).length
    if (finalCount === 0) {
      errs.statuses = 'Deve esserci almeno uno stato finale'
      return errs
    }

    return errs
  }, [form])

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    await onSave(form)
  }

  const title = editingTemplate ? `Modifica: ${editingTemplate.name}` : 'Nuovo Workflow'

  return (
    <div className="card p-6 space-y-6">
      {/* Editor header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          {title}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Annulla e chiudi editor"
          className="btn-icon"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* General error */}
      {errors.general && (
        <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{errors.general}</span>
        </div>
      )}

      {/* Basic info */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Informazioni di base
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Name */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }))
                if (errors.name) setErrors((e) => ({ ...e, name: undefined }))
              }}
              placeholder="es. Sviluppo Software, Progetto Standard..."
              className={`input w-full ${errors.name ? 'input-error' : ''}`}
              maxLength={100}
              aria-required="true"
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name && (
              <p id="name-error" className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descrizione
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Descrizione opzionale del workflow..."
              rows={2}
              className="input w-full resize-none"
              maxLength={500}
            />
          </div>
        </div>
      </div>

      {/* Status management */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Stati del Workflow
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Definisci gli stati che un task puo assumere in questo workflow
            </p>
          </div>
          <button
            type="button"
            onClick={addStatus}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 border border-primary-200 dark:border-primary-800 transition-all duration-150"
          >
            <Plus className="w-3.5 h-3.5" />
            Aggiungi Stato
          </button>
        </div>

        {/* Legend for columns */}
        {form.statuses.length > 0 && (
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 px-3 text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            <span>Nome / Chiave</span>
            <span>Colore</span>
            <span className="text-center w-12">Inizio</span>
            <span className="text-center w-12">Fine</span>
            <span className="text-center w-12">Nota</span>
            <span className="w-8" />
          </div>
        )}

        {errors.statuses && (
          <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errors.statuses}</span>
          </div>
        )}

        {form.statuses.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            <GitBranch className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nessuno stato definito. Aggiungi il primo stato.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {form.statuses.map((status, index) => (
              <StatusRow
                key={status._tempId}
                status={status}
                index={index}
                allStatuses={form.statuses}
                onChange={(updated) => updateStatus(status._tempId, updated)}
                onRemove={() => removeStatus(status._tempId)}
              />
            ))}
          </div>
        )}

        {/* Status summary */}
        {form.statuses.length >= 2 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {form.statuses
              .filter((s) => s.label.trim())
              .map((s) => (
                <StatusChip key={s._tempId} status={s} />
              ))}
          </div>
        )}
      </div>

      {/* Transition matrix */}
      {form.statuses.length >= 2 && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Matrice delle Transizioni
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Definisci quali transizioni tra stati sono consentite. Spunta le celle per abilitare la transizione.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <TransitionMatrix
              statuses={form.statuses}
              transitions={form.transitions}
              onChange={updateTransitions}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
        <button type="button" onClick={onCancel} className="btn-secondary" disabled={isSaving}>
          Annulla
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="btn-primary flex items-center gap-2"
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {editingTemplate ? 'Salva Modifiche' : 'Crea Workflow'}
        </button>
      </div>
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function WorkflowEditorPage() {
  const { user } = useAuthStore()
  const {
    templates,
    isLoading,
    error,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  } = useWorkflowStore()

  const [editingTemplate, setEditingTemplate] = useState<WorkflowTemplate | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    void fetchTemplates()
  }, [fetchTemplates])

  const handleNewWorkflow = useCallback(() => {
    setEditingTemplate(null)
    setIsCreating(true)
    setSaveError(null)
  }, [])

  const handleEditTemplate = useCallback((template: WorkflowTemplate) => {
    if (template.isSystem) return
    setEditingTemplate(template)
    setIsCreating(false)
    setSaveError(null)
  }, [])

  const handleCancelEditor = useCallback(() => {
    setEditingTemplate(null)
    setIsCreating(false)
    setSaveError(null)
  }, [])

  const handleSave = useCallback(
    async (formData: WorkflowFormData) => {
      setIsSaving(true)
      setSaveError(null)

      try {
        // Strip internal draft fields before sending to store
        const statuses: WorkflowStatus[] = formData.statuses.map(
          ({ _tempId: _t, _isNew: _n, ...rest }) => rest
        )

        const payload = {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          statuses,
          transitions: formData.transitions,
        }

        if (editingTemplate) {
          await updateTemplate(editingTemplate.id, payload)
        } else {
          await createTemplate(payload)
        }

        setEditingTemplate(null)
        setIsCreating(false)
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Errore durante il salvataggio')
      } finally {
        setIsSaving(false)
      }
    },
    [editingTemplate, createTemplate, updateTemplate]
  )

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    setIsDeleting(true)
    try {
      await deleteTemplate(deleteConfirm.id)
      setDeleteConfirm(null)
      if (editingTemplate?.id === deleteConfirm.id) {
        setEditingTemplate(null)
        setIsCreating(false)
      }
    } catch {
      // handled by store
    } finally {
      setIsDeleting(false)
    }
  }

  const showEditor = isCreating || editingTemplate !== null

  // Sort: system/default templates first, then by name
  const sortedTemplates = useMemo(
    () =>
      [...templates].sort((a, b) => {
        if (a.isSystem && !b.isSystem) return -1
        if (!a.isSystem && b.isSystem) return 1
        if (a.isDefault && !b.isDefault) return -1
        if (!a.isDefault && b.isDefault) return 1
        return a.name.localeCompare(b.name)
      }),
    [templates]
  )

  if (isLoading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center h-64" aria-live="polite" aria-label="Caricamento in corso">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            Gestione Workflow
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configura i template di workflow per gestire i cicli di vita dei task nei progetti
          </p>
        </div>

        {isAdmin && !showEditor && (
          <button
            onClick={handleNewWorkflow}
            className="btn-primary flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Nuovo Workflow
          </button>
        )}
      </div>

      {/* Store-level error */}
      {error && !isLoading && (
        <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3 border border-red-200 dark:border-red-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Save error banner (shown outside editor when editor was closed) */}
      {saveError && !showEditor && (
        <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3 border border-red-200 dark:border-red-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{saveError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
        {/* Left column: Template list */}
        <div className="space-y-3">
          {/* New button on mobile / when editor is visible */}
          {isAdmin && showEditor && (
            <button
              onClick={handleNewWorkflow}
              disabled={isCreating && editingTemplate === null}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-500 dark:text-gray-400 hover:border-primary-400 dark:hover:border-primary-600 hover:text-primary-600 dark:hover:text-primary-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            >
              <Plus className="w-4 h-4" />
              Nuovo Workflow
            </button>
          )}

          {sortedTemplates.length === 0 ? (
            <div className="card p-10 text-center">
              <GitBranch className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Nessun template di workflow
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Crea il primo workflow per i tuoi progetti
              </p>
              {isAdmin && !showEditor && (
                <button onClick={handleNewWorkflow} className="mt-4 btn-primary text-sm">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Crea il primo workflow
                </button>
              )}
            </div>
          ) : (
            sortedTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={
                  editingTemplate?.id === template.id ||
                  (isCreating && !editingTemplate)
                }
                onEdit={() => handleEditTemplate(template)}
                onDelete={() =>
                  setDeleteConfirm({ id: template.id, name: template.name })
                }
              />
            ))
          )}
        </div>

        {/* Right column: Editor or hint */}
        <div>
          {showEditor ? (
            <TemplateEditor
              editingTemplate={editingTemplate}
              isCreating={isCreating}
              onSave={handleSave}
              onCancel={handleCancelEditor}
              isSaving={isSaving}
            />
          ) : (
            <div className="card border-dashed p-12 text-center hidden lg:block">
              <GitBranch className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 font-medium">
                Seleziona un workflow da modificare
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Oppure crea un nuovo workflow usando il pulsante in alto
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={true}
          title="Elimina Workflow"
          message={`Sei sicuro di voler eliminare il workflow "${deleteConfirm.name}"? I progetti che usano questo workflow potrebbero essere impattati.`}
          confirmLabel="Elimina"
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          isLoading={isDeleting}
          variant="danger"
        />
      )}
    </div>
  )
}
