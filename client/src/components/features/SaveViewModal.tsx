/**
 * SaveViewModal - Create or edit a saved filter view
 * @module components/features/SaveViewModal
 */

import { useState, useEffect } from 'react'
import { Bookmark, Loader2, Users, Star, X } from 'lucide-react'
import { useSavedViewStore } from '@stores/savedViewStore'
import { BaseModal } from '@components/ui/BaseModal'
import type { SavedView, SavedViewEntity } from '@/types'

interface SaveViewModalProps {
  isOpen: boolean
  onClose: () => void
  entity: SavedViewEntity
  filters: Record<string, unknown>
  sortBy?: string
  sortOrder?: string
  existingView?: SavedView
  onSaved?: (view: SavedView) => void
}

/**
 * Formats a filter value for human-readable display.
 */
function formatFilterValue(_key: string, value: unknown): string | null {
  if (value === '' || value === null || value === undefined) return null
  if (typeof value === 'boolean') return value ? 'Sì' : 'No'
  if (typeof value === 'string' && value.length > 0) return value
  if (Array.isArray(value) && value.length > 0) return value.join(', ')
  return null
}

const FILTER_LABELS: Record<string, string> = {
  status: 'Stato',
  priority: 'Priorità',
  projectId: 'Progetto',
  departmentId: 'Reparto',
  assigneeId: 'Assegnato a',
  search: 'Ricerca',
  all: 'Tutti i task',
  standalone: 'Standalone',
  view: 'Vista',
}

export function SaveViewModal({
  isOpen,
  onClose,
  entity,
  filters,
  sortBy,
  sortOrder,
  existingView,
  onSaved,
}: SaveViewModalProps) {
  const { createView, updateView } = useSavedViewStore()

  const [name, setName] = useState('')
  const [isShared, setIsShared] = useState(false)
  const [isDefault, setIsDefault] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const isEditMode = !!existingView

  // Populate form in edit mode
  useEffect(() => {
    if (isOpen) {
      if (existingView) {
        setName(existingView.name)
        setIsShared(existingView.isShared)
        setIsDefault(existingView.isDefault)
      } else {
        setName('')
        setIsShared(false)
        setIsDefault(false)
      }
      setError('')
    }
  }, [isOpen, existingView])

  // Build active filter summary for display
  const activeFilters = Object.entries(filters).filter(([, v]) => {
    if (v === '' || v === null || v === undefined) return false
    if (typeof v === 'boolean') return v
    if (Array.isArray(v)) return v.length > 0
    return true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Il nome è obbligatorio')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      if (isEditMode && existingView) {
        await updateView(existingView.id, {
          name: trimmedName,
          filters,
          sortBy: sortBy ?? undefined,
          sortOrder: (sortOrder as 'asc' | 'desc') ?? undefined,
          isShared,
          isDefault,
        })
        // Fetch the updated view for the callback — just build a local approximation
        const updatedView: SavedView = {
          ...existingView,
          name: trimmedName,
          filters,
          isShared,
          isDefault,
          sortBy: sortBy ?? null,
          sortOrder: (sortOrder as 'asc' | 'desc') ?? null,
        }
        onSaved?.(updatedView)
      } else {
        const created = await createView({
          name: trimmedName,
          entity,
          filters,
          sortBy: sortBy ?? undefined,
          sortOrder: (sortOrder as 'asc' | 'desc') ?? undefined,
          isShared,
          isDefault,
        })
        onSaved?.(created)
      }
      onClose()
    } catch {
      setError('Errore nel salvataggio della vista. Riprova.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    if (!isSaving) onClose()
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      showCloseButton={false}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-primary-500" />
            {isEditMode ? 'Modifica vista' : 'Salva vista corrente'}
          </h3>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="btn-icon disabled:opacity-50"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active filters summary */}
        {!isEditMode && (
          <div className="mb-5 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Filtri attivi
            </p>
            {activeFilters.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">Nessun filtro attivo</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {activeFilters.map(([key, value]) => {
                  const formatted = formatFilterValue(key, value)
                  if (!formatted) return null
                  const label = FILTER_LABELS[key] ?? key
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs"
                    >
                      <span className="font-medium">{label}:</span> {formatted}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name field */}
          <div>
            <label
              htmlFor="view-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Nome della vista <span className="text-red-500">*</span>
            </label>
            <input
              id="view-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              placeholder="Es: Task in corso questa settimana"
              className="input w-full"
              autoFocus
              maxLength={100}
              disabled={isSaving}
            />
            {error && (
              <p className="mt-1 text-xs text-red-500">{error}</p>
            )}
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                disabled={isSaving}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
              />
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Condividi con il team
                  </span>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Tutti i membri potranno vedere questa vista
                  </p>
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                disabled={isSaving}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
              />
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-gray-400 group-hover:text-amber-500 transition-colors" />
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Imposta come predefinita
                  </span>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Verrà applicata automaticamente all'apertura della pagina
                  </p>
                </div>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="btn-secondary disabled:opacity-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSaving}
              className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4" />
                  {isEditMode ? 'Aggiorna' : 'Salva vista'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </BaseModal>
  )
}
