/**
 * Blocked Reason Modal - Prompts for reason when blocking a task
 * @module components/tasks/BlockedReasonModal
 */

import { useState } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'

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

  if (!isOpen) return null

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
            Motivo del blocco
          </h3>
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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
              Spiega perche il task e bloccato <span className="text-red-500">*</span>
            </label>
            <textarea
              id="blocked-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Es: In attesa di risposta dal cliente, Dipendenza da altro task, Problema tecnico..."
              rows={4}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       placeholder-gray-400 dark:placeholder-gray-500
                       focus:ring-2 focus:ring-yellow-500 focus:border-transparent
                       resize-none disabled:opacity-50"
              autoFocus
              required
            />
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
              className="px-4 py-2 bg-yellow-500 text-white hover:bg-yellow-600
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
    </div>
  )
}
