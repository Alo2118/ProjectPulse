/**
 * CustomFieldsSection - Renders custom fields for a task with inline edit support
 * Shows all applicable fields (project-specific + global) with their current values.
 * @module components/tasks/CustomFieldsSection
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { Settings2, Loader2 } from 'lucide-react'
import { useCustomFieldStore, selectTaskFieldValues } from '@stores/customFieldStore'
import { CustomFieldInput } from '@components/ui/CustomFieldInput'
import { toast } from '@stores/toastStore'
import { CustomFieldWithValue } from '@/types'

interface CustomFieldsSectionProps {
  taskId: string
  projectId: string | null
  readOnly?: boolean
}

// ============================================================
// FIELD ROW — inline-edit pattern
// ============================================================

interface FieldRowProps {
  item: CustomFieldWithValue
  readOnly: boolean
  onSave: (definitionId: string, value: string | null) => Promise<void>
}

function FieldRow({ item, readOnly, onSave }: FieldRowProps) {
  const { definition, value: fieldValue } = item
  const currentValue = fieldValue?.value ?? null

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string | null>(currentValue)
  const [isSaving, setIsSaving] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Reset draft when external value changes
  useEffect(() => {
    if (!editing) {
      setDraft(fieldValue?.value ?? null)
    }
  }, [fieldValue?.value, editing])

  const startEdit = () => {
    if (readOnly) return
    setDraft(fieldValue?.value ?? null)
    setEditing(true)
  }

  const commitEdit = useCallback(async () => {
    if (!editing) return
    setEditing(false)
    if (draft === currentValue) return

    setIsSaving(true)
    try {
      await onSave(definition.id, draft)
    } catch {
      toast.error('Impossibile salvare il valore')
      setDraft(currentValue)
    } finally {
      setIsSaving(false)
    }
  }, [editing, draft, currentValue, definition.id, onSave])

  const cancelEdit = useCallback(() => {
    setEditing(false)
    setDraft(currentValue)
  }, [currentValue])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (definition.fieldType === 'checkbox') return
    if (e.key === 'Enter') void commitEdit()
    if (e.key === 'Escape') cancelEdit()
  }

  const displayValue = () => {
    if (currentValue === null || currentValue === '') {
      return <span className="text-gray-400 dark:text-gray-500 italic text-sm">—</span>
    }
    if (definition.fieldType === 'checkbox') {
      return (
        <span className="text-sm text-gray-800 dark:text-gray-200">
          {currentValue === 'true' ? 'Sì' : 'No'}
        </span>
      )
    }
    return <span className="text-sm text-gray-800 dark:text-gray-200">{currentValue}</span>
  }

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      {/* Label */}
      <div className="w-36 flex-shrink-0">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {definition.name}
          {definition.isRequired && (
            <span className="text-red-500 ml-0.5">*</span>
          )}
        </span>
      </div>

      {/* Value */}
      <div
        ref={containerRef}
        className="flex-1 min-w-0"
        onKeyDown={handleKeyDown}
      >
        {editing ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <CustomFieldInput
                fieldType={definition.fieldType}
                value={draft}
                options={definition.options}
                onChange={(v) => {
                  setDraft(v)
                  // For checkbox, auto-save immediately on change
                  if (definition.fieldType === 'checkbox') {
                    setEditing(false)
                    setIsSaving(true)
                    onSave(definition.id, v).catch(() => {
                      toast.error('Impossibile salvare il valore')
                    }).finally(() => setIsSaving(false))
                  }
                }}
                readOnly={isSaving}
                required={definition.isRequired}
              />
            </div>
            {definition.fieldType !== 'checkbox' && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => void commitEdit()}
                  disabled={isSaving}
                  aria-label="Salva valore"
                  className="text-xs px-2 py-1 bg-cyan-500 text-white rounded hover:bg-cyan-600 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salva'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={isSaving}
                  aria-label="Annulla modifica"
                  className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                >
                  Annulla
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            onClick={startEdit}
            title={readOnly ? undefined : 'Clicca per modificare'}
            className={`min-h-[24px] flex items-center ${!readOnly ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded px-1 -mx-1 transition-colors' : ''}`}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            ) : (
              displayValue()
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function CustomFieldsSection({ taskId, projectId, readOnly = false }: CustomFieldsSectionProps) {
  const { fetchTaskFieldValues, setFieldValue } = useCustomFieldStore()
  const [isLoading, setIsLoading] = useState(true)

  const fieldValues = useCustomFieldStore((state) => selectTaskFieldValues(state, taskId))

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      try {
        await fetchTaskFieldValues(taskId, projectId)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [taskId, projectId, fetchTaskFieldValues])

  const handleSave = useCallback(
    async (definitionId: string, value: string | null) => {
      await setFieldValue(taskId, definitionId, value)
    },
    [taskId, setFieldValue]
  )

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-3">
          <Settings2 className="w-4 h-4 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Campi Personalizzati</h2>
        </div>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (fieldValues.length === 0) {
    return null
  }

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Settings2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Campi Personalizzati
        </h2>
        <span className="text-xs text-gray-400 dark:text-gray-500 font-normal ml-1">
          {fieldValues.length} {fieldValues.length === 1 ? 'campo' : 'campi'}
        </span>
      </div>

      {/* Field list */}
      <div className="-mx-1 px-1">
        {fieldValues.map((item) => (
          <FieldRow
            key={item.definition.id}
            item={item}
            readOnly={readOnly}
            onSave={handleSave}
          />
        ))}
      </div>
    </div>
  )
}
