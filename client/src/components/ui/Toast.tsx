import { useEffect, useRef, useState } from 'react'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useToastStore } from '@stores/toastStore'
import type { ToastType } from '@stores/toastStore'

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
}

const STYLES: Record<ToastType, string> = {
  success: 'border-green-500/30 shadow-glow-green',
  error: 'border-red-500/30 shadow-glow-red',
  info: 'border-primary-500/30 shadow-glow-primary',
  warning: 'border-amber-500/30 shadow-glow-amber',
}

const ICON_COLORS: Record<ToastType, string> = {
  success: 'text-green-500',
  error: 'text-red-500',
  info: 'text-primary-500',
  warning: 'text-amber-500',
}

const PROGRESS_COLORS: Record<ToastType, string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  info: 'bg-primary-500',
  warning: 'bg-amber-500',
}

const ACTION_COLORS: Record<ToastType, string> = {
  success: 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300',
  error: 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300',
  info: 'text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300',
  warning: 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300',
}

/** Default auto-dismiss duration for standard toasts (no showProgress) */
const DEFAULT_DURATION = 4000

function ToastItem({
  id,
  type,
  title,
  message,
  duration,
  action,
  showProgress,
}: {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: { label: string; onClick: () => void }
  showProgress?: boolean
}) {
  const removeToast = useToastStore((s) => s.removeToast)
  const Icon = ICONS[type]

  // Only auto-dismiss if there is no action button — when there's an undo action,
  // the store's own timer handles removal.
  const autoDismiss = !action
  const dismissAfter = autoDismiss ? (duration ?? DEFAULT_DURATION) : undefined

  useEffect(() => {
    if (dismissAfter === undefined) return
    const timer = setTimeout(() => removeToast(id), dismissAfter)
    return () => clearTimeout(timer)
  }, [id, dismissAfter, removeToast])

  // Progress bar: width shrinks from 100% to 0% over `duration` ms using CSS transition.
  // We start at 100% and immediately transition to 0% after mount.
  const progressDuration = duration ?? DEFAULT_DURATION
  const [progressWidth, setProgressWidth] = useState(100)
  const progressStarted = useRef(false)

  useEffect(() => {
    if (!showProgress) return
    if (progressStarted.current) return
    progressStarted.current = true
    // rAF ensures the element is painted at 100% before transitioning to 0%
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setProgressWidth(0)
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [showProgress])

  return (
    <div
      className={`card flex flex-col min-w-[320px] max-w-[420px]
        border ${STYLES[type]} animate-slide-in-right overflow-hidden`}
    >
      {/* Main content row */}
      <div className="flex items-start gap-3 p-4">
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${ICON_COLORS[type]}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
          {message && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{message}</p>
          )}
        </div>

        {/* Action button (e.g. "Annulla") */}
        {action && (
          <button
            onClick={action.onClick}
            className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold
              border border-current transition-colors ${ACTION_COLORS[type]}`}
          >
            {action.label}
          </button>
        )}

        {/* Dismiss X */}
        <button
          onClick={() => removeToast(id)}
          className="flex-shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          aria-label="Chiudi notifica"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Progress bar — only shown when showProgress is true */}
      {showProgress && (
        <div className="h-0.5 w-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-full ${PROGRESS_COLORS[type]} transition-[width] ease-linear`}
            style={{
              width: `${progressWidth}%`,
              transitionDuration: `${progressDuration}ms`,
            }}
          />
        </div>
      )}
    </div>
  )
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
    </div>
  )
}
