/**
 * GanttPage - Main page for Gantt chart view
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGanttStore } from '@stores/ganttStore'
import { useProjectStore } from '@stores/projectStore'
import { useUserStore } from '@stores/userStore'
import { GanttChart, GanttZoomControls } from '@components/gantt'
import { GanttZoomLevel } from '@/types'
import { BarChart3, Filter, RefreshCw, X } from 'lucide-react'
import { startOfMonth, endOfMonth } from 'date-fns'

export default function GanttPage() {
  const navigate = useNavigate()

  // Stores
  const {
    tasks,
    isLoading,
    error,
    zoomLevel,
    viewStartDate,
    viewEndDate,
    fetchGanttTasks,
    setZoomLevel,
    setViewRange,
    navigateView,
    setFilters,
    clearError,
  } = useGanttStore()

  const { projects, fetchProjects } = useProjectStore()
  const { users, fetchUsers } = useUserStore()

  // Local filter state
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedAssignee, setSelectedAssignee] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  // Load data on mount
  useEffect(() => {
    fetchGanttTasks()
    fetchProjects({})
    fetchUsers()
  }, [fetchGanttTasks, fetchProjects, fetchUsers])

  // Handle filter changes
  const handleApplyFilters = () => {
    setFilters({
      projectId: selectedProject || undefined,
      assigneeId: selectedAssignee || undefined,
    })
    fetchGanttTasks({
      projectId: selectedProject || undefined,
      assigneeId: selectedAssignee || undefined,
    })
  }

  const handleClearFilters = () => {
    setSelectedProject('')
    setSelectedAssignee('')
    setFilters({})
    fetchGanttTasks({})
  }

  // Handle zoom change
  const handleZoomChange = (level: GanttZoomLevel) => {
    setZoomLevel(level)
  }

  // Go to today
  const handleToday = () => {
    const now = new Date()
    setViewRange(startOfMonth(now), endOfMonth(now))
  }

  // Handle task click
  const handleTaskClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`)
  }

  const hasActiveFilters = selectedProject || selectedAssignee

  return (
    <div className="space-y-4">
      {/* Page heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary-500" />
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Gantt Chart</h1>
          {tasks.length > 0 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-surface-800 dark:text-gray-300">
              {tasks.length} task
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Zoom controls */}
          <GanttZoomControls
            zoomLevel={zoomLevel}
            viewStart={viewStartDate}
            viewEnd={viewEndDate}
            onZoomChange={handleZoomChange}
            onNavigate={navigateView}
            onToday={handleToday}
          />

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-surface-800 dark:text-gray-300 dark:hover:bg-surface-700'
            }`}
            aria-label="Mostra filtri"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filtri</span>
          </button>

          {/* Refresh */}
          <button
            onClick={() => fetchGanttTasks()}
            disabled={isLoading}
            className="rounded-lg bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-50 dark:bg-surface-800 dark:text-gray-300 dark:hover:bg-surface-700"
            aria-label="Aggiorna"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-surface-800">
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="w-full sm:w-auto">
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Progetto</label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="input w-full sm:w-48"
              >
                <option value="">Tutti i progetti</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-auto">
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Assegnatario</label>
              <select
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
                className="input w-full sm:w-48"
              >
                <option value="">Tutti gli utenti</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button onClick={handleApplyFilters} className="btn-primary px-4 py-2 text-sm">
                Applica
              </button>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="btn-secondary px-4 py-2 text-sm"
                >
                  Pulisci
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-600 dark:text-red-400">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button onClick={clearError} className="text-red-500 hover:text-red-400" aria-label="Chiudi errore">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Gantt chart */}
      <div style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
        {isLoading && tasks.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Caricamento...
            </div>
          </div>
        ) : (
          <GanttChart
            tasks={tasks}
            zoomLevel={zoomLevel}
            viewStart={viewStartDate}
            viewEnd={viewEndDate}
            onTaskClick={handleTaskClick}
          />
        )}
      </div>

      {/* Help text */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Clicca su un task per vedere i dettagli. I task senza date di inizio o scadenza non vengono visualizzati.
      </p>
    </div>
  )
}
