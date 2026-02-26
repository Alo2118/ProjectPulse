/**
 * GanttBar - Task bar component for Gantt chart
 */

import { GanttTask } from '@/types'
import { GanttTooltip } from './GanttTooltip'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface GanttBarProps {
  task: GanttTask
  left: number
  width: number
  height: number
  onClick?: () => void
}

// JARVIS palette status colors — cyan for active, emerald for done, red for blocked
const STATUS_COLORS: Record<string, { bg: string; shadow: string }> = {
  todo: { bg: 'bg-gradient-to-r from-slate-500 to-slate-400', shadow: 'shadow-slate-500/30' },
  in_progress: { bg: 'bg-gradient-to-r from-cyan-600 to-cyan-400', shadow: 'shadow-cyan-500/40' },
  review: { bg: 'bg-gradient-to-r from-amber-500 to-amber-400', shadow: 'shadow-amber-500/30' },
  blocked: { bg: 'bg-gradient-to-r from-red-600 to-red-500', shadow: 'shadow-red-500/40' },
  done: { bg: 'bg-gradient-to-r from-emerald-600 to-emerald-400', shadow: 'shadow-emerald-500/40' },
  cancelled: { bg: 'bg-gradient-to-r from-slate-400 to-slate-300', shadow: 'shadow-slate-400/20' },
}

// Priority border colors — semantic intensity scale
const PRIORITY_COLORS: Record<string, string> = {
  low: 'border-l-slate-400',
  medium: 'border-l-cyan-500',
  high: 'border-l-amber-500',
  critical: 'border-l-red-500',
}

export default function GanttBar({ task, left, width, height, onClick }: GanttBarProps) {
  const statusColor = STATUS_COLORS[task.status] || STATUS_COLORS.todo
  const priorityBorder = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium
  const isSubtask = (task.depth || 0) > 0

  // Calculate progress width
  const progressWidth = Math.min(100, Math.max(0, task.progress))

  // Subtasks are slightly smaller
  const barHeight = isSubtask ? height - 6 : height
  const barTop = isSubtask ? 7 : 4

  // Tooltip content
  const tooltipContent = (
    <div className="space-y-1 text-xs">
      {isSubtask && (
        <div className="text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-wide">Subtask</div>
      )}
      <div className="font-medium">{task.title}</div>
      <div className="text-gray-500 dark:text-gray-400">{task.code}</div>
      <div className="flex items-center gap-2">
        <span className="capitalize">{task.status.replace('_', ' ')}</span>
        <span className="text-gray-400 dark:text-gray-500">|</span>
        <span className="capitalize">{task.priority}</span>
      </div>
      {task.startDate && (
        <div>
          Inizio: {format(new Date(task.startDate), 'd MMM yyyy', { locale: it })}
        </div>
      )}
      {task.endDate && (
        <div>
          Fine: {format(new Date(task.endDate), 'd MMM yyyy', { locale: it })}
        </div>
      )}
      {task.assignee && (
        <div>
          Assegnato: {task.assignee.firstName} {task.assignee.lastName}
        </div>
      )}
      {task.progress > 0 && <div>Progresso: {task.progress}%</div>}
    </div>
  )

  return (
    <GanttTooltip content={tooltipContent}>
      <div
        className={`
          absolute flex cursor-pointer items-center overflow-hidden rounded-md
          border-l-4 ${priorityBorder}
          ${statusColor.bg}
          shadow-md ${statusColor.shadow}
          transition-all duration-200
          hover:scale-[1.02] hover:shadow-lg hover:brightness-105
          ${task.status === 'blocked' ? 'animate-pulse' : ''}
        `}
        style={{
          left,
          width: Math.max(width, 40),
          height: barHeight,
          top: barTop,
        }}
        onClick={onClick}
      >
        {/* Progress fill overlay */}
        {progressWidth > 0 && progressWidth < 100 && (
          <div
            className="absolute inset-y-0 left-0 bg-white/30"
            style={{ width: `${progressWidth}%` }}
          >
            <div className="absolute inset-y-0 right-0 w-1 bg-white/70" />
          </div>
        )}

        {/* Completed overlay */}
        {progressWidth === 100 && (
          <div className="absolute inset-0 bg-white/10" />
        )}

        {/* Task title (only show if bar is wide enough) */}
        {width > 80 && (
          <span className="relative z-10 truncate px-2 text-xs font-medium text-white drop-shadow-sm">
            {task.title}
          </span>
        )}

        {/* Progress percentage (show if bar is wide enough but title doesn't fit) */}
        {width > 40 && width <= 80 && progressWidth > 0 && (
          <span className="relative z-10 truncate px-1 text-[10px] font-medium text-white/90">
            {progressWidth}%
          </span>
        )}

        {/* Dependencies indicator */}
        {task.dependencies.length > 0 && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2">
            <div className="h-2 w-2 rounded-full bg-white/60 shadow-sm" title="Ha dipendenze" />
          </div>
        )}
      </div>
    </GanttTooltip>
  )
}
