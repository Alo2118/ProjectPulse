/**
 * CalendarPage - Month/week calendar showing tasks or time entries by date
 */

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Filter,
  X,
  ListChecks,
  Clock,
} from 'lucide-react'
import {
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  format,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { it } from 'date-fns/locale'
import { useCalendarStore } from '@stores/calendarStore'
import { useProjectStore } from '@stores/projectStore'
import { useUserStore } from '@stores/userStore'
import { useAuthStore } from '@stores/authStore'
import CalendarGrid from '@components/calendar/CalendarGrid'
import WeekView from '@components/calendar/WeekView'

export default function CalendarPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const userRole = user?.role ?? 'dipendente'

  const {
    currentDate,
    viewMode,
    dataMode,
    tasks,
    timeEntries,
    isLoading,
    filters,
    setCurrentDate,
    setViewMode,
    setDataMode,
    setFilters,
    fetchCalendarData,
  } = useCalendarStore()

  const { projects, fetchProjects } = useProjectStore()
  const { users, fetchUsers } = useUserStore()

  const [showFilters, setShowFilters] = useState(false)
  const [selectedProject, setSelectedProject] = useState<string>(filters.projectId ?? '')
  const [selectedAssignee, setSelectedAssignee] = useState<string>(filters.assigneeId ?? '')

  // Load reference data and initial calendar data on mount
  useEffect(() => {
    fetchCalendarData()
    fetchProjects({})
    if (userRole !== 'dipendente') {
      fetchUsers()
    }
  }, [fetchCalendarData, fetchProjects, fetchUsers, userRole])

  // Navigate prev/next
  const handlePrev = useCallback(() => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1))
    } else {
      setCurrentDate(subWeeks(currentDate, 1))
    }
  }, [viewMode, currentDate, setCurrentDate])

  const handleNext = useCallback(() => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1))
    } else {
      setCurrentDate(addWeeks(currentDate, 1))
    }
  }, [viewMode, currentDate, setCurrentDate])

  const handleToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [setCurrentDate])

  const handleApplyFilters = useCallback(() => {
    setFilters({
      projectId: selectedProject || undefined,
      assigneeId: selectedAssignee || undefined,
    })
    setShowFilters(false)
  }, [selectedProject, selectedAssignee, setFilters])

  const handleClearFilters = useCallback(() => {
    setSelectedProject('')
    setSelectedAssignee('')
    setFilters({})
    setShowFilters(false)
  }, [setFilters])

  const handleTaskClick = useCallback(
    (taskId: string) => {
      navigate(`/tasks/${taskId}`)
    },
    [navigate]
  )

  const hasActiveFilters = Boolean(filters.projectId || filters.assigneeId)

  // Build the header date label
  const dateLabel = viewMode === 'month'
    ? format(currentDate, 'MMMM yyyy', { locale: it })
    : (() => {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
        const sameMonth = weekStart.getMonth() === weekEnd.getMonth()
        if (sameMonth) {
          return `${format(weekStart, 'd')} – ${format(weekEnd, 'd MMMM yyyy', { locale: it })}`
        }
        return `${format(weekStart, 'd MMM', { locale: it })} – ${format(weekEnd, 'd MMM yyyy', { locale: it })}`
      })()

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 dark:bg-cyan-500/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Calendario
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {dataMode === 'tasks' ? 'Task pianificati per data' : 'Ore registrate per giorno'}
            </p>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Data mode toggle: Tasks / Entries */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => setDataMode('tasks')}
              title="Task pianificati"
              className={`px-2.5 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                dataMode === 'tasks'
                  ? 'bg-cyan-500 text-white'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <ListChecks className="w-4 h-4" />
              <span className="hidden sm:inline">Task</span>
            </button>
            <button
              onClick={() => setDataMode('entries')}
              title="Ore registrate"
              className={`px-2.5 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 ${
                dataMode === 'entries'
                  ? 'bg-teal-500 text-white'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Ore</span>
            </button>
          </div>

          {/* Prev / Today / Next */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={handlePrev}
              aria-label="Periodo precedente"
              className="px-2.5 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border-x border-slate-200 dark:border-slate-700 transition-colors"
            >
              Oggi
            </button>
            <button
              onClick={handleNext}
              aria-label="Periodo successivo"
              className="px-2.5 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-cyan-500 text-white'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Mese
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-slate-200 dark:border-slate-700 ${
                viewMode === 'week'
                  ? 'bg-cyan-500 text-white'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Settimana
            </button>
          </div>

          {/* Filters button */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`btn-icon relative ${hasActiveFilters ? 'text-cyan-600 dark:text-cyan-400' : ''}`}
            aria-label="Filtri"
          >
            <Filter className="w-4 h-4" />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-500" />
            )}
          </button>

          {/* Refresh button */}
          <button
            onClick={fetchCalendarData}
            disabled={isLoading}
            aria-label="Aggiorna calendario"
            className="btn-icon"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
          className="card p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
            {/* Project filter */}
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Progetto
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="input text-sm w-full"
              >
                <option value="">Tutti i progetti</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee/User filter — visible only to admin/direzione */}
            {userRole !== 'dipendente' && (
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {dataMode === 'tasks' ? 'Assegnato a' : 'Utente'}
                </label>
                <select
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                  className="input text-sm w-full"
                >
                  <option value="">Tutti gli utenti</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button onClick={handleApplyFilters} className="btn-primary text-sm">
                Applica
              </button>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="btn-secondary text-sm flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Date label */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 capitalize">
          {dateLabel}
        </h2>
        {isLoading && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Caricamento...
          </span>
        )}
      </div>

      {/* Calendar body */}
      <div className="card overflow-hidden p-0">
        {viewMode === 'month' ? (
          <CalendarGrid
            currentDate={currentDate}
            tasks={tasks}
            timeEntries={timeEntries}
            dataMode={dataMode}
            onTaskClick={handleTaskClick}
          />
        ) : (
          <WeekView
            currentDate={currentDate}
            tasks={tasks}
            timeEntries={timeEntries}
            dataMode={dataMode}
            onTaskClick={handleTaskClick}
          />
        )}
      </div>

      {/* Legend */}
      {dataMode === 'tasks' ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium">Stato:</span>
          {[
            { label: 'Da fare', color: 'bg-slate-400' },
            { label: 'In corso', color: 'bg-blue-500' },
            { label: 'In revisione', color: 'bg-violet-500' },
            { label: 'Bloccato', color: 'bg-red-500' },
            { label: 'Completato', color: 'bg-green-500' },
          ].map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className={`inline-block w-2.5 h-2.5 rounded-sm ${color}`} />
              {label}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-teal-500" />
            Ore registrate
          </span>
          <span className="text-slate-400 dark:text-slate-500">
            Clicca su una registrazione per vedere il dettaglio del task
          </span>
        </div>
      )}
    </div>
  )
}
