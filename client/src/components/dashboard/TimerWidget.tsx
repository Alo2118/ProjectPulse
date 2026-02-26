/**
 * TimerWidget - Prominent full-width timer for active task
 * Shows running timer with task name, live counter, and stop button
 * When inactive, shows a prompt to start a timer
 */

import { Link } from 'react-router-dom'
import { Play, Square, Timer } from 'lucide-react'
import { LiveTimer } from '@/components/ui/LiveTimer'
import { useDashboardStore } from '@stores/dashboardStore'

interface TimerWidgetProps {
  onTimerToggle: (taskId: string) => void
}

export function TimerWidget({ onTimerToggle }: TimerWidgetProps) {
  const { runningTimer } = useDashboardStore()

  if (!runningTimer) {
    return (
      <div className="card p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gray-100 dark:bg-white/10">
            <Timer className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Nessun timer attivo
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Avvia un timer dalla pagina task
            </p>
          </div>
        </div>
        <Link
          to="/tasks"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors text-sm font-medium"
        >
          <Play className="w-4 h-4" />
          Vai ai task
        </Link>
      </div>
    )
  }

  return (
    <div className="card p-4 sm:p-6 border-primary-500/30 dark:border-primary-500/40 bg-gradient-to-r from-primary-50/50 to-transparent dark:from-primary-900/20 dark:to-transparent">
      <div className="flex items-center gap-4">
        {/* Pulse indicator */}
        <div className="relative flex-shrink-0">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-30" />
        </div>

        {/* Task info */}
        <div className="flex-1 min-w-0">
          <Link
            to={`/tasks/${runningTimer.taskId}`}
            className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 truncate block"
          >
            {runningTimer.task?.title || 'Timer attivo'}
          </Link>
          {runningTimer.task?.project && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {runningTimer.task.project.name}
            </p>
          )}
        </div>

        {/* Live timer */}
        <LiveTimer
          startTime={runningTimer.startTime}
          size="lg"
          className="text-primary-600 dark:text-primary-400"
        />

        {/* Stop button */}
        <button
          onClick={() => onTimerToggle(runningTimer.taskId)}
          className="p-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors flex-shrink-0 shadow-lg shadow-red-500/25"
          title="Stop timer"
        >
          <Square className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
