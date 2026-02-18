/**
 * DashboardCustomizer - Slide-over panel for reordering and toggling dashboard widgets
 * @module components/dashboard/DashboardCustomizer
 */

import { useCallback } from 'react'
import { X, Eye, EyeOff, ChevronUp, ChevronDown, RotateCcw, Settings2 } from 'lucide-react'
import { useFocusTrap } from '@hooks/useFocusTrap'
import {
  useDashboardLayoutStore,
  WidgetConfig,
} from '@stores/dashboardLayoutStore'

interface DashboardCustomizerProps {
  role: 'admin' | 'direzione' | 'dipendente'
}

export function DashboardCustomizer({ role }: DashboardCustomizerProps) {
  const { isCustomizing, setCustomizing, toggleWidget, moveWidget, resetLayout } =
    useDashboardLayoutStore()

  const allWidgets = useDashboardLayoutStore((s) =>
    s.widgets
      .filter((w) => {
        if (w.availableTo === 'all') return true
        if (w.availableTo === 'direzione') return role === 'direzione'
        if (w.availableTo === 'dipendente') return role !== 'direzione'
        return false
      })
      .sort((a, b) => a.order - b.order)
  )

  const trapRef = useFocusTrap(isCustomizing)

  const handleReset = useCallback(() => {
    if (window.confirm('Ripristinare il layout predefinito?')) {
      resetLayout()
    }
  }, [resetLayout])

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setCustomizing(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
        aria-label="Personalizza dashboard"
      >
        <Settings2 className="w-4 h-4" />
        <span className="hidden sm:inline">Personalizza</span>
      </button>

      {/* Overlay */}
      {isCustomizing && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity"
          aria-hidden="true"
          onClick={() => setCustomizing(false)}
        />
      )}

      {/* Slide-over panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-80 bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-white/10 transform transition-transform duration-300 ${
          isCustomizing ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Personalizza Dashboard"
      >
        <div ref={trapRef} className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary-500" />
                Layout Dashboard
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Attiva/disattiva e riordina i widget
              </p>
            </div>
            <button
              onClick={() => setCustomizing(false)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              aria-label="Chiudi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Widget list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {allWidgets.map((widget, idx) => (
              <WidgetRow
                key={widget.id}
                widget={widget}
                isFirst={idx === 0}
                isLast={idx === allWidgets.length - 1}
                onToggle={() => toggleWidget(widget.id)}
                onMoveUp={() => moveWidget(widget.id, 'up')}
                onMoveDown={() => moveWidget(widget.id, 'down')}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-white/10">
            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Ripristina predefinito
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

interface WidgetRowProps {
  widget: WidgetConfig
  isFirst: boolean
  isLast: boolean
  onToggle: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function WidgetRow({ widget, isFirst, isLast, onToggle, onMoveUp, onMoveDown }: WidgetRowProps) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
        widget.visible
          ? 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10'
          : 'bg-gray-50 dark:bg-white/[0.02] border-gray-100 dark:border-white/5 opacity-60'
      }`}
    >
      {/* Visibility toggle */}
      <button
        onClick={onToggle}
        className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
          widget.visible
            ? 'text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20'
            : 'text-gray-400 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5'
        }`}
        aria-label={widget.visible ? `Nascondi ${widget.label}` : `Mostra ${widget.label}`}
        title={widget.visible ? 'Nascondi widget' : 'Mostra widget'}
      >
        {widget.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>

      {/* Label + description */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            widget.visible ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'
          }`}
        >
          {widget.label}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{widget.description}</p>
      </div>

      {/* Move up/down */}
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20 disabled:cursor-not-allowed"
          aria-label={`Sposta ${widget.label} in su`}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20 disabled:cursor-not-allowed"
          aria-label={`Sposta ${widget.label} in giù`}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
