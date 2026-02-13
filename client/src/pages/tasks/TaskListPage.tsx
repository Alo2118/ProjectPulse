/**
 * Task List Page - Shows all tasks with hierarchical view
 * @module pages/tasks/TaskListPage
 */

import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTaskStore } from '@stores/taskStore'
import { useProjectStore } from '@stores/projectStore'
import { useAuthStore } from '@stores/authStore'
import { useDashboardStore } from '@stores/dashboardStore'
import {
  Plus,
  Search,
  Loader2,
  Clock,
  List,
  FolderTree,
  CheckCircle,
  ArrowRight,
  AlertTriangle,
  CheckSquare,
  Play,
  Square,
  Repeat2,
} from 'lucide-react'
import { TaskTreeView } from '@/components/reports/TaskTreeView'
import type { Task } from '@/types'

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const now = new Date()
  const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diff < 0) return `${Math.abs(diff)}g fa`
  if (diff === 0) return 'Oggi'
  if (diff === 1) return 'Domani'
  if (diff < 7) return `${diff}g`

  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

export default function TaskListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuthStore()
  const { tasks, myTasks, isLoading, fetchTasks, fetchMyTasks } = useTaskStore()
  const { projects, fetchProjects } = useProjectStore()
  const { runningTimer, startTimer, stopTimer } = useDashboardStore()

  const canTrackTime = user?.role !== 'direzione' // Direzione non può tracciare tempo

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || '')
  const [projectFilter, setProjectFilter] = useState(searchParams.get('projectId') || '')
  // Admin e direzione possono vedere tutti i task, gli altri vedono solo i propri
  const canSeeAllTasks = user?.role === 'admin' || user?.role === 'direzione'
  const [showAllTasks, setShowAllTasks] = useState(
    canSeeAllTasks ? searchParams.get('all') === 'true' : false
  )
  const [viewMode, setViewMode] = useState<'list' | 'tree'>(
    (searchParams.get('view') as 'list' | 'tree') || 'list'
  )

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    const filters: Record<string, string> = {}
    if (searchTerm) filters.search = searchTerm
    if (statusFilter) filters.status = statusFilter
    if (priorityFilter) filters.priority = priorityFilter
    if (projectFilter) filters.projectId = projectFilter
    if (showAllTasks && canSeeAllTasks) filters.all = 'true'

    const params = new URLSearchParams(filters)
    setSearchParams(params)

    // Fetch my tasks for the list view
    fetchMyTasks({
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      limit: 100,
    })

    // Fetch all tasks when "Mostra tutti" is checked (for admin/direzione)
    if (showAllTasks && canSeeAllTasks) {
      fetchTasks({
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        projectId: projectFilter && projectFilter !== 'standalone' ? projectFilter : undefined,
        standalone: projectFilter === 'standalone' ? true : undefined,
        page: 1,
        limit: 200, // Higher limit to fetch all tasks
      })
    }
  }, [searchTerm, statusFilter, priorityFilter, projectFilter, showAllTasks, canSeeAllTasks, user?.id])

  const handleTimerToggle = useCallback(
    async (taskId: string) => {
      try {
        if (runningTimer?.taskId === taskId) {
          await stopTimer()
        } else {
          await startTimer(taskId)
        }
      } catch (error) {
        console.error('Timer error:', error)
      }
    },
    [runningTimer?.taskId, startTimer, stopTimer]
  )

  const canCreateTask = !!user // Tutti gli utenti autenticati possono creare task

  if (isLoading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Task</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Gestisci e traccia i tuoi task
          </p>
        </div>
        {canCreateTask && (
          <button onClick={() => navigate('/tasks/new')} className="btn-primary flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Nuovo Task
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder="Cerca task..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="">Tutti i progetti</option>
            <option value="standalone">Standalone</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} - {project.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="">Tutti gli stati</option>
            <option value="todo">Da fare</option>
            <option value="in_progress">In corso</option>
            <option value="review">In revisione</option>
            <option value="blocked">Bloccato</option>
            <option value="done">Completato</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="">Tutte le priorità</option>
            <option value="critical">Critica</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Bassa</option>
          </select>
          {canSeeAllTasks && (
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showAllTasks}
                onChange={(e) => setShowAllTasks(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Mostra tutti
            </label>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Vista Lista"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
                viewMode === 'tree'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Vista Albero"
            >
              <FolderTree className="w-4 h-4" />
              <span className="hidden sm:inline">Albero</span>
            </button>
          </div>
        </div>
      </div>

      {/* Task Statistics */}
      {(() => {
          const taskList = showAllTasks && canSeeAllTasks ? tasks : myTasks
          const totalTasks = taskList.length
          const inProgressCount = taskList.filter((t) => t.status === 'in_progress').length
          const completedCount = taskList.filter((t) => t.status === 'done').length
          const blockedCount = taskList.filter((t) => t.status === 'blocked').length
          const todoCount = taskList.filter((t) => t.status === 'todo').length

          return (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="card-hover p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                    <CheckSquare className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Totale</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{totalTasks}</p>
                  </div>
                </div>
              </div>
              <div className="card-hover p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-gray-400 to-gray-500 shadow-lg">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Da Fare</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{todoCount}</p>
                  </div>
                </div>
              </div>
              <div className="card-hover p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg">
                    <ArrowRight className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">In Corso</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{inProgressCount}</p>
                  </div>
                </div>
              </div>
              <div className="card-hover p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg">
                    <AlertTriangle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Bloccati</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{blockedCount}</p>
                  </div>
                </div>
              </div>
              <div className="card-hover p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Completati</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{completedCount}</p>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

      {/* Tasks Content */}
      {viewMode === 'tree' ? (
        // Tree View
        <TaskTreeView
          mode="full"
          myTasksOnly={!showAllTasks}
          excludeCompleted={false}
          projectId={projectFilter && projectFilter !== 'standalone' ? projectFilter : undefined}
          showSummary={true}
          showControls={true}
          showFilters={false}
          onTimerToggle={handleTimerToggle}
          runningTimerId={runningTimer?.taskId ?? null}
          canTrackTime={canTrackTime}
        />
      ) : (
        (() => {
          const taskList = showAllTasks && canSeeAllTasks ? tasks : myTasks

          if (taskList.length === 0) {
            return (
              <div className="card p-8 text-center">
                <span className="text-5xl block mb-4">
                  {searchTerm || statusFilter || priorityFilter || projectFilter ? '\u{1F50D}' : '\u{1F3AF}'}
                </span>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {searchTerm || statusFilter || priorityFilter || projectFilter
                    ? 'Nessun task trovato'
                    : 'Nessun task'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {searchTerm || statusFilter || priorityFilter || projectFilter
                    ? 'Prova a modificare i filtri di ricerca'
                    : 'Crea il primo task per iniziare!'}
                </p>
                {canCreateTask && !searchTerm && !statusFilter && !priorityFilter && (
                  <button onClick={() => navigate('/tasks/new')} className="btn-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Crea Task
                  </button>
                )}
              </div>
            )
          }

          console.log('[TaskListPage] taskList length:', taskList.length)
          console.log('[TaskListPage] First task:', taskList[0])
          console.log('[TaskListPage] Checking isRecurring values:', taskList.map(t => ({ code: t.code, isRecurring: t.isRecurring, type: typeof t.isRecurring })))
          const recurringTasks = taskList.filter((t) => t.isRecurring && t.status !== 'done')
          console.log('[TaskListPage] Recurring tasks count:', recurringTasks.length)
          const inProgressTasks = taskList.filter((t) => t.status === 'in_progress' && !t.isRecurring)
          const todoTasks = taskList.filter((t) => t.status === 'todo' && !t.isRecurring)
          const blockedTasks = taskList.filter((t) => t.status === 'blocked' && !t.isRecurring)
          const reviewTasks = taskList.filter((t) => t.status === 'review' && !t.isRecurring)
          const completedTasks = taskList.filter((t) => t.status === 'done')

          const renderTaskItem = (task: Task) => {
            const isRunning = runningTimer?.taskId === task.id
            const isCompleted = task.status === 'done'
            const isBlocked = task.status === 'blocked'

            return (
              <li key={task.id} className="flex items-center gap-2 group py-1.5">
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : isBlocked ? (
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                ) : task.status === 'in_progress' ? (
                  <ArrowRight className="w-4 h-4 text-blue-500 flex-shrink-0" />
                ) : task.status === 'review' ? (
                  <Search className="w-4 h-4 text-amber-500 flex-shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
                <Link
                  to={`/tasks/${task.id}`}
                  className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate hover:text-primary-500 flex items-center gap-2"
                >
                  {task.title}
                  {task.isRecurring && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium whitespace-nowrap flex-shrink-0">
                      <Repeat2 className="w-3 h-3" />
                      Ricorrente
                    </span>
                  )}
                  {task.project && (
                    <span className="text-xs text-gray-400 ml-auto flex-shrink-0">({task.project.name})</span>
                  )}
                </Link>
                {task.dueDate && (
                  <span className={`text-xs ${
                    new Date(task.dueDate) < new Date() && !isCompleted
                      ? 'text-red-500 font-medium'
                      : 'text-gray-400'
                  }`}>
                    {formatDate(task.dueDate)}
                  </span>
                )}
                {canTrackTime && !isCompleted && (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      handleTimerToggle(task.id)
                    }}
                    className={`p-1.5 rounded-lg transition-all ${
                      isRunning
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-gray-100 dark:bg-white/10 text-gray-500 hover:bg-primary-500 hover:text-white opacity-0 group-hover:opacity-100'
                    }`}
                    title={isRunning ? 'Stop timer' : 'Avvia timer'}
                  >
                    {isRunning ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  </button>
                )}
              </li>
            )
          }

          return (
            <div className="card p-6">
              <div className="space-y-6">
                {/* Recurring Tasks */}
                {recurringTasks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 mb-3 flex items-center gap-2">
                      <Repeat2 className="w-4 h-4" />
                      Ricorrenti ({recurringTasks.length})
                    </h4>
                    <ul className="space-y-1">
                      {recurringTasks.map(renderTaskItem)}
                    </ul>
                  </div>
                )}

                {/* In Progress */}
                <div>
                  <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" />
                    In Corso ({inProgressTasks.length})
                  </h4>
                  {inProgressTasks.length > 0 ? (
                    <ul className="space-y-1">
                      {inProgressTasks.map(renderTaskItem)}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">Nessun task in corso</p>
                  )}
                </div>

                {/* Todo */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Da Fare ({todoTasks.length})
                  </h4>
                  {todoTasks.length > 0 ? (
                    <ul className="space-y-1">
                      {todoTasks.map(renderTaskItem)}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">Nessun task da fare</p>
                  )}
                </div>

                {/* Review */}
                {reviewTasks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      In Revisione ({reviewTasks.length})
                    </h4>
                    <ul className="space-y-1">
                      {reviewTasks.map(renderTaskItem)}
                    </ul>
                  </div>
                )}

                {/* Blocked */}
                {blockedTasks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Bloccati ({blockedTasks.length})
                    </h4>
                    <ul className="space-y-1">
                      {blockedTasks.map(renderTaskItem)}
                    </ul>
                  </div>
                )}

                {/* Completed */}
                <div>
                  <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Completati ({completedTasks.length})
                  </h4>
                  {completedTasks.length > 0 ? (
                    <ul className="space-y-1">
                      {completedTasks.slice(0, 10).map(renderTaskItem)}
                      {completedTasks.length > 10 && (
                        <li className="text-sm text-gray-400 py-1">
                          ...e altri {completedTasks.length - 10} completati
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">Nessun task completato</p>
                  )}
                </div>
              </div>
            </div>
          )
        })()
      )}
    </div>
  )
}
