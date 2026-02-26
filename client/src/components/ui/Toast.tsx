import { useEffect, useRef, useState } from 'react'
import { X, CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react'
import { useToastStore } from '@stores/toastStore'
import type { ToastType } from '@stores/toastStore'

const ICONS: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
}

const ICON_COLORS: Record<ToastType, string> = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  info: 'text-cyan-400',
  warning: 'text-amber-400',
}

const ACTION_COLORS: Record<ToastType, string> = {
  success: 'text-emerald-400 hover:text-emerald-300',
  error: 'text-red-400 hover:text-red-300',
  info: 'text-cyan-400 hover:text-cyan-300',
  warning: 'text-amber-400 hover:text-amber-300',
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
      className="flex flex-col min-w-[320px] max-w-[420px] overflow-hidden rounded-lg
        bg-white border border-slate-200 shadow-lg
        dark:bg-slate-800 dark:border dark:border-cyan-500/20 dark:shadow-glow-cyan
        animate-slide-in-right"
    >
      {/* Main content row */}
      <div className="flex items-start gap-3 p-4">
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${ICON_COLORS[type]}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{title}</p>
          {message && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{message}</p>
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
          className="flex-shrink-0 p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          aria-label="Chiudi notifica"
        >
          <X className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        </button>
      </div>

      {/* Progress bar — only shown when showProgress is true */}
      {showProgress && (
        <div className="h-0.5 w-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full bg-cyan-500 transition-[width] ease-linear"
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
