/**
 * Blocked Reason Modal - Prompts for reason when blocking a task
 * @module components/tasks/BlockedReasonModal
 */

import { useState } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { MentionTextarea } from '@components/common/MentionTextarea'
import { BaseModal } from '@components/ui/BaseModal'

interface BlockedReasonModalProps {
  isOpen: boolean
  taskTitle: string
  isSubmitting: boolean
  onCancel: () => void
  onConfirm: (reason: string) => void
}

export function BlockedReasonModal({
  isOpen,
  taskTitle,
  isSubmitting,
  onCancel,
  onConfirm,
}: BlockedReasonModalProps) {
  const [reason, setReason] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (reason.trim()) {
      onConfirm(reason.trim())
      setReason('')
    }
  }

  const handleCancel = () => {
    setReason('')
    onCancel()
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleCancel}
      size="md"
      showCloseButton={false}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
            Motivo del blocco
          </h3>
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Stai bloccando il task: <strong className="text-gray-900 dark:text-white">{taskTitle}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="blocked-reason"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Spiega perché il task è bloccato <span className="text-red-500">*</span>
            </label>
            <MentionTextarea
              id="blocked-reason"
              value={reason}
              onChange={setReason}
              placeholder="Es: In attesa di risposta dal cliente... usa @ per notificare un collega"
              minRows={4}
              disabled={isSubmitting}
              autoFocus
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       placeholder-gray-400 dark:placeholder-gray-500
                       focus:ring-2 focus:ring-red-500 focus:border-transparent
                       disabled:opacity-50"
            />
            <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
              Digita <span className="font-mono font-semibold">@</span> per menzionare un collega e inviargli una notifica
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100
                       dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={!reason.trim() || isSubmitting}
              className="px-4 py-2 bg-red-500 text-white hover:bg-red-600
                       rounded-lg transition-colors flex items-center disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Bloccando...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Blocca Task
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </BaseModal>
  )
}
