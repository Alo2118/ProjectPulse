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

// Dark-mode classes are declared first, light-mode overrides via not-dark:
// border-l accent | bg dark | bg light | text dark | text light
const STATUS_STYLES: Record<string, { border: string; bg: string; lightBg: string; text: string; lightText: string }> = {
  todo: {
    border: 'border-l-slate-500',
    bg: 'dark:bg-slate-700/50',
    lightBg: 'not-dark:bg-slate-100',
    text: 'dark:text-slate-300',
    lightText: 'not-dark:text-slate-700',
  },
  in_progress: {
    border: 'border-l-cyan-500',
    bg: 'dark:bg-cyan-500/15',
    lightBg: 'not-dark:bg-cyan-50',
    text: 'dark:text-cyan-300',
    lightText: 'not-dark:text-cyan-800',
  },
  review: {
    border: 'border-l-amber-500',
    bg: 'dark:bg-amber-500/15',
    lightBg: 'not-dark:bg-amber-50',
    text: 'dark:text-amber-300',
    lightText: 'not-dark:text-amber-800',
  },
  blocked: {
    border: 'border-l-red-500',
    bg: 'dark:bg-red-500/15',
    lightBg: 'not-dark:bg-red-50',
    text: 'dark:text-red-300',
    lightText: 'not-dark:text-red-800',
  },
  done: {
    border: 'border-l-emerald-500',
    bg: 'dark:bg-emerald-500/15',
    lightBg: 'not-dark:bg-emerald-50',
    text: 'dark:text-emerald-300',
    lightText: 'not-dark:text-emerald-800',
  },
  cancelled: {
    border: 'border-l-slate-400',
    bg: 'dark:bg-slate-700/30',
    lightBg: 'not-dark:bg-slate-100',
    text: 'dark:text-slate-400',
    lightText: 'not-dark:text-slate-500',
  },
}

const OVERDUE_STYLE = {
  border: 'border-l-red-600',
  bg: 'dark:bg-red-500/20',
  lightBg: 'not-dark:bg-red-50',
  text: 'dark:text-red-300',
  lightText: 'not-dark:text-red-700',
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
        ${style.border} ${style.bg} ${style.lightBg} ${style.text} ${style.lightText}
        ${taskIsOverdue ? 'ring-1 ring-red-500/40 dark:ring-red-500/40' : ''}
        hover:brightness-110 dark:hover:brightness-110 not-dark:hover:brightness-95
        transition-all duration-100
        focus:outline-none focus:ring-1 focus:ring-cyan-500/40
      `}
    >
      <span className="truncate leading-4">{task.title}</span>
    </button>
  )
})

export default CalendarTaskChip
