/**
 * Dashboard Page - Main dashboard for all roles
 * Shows personalized overview based on user role
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@stores/authStore'
import { useDashboardStore } from '@stores/dashboardStore'
import { useAnalyticsStore } from '@stores/analyticsStore'
import {
  FolderKanban,
  CheckSquare,
  Clock,
  AlertTriangle,
  ArrowRight,
  FolderTree,
  List,
  Play,
  Square,
  CheckCircle,
} from 'lucide-react'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { StatusIcon } from '@/components/ui/StatusIcon'
import { StatCardSkeleton, ListItemSkeleton } from '@/components/ui/SkeletonLoader'
import { ExecutiveKPISection } from '@/components/dashboard/ExecutiveKPISection'
import { ProjectHealthSection } from '@/components/dashboard/ProjectHealthSection'
import { TeamPerformanceSection } from '@/components/dashboard/TeamPerformanceSection'
import { CompanyAlertsSection } from '@/components/dashboard/CompanyAlertsSection'
import { TodayTimeTracking } from '@/components/dashboard/TodayTimeTracking'
import { TaskTreeView } from '@/components/reports/TaskTreeView'

function formatDuration(minutes: number | null): string {
  if (!minutes) return '0m'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  return `${hours}h ${mins}m`
}

const STAT_CONFIG = [
  { name: 'Progetti', icon: FolderKanban, gradient: 'from-blue-500 to-blue-600' },
  { name: 'Task', icon: CheckSquare, gradient: 'from-green-500 to-emerald-600' },
  { name: 'In Corso', icon: Clock, gradient: 'from-purple-500 to-violet-600' },
  { name: 'Completati', icon: AlertTriangle, gradient: 'from-emerald-500 to-teal-600' },
] as const

export default function DashboardPage() {
  const { user } = useAuthStore()
  const {
    myTasks,
    allTasks,
    recentProjects,
    recentTimeEntries,
    taskStats,
    runningTimer,
    isLoading,
    isLoadingTasks,
    fetchDashboardData,
    fetchAllTasks,
    startTimer,
    stopTimer,
  } = useDashboardStore()

  const {
    overview,
    projectHealth,
    topContributors,
    completionTrend,
    isLoading: isLoadingAnalytics,
    fetchAll: fetchAnalytics,
  } = useAnalyticsStore()

  const canTrackTime = user?.role !== 'direzione' // Direzione non può tracciare tempo
  const isDirezione = user?.role === 'direzione'
  const [taskViewMode, setTaskViewMode] = useState<'list' | 'tree'>('list')

  useEffect(() => {
    fetchDashboardData()
    if (isDirezione) {
      fetchAnalytics()
      fetchAllTasks()
    }
  }, [fetchDashboardData, fetchAnalytics, fetchAllTasks, isDirezione])

  const statValues = [
    recentProjects.length,
    taskStats?.total || 0,
    taskStats?.byStatus?.in_progress || 0,
    taskStats?.byStatus?.done || 0,
  ]

  const handleTimerToggle = async (taskId: string) => {
    try {
      if (runningTimer?.taskId === taskId) {
        await stopTimer()
      } else {
        await startTimer(taskId)
      }
    } catch (error) {
      console.error('Timer error:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-1">
          <div className="skeleton h-8 w-64" />
          <div className="skeleton h-4 w-48 mt-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
          <div className="card p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Benvenuto, <span className="text-gradient">{user?.firstName}!</span>
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          {isDirezione
            ? 'Ecco una panoramica esecutiva dell\'azienda'
            : 'Ecco una panoramica della tua attivita'}
        </p>
      </div>

      {/* Executive Dashboard for Direzione */}
      {isDirezione && (
        <>
          {/* KPI Executive */}
          <ExecutiveKPISection overview={overview} isLoading={isLoadingAnalytics} />

          {/* Project Health Overview */}
          <ProjectHealthSection projects={projectHealth} isLoading={isLoadingAnalytics} />

          {/* Team Performance */}
          <TeamPerformanceSection
            topContributors={topContributors}
            completionTrend={completionTrend}
            isLoading={isLoadingAnalytics}
          />

          {/* Company Alerts */}
          <CompanyAlertsSection
            projects={projectHealth}
            blockedTasksCount={overview?.blockedTasks || 0}
            openRisksCount={overview?.openRisks || 0}
            isLoading={isLoadingAnalytics}
          />
        </>
      )}

      {/* Stats Grid - Personal stats for all roles */}
      {!isDirezione && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {STAT_CONFIG.map((stat, index) => (
            <div key={stat.name} className="card-hover p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">
                    {stat.name}
                  </p>
                  <AnimatedCounter
                    value={statValues[index]}
                    className="text-xl font-bold text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Time Statistics - inline with other stats */}
          {canTrackTime && (() => {
            const now = new Date()
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            const dayOfWeek = now.getDay()
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
            const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset)

            const todayMinutes = recentTimeEntries
              .filter((e) => new Date(e.startTime) >= today)
              .reduce((sum, e) => sum + (e.duration || 0), 0)

            const weekMinutes = recentTimeEntries
              .filter((e) => new Date(e.startTime) >= monday)
              .reduce((sum, e) => sum + (e.duration || 0), 0)

            return (
              <>
                <div className="card-hover p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">
                        Tempo Oggi
                      </p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatDuration(todayMinutes)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card-hover p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 shadow-lg">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">
                        Settimana
                      </p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatDuration(weekMinutes)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* Attenzione Richiesta - for non-direzione users */}
      {!isDirezione &&
        (() => {
        const now = new Date()
        const twoDays = 2 * 24 * 60 * 60 * 1000
        const blockedTasks = myTasks.filter((t) => t.status === 'blocked')
        const overdueTasks = myTasks.filter(
          (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done' && t.status !== 'cancelled'
        )
        const dueSoonTasks = myTasks.filter(
          (t) =>
            t.dueDate &&
            new Date(t.dueDate).getTime() - now.getTime() > 0 &&
            new Date(t.dueDate).getTime() - now.getTime() < twoDays &&
            t.status !== 'done' &&
            t.status !== 'cancelled'
        )
        const alertTasks = [...blockedTasks, ...overdueTasks, ...dueSoonTasks]
        const uniqueAlertTasks = alertTasks.filter((t, i, arr) => arr.findIndex((a) => a.id === t.id) === i)

        if (uniqueAlertTasks.length === 0) return null

        return (
          <div className="card border-red-500/20 dark:border-red-500/30">
            <div className="p-4 border-b border-red-200/30 dark:border-red-500/10">
              <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Attenzione Richiesta
                <span className="ml-auto text-sm bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                  {uniqueAlertTasks.length}
                </span>
              </h2>
            </div>
            <div className="p-4 space-y-2">
              {uniqueAlertTasks.slice(0, 5).map((task) => {
                const isBlocked = task.status === 'blocked'
                const isOverdue = task.dueDate && new Date(task.dueDate) < now && task.status !== 'done'
                return (
                  <Link
                    key={task.id}
                    to={`/tasks/${task.id}`}
                    className={`flex items-center p-3 rounded-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                      isBlocked
                        ? 'bg-red-500/5 dark:bg-red-500/10 border-l-2 border-l-red-500'
                        : isOverdue
                          ? 'bg-red-500/5 dark:bg-red-500/10 border-l-2 border-l-red-400'
                          : 'bg-amber-500/5 dark:bg-amber-500/10 border-l-2 border-l-amber-400'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {task.project?.name} - {task.code}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {isBlocked && <span className="text-xs text-red-500 font-medium animate-pulse">🚫 Bloccato</span>}
                      {isOverdue && <span className="text-xs text-red-500 font-medium">⏰ Scaduto</span>}
                      {!isBlocked && !isOverdue && <span className="text-xs text-amber-500 font-medium">⚡ Scade presto</span>}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Today's Time Tracking - for non-direzione */}
      {canTrackTime && (
        <TodayTimeTracking onTimerToggle={handleTimerToggle} />
      )}

      {/* Recent Activity - shown for all roles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks - tasks with time entries in the last 3 days */}
        <div className="card">
          <div className="p-4 border-b border-gray-200/30 dark:border-white/5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isDirezione ? 'Task Recenti del Team' : 'Task Recenti'}
            </h2>
            <div className="flex items-center gap-3">
              {/* View mode toggle */}
              <div className="flex items-center bg-gray-100 dark:bg-white/10 rounded-lg p-0.5">
                <button
                  onClick={() => setTaskViewMode('list')}
                  className={`p-1.5 rounded-md transition-all ${
                    taskViewMode === 'list'
                      ? 'bg-white dark:bg-white/20 shadow-sm text-primary-600 dark:text-primary-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  title="Vista Lista"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTaskViewMode('tree')}
                  className={`p-1.5 rounded-md transition-all ${
                    taskViewMode === 'tree'
                      ? 'bg-white dark:bg-white/20 shadow-sm text-primary-600 dark:text-primary-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  title="Vista Albero"
                >
                  <FolderTree className="w-4 h-4" />
                </button>
              </div>
              <Link
                to="/tasks"
                className="text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 flex items-center group"
              >
                Vedi tutti
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
          <div className="p-4">
            {(() => {
              // Filter tasks that have time entries in the last 3 days
              const recentTaskIds = new Set(recentTimeEntries.map((e) => e.taskId))
              const tasksSource = isDirezione ? allTasks : myTasks
              const recentTasks = tasksSource.filter((t) => recentTaskIds.has(t.id))

              // Create a map of taskId -> most recent time entry that has a note/description
              const latestTimeEntryPerTask = new Map<string, typeof recentTimeEntries[0]>()
              recentTimeEntries.forEach((entry) => {
                if (!entry.description) return
                const existing = latestTimeEntryPerTask.get(entry.taskId)
                if (!existing || new Date(entry.startTime) > new Date(existing.startTime)) {
                  latestTimeEntryPerTask.set(entry.taskId, entry)
                }
              })

              if (taskViewMode === 'tree') {
                return (
                  <TaskTreeView
                    mode="compact"
                    myTasksOnly={!isDirezione}
                    excludeCompleted={false}
                    showSummary={false}
                    showControls={false}
                    showFilters={false}
                    maxDepth={2}
                    canTrackTime={canTrackTime}
                    runningTimerId={runningTimer?.taskId}
                    onTimerToggle={handleTimerToggle}
                  />
                )
              }

              if (isLoadingTasks) {
                return (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <ListItemSkeleton key={i} />
                    ))}
                  </div>
                )
              }

              if (recentTasks.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>{isDirezione ? 'Nessuna attività del team negli ultimi 3 giorni' : 'Nessuna attività negli ultimi 3 giorni'}</p>
                    <Link
                      to="/tasks"
                      className="text-sm text-primary-500 hover:text-primary-600 mt-2 inline-block"
                    >
                      {isDirezione ? 'Vedi tutti i task' : 'Vai ai tuoi task'}
                    </Link>
                  </div>
                )
              }

              // Group tasks by status
              const completedTasks = recentTasks.filter((t) => t.status === 'done')
              const inProgressTasks = recentTasks.filter((t) => t.status === 'in_progress')
              const otherTasks = recentTasks.filter((t) => t.status !== 'done' && t.status !== 'in_progress')

              const renderTaskItem = (task: typeof recentTasks[0], showTimer: boolean) => {
                const isRunning = runningTimer?.taskId === task.id
                const isCompleted = task.status === 'done'
                const latestEntry = latestTimeEntryPerTask.get(task.id)

                return (
                  <li key={task.id} className="flex items-center gap-2 group">
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : task.status === 'in_progress' ? (
                      <ArrowRight className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <Link
                      to={`/tasks/${task.id}`}
                      className="flex-1 text-sm text-gray-600 dark:text-gray-400 truncate hover:text-primary-500"
                    >
                      {task.title}
                      {/* Display time entry note/description inline after title */}
                      {latestEntry?.description && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic ml-1.5">
                          — &quot;{latestEntry.description}&quot;
                          {latestEntry.user && (
                            <span className="not-italic ml-1">
                              ({latestEntry.user.firstName})
                            </span>
                          )}
                        </span>
                      )}
                      {task.project && (
                        <span className="text-xs text-gray-400 ml-2">({task.project.name})</span>
                      )}
                      {isDirezione && task.assignee && (
                        <span className="text-xs text-primary-500 dark:text-primary-400 ml-2">
                          — {task.assignee.firstName} {task.assignee.lastName}
                        </span>
                      )}
                    </Link>
                    {showTimer && canTrackTime && !isCompleted && (
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
                        {isRunning ? (
                          <Square className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </li>
                )
              }

              return (
                <div className="space-y-4">
                  {/* In Progress */}
                  {inProgressTasks.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wide">
                        In Corso ({inProgressTasks.length})
                      </h4>
                      <ul className="space-y-1.5">
                        {inProgressTasks.slice(0, 5).map((task) => renderTaskItem(task, true))}
                      </ul>
                    </div>
                  )}

                  {/* Other (todo, blocked, etc) */}
                  {otherTasks.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                        Da Fare ({otherTasks.length})
                      </h4>
                      <ul className="space-y-1.5">
                        {otherTasks.slice(0, 3).map((task) => renderTaskItem(task, true))}
                      </ul>
                    </div>
                  )}

                  {/* Completed */}
                  {completedTasks.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-green-600 dark:text-green-400 mb-2 uppercase tracking-wide">
                        Completati ({completedTasks.length})
                      </h4>
                      <ul className="space-y-1.5">
                        {completedTasks.slice(0, 3).map((task) => renderTaskItem(task, false))}
                        {completedTasks.length > 3 && (
                          <li className="text-xs text-gray-400">...e altri {completedTasks.length - 3}</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>

        {/* Recent Projects */}
        <div className="card">
          <div className="p-4 border-b border-gray-200/30 dark:border-white/5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Progetti Recenti</h2>
            <Link
              to="/projects"
              className="text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 flex items-center group"
            >
              Vedi tutti
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="p-4">
            {recentProjects.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <span className="text-3xl block mb-2">{'\u{1F4C2}'}</span>
                Nessun progetto disponibile
              </div>
            ) : (
              <div className="space-y-2">
                {recentProjects.slice(0, 5).map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="flex items-center p-3 rounded-lg bg-gray-50/50 dark:bg-white/5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
                  >
                    <div className="p-2 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600">
                      <FolderKanban className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0 ml-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {project.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {project.code} - {project._count?.tasks || 0} task
                      </p>
                    </div>
                    <StatusIcon type="projectStatus" value={project.status} size="sm" showLabel />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
