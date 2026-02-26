/**
 * TaskListViewItem — Single task row rendered inside the list-view sections.
 * Handles inline edits (status, priority, due date, assignee) and the timer toggle.
 * @module components/tasks/TaskListViewItem
 */

import { Link } from 'react-router-dom'
import { Play, Square, Repeat2 } from 'lucide-react'
import { InlineSelect } from '@components/ui/InlineSelect'
import type { InlineSelectOption } from '@components/ui/InlineSelect'
import { InlineDatePicker } from '@components/ui/InlineDatePicker'
import { InlineUserSelect } from '@components/ui/InlineUserSelect'
import { DepartmentBadge } from '@components/ui/DepartmentBadge'
import type { Task, TaskStatus } from '@/types'

// ---- shared option lists (duplicated here to keep the component self-contained) ----

const STATUS_OPTIONS: InlineSelectOption[] = [
  { value: 'todo', label: 'Da fare', color: 'text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  { value: 'in_progress', label: 'In Corso', color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  { value: 'review', label: 'Review', color: 'text-violet-500', bgColor: 'bg-violet-100 dark:bg-violet-900/30' },
  { value: 'blocked', label: 'Bloccato', color: 'text-red-500', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  { value: 'done', label: 'Completato', color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  { value: 'cancelled', label: 'Annullato', color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-800' },
]

const PRIORITY_OPTIONS: InlineSelectOption[] = [
  { value: 'low', label: 'Bassa', dotColor: 'bg-green-500' },
  { value: 'medium', label: 'Media', dotColor: 'bg-amber-500' },
  { value: 'high', label: 'Alta', dotColor: 'bg-orange-500' },
  { value: 'critical', label: 'Critica', dotColor: 'bg-red-500' },
]

function priorityBorderClass(priority: Task['priority']): string {
  switch (priority) {
    case 'critical': return 'border-l-red-500'
    case 'high': return 'border-l-orange-400'
    case 'medium': return 'border-l-amber-400'
    default: return 'border-l-slate-600/50 dark:border-l-slate-600/50'
  }
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate) return false
  if (task.status === 'done' || task.status === 'cancelled') return false
  const dateOnly = task.dueDate.includes('T') ? task.dueDate.split('T')[0] : task.dueDate
  return dateOnly < todayISO()
}

// ---- component ----

export interface TaskListViewItemProps {
  task: Task
  isSelected: boolean
  onSelect: (id: string) => void
  onStatusChange: (taskId: string, status: string) => void
  onPriorityChange: (taskId: string, priority: string) => void
  onDueDateChange: (taskId: string, date: string | null) => void
  onAssigneeChange: (taskId: string, userId: string | null) => void
  onTimerToggle: (taskId: string) => void
  runningTimerId: string | null
  canTrackTime: boolean
  onRequestBlockedModal: (taskId: string, taskTitle: string) => void
}

export function TaskListViewItem({
  task,
  isSelected,
  onSelect,
  onStatusChange,
  onPriorityChange,
  onDueDateChange,
  onAssigneeChange,
  onTimerToggle,
  runningTimerId,
  canTrackTime,
  onRequestBlockedModal,
}: TaskListViewItemProps) {
  const isRunning = runningTimerId === task.id
  const isCompleted = task.status === 'done' || task.status === 'cancelled'
  const overdue = isOverdue(task)

  const estimatedPct =
    task.estimatedHours && task.actualHours
      ? Math.min(Math.round((task.actualHours / task.estimatedHours) * 100), 100)
      : null

  return (
    <div
      className={[
        'flex items-start gap-3 px-4 py-3 rounded-lg border-l-[3px] transition-all duration-150 group',
        priorityBorderClass(task.priority),
        isCompleted ? 'opacity-50' : '',
        isSelected
          ? 'bg-cyan-500/10 dark:bg-cyan-500/10'
          : 'hover:bg-slate-800/60 dark:hover:bg-slate-800/60 :root:not(.dark):hover:bg-slate-50',
        overdue ? 'ring-1 ring-red-400/30' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Left column: checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onSelect(task.id)}
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5 w-3.5 h-3.5 flex-shrink-0 rounded border-slate-600 dark:border-slate-600 text-cyan-500 focus:ring-cyan-500/30 cursor-pointer accent-cyan-500"
        aria-label={`Seleziona ${task.title}`}
      />

      {/* Right column: two rows */}
      <div className="flex-1 min-w-0">
        {/* Row 1: status + title + badges */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <InlineSelect
            value={task.status}
            options={STATUS_OPTIONS}
            onChange={(newStatus) => {
              if (newStatus === 'blocked') {
                onRequestBlockedModal(task.id, task.title)
                return
              }
              onStatusChange(task.id, newStatus as TaskStatus)
            }}
            size="sm"
          />
          <Link
            to={`/tasks/${task.id}`}
            className={[
              'flex-1 text-sm text-slate-200 dark:text-slate-200 truncate hover:text-cyan-400 dark:hover:text-cyan-400 transition-colors',
              isCompleted ? 'line-through text-slate-500 dark:text-slate-500' : '',
            ].join(' ')}
          >
            {task.title}
          </Link>
          {task.isRecurring && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium whitespace-nowrap flex-shrink-0">
              <Repeat2 className="w-3 h-3" />
              Ricorrente
            </span>
          )}
          {task.project && (
            <span className="text-xs bg-cyan-500/10 dark:bg-cyan-500/10 text-cyan-400 dark:text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 :root:not(.dark):bg-cyan-50 :root:not(.dark):text-cyan-700 :root:not(.dark):border-cyan-200">
              {task.project.name}
            </span>
          )}
        </div>

        {/* Row 2: meta fields aligned under title */}
        <div className="flex flex-wrap items-center gap-2 mt-1 ml-[calc(1.375rem+0.5rem)]">
          <InlineSelect
            value={task.priority}
            options={PRIORITY_OPTIONS}
            onChange={(newPriority) => onPriorityChange(task.id, newPriority)}
            size="sm"
          />
          <DepartmentBadge department={task.department} size="sm" />
          <InlineDatePicker
            value={task.dueDate}
            onChange={(newDate) => onDueDateChange(task.id, newDate)}
            showClear
          />
          <InlineUserSelect
            value={task.assigneeId}
            displayUser={task.assignee ?? null}
            onChange={(userId) => onAssigneeChange(task.id, userId)}
            size="sm"
            allowClear
          />
          {estimatedPct !== null && (
            <div
              className="w-16 h-1.5 bg-slate-700/50 dark:bg-slate-700/50 rounded-full overflow-hidden flex-shrink-0"
              title={`${estimatedPct}% delle ore stimate`}
              aria-label={`Avanzamento ore: ${estimatedPct}%`}
            >
              <div
                className="h-full bg-cyan-500 dark:bg-cyan-500 rounded-full"
                style={{ width: `${estimatedPct}%` }}
              />
            </div>
          )}
          {canTrackTime && !isCompleted && (
            <button
              onClick={(e) => {
                e.preventDefault()
                onTimerToggle(task.id)
              }}
              className={`ml-auto p-1.5 rounded-lg transition-all duration-150 flex-shrink-0 ${
                isRunning
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-slate-700/50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-400 hover:bg-cyan-500 hover:text-white opacity-0 group-hover:opacity-100'
              }`}
              title={isRunning ? 'Stop timer' : 'Avvia timer'}
              aria-label={isRunning ? 'Ferma timer' : 'Avvia timer'}
            >
              {isRunning ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
