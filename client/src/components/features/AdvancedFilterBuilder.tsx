/**
 * AdvancedFilterBuilder - Composable AND/OR filter rule builder
 *
 * Renders a collapsible panel (Framer Motion slide-down) with one row per rule.
 * Each row: [Field dropdown] [Operator dropdown] [Value input] [Remove button]
 * Supports fields: status, priority, assignee, project, dueDate, department,
 * taskType, hasBlockedReason.
 *
 * Designed to be reusable on any list page — pass `projects`, `departments`, `users`
 * as props so the component has no store dependencies for data.
 *
 * @module components/features/AdvancedFilterBuilder
 */

import { useCallback, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, SlidersHorizontal } from 'lucide-react'
import type {
  AdvancedFilter,
  FilterRule,
  FilterFieldKey,
  FilterOperator,
} from '@/types'

// ---------------------------------------------------------------------------
// Static config
// ---------------------------------------------------------------------------

interface FieldMeta {
  label: string
  type: 'select' | 'date' | 'boolean' | 'text'
  operators: FilterOperator[]
  options?: { value: string; label: string }[]
}

const FIELD_META: Record<FilterFieldKey, FieldMeta> = {
  status: {
    label: 'Stato',
    type: 'select',
    operators: ['is', 'is_not'],
    options: [
      { value: 'todo', label: 'Da fare' },
      { value: 'in_progress', label: 'In corso' },
      { value: 'review', label: 'In revisione' },
      { value: 'blocked', label: 'Bloccato' },
      { value: 'done', label: 'Completato' },
      { value: 'cancelled', label: 'Annullato' },
    ],
  },
  priority: {
    label: 'Priorità',
    type: 'select',
    operators: ['is', 'is_not'],
    options: [
      { value: 'critical', label: 'Critica' },
      { value: 'high', label: 'Alta' },
      { value: 'medium', label: 'Media' },
      { value: 'low', label: 'Bassa' },
    ],
  },
  taskType: {
    label: 'Tipo task',
    type: 'select',
    operators: ['is', 'is_not'],
    options: [
      { value: 'milestone', label: 'Milestone' },
      { value: 'task', label: 'Task' },
      { value: 'subtask', label: 'Sottotask' },
    ],
  },
  assigneeId: {
    label: 'Assegnatario',
    type: 'select',
    operators: ['is', 'is_not'],
    options: [], // populated dynamically from props
  },
  projectId: {
    label: 'Progetto',
    type: 'select',
    operators: ['is', 'is_not'],
    options: [], // populated dynamically from props
  },
  departmentId: {
    label: 'Reparto',
    type: 'select',
    operators: ['is', 'is_not'],
    options: [], // populated dynamically from props
  },
  dueDate: {
    label: 'Scadenza',
    type: 'date',
    operators: ['before', 'after', 'between'],
  },
  hasBlockedReason: {
    label: 'Motivo blocco',
    type: 'boolean',
    operators: ['is_true', 'is_false'],
  },
}

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  is: 'è',
  is_not: 'non è',
  before: 'prima di',
  after: 'dopo',
  between: 'tra',
  is_true: 'è presente',
  is_false: 'non è presente',
  contains: 'contiene',
  not_contains: 'non contiene',
}

const FIELD_ORDER: FilterFieldKey[] = [
  'status',
  'priority',
  'taskType',
  'assigneeId',
  'projectId',
  'departmentId',
  'dueDate',
  'hasBlockedReason',
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `r_${Math.random().toString(36).slice(2, 9)}`
}

function defaultOperatorForField(field: FilterFieldKey): FilterOperator {
  const meta = FIELD_META[field]
  return meta.operators[0]
}

