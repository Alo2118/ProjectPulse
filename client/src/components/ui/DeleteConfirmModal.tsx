/**
 * Delete Confirm Modal - Reusable confirmation modal for delete operations
 * @module components/ui/DeleteConfirmModal
 */

import { Loader2, Trash2 } from 'lucide-react'
import { BaseModal } from '@components/ui/BaseModal'

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
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="md"
      showCloseButton={false}
    >
      <div className="p-6">
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {message}
          {itemName && <strong> {itemName}</strong>}
          {itemName && '?'}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
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
    </BaseModal>
  )
}
