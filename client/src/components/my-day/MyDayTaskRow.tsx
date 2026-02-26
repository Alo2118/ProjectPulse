/**
 * MyDayTaskRow - Interactive task row with inline editing for My Day view
 * @module components/my-day/MyDayTaskRow
 */

import { Link } from 'react-router-dom'
import { Play, Square, Clock } from 'lucide-react'
import { InlineSelect } from '@components/ui/InlineSelect'
import type { InlineSelectOption } from '@components/ui/InlineSelect'
import type { Task, TaskStatus } from '@/types'
import { TASK_STATUS_TRANSITIONS } from '@/constants'
import { formatHoursFromDecimal } from '@utils/dateFormatters'

interface MyDayTaskRowProps {
  task: Task
  canTrackTime: boolean
  isTimerRunning: boolean
  onTimerToggle: () => void
  onStatusChange: (newStatus: TaskStatus) => void
  onPriorityChange: (newPriority: string) => void
}

const ALL_STATUS_OPTIONS: InlineSelectOption[] = [
  { value: 'todo', label: 'Da fare', color: 'text-slate-400', bgColor: 'bg-slate-100 dark:bg-slate-800' },
  { value: 'in_progress', label: 'In Corso', color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  { value: 'review', label: 'Review', color: 'text-violet-500', bgColor: 'bg-violet-100 dark:bg-violet-900/30' },
  { value: 'blocked', label: 'Bloccato', color: 'text-red-500', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  { value: 'done', label: 'Completato', color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  { value: 'cancelled', label: 'Annullato', color: 'text-slate-500', bgColor: 'bg-slate-100 dark:bg-slate-800' },
]

const PRIORITY_OPTIONS: InlineSelectOption[] = [
  { value: 'low', label: 'Bassa', dotColor: 'bg-green-500' },
  { value: 'medium', label: 'Media', dotColor: 'bg-amber-500' },
  { value: 'high', label: 'Alta', dotColor: 'bg-orange-500' },
  { value: 'critical', label: 'Critica', dotColor: 'bg-red-500' },
]

const PRIORITY_BORDER: Record<string, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-amber-400',
  low: 'border-l-slate-300 dark:border-l-slate-600',
}

const COMPLETION_CIRCLE_COLORS: Record<string, string> = {
  in_progress: 'border-blue-400 bg-blue-400/20',
  review: 'border-violet-400 bg-violet-400/20',
  todo: 'border-slate-300 dark:border-slate-600',
  blocked: 'border-red-400 bg-red-400/20',
}

function getDueBadge(dueDate: string | null): { label: string; className: string } | null {
  if (!dueDate) return null
  const now = new Date()
  const due = new Date(dueDate)
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return { label: 'Scaduto', className: 'bg-red-500/10 text-red-600 dark:text-red-400' }
  }
  if (diffDays === 0) {
    return { label: 'Oggi', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' }
  }
  if (diffDays <= 2) {
    return { label: `${diffDays}g`, className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' }
  }
  if (diffDays <= 7) {
    return { label: `${diffDays}g`, className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' }
  }
  return { label: `${diffDays}g`, className: 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400' }
}

function formatHours(value: number | null): string {
  if (!value) return '-'
  return formatHoursFromDecimal(value)
}

export function MyDayTaskRow({
  task,
  canTrackTime,
  isTimerRunning,
  onTimerToggle,
  onStatusChange,
  onPriorityChange,
}: MyDayTaskRowProps) {
  const dueBadge = getDueBadge(task.dueDate)
  const borderClass = PRIORITY_BORDER[task.priority] ?? PRIORITY_BORDER.low
  const circleClass = COMPLETION_CIRCLE_COLORS[task.status] ?? COMPLETION_CIRCLE_COLORS.todo

  // Filter status options to only valid transitions from current status
  const allowedTransitions = TASK_STATUS_TRANSITIONS[task.status] ?? []
  const statusOptions = ALL_STATUS_OPTIONS.filter(
    (opt) => opt.value === task.status || allowedTransitions.includes(opt.value as TaskStatus)
  )

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 transition-all group border-l-4 ${borderClass} ${
        isTimerRunning
          ? 'bg-cyan-50/50 dark:bg-cyan-900/10'
          : 'hover:bg-slate-50 dark:hover:bg-white/5'
      }`}
    >
      {/* Completion circle */}
      <button
        onClick={() => onStatusChange('done')}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all
          ${circleClass}
          hover:border-green-400 hover:bg-green-400/20`}
        title="Completa task"
        aria-label={`Completa ${task.title}`}
      />

      {/* Priority inline select */}
      <InlineSelect
        value={task.priority}
        options={PRIORITY_OPTIONS}
        onChange={async (newPriority) => {
          onPriorityChange(newPriority)
        }}
        size="sm"
      />

      {/* Task info */}
      <Link to={`/tasks/${task.id}`} className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
          {task.title}
        </p>
        {task.project && (
          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
            {task.project.name}
          </p>
        )}
      </Link>

      {/* Hours */}
      <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
        <Clock className="w-3 h-3" />
        <span>{formatHours(task.actualHours)}/{formatHours(task.estimatedHours)}</span>
      </div>

      {/* Due badge */}
      {dueBadge && (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${dueBadge.className}`}>
          {dueBadge.label}
        </span>
      )}

      {/* Status inline select */}
      <InlineSelect
        value={task.status}
        options={statusOptions}
        onChange={async (newStatus) => {
          onStatusChange(newStatus as TaskStatus)
        }}
        size="sm"
      />

      {/* Timer button */}
      {canTrackTime && task.taskType !== 'milestone' && (
        <button
          onClick={(e) => {
            e.preventDefault()
            onTimerToggle()
          }}
          className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
            isTimerRunning
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-slate-100 dark:bg-white/10 text-slate-400 hover:bg-cyan-500 hover:text-white opacity-0 group-hover:opacity-100'
          }`}
          title={isTimerRunning ? 'Stop timer' : 'Avvia timer'}
          aria-label={isTimerRunning ? 'Stop timer' : 'Avvia timer'}
        >
          {isTimerRunning ? (
            <Square className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  )
}
