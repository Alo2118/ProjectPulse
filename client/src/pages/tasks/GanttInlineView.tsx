/**
 * GanttInlineView — Renders the Gantt chart inline inside TaskListPage
 * when the user selects the "gantt" view mode.
 * @module pages/tasks/GanttInlineView
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGanttStore } from '@stores/ganttStore'
import { useProjectStore } from '@stores/projectStore'
import { useUserStore } from '@stores/userStore'
import { GanttChart, GanttZoomControls } from '@components/gantt'
import { GanttZoomLevel } from '@/types'
import { RefreshCw, X } from 'lucide-react'
import { startOfMonth, endOfMonth } from 'date-fns'

interface GanttInlineViewProps {
  /** Pre-selected project from the parent filter bar */
  projectFilter?: string
}

export default function GanttInlineView({ projectFilter }: GanttInlineViewProps) {
  const navigate = useNavigate()
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
  const [selectedProject, setSelectedProject] = useState<string>(projectFilter ?? '')
  const [selectedAssignee, setSelectedAssignee] = useState<string>('')

  useEffect(() => {
    fetchProjects({})
    fetchUsers()
    const opts = projectFilter ? { projectId: projectFilter } : {}
    setFilters(opts)
    fetchGanttTasks(opts)
  }, [fetchGanttTasks, fetchProjects, fetchUsers, setFilters, projectFilter])

  const handleApplyFilters = () => {
    const opts = {
      projectId: selectedProject || undefined,
      assigneeId: selectedAssignee || undefined,
    }
    setFilters(opts)
    fetchGanttTasks(opts)
  }

  const handleClearFilters = () => {
    setSelectedProject('')
    setSelectedAssignee('')
    setFilters({})
    fetchGanttTasks({})
  }

  const handleZoomChange = (level: GanttZoomLevel) => setZoomLevel(level)

  const handleToday = () => {
    const now = new Date()
    setViewRange(startOfMonth(now), endOfMonth(now))
  }

  const handleTaskClick = (taskId: string) => navigate(`/tasks/${taskId}`)

  const hasActiveFilters = selectedProject || selectedAssignee

  return (
    <div className="space-y-3">
      {/* Gantt toolbar */}
      <div className="card p-3 flex flex-wrap items-center gap-3">
        <GanttZoomControls
          zoomLevel={zoomLevel}
          viewStart={viewStartDate}
          viewEnd={viewEndDate}
          onZoomChange={handleZoomChange}
          onNavigate={navigateView}
          onToday={handleToday}
        />

        {/* Project filter */}
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="input w-auto py-1.5 text-sm"
          aria-label="Filtra per progetto"
        >
          <option value="">Tutti i progetti</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        {/* Assignee filter */}
        <select
          value={selectedAssignee}
          onChange={(e) => setSelectedAssignee(e.target.value)}
          className="input w-auto py-1.5 text-sm"
          aria-label="Filtra per assegnatario"
        >
          <option value="">Tutti gli utenti</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName}
            </option>
          ))}
        </select>

        <button onClick={handleApplyFilters} className="btn-primary px-3 py-1.5 text-sm">
          Applica
        </button>

        {hasActiveFilters && (
          <button onClick={handleClearFilters} className="btn-secondary px-3 py-1.5 text-sm">
            Pulisci
          </button>
        )}

        <button
          onClick={() => fetchGanttTasks()}
          disabled={isLoading}
          className="ml-auto btn-icon"
          aria-label="Aggiorna"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-500 hover:text-red-400" aria-label="Chiudi">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div style={{ height: 'calc(100vh - 340px)', minHeight: '400px' }}>
        {isLoading && tasks.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400 gap-3">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Caricamento...
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

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Clicca su un task per vedere i dettagli. I task senza date di inizio o scadenza non vengono visualizzati.
      </p>
    </div>
  )
}
