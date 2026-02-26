/**
 * CalendarGrid - Month view calendar grid with day cells and task/entry chips
 */

import React, { useMemo, useState } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  format,
  parseISO,
} from 'date-fns'
import { it } from 'date-fns/locale'
import type { CalendarTask, CalendarTimeEntry } from '@stores/calendarStore'
import CalendarTaskChip from './CalendarTaskChip'
import CalendarEntryChip from './CalendarEntryChip'

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const MAX_VISIBLE_ITEMS = 3

interface CalendarGridProps {
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

    // Show task on its due date or start date
    if (dueDate && isSameDay(dueDate, day)) return true
    if (startDate && isSameDay(startDate, day)) return true

    // Show task spanning across the day
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

interface OverflowModalProps {
  day: Date
  tasks: CalendarTask[]
  entries: CalendarTimeEntry[]
  dataMode: 'tasks' | 'entries'
  onTaskClick: (taskId: string) => void
  onClose: () => void
}

function OverflowModal({ day, tasks, entries, dataMode, onTaskClick, onClose }: OverflowModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-surface-800 rounded-xl shadow-xl p-4 w-72 max-h-80 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {format(day, 'd MMMM', { locale: it })}
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
            aria-label="Chiudi"
          >
            &times;
          </button>
        </div>
        <div className="space-y-1">
          {dataMode === 'tasks'
            ? tasks.map((task) => (
                <CalendarTaskChip
                  key={task.id}
                  task={task}
                  onClick={() => { onTaskClick(task.id); onClose() }}
                />
              ))
            : entries.map((entry) => (
                <CalendarEntryChip
                  key={entry.id}
                  entry={entry}
                  onClick={() => { if (entry.task) { onTaskClick(entry.task.id); onClose() } }}
                />
              ))
          }
        </div>
      </div>
    </div>
  )
}

const CalendarGrid = React.memo(function CalendarGrid({
  currentDate,
  tasks,
  timeEntries = [],
  dataMode = 'tasks',
  onTaskClick,
}: CalendarGridProps) {
  const [overflowDay, setOverflowDay] = useState<Date | null>(null)

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentDate])

  const overflowDayData = useMemo(() => {
    if (!overflowDay) return { tasks: [] as CalendarTask[], entries: [] as CalendarTimeEntry[] }
    return {
      tasks: getTasksForDay(tasks, overflowDay),
      entries: getEntriesForDay(timeEntries, overflowDay),
    }
  }, [overflowDay, tasks, timeEntries])

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7 flex-1 divide-x divide-y divide-gray-200 dark:divide-gray-700 border-b border-gray-200 dark:border-gray-700">
          {days.map((day) => {
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isTodayDate = isToday(day)

            const dayTasks = dataMode === 'tasks' ? getTasksForDay(tasks, day) : []
            const dayEntries = dataMode === 'entries' ? getEntriesForDay(timeEntries, day) : []

            const itemCount = dataMode === 'tasks' ? dayTasks.length : dayEntries.length
            const visibleCount = Math.min(itemCount, MAX_VISIBLE_ITEMS)
            const hiddenCount = itemCount - MAX_VISIBLE_ITEMS

            const totalMinutes = dataMode === 'entries'
              ? dayEntries.reduce((sum, e) => sum + (e.duration ?? 0), 0)
              : 0

            return (
              <div
                key={day.toISOString()}
                className={`
                  min-h-[100px] p-1.5 flex flex-col gap-1
                  ${isCurrentMonth
                    ? 'bg-white dark:bg-surface-900'
                    : 'bg-gray-50/60 dark:bg-surface-800/40'}
                `}
              >
                {/* Date number */}
                <div className="flex justify-end mb-0.5">
                  <span
                    className={`
                      inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full
                      ${isTodayDate
                        ? 'bg-primary-500 text-white'
                        : isCurrentMonth
                          ? 'text-gray-700 dark:text-gray-200'
                          : 'text-gray-400 dark:text-gray-600'}
                    `}
                  >
                    {format(day, 'd')}
                  </span>
                </div>

                {/* Items */}
                <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                  {dataMode === 'tasks'
                    ? dayTasks.slice(0, visibleCount).map((task) => (
                        <CalendarTaskChip
                          key={task.id}
                          task={task}
                          onClick={() => onTaskClick(task.id)}
                        />
                      ))
                    : dayEntries.slice(0, visibleCount).map((entry) => (
                        <CalendarEntryChip
                          key={entry.id}
                          entry={entry}
                          onClick={() => { if (entry.task) onTaskClick(entry.task.id) }}
                        />
                      ))
                  }

                  {hiddenCount > 0 && (
                    <button
                      onClick={() => setOverflowDay(day)}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:underline text-left pl-1.5 font-medium"
                    >
                      +{hiddenCount} altri
                    </button>
                  )}
                </div>

                {/* Daily total for entries mode */}
                {dataMode === 'entries' && totalMinutes > 0 && (
                  <div className="text-xs font-medium text-teal-600 dark:text-teal-400 text-right mt-auto pt-0.5 border-t border-gray-100 dark:border-gray-700/50">
                    {formatTotalDuration(totalMinutes)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Overflow modal */}
      {overflowDay && (
        <OverflowModal
          day={overflowDay}
          tasks={overflowDayData.tasks}
          entries={overflowDayData.entries}
          dataMode={dataMode}
          onTaskClick={onTaskClick}
          onClose={() => setOverflowDay(null)}
        />
      )}
    </>
  )
})

export default CalendarGrid
