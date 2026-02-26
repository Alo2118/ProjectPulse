/**
 * CalendarInlineView — Renders the Calendar inline inside TaskListPage
 * when the user selects the "calendar" view mode.
 * Delegates all state management to the existing CalendarPage component.
 * @module pages/tasks/CalendarInlineView
 */

import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { addMonths, subMonths, addWeeks, subWeeks, format, startOfWeek, endOfWeek } from 'date-fns'
import { it } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { useCalendarStore } from '@stores/calendarStore'
import { useProjectStore } from '@stores/projectStore'
import CalendarGrid from '@components/calendar/CalendarGrid'
import WeekView from '@components/calendar/WeekView'

export default function CalendarInlineView() {
  const navigate = useNavigate()

  const {
    currentDate,
    viewMode,
    tasks,
    timeEntries,
    isLoading,
    setCurrentDate,
    setViewMode,
    fetchCalendarData,
  } = useCalendarStore()

  const { fetchProjects } = useProjectStore()

  useEffect(() => {
    fetchCalendarData()
    fetchProjects({})
  }, [fetchCalendarData, fetchProjects])

  const handlePrev = useCallback(() => {
    setCurrentDate(viewMode === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1))
  }, [viewMode, currentDate, setCurrentDate])

  const handleNext = useCallback(() => {
    setCurrentDate(viewMode === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1))
  }, [viewMode, currentDate, setCurrentDate])

  const handleToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [setCurrentDate])

  const handleTaskClick = useCallback(
    (taskId: string) => navigate(`/tasks/${taskId}`),
    [navigate]
  )

  // Compute header label
  const headerLabel =
    viewMode === 'month'
      ? format(currentDate, 'MMMM yyyy', { locale: it })
      : `${format(startOfWeek(currentDate, { locale: it }), 'd MMM', { locale: it })} — ${format(endOfWeek(currentDate, { locale: it }), 'd MMM yyyy', { locale: it })}`

  return (
    <div className="space-y-3">
      {/* Calendar toolbar */}
      <div className="card p-3 flex items-center gap-3 flex-wrap">
        <div className="segmented-control">
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`segmented-control-item ${viewMode === 'month' ? 'segmented-control-item-active' : ''}`}
          >
            Mese
          </button>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`segmented-control-item ${viewMode === 'week' ? 'segmented-control-item-active' : ''}`}
          >
            Settimana
          </button>
        </div>

        <button
          type="button"
          onClick={handlePrev}
          className="btn-icon"
          aria-label="Precedente"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleToday}
          className="btn-secondary px-3 py-1.5 text-sm"
        >
          Oggi
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="btn-icon"
          aria-label="Successivo"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
          {headerLabel}
        </span>

        {isLoading && (
          <RefreshCw className="w-4 h-4 animate-spin text-gray-400 ml-auto" aria-hidden="true" />
        )}
      </div>

      {/* Calendar content */}
      {viewMode === 'month' ? (
        <CalendarGrid
          currentDate={currentDate}
          tasks={tasks}
          timeEntries={timeEntries}
          onTaskClick={handleTaskClick}
        />
      ) : (
        <WeekView
          currentDate={currentDate}
          tasks={tasks}
          timeEntries={timeEntries}
          onTaskClick={handleTaskClick}
        />
      )}
    </div>
  )
}
