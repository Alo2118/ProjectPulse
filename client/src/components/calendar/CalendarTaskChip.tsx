/**
 * CalendarTaskChip - Compact task representation for calendar cells
 */

import React from 'react'
import type { CalendarTask } from '@stores/calendarStore'
import { isOverdue } from '@/utils/dateFormatters'

interface CalendarTaskChipProps {
  task: CalendarTask
  onClick: () => void
}

const STATUS_STYLES: Record<string, { border: string; bg: string; darkBg: string; text: string; darkText: string }> = {
  todo: {
    border: 'border-l-gray-400',
    bg: 'bg-gray-100',
    darkBg: 'dark:bg-gray-700/60',
    text: 'text-gray-700',
    darkText: 'dark:text-gray-200',
  },
  in_progress: {
    border: 'border-l-blue-500',
    bg: 'bg-blue-50',
    darkBg: 'dark:bg-blue-900/30',
    text: 'text-blue-800',
    darkText: 'dark:text-blue-200',
  },
  review: {
    border: 'border-l-violet-500',
    bg: 'bg-violet-50',
    darkBg: 'dark:bg-violet-900/30',
    text: 'text-violet-800',
    darkText: 'dark:text-violet-200',
  },
  blocked: {
    border: 'border-l-red-500',
    bg: 'bg-red-50',
    darkBg: 'dark:bg-red-900/30',
    text: 'text-red-800',
    darkText: 'dark:text-red-200',
  },
  done: {
    border: 'border-l-green-500',
    bg: 'bg-green-50',
    darkBg: 'dark:bg-green-900/30',
    text: 'text-green-800',
    darkText: 'dark:text-green-200',
  },
  cancelled: {
    border: 'border-l-gray-400',
    bg: 'bg-gray-100',
    darkBg: 'dark:bg-gray-700/40',
    text: 'text-gray-500',
    darkText: 'dark:text-gray-400',
  },
}

const OVERDUE_STYLE = {
  border: 'border-l-red-600',
  bg: 'bg-red-50',
  darkBg: 'dark:bg-red-900/30',
  text: 'text-red-700',
  darkText: 'dark:text-red-300',
}

const CalendarTaskChip = React.memo(function CalendarTaskChip({
  task,
  onClick,
}: CalendarTaskChipProps) {
  const taskIsOverdue = isOverdue(task.dueDate, task.status)
  const style = taskIsOverdue ? OVERDUE_STYLE : (STATUS_STYLES[task.status] ?? STATUS_STYLES.todo)

  return (
    <button
      onClick={onClick}
      title={taskIsOverdue ? `[SCADUTO] ${task.code}: ${task.title}` : `${task.code}: ${task.title}`}
      className={`
        w-full flex items-center gap-1 px-1.5 py-0.5 rounded text-xs truncate cursor-pointer
        border-l-2 text-left
        ${style.border} ${style.bg} ${style.darkBg} ${style.text} ${style.darkText}
        ${taskIsOverdue ? 'ring-1 ring-red-400/50 dark:ring-red-500/40' : ''}
        hover:brightness-95 dark:hover:brightness-110
        transition-all duration-100
        focus:outline-none focus:ring-1 focus:ring-primary-500/50
      `}
    >
      <span className="truncate leading-4">{task.title}</span>
    </button>
  )
})

export default CalendarTaskChip
