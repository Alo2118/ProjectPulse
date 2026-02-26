/**
 * CsvFieldMapper - Maps CSV column headers to task field names
 * @module components/features/CsvFieldMapper
 */

import { ArrowRight } from 'lucide-react'

// ============================================================
// FIELD DEFINITIONS
// ============================================================

export interface TaskFieldOption {
  value: string
  label: string
  required?: boolean
}

export const TASK_FIELD_OPTIONS: TaskFieldOption[] = [
  { value: 'ignore', label: 'Ignora' },
  { value: 'title', label: 'Titolo', required: true },
  { value: 'description', label: 'Descrizione' },
  { value: 'taskType', label: 'Tipo (milestone/task/subtask)' },
  { value: 'status', label: 'Stato' },
  { value: 'priority', label: 'Priorità' },
  { value: 'projectCode', label: 'Codice Progetto' },
  { value: 'assigneeEmail', label: 'Email Assegnatario' },
  { value: 'departmentName', label: 'Nome Reparto' },
  { value: 'startDate', label: 'Data Inizio' },
  { value: 'dueDate', label: 'Scadenza' },
  { value: 'estimatedHours', label: 'Ore Stimate' },
]

// ============================================================
// AUTO-DETECT MAPPINGS
// ============================================================

/**
 * Attempts to auto-detect the task field for a given CSV column header
 * based on common Italian and English names.
 */
export function autoDetectMapping(header: string): string {
  const lower = header.toLowerCase().trim()

  const rules: [RegExp, string][] = [
    [/titolo|title|nome task|task name/, 'title'],
    [/descrizione|description|descr/, 'description'],
    [/tipo|type|task.?type/, 'taskType'],
    [/stato|status/, 'status'],
    [/priorit/, 'priority'],
    [/codice.?prog|project.?code|cod\.?\s*prog/, 'projectCode'],
    [/email.?assegn|assegn.*email|email.*user|assignee/, 'assigneeEmail'],
    [/reparto|department|dept/, 'departmentName'],
    [/data.?inizio|start.?date|inizio/, 'startDate'],
    [/scadenza|due.?date|fine|end.?date/, 'dueDate'],
    [/ore.?stimate|estimated.?hours|stimate/, 'estimatedHours'],
  ]

  for (const [regex, field] of rules) {
    if (regex.test(lower)) return field
  }

  return 'ignore'
}

// ============================================================
// COMPONENT
// ============================================================

interface CsvFieldMapperProps {
  headers: string[]
  mappings: Record<string, string>
  onChange: (mappings: Record<string, string>) => void
}

export function CsvFieldMapper({ headers, mappings, onChange }: CsvFieldMapperProps) {
  const handleChange = (header: string, value: string) => {
    onChange({ ...mappings, [header]: value })
  }

  // Count how many fields are mapped to 'title' — required exactly once
  const titleMappedCount = Object.values(mappings).filter((v) => v === 'title').length

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
        Associa le colonne del tuo file CSV ai campi del task. I campi mappati a{' '}
        <span className="font-medium text-slate-700 dark:text-slate-300">"Ignora"</span> verranno
        saltati.
      </p>

      {titleMappedCount === 0 && (
        <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg text-sm text-amber-700 dark:text-amber-300 mb-3">
          <span className="font-medium">Attenzione:</span> il campo Titolo e obbligatorio.
          Mappa almeno una colonna su Titolo.
        </div>
      )}

      <div className="divide-y divide-slate-100 dark:divide-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          <span>Colonna CSV</span>
          <span />
          <span>Campo Task</span>
        </div>

        {/* Mapping rows */}
        {headers.map((header) => {
          const currentValue = mappings[header] ?? 'ignore'
          const isMapped = currentValue !== 'ignore'
          const isRequired =
            TASK_FIELD_OPTIONS.find((f) => f.value === currentValue)?.required ?? false

          return (
            <div
              key={header}
              className={`grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 transition-colors ${
                isMapped
                  ? 'bg-cyan-50/50 dark:bg-cyan-900/10'
                  : 'bg-white dark:bg-slate-800/20'
              }`}
            >
              {/* CSV column name */}
              <div
                className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate"
                title={header}
              >
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono text-xs">
                  {header}
                </span>
              </div>

              {/* Arrow */}
              <ArrowRight
                className={`w-4 h-4 flex-shrink-0 ${
                  isMapped ? 'text-cyan-500' : 'text-slate-300 dark:text-slate-600'
                }`}
              />

              {/* Task field selector */}
              <div className="relative">
                <select
                  value={currentValue}
                  onChange={(e) => handleChange(header, e.target.value)}
                  className={`input text-sm w-full ${
                    isRequired
                      ? 'border-cyan-400 dark:border-cyan-500 ring-1 ring-cyan-400/30'
                      : ''
                  }`}
                  aria-label={`Mappa colonna ${header}`}
                >
                  {TASK_FIELD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                      {opt.required ? ' *' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 pt-1">
        * campo obbligatorio
      </p>
    </div>
  )
}

export default CsvFieldMapper
