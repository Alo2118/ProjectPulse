/**
 * WeekView - Week view calendar with all tasks/entries per day
 */

import React, { useMemo } from 'react'
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  format,
  parseISO,
} from 'date-fns'
import { it } from 'date-fns/locale'
import type { CalendarTask, CalendarTimeEntry } from '@stores/calendarStore'
import CalendarTaskChip from './CalendarTaskChip'
import CalendarEntryChip from './CalendarEntryChip'

interface WeekViewProps {
  currentDate: Date
  tasks: CalendarTask[]
  timeEntries?: CalendarTimeEntry[]
  dataMode?: 'tasks' | 'entries'
  onTaskClick: (taskId: string) => void
}

function getTasksForDay(tasks: CalendarTask[], day: Date): CalendarTask[] {
  return tasks.filter((task) => {
    const startDate = task.startDate ? parseISO(task.startDate) : null
    const dueDate = task.dueDate ? parseISO(task.dueDate) : null

    if (dueDate && isSameDay(dueDate, day)) return true
    if (startDate && isSameDay(startDate, day)) return true
    if (startDate && dueDate && day > startDate && day < dueDate) return true

    return false
  })
}

function getEntriesForDay(entries: CalendarTimeEntry[], day: Date): CalendarTimeEntry[] {
  return entries.filter((entry) => {
    const entryDate = parseISO(entry.startTime)
    return isSameDay(entryDate, day)
  })
}

function formatTotalDuration(minutes: number): string {
  if (minutes <= 0) return '0m'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

const WeekView = React.memo(function WeekView({
  currentDate,
  tasks,
  timeEntries = [],
  dataMode = 'tasks',
  onTaskClick,
}: WeekViewProps) {
  const days = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: weekStart, end: weekEnd })
  }, [currentDate])

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {days.map((day) => {
          const isTodayDate = isToday(day)
          return (
            <div
              key={day.toISOString()}
              className="py-3 text-center"
            >
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
                {format(day, 'EEE', { locale: it })}
              </span>
              <span
                className={`
                  inline-flex items-center justify-center w-8 h-8 mt-1 text-sm font-semibold rounded-full
                  ${isTodayDate
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-700 dark:text-gray-200'}
                `}
              >
                {format(day, 'd')}
              </span>
            </div>
          )
        })}
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-7 flex-1 divide-x divide-gray-200 dark:divide-gray-700">
        {days.map((day) => {
          const isTodayDate = isToday(day)

          const dayTasks = dataMode === 'tasks' ? getTasksForDay(tasks, day) : []
          const dayEntries = dataMode === 'entries' ? getEntriesForDay(timeEntries, day) : []

          const isEmpty = dataMode === 'tasks' ? dayTasks.length === 0 : dayEntries.length === 0

          const totalMinutes = dataMode === 'entries'
            ? dayEntries.reduce((sum, e) => sum + (e.duration ?? 0), 0)
            : 0

          return (
            <div
              key={day.toISOString()}
              className={`
                p-2 flex flex-col gap-1.5 min-h-[200px]
                ${isTodayDate
                  ? 'bg-primary-50/30 dark:bg-primary-900/10'
                  : 'bg-white dark:bg-surface-900'}
              `}
            >
              {/* Daily total badge for entries */}
              {dataMode === 'entries' && totalMinutes > 0 && (
                <div className="text-xs font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 rounded px-1.5 py-0.5 text-center mb-1">
                  {formatTotalDuration(totalMinutes)}
                </div>
              )}

              {isEmpty ? (
                <p className="text-xs text-gray-300 dark:text-gray-600 text-center mt-4">
                  {dataMode === 'tasks' ? 'Nessun task' : 'Nessuna registrazione'}
                </p>
              ) : dataMode === 'tasks' ? (
                dayTasks.map((task) => (
                  <CalendarTaskChip
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick(task.id)}
                  />
                ))
              ) : (
                dayEntries.map((entry) => (
                  <CalendarEntryChip
                    key={entry.id}
                    entry={entry}
                    onClick={() => { if (entry.task) onTaskClick(entry.task.id) }}
                  />
                ))
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default WeekView
