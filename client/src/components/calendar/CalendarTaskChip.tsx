/**
 * CalendarTaskChip - Compact task representation for calendar cells
 * JARVIS palette: cyan for in_progress, emerald for done, red for blocked,
 * amber for review, slate for todo/cancelled
 */

import React from 'react'
import type { CalendarTask } from '@stores/calendarStore'
import { isOverdue } from '@/utils/dateFormatters'

interface CalendarTaskChipProps {
  task: CalendarTask
  onClick: () => void
}

// border-l accent | bg (light) | darkBg | text (light) | darkText
const STATUS_STYLES: Record<string, { border: string; bg: string; darkBg: string; text: string; darkText: string }> = {
  todo: {
    border: 'border-l-slate-500',
    bg: 'bg-slate-100',
    darkBg: 'dark:bg-slate-700/50',
    text: 'text-slate-700',
    darkText: 'dark:text-slate-300',
  },
  in_progress: {
    border: 'border-l-cyan-500',
    bg: 'bg-cyan-50',
    darkBg: 'dark:bg-cyan-500/15',
    text: 'text-cyan-800',
    darkText: 'dark:text-cyan-300',
  },
  review: {
    border: 'border-l-amber-500',
    bg: 'bg-amber-50',
    darkBg: 'dark:bg-amber-500/15',
    text: 'text-amber-800',
    darkText: 'dark:text-amber-300',
  },
  blocked: {
    border: 'border-l-red-500',
    bg: 'bg-red-50',
    darkBg: 'dark:bg-red-500/15',
    text: 'text-red-800',
    darkText: 'dark:text-red-300',
  },
  done: {
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-50',
    darkBg: 'dark:bg-emerald-500/15',
    text: 'text-emerald-800',
    darkText: 'dark:text-emerald-300',
  },
  cancelled: {
    border: 'border-l-slate-400',
    bg: 'bg-slate-100',
    darkBg: 'dark:bg-slate-700/30',
    text: 'text-slate-500',
    darkText: 'dark:text-slate-400',
  },
}

const OVERDUE_STYLE = {
  border: 'border-l-red-600',
  bg: 'bg-red-50',
  darkBg: 'dark:bg-red-500/20',
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
        ${taskIsOverdue ? 'ring-1 ring-red-500/40 dark:ring-red-500/40' : ''}
        hover:brightness-95 dark:hover:brightness-110
        transition-all duration-100
        focus:outline-none focus:ring-1 focus:ring-cyan-500/40
      `}
    >
      <span className="truncate leading-4">{task.title}</span>
    </button>
  )
})

export default CalendarTaskChip
