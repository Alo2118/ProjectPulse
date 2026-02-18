/**
 * Delete Confirm Modal - Reusable confirmation modal for delete operations
 * @module components/ui/DeleteConfirmModal
 */

import { useEffect, useCallback } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { useFocusTrap } from '@hooks/useFocusTrap'

interface DeleteConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  itemName?: string
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteConfirmModal({
  isOpen,
  title,
  message,
  itemName,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteConfirmModalProps) {
  const trapRef = useFocusTrap(isOpen)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) onCancel()
    },
    [isDeleting, onCancel]
  )

  useEffect(() => {
    if (!isOpen) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
      >
        <h3 id="delete-dialog-title" className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {message}
          {itemName && <strong> {itemName}</strong>}
          {itemName && '?'}
          {!itemName && message.endsWith('?') ? '' : ''}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors flex items-center disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Eliminazione...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Elimina
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
