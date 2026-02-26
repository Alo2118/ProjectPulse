/**
 * TaskBulkActionBar — Floating toolbar shown when one or more tasks are selected.
 * Provides bulk status change, bulk priority change, bulk delete, and clear selection.
 * @module components/tasks/TaskBulkActionBar
 */

import { useState } from 'react'
import { ChevronDown, Trash2, X } from 'lucide-react'

export interface TaskBulkActionBarProps {
  selectedIds: string[]
  onClearSelection: () => void
  onBulkStatusChange: (status: string) => Promise<void>
  onBulkPriorityChange: (priority: string) => Promise<void>
  onBulkDelete: () => void
  isAdmin: boolean
}

export function TaskBulkActionBar({
  selectedIds,
  onClearSelection,
  onBulkStatusChange,
  onBulkPriorityChange,
  onBulkDelete,
  isAdmin,
}: TaskBulkActionBarProps) {
  const [bulkStatusValue, setBulkStatusValue] = useState('')
  const [bulkPriorityValue, setBulkPriorityValue] = useState('')
  const [isApplying, setIsApplying] = useState(false)

  const canApply = !!(bulkStatusValue || bulkPriorityValue)

  const handleApply = async () => {
    if (!canApply) return
    setIsApplying(true)
    try {
      if (bulkStatusValue) {
        await onBulkStatusChange(bulkStatusValue)
      } else if (bulkPriorityValue) {
        await onBulkPriorityChange(bulkPriorityValue)
      }
      setBulkStatusValue('')
      setBulkPriorityValue('')
    } finally {
      setIsApplying(false)
    }
  }

  const count = selectedIds.length

  return (
    <div className="floating-bar animate-slide-up-in" role="toolbar" aria-label="Azioni in blocco">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
          {count} {count === 1 ? 'selezionato' : 'selezionati'}
        </span>

        <div
          className="h-4 w-px bg-gray-200 dark:bg-gray-700 flex-shrink-0"
          aria-hidden="true"
        />

        {/* Bulk status */}
        <div className="relative">
          <select
            value={bulkStatusValue}
            onChange={(e) => {
              setBulkStatusValue(e.target.value)
              setBulkPriorityValue('')
            }}
            className="input py-1.5 pr-8 text-sm"
            aria-label="Cambia stato in blocco"
          >
            <option value="">Stato...</option>
            <option value="todo">Da fare</option>
            <option value="in_progress">In corso</option>
            <option value="review">In revisione</option>
            <option value="blocked">Bloccato</option>
            <option value="done">Completato</option>
          </select>
          <ChevronDown
            className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-gray-400 dark:text-gray-500"
            aria-hidden="true"
          />
        </div>

        {/* Bulk priority */}
        <div className="relative">
          <select
            value={bulkPriorityValue}
            onChange={(e) => {
              setBulkPriorityValue(e.target.value)
              setBulkStatusValue('')
            }}
            className="input py-1.5 pr-8 text-sm"
            aria-label="Cambia priorità in blocco"
          >
            <option value="">Priorità...</option>
            <option value="critical">Critica</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Bassa</option>
          </select>
          <ChevronDown
            className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-gray-400 dark:text-gray-500"
            aria-hidden="true"
          />
        </div>

        <button
          type="button"
          onClick={() => void handleApply()}
          disabled={isApplying || !canApply}
          className="btn-primary py-1.5 px-4 text-sm disabled:opacity-50"
        >
          {isApplying ? 'Applicando...' : 'Applica'}
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={onBulkDelete}
            className="flex items-center gap-1.5 py-1.5 px-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            aria-label="Elimina i task selezionati"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            Elimina
          </button>
        )}

        <button
          type="button"
          onClick={onClearSelection}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
          title="Deseleziona tutto"
          aria-label="Deseleziona tutto"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
