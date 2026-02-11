/**
 * RunningTimerBanner - Centralized running timer display component
 * Shows active timer with task info and stop button
 */

import { Timer, Square } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LiveTimer } from './LiveTimer'
import { TimeEntry } from '@/types'

interface RunningTimerBannerProps {
  timer: TimeEntry
  onStop: () => void
  variant?: 'full' | 'compact'
  className?: string
}

export function RunningTimerBanner({
  timer,
  onStop,
  variant = 'full',
  className = '',
}: RunningTimerBannerProps) {
  if (variant === 'compact') {
    return (
      <div
        className={`bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 rounded-lg p-4 text-white shadow-lg ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse mr-3" />
            <span className="font-medium text-white">Timer in esecuzione</span>
          </div>
          <LiveTimer startTime={timer.startTime} className="text-white" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`card p-6 bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 text-white ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="relative mr-4">
            <Timer className="w-10 h-10 text-white" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          </div>
          <div>
            <p className="text-sm text-white/80">Timer attivo</p>
            <Link
              to={`/tasks/${timer.taskId}`}
              className="text-xl font-bold text-white hover:text-white/90 transition-colors"
            >
              {timer.task?.title || 'Task'}
            </Link>
            <p className="text-sm text-white/70">
              {timer.task?.project?.name}
              {timer.task?.project?.code && ` (${timer.task.project.code})`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <LiveTimer startTime={timer.startTime} size="lg" className="text-4xl text-white" />
          <button
            onClick={onStop}
            className="mt-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center ml-auto text-white"
          >
            <Square className="w-4 h-4 mr-2" />
            Stop
          </button>
        </div>
      </div>
    </div>
  )
}
