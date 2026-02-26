/**
 * Dashboard Page - Main dashboard for all roles
 * Shows personalized overview based on user role
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@stores/authStore'
import { useDashboardStore } from '@stores/dashboardStore'
import { useAnalyticsStore } from '@stores/analyticsStore'
import { useTimerToggle } from '@hooks/useTimerToggle'
import { useDashboardLayoutStore } from '@stores/dashboardLayoutStore'
import {
  Clock,
  ArrowRight,
  FolderTree,
  List,
  Play,
  Square,
  CheckCircle,
} from 'lucide-react'
import { StatCardSkeleton, ListItemSkeleton } from '@/components/ui/SkeletonLoader'
import { ProjectHealthSection } from '@/components/dashboard/ProjectHealthSection'
import { TeamPerformanceSection } from '@/components/dashboard/TeamPerformanceSection'
import { DashboardCustomizer } from '@/components/dashboard/DashboardCustomizer'
import { TaskTreeView } from '@/components/reports/TaskTreeView'
import TrafficLightSection from '@/components/dashboard/TrafficLightSection'
import AttentionSection from '@/components/dashboard/AttentionSection'
import FocusTodaySection from '@/components/dashboard/FocusTodaySection'
import DeliveryOutlookSection from '@/components/dashboard/DeliveryOutlookSection'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const {
    myTasks,
    allTasks,
    recentTimeEntries,
    weeklyHours,
    runningTimer,
    isLoading,
    isLoadingTasks,
    isLoadingWeeklyHours,
    fetchDashboardData,
    fetchAllTasks,
  } = useDashboardStore()

  const { canTrackTime, handleTimerToggle, runningTimerTaskId } = useTimerToggle()

  const {
    overview,
    projectHealth,
    topContributors,
    completionTrend,
    teamWorkload,
    deliveryForecast,
    trendPeriodDays,
    setTrendPeriodDays,
    isLoading: isLoadingAnalytics,
    fetchAll: fetchAnalytics,
  } = useAnalyticsStore()

  const isDirezione = user?.role === 'direzione'
  const [taskViewMode, setTaskViewMode] = useState<'list' | 'tree'>('list')

  const { getVisibleWidgets } = useDashboardLayoutStore()
  const visibleWidgets = getVisibleWidgets((user?.role as 'admin' | 'direzione' | 'dipendente') ?? 'dipendente')
  const isVisible = (id: string) => visibleWidgets.some((w) => w.id === id && w.visible)

  useEffect(() => {
    fetchDashboardData()
    if (isDirezione) {
      fetchAnalytics()
      fetchAllTasks()
    }
  }, [fetchDashboardData, fetchAnalytics, fetchAllTasks, isDirezione])

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Benvenuto, <span className="text-gradient">{user?.firstName}!</span>
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {isDirezione
              ? 'Panoramica dello stato dei lavori'
              : 'Ecco una panoramica della tua attivita'}
          </p>
        </div>
        <div className="flex-shrink-0">
          <DashboardCustomizer role={(user?.role as 'admin' | 'direzione' | 'dipendente') ?? 'dipendente'} />
        </div>
      </div>

      {/* ============================================ */}
      {/* Executive Dashboard for Direzione            */}
      {/* ============================================ */}
      {isDirezione && (
        <>
          {/* Level 1: Semaforo */}
          {isVisible('traffic_light') && (
            <TrafficLightSection
              projectHealth={projectHealth}
              teamWorkload={teamWorkload}
              isLoading={isLoadingAnalytics}
            />
          )}

          {/* Level 2: Attenzione (auto-hides when no issues) */}
          {isVisible('attention_direzione') && (
            <AttentionSection
              role="direzione"
              projectHealth={projectHealth}
              teamWorkload={teamWorkload}
              overview={overview}
            />
          )}

          {/* Level 3: Dettaglio */}
          {isVisible('delivery_outlook') && (
            <DeliveryOutlookSection
              forecasts={deliveryForecast}
              isLoading={isLoadingAnalytics}
            />
          )}

          {isVisible('team_capacity') && (
            <TeamPerformanceSection
              topContributors={topContributors}
              completionTrend={completionTrend}
              teamWorkload={teamWorkload}
              isLoading={isLoadingAnalytics}
              trendPeriodDays={trendPeriodDays}
              onTrendPeriodChange={setTrendPeriodDays}
            />
          )}

          {isVisible('project_health') && (
            <ProjectHealthSection
              projects={projectHealth}
              isLoading={isLoadingAnalytics}
            />
          )}
        </>
      )}

      {/* ============================================ */}
      {/* Dipendente Dashboard (New Layout)            */}
      {/* ============================================ */}
      {!isDirezione && (
        <>
          {/* Level 1+2: Focus del giorno with timer */}
          {isVisible('focus_today') && (
            <FocusTodaySection
              tasks={myTasks}
              weeklyHours={weeklyHours}
              runningTimer={runningTimer}
              canTrackTime={canTrackTime}
              runningTimerTaskId={runningTimerTaskId}
              onTimerToggle={handleTimerToggle}
              isLoading={isLoadingTasks || isLoadingWeeklyHours}
              userName={user?.firstName}
            />
          )}

          {/* Level 2: Attenzione (auto-hides when no issues) */}
          {isVisible('attention_dipendente') && (
            <AttentionSection
              role="dipendente"
              myTasks={myTasks}
            />
          )}
        </>
      )}

      {/* ============================================ */}
      {/* Recent Activity - shown for all roles        */}
      {/* ============================================ */}
      {/* Recent Tasks */}
      {isVisible('recent_tasks') && (
        <div className="card">
          <div className="p-3 sm:p-4 border-b border-gray-200/30 dark:border-white/5 flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              {isDirezione ? 'Task Recenti del Team' : 'Task Recenti'}
            </h2>
            <div className="flex items-center gap-2 sm:gap-3">
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
              const recentTaskIds = new Set(recentTimeEntries.map((e) => e.taskId))
              const tasksSource = isDirezione ? allTasks : myTasks
              const recentTasks = tasksSource.filter((t) => recentTaskIds.has(t.id))

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
                    runningTimerId={runningTimerTaskId}
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

              const completedTasks = recentTasks.filter((t) => t.status === 'done')
              const inProgressTasks = recentTasks.filter((t) => t.status === 'in_progress')
              const otherTasks = recentTasks.filter((t) => t.status !== 'done' && t.status !== 'in_progress')

              const renderTaskItem = (task: typeof recentTasks[0], showTimer: boolean) => {
                const isRunning = runningTimerTaskId === task.id
                const isCompleted = task.status === 'done'
                const latestEntry = latestTimeEntryPerTask.get(task.id)

                return (
                  <li key={task.id} className="flex items-start gap-2 group">
                    <div className="mt-0.5 flex-shrink-0">
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : task.status === 'in_progress' ? (
                        <ArrowRight className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <Link
                      to={`/tasks/${task.id}`}
                      className="flex-1 min-w-0 hover:text-primary-500"
                    >
                      {task.project && (
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                          {task.project.name}
                          {isDirezione && task.assignee && (
                            <span className="text-primary-500 dark:text-primary-400 ml-1 font-normal">
                              · {task.assignee.firstName} {task.assignee.lastName}
                            </span>
                          )}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate leading-snug">
                        {task.title}
                      </p>
                      {latestEntry?.description && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 italic truncate">
                          &quot;{latestEntry.description}&quot;
                          {latestEntry.user && (
                            <span className="not-italic ml-1">
                              ({latestEntry.user.firstName})
                            </span>
                          )}
                        </p>
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

                  {completedTasks.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-green-600 dark:text-green-400 mb-2 uppercase tracking-wide">
                        Completati ({completedTasks.length})
                      </h4>
                      <ul className="space-y-1.5">
                        {completedTasks.map((task) => renderTaskItem(task, false))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
