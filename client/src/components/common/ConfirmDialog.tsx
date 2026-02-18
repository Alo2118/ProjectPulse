/**
 * ConfirmDialog - Reusable confirmation modal
 * @module components/common/ConfirmDialog
 */

import { useEffect, useCallback, type ReactNode } from 'react'
import { Loader2, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { useFocusTrap } from '@hooks/useFocusTrap'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string | ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
}

const VARIANT_CONFIG = {
  danger: {
    icon: AlertTriangle,
    iconClass: 'text-red-500 dark:text-red-400',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    confirmClass:
      'bg-red-600 hover:bg-red-700 focus:ring-red-500/50 text-white disabled:opacity-50',
  },
  warning: {
    icon: AlertCircle,
    iconClass: 'text-amber-500 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    confirmClass:
      'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500/50 text-white disabled:opacity-50',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-500 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    confirmClass:
      'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500/50 text-white disabled:opacity-50',
  },
} as const

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Conferma',
  cancelLabel = 'Annulla',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const config = VARIANT_CONFIG[variant]
  const Icon = config.icon

  const trapRef = useFocusTrap(isOpen)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose()
      }
    },
    [isLoading, onClose]
  )

  useEffect(() => {
    if (!isOpen) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          aria-hidden="true"
          onClick={!isLoading ? onClose : undefined}
        />

        {/* Dialog card */}
        <div
          ref={trapRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-message"
          className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6"
        >
          {/* Icon + Title */}
          <div className="flex items-start gap-4 mb-3">
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${config.iconBg}`}
            >
              <Icon className={`w-5 h-5 ${config.iconClass}`} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h3
                id="confirm-dialog-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {title}
              </h3>
            </div>
          </div>

          {/* Message */}
          <p
            id="confirm-dialog-message"
            className="text-sm text-gray-600 dark:text-gray-400 mb-6 pl-14"
          >
            {message}
          </p>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="btn-secondary disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg font-medium flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all duration-200 active:scale-[0.98] ${config.confirmClass}`}
            >
              {isLoading && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
              )}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
