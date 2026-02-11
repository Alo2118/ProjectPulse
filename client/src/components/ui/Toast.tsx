import { useEffect } from 'react'
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

function ToastItem({ id, type, title, message }: {
  id: string
  type: ToastType
  title: string
  message?: string
}) {
  const removeToast = useToastStore((s) => s.removeToast)
  const Icon = ICONS[type]

  useEffect(() => {
    const timer = setTimeout(() => removeToast(id), 4000)
    return () => clearTimeout(timer)
  }, [id, removeToast])

  return (
    <div
      className={`card p-4 flex items-start gap-3 min-w-[320px] max-w-[420px]
        border ${STYLES[type]} animate-slide-in-right`}
    >
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${ICON_COLORS[type]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        {message && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{message}</p>
        )}
      </div>
      <button
        onClick={() => removeToast(id)}
        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} />
      ))}
    </div>
  )
}
