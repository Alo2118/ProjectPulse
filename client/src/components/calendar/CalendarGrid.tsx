/**
 * CalendarGrid - Month view calendar grid with day cells and task/entry chips
 * JARVIS palette: cyan-500/10 borders, cyan today highlight, semantic chip colors
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="modal-panel w-72 max-h-80 overflow-y-auto p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-200 dark:text-slate-200 not-dark:text-slate-800">
            {format(day, 'd MMMM', { locale: it })}
          </span>
          <button
            onClick={onClose}
            className="btn-icon p-1 text-lg leading-none"
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
        {/* Day-of-week header row */}
        <div className="grid grid-cols-7 border-b border-cyan-500/10 dark:border-cyan-500/10 not-dark:border-slate-200">
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400 not-dark:text-slate-500"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7 flex-1 divide-x divide-y divide-cyan-500/10 border-b border-cyan-500/10 dark:divide-cyan-500/10 dark:border-cyan-500/10 not-dark:divide-slate-200 not-dark:border-slate-200">
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
                  min-h-[100px] p-1.5 flex flex-col gap-1 transition-colors
                  ${isTodayDate
                    ? 'bg-cyan-500/8 dark:bg-cyan-500/8 not-dark:bg-cyan-50/60'
                    : isCurrentMonth
                      ? 'bg-slate-900/50 dark:bg-slate-900/50 not-dark:bg-white'
                      : 'bg-slate-800/25 dark:bg-slate-800/25 not-dark:bg-slate-50/60'}
                `}
              >
                {/* Date number badge */}
                <div className="flex justify-end mb-0.5">
                  <span
                    className={`
                      inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full transition-colors
                      ${isTodayDate
                        ? 'bg-cyan-500 text-white shadow-[0_0_8px_rgba(6,182,212,0.5)]'
                        : isCurrentMonth
                          ? 'text-slate-200 dark:text-slate-200 not-dark:text-slate-700'
                          : 'text-slate-500 dark:text-slate-500 not-dark:text-slate-400'}
                    `}
                  >
                    {format(day, 'd')}
                  </span>
                </div>

                {/* Task / entry chips */}
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
                      className="text-xs text-cyan-400 hover:text-cyan-300 dark:text-cyan-400 dark:hover:text-cyan-300 not-dark:text-cyan-600 not-dark:hover:text-cyan-700 hover:underline text-left pl-1.5 font-medium transition-colors"
                    >
                      +{hiddenCount} altri
                    </button>
                  )}
                </div>

                {/* Daily total for time-entry mode */}
                {dataMode === 'entries' && totalMinutes > 0 && (
                  <div className="text-xs font-medium text-cyan-400 dark:text-cyan-400 not-dark:text-cyan-600 text-right mt-auto pt-0.5 border-t border-cyan-500/10 not-dark:border-slate-100">
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