function defaultValueForField(field: FilterFieldKey, operator: FilterOperator): string | string[] {
  if (field === 'dueDate' && operator === 'between') return ['', '']
  return ''
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface UserOption {
  id: string
  firstName: string
  lastName: string
}

interface ProjectOption {
  id: string
  name: string
}

interface DepartmentOption {
  id: string
  name: string
  isActive: boolean
}

export interface AdvancedFilterBuilderProps {
  filter: AdvancedFilter
  onChange: (filter: AdvancedFilter) => void
  users?: UserOption[]
  projects?: ProjectOption[]
  departments?: DepartmentOption[]
}

// ---------------------------------------------------------------------------
// Rule Row
// ---------------------------------------------------------------------------

interface RuleRowProps {
  rule: FilterRule
  index: number
  showLogicBadge: boolean
  logic: 'and' | 'or'
  users: UserOption[]
  projects: ProjectOption[]
  departments: DepartmentOption[]
  onFieldChange: (id: string, field: FilterFieldKey) => void
  onOperatorChange: (id: string, operator: FilterOperator) => void
  onValueChange: (id: string, value: string | string[]) => void
  onRemove: (id: string) => void
  baseId: string
}

function RuleRow({
  rule,
  index,
  showLogicBadge,
  logic,
  users,
  projects,
  departments,
  onFieldChange,
  onOperatorChange,
  onValueChange,
  onRemove,
  baseId,
}: RuleRowProps) {
  const meta = FIELD_META[rule.field]
  const fieldId = `${baseId}-field-${rule.id}`
  const opId = `${baseId}-op-${rule.id}`
  const valId = `${baseId}-val-${rule.id}`

  // Build dynamic option lists for relational fields
  const effectiveOptions: { value: string; label: string }[] = (() => {
    if (rule.field === 'assigneeId') {
      return users.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))
    }
    if (rule.field === 'projectId') {
      return projects.map((p) => ({ value: p.id, label: p.name }))
    }
    if (rule.field === 'departmentId') {
      return departments
        .filter((d) => d.isActive)
        .map((d) => ({ value: d.id, label: d.name }))
    }
    return meta.options ?? []
  })()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="flex flex-wrap items-center gap-2"
    >
      {/* Logic badge (AND/OR) — shown for rows after the first */}
      <div className="w-10 flex-shrink-0 text-center">
        {showLogicBadge ? (
          <span className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 uppercase">
            {logic === 'and' ? 'E' : 'O'}
          </span>
        ) : (
          <span className="inline-block w-8 h-5 text-xs font-medium text-slate-400 dark:text-slate-500 text-center">
            {index + 1}.
          </span>
        )}
      </div>

      {/* Field selector */}
      <div className="flex-shrink-0">
        <label htmlFor={fieldId} className="sr-only">
          Campo regola {index + 1}
        </label>
        <select
          id={fieldId}
          value={rule.field}
          onChange={(e) => onFieldChange(rule.id, e.target.value as FilterFieldKey)}
          className="input py-1.5 text-sm w-40"
          aria-label={`Campo regola ${index + 1}`}
        >
          {FIELD_ORDER.map((key) => (
            <option key={key} value={key}>
              {FIELD_META[key].label}
            </option>
          ))}
        </select>
      </div>

      {/* Operator selector */}
      <div className="flex-shrink-0">
        <label htmlFor={opId} className="sr-only">
          Operatore regola {index + 1}
        </label>
        <select
          id={opId}
          value={rule.operator}
          onChange={(e) => onOperatorChange(rule.id, e.target.value as FilterOperator)}
          className="input py-1.5 text-sm w-36"
          aria-label={`Operatore regola ${index + 1}`}
        >
          {meta.operators.map((op) => (
            <option key={op} value={op}>
              {OPERATOR_LABELS[op]}
            </option>
          ))}
        </select>
      </div>

      {/* Value input — varies by field type */}
      <div className="flex-shrink-0 flex items-center gap-1">
        {meta.type === 'boolean' ? (
          /* Boolean fields: no extra value input needed — operator IS the value */
          <span className="text-sm text-slate-400 dark:text-slate-500 italic px-2">
            (nessun valore richiesto)
          </span>
        ) : meta.type === 'select' ? (
          <div>
            <label htmlFor={valId} className="sr-only">
              Valore regola {index + 1}
            </label>
            <select
              id={valId}
              value={typeof rule.value === 'string' ? rule.value : ''}
              onChange={(e) => onValueChange(rule.id, e.target.value)}
              className="input py-1.5 text-sm w-44"
              aria-label={`Valore regola ${index + 1}`}
            >
              <option value="">-- Seleziona --</option>
              {effectiveOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ) : meta.type === 'date' ? (
          rule.operator === 'between' ? (
            /* Between: two date pickers */
            <div className="flex items-center gap-1">
              <label htmlFor={`${valId}-from`} className="sr-only">
                Dal
              </label>
              <input
                id={`${valId}-from`}
                type="date"
                value={Array.isArray(rule.value) ? (rule.value[0] ?? '') : ''}
                onChange={(e) => {
                  const current = Array.isArray(rule.value) ? rule.value : ['', '']
                  onValueChange(rule.id, [e.target.value, current[1] ?? ''])
                }}
                className="input py-1.5 text-sm w-36"
                aria-label="Dal"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500 px-0.5">e</span>
              <label htmlFor={`${valId}-to`} className="sr-only">
                Al
              </label>
              <input
                id={`${valId}-to`}
                type="date"
                value={Array.isArray(rule.value) ? (rule.value[1] ?? '') : ''}
                onChange={(e) => {
                  const current = Array.isArray(rule.value) ? rule.value : ['', '']
                  onValueChange(rule.id, [current[0] ?? '', e.target.value])
                }}
                className="input py-1.5 text-sm w-36"
                aria-label="Al"
              />
            </div>
          ) : (
            <div>
              <label htmlFor={valId} className="sr-only">
                Data regola {index + 1}
              </label>
              <input
                id={valId}
                type="date"
                value={typeof rule.value === 'string' ? rule.value : ''}
                onChange={(e) => onValueChange(rule.id, e.target.value)}
                className="input py-1.5 text-sm w-36"
                aria-label={`Data regola ${index + 1}`}
              />
            </div>
          )
        ) : (
          /* Text */
          <div>
            <label htmlFor={valId} className="sr-only">
              Testo regola {index + 1}
            </label>
            <input
              id={valId}
              type="text"
              value={typeof rule.value === 'string' ? rule.value : ''}
              onChange={(e) => onValueChange(rule.id, e.target.value)}
              placeholder="Valore..."
              className="input py-1.5 text-sm w-44"
              aria-label={`Testo regola ${index + 1}`}
            />
          </div>
        )}
      </div>

      {/* Remove rule button */}
      <button
        type="button"
        onClick={() => onRemove(rule.id)}
        className="flex-shrink-0 p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        aria-label={`Rimuovi regola ${index + 1}`}
        title="Rimuovi regola"
      >
        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AdvancedFilterBuilder({
  filter,
  onChange,
  users = [],
  projects = [],
  departments = [],
}: AdvancedFilterBuilderProps) {
  const baseId = useId()

  // ---- Mutations ------------------------------------------------------------

  const handleAddRule = useCallback(() => {
    const field: FilterFieldKey = 'status'
    const operator = defaultOperatorForField(field)
    const newRule: FilterRule = {
      id: generateId(),
      field,
      operator,
      value: defaultValueForField(field, operator),
    }
    onChange({
      ...filter,
      rules: [...filter.rules, newRule],
    })
  }, [filter, onChange])

  const handleRemoveRule = useCallback(
    (id: string) => {
      onChange({
        ...filter,
        rules: filter.rules.filter((r) => r.id !== id),
      })
    },
    [filter, onChange]
  )

  const handleFieldChange = useCallback(
    (id: string, field: FilterFieldKey) => {
      const operator = defaultOperatorForField(field)
      onChange({
        ...filter,
        rules: filter.rules.map((r) =>
          r.id === id
            ? { ...r, field, operator, value: defaultValueForField(field, operator) }
            : r
        ),
      })
    },
    [filter, onChange]
  )

  const handleOperatorChange = useCallback(
    (id: string, operator: FilterOperator) => {
      onChange({
        ...filter,
        rules: filter.rules.map((r) => {
          if (r.id !== id) return r
          const meta = FIELD_META[r.field]
          // For date/between transition, reset value to array/string as needed
          const value =
            meta.type === 'date' && operator === 'between'
              ? ['', '']
              : meta.type === 'date' && Array.isArray(r.value)
              ? ''
              : r.value
          return { ...r, operator, value }
        }),
      })
    },
    [filter, onChange]
  )

  const handleValueChange = useCallback(
    (id: string, value: string | string[]) => {
      onChange({
        ...filter,
        rules: filter.rules.map((r) => (r.id === id ? { ...r, value } : r)),
      })
    },
    [filter, onChange]
  )

  const handleLogicToggle = useCallback(() => {
    onChange({ ...filter, logic: filter.logic === 'and' ? 'or' : 'and' })
  }, [filter, onChange])

  const handleReset = useCallback(() => {
    onChange({ logic: 'and', rules: [] })
  }, [onChange])

  // ---- Render ---------------------------------------------------------------

  const hasRules = filter.rules.length > 0

  return (
    <div
      className="rounded-lg border border-cyan-200 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-900/10 p-4"
      role="region"
      aria-label="Filtro avanzato"
    >
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Filtro avanzato
          </span>
        </div>

        {/* AND / OR toggle — only relevant when there are ≥ 2 rules */}
        {filter.rules.length >= 2 && (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-slate-500 dark:text-slate-400">Operatore logico:</span>
            <button
              type="button"
              onClick={handleLogicToggle}
              className={[
                'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide transition-colors',
                filter.logic === 'and'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-amber-500 text-white hover:bg-amber-600',
              ].join(' ')}
              aria-label={
                filter.logic === 'and'
                  ? 'Operatore AND attivo. Clicca per passare a OR'
                  : 'Operatore OR attivo. Clicca per passare a AND'
              }
              title={
                filter.logic === 'and'
                  ? 'Tutte le regole devono essere soddisfatte (AND)'
                  : 'Almeno una regola deve essere soddisfatta (OR)'
              }
            >
              {filter.logic === 'and' ? 'E (AND)' : 'O (OR)'}
            </button>
          </div>
        )}

        {/* Active rule count badge */}
        {hasRules && (
          <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
            {filter.rules.length}{' '}
            {filter.rules.length === 1 ? 'regola attiva' : 'regole attive'}
            {filter.rules.length >= 2 && (
              <span className="ml-1 font-medium">
                ({filter.logic === 'and' ? 'AND' : 'OR'})
              </span>
            )}
          </span>
        )}
      </div>

      {/* Rules list */}
      <div className="space-y-2.5 mb-4" role="list" aria-label="Regole filtro">
        <AnimatePresence initial={false}>
          {filter.rules.map((rule, index) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              index={index}
              showLogicBadge={index > 0}
              logic={filter.logic}
              users={users}
              projects={projects}
              departments={departments}
              onFieldChange={handleFieldChange}
              onOperatorChange={handleOperatorChange}
              onValueChange={handleValueChange}
              onRemove={handleRemoveRule}
              baseId={baseId}
            />
          ))}
        </AnimatePresence>

        {!hasRules && (
          <p className="text-sm text-slate-400 dark:text-slate-500 italic pl-12">
            Nessuna regola aggiunta. Clicca "Aggiungi regola" per iniziare.
          </p>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleAddRule}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-cyan-700 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-900/40 hover:bg-cyan-200 dark:hover:bg-cyan-900/60 rounded-lg transition-colors"
          aria-label="Aggiungi una nuova regola di filtro"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          Aggiungi regola
        </button>

        {hasRules && (
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            aria-label="Rimuovi tutte le regole"
          >
            Azzera tutto
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Exports (re-export types for convenience)
// ---------------------------------------------------------------------------

export type { AdvancedFilter, FilterRule, FilterFieldKey, FilterOperator }
