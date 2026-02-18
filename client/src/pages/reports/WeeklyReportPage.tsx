/**
 * Weekly Report Page - View and generate weekly reports
 * @module pages/reports/WeeklyReportPage
 */

import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useWeeklyReportStore } from '@stores/weeklyReportStore'
import { useAuthStore } from '@stores/authStore'
import { useToastStore } from '@stores/toastStore'
import {
  Loader2,
  Clock,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  FileText,
  Download,
  RefreshCw,
  Users,
  User,
  Calendar,
  ArrowRight,
  FolderTree,
  Repeat2,
  BarChart3,
  TrendingUp,
  Target,
  Activity,
  Zap,
  ShieldAlert,
  Gauge,
} from 'lucide-react'
import type { WeeklyReportData, WeeklyReport } from '@/types'
import { TaskTreeView } from '@components/reports/TaskTreeView'
import { AdvancedStatCard } from '@components/reports/AdvancedStatCard'
import { CircularProgress } from '@components/reports/CircularProgress'
import { ProgressBar } from '@components/reports/ProgressBar'
import { DonutChart } from '@components/reports/DonutChart'
import { ProjectHealthCard } from '@/components/reports/ProjectHealthCard'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
  })
}

// Preview Section Component
function ReportPreview({ data, selectedUserId }: { data: WeeklyReportData; selectedUserId?: string | null }) {
  const [activityUserTab, setActivityUserTab] = useState<string | null>(null)

  // Filter tasks based on selected user and separate recurring tasks
  const allCompleted = selectedUserId
    ? data.tasks.completed.filter(t => t.assigneeId === selectedUserId)
    : data.tasks.completed

  const allInProgress = selectedUserId
    ? data.tasks.inProgress.filter(t => t.assigneeId === selectedUserId)
    : data.tasks.inProgress

  const allCreated = selectedUserId
    ? data.tasks.created.filter(t => t.assigneeId === selectedUserId)
    : data.tasks.created

  // Separate recurring tasks (non-completed ones)
  const recurringTasks = allInProgress.filter(t => t.isRecurring)
  const recurringCreated = allCreated.filter(t => t.isRecurring && t.status !== 'done')
  const allRecurringTasks = [...recurringTasks, ...recurringCreated.filter(t => !recurringTasks.find(rt => rt.id === t.id))]

  const filteredData = {
    ...data,
    tasks: {
      completed: allCompleted,
      inProgress: allInProgress.filter(t => !t.isRecurring),
      created: allCreated.filter(t => !t.isRecurring),
      recurring: allRecurringTasks,
    },
    blockedTasks: selectedUserId
      ? data.blockedTasks.filter(t => t.assigneeId === selectedUserId)
      : data.blockedTasks,
  }

  // Calculate advanced metrics
  const totalTasks = allCompleted.length + allInProgress.length + allCreated.length
  const completionRate = totalTasks > 0 ? (allCompleted.length / totalTasks) * 100 : 0
  const avgHoursPerTask = allCompleted.length > 0 ? data.timeTracking.totalHours / allCompleted.length : 0
  const productivity = data.timeTracking.totalHours > 0 ? (allCompleted.length / data.timeTracking.totalHours) * 100 : 0

  // Get unique users from time entries for activity tabs
  const entryUsers = useMemo(() => {
    const entries = data.timeTracking.entries || []
    const userMap = new Map<string, string>()
    entries.forEach(e => userMap.set(e.userId, e.userName))
    return Array.from(userMap, ([userId, userName]) => ({ userId, userName }))
      .sort((a, b) => a.userName.localeCompare(b.userName))
  }, [data.timeTracking.entries])

  // Group time entries hierarchically: Project → Task → Entries
  const groupedByProject = useMemo(() => {
    let entries = data.timeTracking.entries || []
    // Apply global user filter
    if (selectedUserId) entries = entries.filter(e => e.userId === selectedUserId)
    // Apply local activity tab filter
    if (activityUserTab) entries = entries.filter(e => e.userId === activityUserTab)

    const projectMap = new Map<string, {
      projectId: string
      projectCode: string
      projectName: string
      tasks: Map<string, {
        taskId: string
        taskCode: string
        taskTitle: string
        isRecurring: boolean
        entries: Array<{ id: string; description: string | null; userName: string; duration: number | null; startTime: string }>
      }>
    }>()

    entries.forEach(entry => {
      if (!projectMap.has(entry.projectId)) {
        projectMap.set(entry.projectId, {
          projectId: entry.projectId,
          projectCode: entry.projectCode,
          projectName: entry.projectName,
          tasks: new Map(),
        })
      }
      const project = projectMap.get(entry.projectId)!
      if (!project.tasks.has(entry.taskId)) {
        project.tasks.set(entry.taskId, {
          taskId: entry.taskId,
          taskCode: entry.taskCode,
          taskTitle: entry.taskTitle,
          isRecurring: entry.isRecurring,
          entries: [],
        })
      }
      project.tasks.get(entry.taskId)!.entries.push({
        id: entry.id,
        description: entry.description,
        userName: entry.userName,
        duration: entry.duration,
        startTime: entry.startTime,
      })
    })

    return Array.from(projectMap.values()).map(p => ({
      ...p,
      tasks: Array.from(p.tasks.values()),
    }))
  }, [data.timeTracking.entries, selectedUserId, activityUserTab])

  // Compute trends from previousWeek data
  const hoursTrend = data.previousWeek ? {
    value: Math.round(Math.abs(((data.timeTracking.totalHours - data.previousWeek.totalHours) / Math.max(data.previousWeek.totalHours, 1)) * 100)),
    direction: (data.timeTracking.totalHours >= data.previousWeek.totalHours ? 'up' : 'down') as 'up' | 'down',
    label: 'vs settimana scorsa',
  } : undefined

  const tasksCompletedTrend = data.previousWeek ? {
    value: Math.round(Math.abs(((allCompleted.length - data.previousWeek.completedTasksCount) / Math.max(data.previousWeek.completedTasksCount, 1)) * 100)),
    direction: (allCompleted.length >= data.previousWeek.completedTasksCount ? 'up' : 'down') as 'up' | 'down',
    label: 'vs settimana scorsa',
  } : undefined

  return (
    <div className="space-y-6">
      {/* Main KPI Cards con gradients */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdvancedStatCard
          label="Ore Lavorate"
          value={data.timeTracking.totalHours.toFixed(1)}
          icon={Clock}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          gradient="from-blue-500 to-blue-600"
          subtitle={`${(data.timeTracking.totalHours / 5).toFixed(1)}h/giorno medio`}
          trend={hoursTrend}
        />
        <AdvancedStatCard
          label="Task Completati"
          value={filteredData.tasks.completed.length}
          icon={CheckCircle}
          color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          gradient="from-green-500 to-emerald-600"
          subtitle={`${completionRate.toFixed(0)}% completamento`}
          trend={tasksCompletedTrend}
        />
        <AdvancedStatCard
          label="Task in Corso"
          value={filteredData.tasks.inProgress.length}
          icon={Activity}
          color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
          gradient="from-purple-500 to-violet-600"
          subtitle={`${filteredData.tasks.created.length} nuovi task`}
        />
        <AdvancedStatCard
          label="Produttività"
          value={`${productivity.toFixed(1)}%`}
          icon={Zap}
          color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
          gradient="from-amber-500 to-orange-600"
          subtitle={`${avgHoursPerTask.toFixed(1)}h media/task`}
        />
      </div>

      {/* Productivity Metrics */}
      {data.productivity && (
        <div className="bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-purple-500" />
            Metriche Produttività
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.productivity.tasksPerDay}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Task/giorno</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.productivity.daysWorked}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Giorni lavorati</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.productivity.avgHoursPerDay}h</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Media ore/giorno</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.productivity.onTimeDeliveryRate}%</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Consegne puntuali</div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Completion Rate */}
        <div className="card p-6 flex flex-col items-center justify-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-gray-400" />
            Tasso Completamento
          </h3>
          <CircularProgress
            percentage={completionRate}
            size={140}
            strokeWidth={10}
            color="#10b981"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
            {filteredData.tasks.completed.length} su {totalTasks} task
          </p>
        </div>

        {/* Task Status Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-400" />
            Distribuzione Task
          </h3>
          <DonutChart
            data={[
              { label: 'Completati', value: filteredData.tasks.completed.length, color: '#10b981' },
              { label: 'In Corso', value: filteredData.tasks.inProgress.length, color: '#8b5cf6' },
              { label: 'Nuovi', value: filteredData.tasks.created.length, color: '#3b82f6' },
              { label: 'Bloccati', value: filteredData.blockedTasks.length, color: '#ef4444' },
            ]}
            size={160}
            strokeWidth={25}
          />
        </div>

        {/* Quick Stats */}
        <div className="card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gray-400" />
            Metriche Rapide
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Task Bloccati</span>
              <span className="text-lg font-bold text-red-600 dark:text-red-400">{filteredData.blockedTasks.length}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Commenti</span>
              <span className="text-lg font-bold text-purple-600 dark:text-purple-400">{data.comments.total}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Task Ricorrenti</span>
              <span className="text-lg font-bold text-cyan-600 dark:text-cyan-400">{filteredData.tasks.recurring.length}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Ore/Task</span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{avgHoursPerTask.toFixed(1)}h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Time by Project - Enhanced */}
      {data.timeTracking.byProject.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-gray-400" />
            Tempo per Progetto
          </h3>
          <div className="space-y-4">
            {data.timeTracking.byProject.map((project, index) => {
              const hours = project.totalMinutes / 60
              const totalHours = data.timeTracking.byProject.reduce((sum, p) => sum + p.totalMinutes / 60, 0)
              const colors = [
                'bg-blue-500',
                'bg-green-500',
                'bg-purple-500',
                'bg-amber-500',
                'bg-pink-500',
                'bg-cyan-500',
              ]
              return (
                <ProgressBar
                  key={project.projectId}
                  label={`${project.projectCode} - ${project.projectName}`}
                  value={hours}
                  max={totalHours}
                  color={colors[index % colors.length]}
                  showValue={false}
                  showPercentage
                  size="md"
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Project Status Overview */}
      {data.projectHealth && data.projectHealth.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Stato Progetti
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.projectHealth.map((project) => (
              <ProjectHealthCard
                key={project.projectId}
                name={project.projectName}
                status={project.status}
                completion={project.completionPercent}
                tasks={{ total: project.tasksTotal, completed: project.tasksCompleted, blocked: project.tasksBlocked }}
                hours={project.actualHours}
              />
            ))}
          </div>
        </div>
      )}

      {/* Time by User (team mode only) - Enhanced */}
      {data.timeTracking.byUser && data.timeTracking.byUser.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            Performance per Dipendente
          </h3>
          <div className="space-y-4">
            {data.timeTracking.byUser
              .sort((a, b) => b.totalMinutes - a.totalMinutes)
              .map((u) => {
                const hours = u.totalMinutes / 60
                const totalHours = data.timeTracking.byUser!.reduce((sum, x) => sum + x.totalMinutes / 60, 0)
                return (
                  <ProgressBar
                    key={u.userId}
                    label={u.userName}
                    value={hours}
                    max={totalHours}
                    color="bg-gradient-to-r from-purple-500 to-pink-500"
                    showValue={false}
                    showPercentage
                    size="md"
                  />
                )
              })}
          </div>
        </div>
      )}

      {/* Time by Day - Enhanced */}
      {data.timeTracking.byDay.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            Distribuzione Giornaliera
          </h3>
          <div className="flex items-end gap-2 h-40">
            {data.timeTracking.byDay.map((day) => {
              const maxMinutes = Math.max(...data.timeTracking.byDay.map(d => d.totalMinutes), 1)
              const pct = (day.totalMinutes / maxMinutes) * 100
              const hours = day.totalMinutes / 60
              const barHeight = Math.max(pct, 5)
              const isWeekend = new Date(day.date).getDay() === 0 || new Date(day.date).getDay() === 6
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2 group" title={`${formatDate(day.date)}: ${hours.toFixed(1)}h`}>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-primary-500 transition-colors">
                    {hours.toFixed(1)}h
                  </span>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-t-lg h-28 flex flex-col justify-end overflow-hidden relative">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-700 ease-out shadow-lg group-hover:shadow-xl ${
                        isWeekend
                          ? 'bg-gradient-to-t from-amber-400 to-amber-500'
                          : 'bg-gradient-to-t from-green-400 to-green-500'
                      }`}
                      style={{ height: `${barHeight}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                    {formatDate(day.date)}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gradient-to-t from-green-400 to-green-500"></div>
              <span className="text-gray-600 dark:text-gray-400">Giorni lavorativi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gradient-to-t from-amber-400 to-amber-500"></div>
              <span className="text-gray-600 dark:text-gray-400">Weekend</span>
            </div>
          </div>
        </div>
      )}

      {/* Task Activity - Hierarchical View */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-gray-400" />
          Attività Task
        </h3>

        {/* User Tabs */}
        {entryUsers.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mb-5 pb-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActivityUserTab(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activityUserTab === null
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Tutti
            </button>
            {entryUsers.map((u) => (
              <button
                key={u.userId}
                onClick={() => setActivityUserTab(u.userId)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  activityUserTab === u.userId
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <User className="w-3 h-3" />
                {u.userName}
              </button>
            ))}
          </div>
        )}

        {/* Hierarchical: Project → Task → Entry (Note + User) */}
        {groupedByProject.length > 0 ? (
          <div className="space-y-5">
            {groupedByProject.map((project) => (
              <div key={project.projectId}>
                {/* Project Level */}
                <div className="flex items-center gap-2 mb-3">
                  <FolderTree className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {project.projectCode} - {project.projectName}
                  </span>
                </div>

                {/* Task Level */}
                <div className="ml-5 space-y-3 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                  {project.tasks.map((task) => (
                    <div key={task.taskId}>
                      <Link
                        to={`/tasks/${task.taskId}`}
                        className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200 hover:text-primary-500 transition-colors mb-1.5"
                      >
                        {task.isRecurring ? (
                          <Repeat2 className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
                        ) : (
                          <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        )}
                        <span>{task.taskCode} - {task.taskTitle}</span>
                        {task.isRecurring && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 text-[10px] font-medium flex-shrink-0">
                            Ricorrente
                          </span>
                        )}
                      </Link>

                      {/* Entry Level: Note + User */}
                      <div className="ml-5 space-y-1">
                        {task.entries.map((entry) => (
                          <div key={entry.id} className="flex items-start gap-2 py-1 text-xs">
                            <Clock className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-gray-600 dark:text-gray-400">
                                {entry.description || <span className="italic text-gray-400">Nessuna nota</span>}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                              <span className="text-gray-500 dark:text-gray-400">
                                {entry.duration ? `${(entry.duration / 60).toFixed(1)}h` : '—'}
                              </span>
                              <span className="text-primary-500 dark:text-primary-400 font-medium hidden sm:inline">
                                {entry.userName}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">Nessuna registrazione di tempo questa settimana</p>
        )}
      </div>

      {/* Blocker Analysis */}
      {data.blockerAnalysis && data.blockerAnalysis.activeCount > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            Analisi Blocchi
          </h3>
          <div className="bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 p-5 space-y-4">
            {/* Summary row */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">{data.blockerAnalysis.activeCount}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">attivi</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">{data.blockerAnalysis.resolvedThisWeek}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">risolti questa settimana</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{data.blockerAnalysis.overdueCount}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">in ritardo (&gt;5gg)</span>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                data.blockerAnalysis.riskScore === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                data.blockerAnalysis.riskScore === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                Rischio: {data.blockerAnalysis.riskScore}
              </div>
            </div>
            {/* Category breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(Object.entries(data.blockerAnalysis.byCategory) as [string, number][]).filter(([, count]) => count > 0).map(([cat, count]) => (
                <div key={cat} className="text-center p-2 rounded-lg bg-gray-50 dark:bg-surface-700/50">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{count}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{cat}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blocked Tasks */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Task Bloccati
          </h3>
          {filteredData.blockedTasks.length > 0 ? (
            <div className="space-y-3">
              {filteredData.blockedTasks.map((task) => (
                <div key={task.id} className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {task.code} - {task.title}
                    {task.assigneeName && (
                      <span className="text-xs font-normal text-primary-500 dark:text-primary-400 ml-2">— {task.assigneeName}</span>
                    )}
                  </p>
                  {task.projectName && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Progetto: {task.projectName}
                    </p>
                  )}
                  {task.lastComment && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
                      "{task.lastComment.substring(0, 100)}{task.lastComment.length > 100 ? '...' : ''}"
                    </p>
                  )}
                  {task.blockedSince && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Bloccato dal {formatDate(task.blockedSince)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <CheckCircle className="w-12 h-12 mb-2" />
              <p className="text-sm">Nessun task bloccato!</p>
            </div>
          )}
        </div>
      </div>

      {/* Comments Summary */}
      {data.comments.byProject.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gray-400" />
            Commenti per Progetto
          </h3>
          <div className="space-y-4">
            {data.comments.byProject.map((project) => (
              <div key={project.projectId}>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {project.projectCode} - {project.projectName} ({project.commentCount} commenti)
                </h4>
                <ul className="space-y-2 ml-4">
                  {project.comments.map((comment) => (
                    <li key={comment.id} className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="text-xs text-gray-400">[{comment.taskCode}]</span>{' '}
                      {comment.content}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Report History Component
function ReportHistory({
  reports,
  pagination,
  onPageChange,
  onSelect,
}: {
  reports: WeeklyReport[]
  pagination: { page: number; pages: number } | null
  onPageChange: (page: number) => void
  onSelect: (id: string) => void
}) {
  if (reports.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Nessun report generato</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <div
          key={report.id}
          className="card p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
          onClick={() => onSelect(report.id)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{report.code}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Settimana {report.weekNumber}/{report.year}
              </p>
              <p className="text-xs text-gray-400">
                {formatDate(report.weekStartDate)} - {formatDate(report.weekEndDate)}
              </p>
            </div>
            <div className="text-right">
              <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                report.status === 'completed'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {report.status === 'completed' ? 'Completato' : report.status}
              </span>
              {report.generatedAt && (
                <p className="text-xs text-gray-400 mt-1">
                  Generato il {new Date(report.generatedAt).toLocaleDateString('it-IT')}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}

      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1 rounded text-sm ${
                page === pagination.page
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function WeeklyReportPage() {
  const {
    currentWeekPreview,
    currentWeekInfo,
    reports,
    teamReports,
    selectedReport,
    isLoading,
    isGenerating,
    isLoadingPreview,
    error,
    pagination,
    teamPagination,
    fetchCurrentWeekInfo,
    fetchWeeklyPreview,
    fetchMyReports,
    fetchTeamReports,
    fetchReportById,
    generateReport,
    clearSelectedReport,
    clearError,
  } = useWeeklyReportStore()

  const { user } = useAuthStore()
  const { addToast } = useToastStore()
  const isDirezione = user?.role === 'direzione'
  const [activeTab, setActiveTab] = useState<'preview' | 'projectTree' | 'myReports' | 'teamReports'>('preview')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isExportingPDF, setIsExportingPDF] = useState(false)

  useEffect(() => {
    fetchCurrentWeekInfo()
    fetchWeeklyPreview(isDirezione)
    fetchMyReports()
    fetchTeamReports()
  }, [fetchCurrentWeekInfo, fetchWeeklyPreview, fetchMyReports, fetchTeamReports, isDirezione])

  const handleGenerate = async () => {
    try {
      const report = await generateReport()
      addToast({
        type: 'success',
        title: 'Report Generato',
        message: `Report ${report.code} generato con successo!`,
      })
    } catch {
      addToast({
        type: 'error',
        title: 'Errore',
        message: 'Errore nella generazione del report',
      })
    }
  }

  const handleExportPDF = async () => {
    if (isExportingPDF) return // Prevent double-click
    
    try {
      if (!currentWeekPreview) {
        addToast({
          type: 'error',
          title: 'Errore',
          message: 'Nessun dato disponibile per l\'export',
        })
        return
      }
      
      setIsExportingPDF(true)
      addToast({
        type: 'info',
        title: 'Generazione PDF',
        message: 'Generazione del PDF in corso...',
      })
      
      // Lazy load PDF module (code splitting)
      const { exportWeeklyReportReactPDF } = await import('@/utils/exportPDFReact')
      const result = await exportWeeklyReportReactPDF(currentWeekPreview, selectedUserId)
      
      if (result.success) {
        addToast({
          type: 'success',
          title: 'PDF Esportato',
          message: `Report esportato con successo: ${result.filename}`,
        })
      } else {
        addToast({
          type: 'error',
          title: 'Errore',
          message: result.error || 'Errore nell\'esportazione del PDF',
        })
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Errore',
        message: 'Errore inaspettato durante l\'esportazione',
      })
    } finally {
      setIsExportingPDF(false)
    }
  }

  const handleExportSelectedReportPDF = async () => {
    if (isExportingPDF) return // Prevent double-click
    
    try {
      if (!selectedReport?.reportData) {
        addToast({
          type: 'error',
          title: 'Errore',
          message: 'Nessun dato disponibile per l\'export',
        })
        return
      }
      
      setIsExportingPDF(true)
      addToast({
        type: 'info',
        title: 'Generazione PDF',
        message: 'Generazione del PDF in corso...',
      })
      
      // Lazy load PDF module (code splitting)
      const { exportWeeklyReportReactPDF } = await import('@/utils/exportPDFReact')
      const result = await exportWeeklyReportReactPDF(selectedReport.reportData)
      
      if (result.success) {
        addToast({
          type: 'success',
          title: 'PDF Esportato',
          message: `Report esportato con successo: ${result.filename}`,
        })
      } else {
        addToast({
          type: 'error',
          title: 'Errore',
          message: result.error || 'Errore nell\'esportazione del PDF',
        })
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Errore',
        message: 'Errore inaspettato durante l\'esportazione',
      })
    } finally {
      setIsExportingPDF(false)
    }
  }

  const handleSelectReport = (id: string) => {
    fetchReportById(id)
  }

  // Show selected report detail
  if (selectedReport) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <button
              onClick={clearSelectedReport}
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 mb-2"
            >
              ← Torna alla lista
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {selectedReport.code}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Settimana {selectedReport.weekNumber}/{selectedReport.year}
              {selectedReport.user && ` - ${selectedReport.user.firstName} ${selectedReport.user.lastName}`}
            </p>
          </div>
          <button
            onClick={handleExportSelectedReportPDF}
            disabled={isExportingPDF}
            className="btn-secondary flex items-center gap-2 self-start disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExportingPDF ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generazione...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Esporta PDF
              </>
            )}
          </button>
        </div>

        {selectedReport.reportData && (
          <ReportPreview data={selectedReport.reportData} />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Report Settimanale</h1>
          {currentWeekInfo && (
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Settimana {currentWeekInfo.weekNumber}/{currentWeekInfo.year} ({formatDate(currentWeekInfo.weekStartDate)} - {formatDate(currentWeekInfo.weekEndDate)})
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => fetchWeeklyPreview(isDirezione)}
            disabled={isLoadingPreview}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingPreview ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Aggiorna</span>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={!currentWeekPreview || isExportingPDF}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExportingPDF ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">Generazione...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Esporta PDF</span>
              </>
            )}
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="btn-primary flex items-center gap-2"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Genera Report</span>
            <span className="sm:hidden">Genera</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button onClick={clearError} className="text-sm text-red-500 underline mt-1">
            Chiudi
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto scrollbar-thin">
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 min-w-0 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'preview'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Preview Settimana
        </button>
        <button
          onClick={() => setActiveTab('projectTree')}
          className={`flex-1 min-w-0 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1 whitespace-nowrap ${
            activeTab === 'projectTree'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          Vista Progetti
        </button>
        <button
          onClick={() => setActiveTab('myReports')}
          className={`flex-1 min-w-0 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'myReports'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          I Miei Report
        </button>
        <button
          onClick={() => setActiveTab('teamReports')}
          className={`flex-1 min-w-0 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1 whitespace-nowrap ${
            activeTab === 'teamReports'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Report Team
        </button>
      </div>

      {/* Content */}
      {activeTab === 'preview' && (
        isLoadingPreview && !currentWeekPreview ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : currentWeekPreview ? (
          <div className="space-y-4">
            {/* User Filter (Team Mode Only) */}
            {isDirezione && currentWeekPreview.timeTracking.byUser && currentWeekPreview.timeTracking.byUser.length > 0 && (
              <div className="card p-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Filtra per Utente
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedUserId(null)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedUserId === null
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    Tutti gli utenti
                  </button>
                  {currentWeekPreview.timeTracking.byUser.map((u) => (
                    <button
                      key={u.userId}
                      onClick={() => setSelectedUserId(u.userId)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedUserId === u.userId
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5" />
                        <span>{u.userName}</span>
                        <span className="text-xs opacity-75">({(u.totalMinutes / 60).toFixed(1)}h)</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <ReportPreview data={currentWeekPreview} selectedUserId={selectedUserId} />
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Nessun dato disponibile per questa settimana</p>
          </div>
        )
      )}

      {activeTab === 'projectTree' && (
        <div className="space-y-4">
          {/* User Filter (Team Mode Only) */}
          {isDirezione && currentWeekPreview?.timeTracking.byUser && currentWeekPreview.timeTracking.byUser.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Filtra per Utente
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedUserId(null)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedUserId === null
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Tutti gli utenti
                </button>
                {currentWeekPreview.timeTracking.byUser.map((u) => (
                  <button
                    key={u.userId}
                    onClick={() => setSelectedUserId(u.userId)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedUserId === u.userId
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5" />
                      <span>{u.userName}</span>
                      <span className="text-xs opacity-75">({(u.totalMinutes / 60).toFixed(1)}h)</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          <TaskTreeView myTasksOnly={!isDirezione} filterUserId={selectedUserId || undefined} />
        </div>
      )}

      {activeTab === 'myReports' && (
        isLoading && reports.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <ReportHistory
            reports={reports}
            pagination={pagination}
            onPageChange={fetchMyReports}
            onSelect={handleSelectReport}
          />
        )
      )}

      {activeTab === 'teamReports' && (
        isLoading && teamReports.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <ReportHistory
            reports={teamReports}
            pagination={teamPagination}
            onPageChange={fetchTeamReports}
            onSelect={handleSelectReport}
          />
        )
      )}
    </div>
  )
}
