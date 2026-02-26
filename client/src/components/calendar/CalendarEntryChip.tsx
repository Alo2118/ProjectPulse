/**
 * CalendarEntryChip - Compact time entry representation for calendar cells
 * JARVIS palette: cyan accent for time entries (interactive/key-data element)
 */

import React from 'react'
import { Clock } from 'lucide-react'
import type { CalendarTimeEntry } from '@stores/calendarStore'
import { formatDuration } from '@utils/dateFormatters'

interface CalendarEntryChipProps {
  entry: CalendarTimeEntry
  onClick: () => void
}

const CalendarEntryChip = React.memo(function CalendarEntryChip({
  entry,
  onClick,
}: CalendarEntryChipProps) {
  const taskTitle = entry.task?.title ?? 'Senza task'
  const duration = formatDuration(entry.duration)

  return (
    <button
      onClick={onClick}
      title={`${entry.task?.code ? `${entry.task.code}: ` : ''}${taskTitle} — ${duration}${entry.description ? ` — ${entry.description}` : ''}`}
      className="
        w-full flex items-center gap-1 px-1.5 py-0.5 rounded text-xs truncate cursor-pointer
        border-l-2 text-left
        border-l-cyan-500
        bg-cyan-50 dark:bg-cyan-500/15
        text-cyan-800 dark:text-cyan-300
        hover:brightness-95 dark:hover:brightness-110
        transition-all duration-100
        focus:outline-none focus:ring-1 focus:ring-cyan-500/40
      "
    >
      <Clock className="w-3 h-3 flex-shrink-0 opacity-60" />
      <span className="truncate leading-4">{taskTitle}</span>
      <span className="ml-auto flex-shrink-0 font-medium opacity-75">{duration}</span>
    </button>
  )
})

export default CalendarEntryChip
