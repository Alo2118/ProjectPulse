/**
 * Analytics Page - Dashboard with charts and KPIs
 * @module pages/analytics/AnalyticsPage
 */

import { useEffect } from 'react'
import { useAnalyticsStore } from '@stores/analyticsStore'
import {
  Loader2,
  FolderKanban,
  CheckCircle,
  Clock,
  Users,
  ShieldAlert,
  TrendingUp,
  BarChart3,
} from 'lucide-react'
import { TASK_STATUS_LABELS } from '@/constants'
import { TaskStatus } from '@/types'

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number | string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

function BarChartSimple({
  data,
  maxValue,
  labelKey,
  valueKey,
  colorFn,
}: {
  data: Record<string, unknown>[]
  maxValue: number
  labelKey: string
  valueKey: string
  colorFn?: (item: Record<string, unknown>) => string
}) {
  return (
    <div className="space-y-3">
      {data.map((item, i) => {
        const val = Number(item[valueKey]) || 0
        const pct = maxValue > 0 ? (val / maxValue) * 100 : 0
        const color = colorFn ? colorFn(item) : 'bg-primary-500'
        return (
          <div key={i}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700 dark:text-gray-300 truncate mr-2">
                {String(item[labelKey])}
              </span>
              <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{val}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${color}`}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function AnalyticsPage() {
  const {
    overview,
    tasksByStatus,
    hoursByProject,
    completionTrend,
    topContributors,
    isLoading,
    fetchAll,
  } = useAnalyticsStore()

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  if (isLoading && !overview) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  const completionRate =
    overview && overview.totalTasks > 0
      ? Math.round((overview.completedTasks / overview.totalTasks) * 100)
      : 0

  const taskStatusMax = Math.max(...tasksByStatus.map((t) => t.count), 1)
  const hoursMax = Math.max(...hoursByProject.map((h) => h.totalMinutes / 60), 1)

  // Last 14 days for the mini trend
  const recentTrend = completionTrend.slice(-14)
  const trendMax = Math.max(...recentTrend.map((d) => Math.max(d.completed, d.created)), 1)

  const statusBarColors: Record<string, string> = {
    todo: 'bg-gray-400',
    in_progress: 'bg-blue-500',
    review: 'bg-yellow-500',
    blocked: 'bg-red-500',
    done: 'bg-green-500',
    cancelled: 'bg-gray-300',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Panoramica delle metriche di progetto
        </p>
      </div>

      {/* KPI Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            label="Progetti Attivi"
            value={overview.activeProjects}
            icon={FolderKanban}
            color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          />
          <StatCard
            label="Task Completati"
            value={`${completionRate}%`}
            icon={CheckCircle}
            color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          />
          <StatCard
            label="In Corso"
            value={overview.inProgressTasks}
            icon={TrendingUp}
            color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
          />
          <StatCard
            label="Ore Registrate"
            value={(overview.totalMinutesLogged / 60).toFixed(1)}
            icon={Clock}
            color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
          />
          <StatCard
            label="Rischi Aperti"
            value={overview.openRisks}
            icon={ShieldAlert}
            color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks by Status */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-400" />
            Task per Stato
          </h2>
          {tasksByStatus.length > 0 ? (
            <BarChartSimple
              data={tasksByStatus.map((t) => ({
                label: TASK_STATUS_LABELS[t.status as TaskStatus] || t.status,
                count: t.count,
                status: t.status,
              }))}
              maxValue={taskStatusMax}
              labelKey="label"
              valueKey="count"
              colorFn={(item) => statusBarColors[String(item.status)] || 'bg-primary-500'}
            />
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">Nessun dato disponibile</p>
          )}
        </div>

        {/* Hours by Project */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            Ore per Progetto
          </h2>
          {hoursByProject.length > 0 ? (
            <BarChartSimple
              data={hoursByProject.map((h) => ({
                label: `${h.projectCode} - ${h.projectName}`,
                hours: (h.totalMinutes / 60).toFixed(1),
              }))}
              maxValue={hoursMax}
              labelKey="label"
              valueKey="hours"
              colorFn={() => 'bg-orange-500'}
            />
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">Nessun dato disponibile</p>
          )}
        </div>

        {/* Task Completion Trend (last 14 days) */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gray-400" />
            Trend Ultimi 14 Giorni
          </h2>
          {recentTrend.length > 0 ? (
            <div className="flex items-end gap-1 h-40">
              {recentTrend.map((day) => {
                const completedH = (day.completed / trendMax) * 100
                const createdH = (day.created / trendMax) * 100
                const dateLabel = new Date(day.date).toLocaleDateString('it-IT', {
                  day: '2-digit',
                  month: '2-digit',
                })
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5" title={`${dateLabel}: ${day.completed} completati, ${day.created} creati`}>
                    <div className="w-full flex flex-col justify-end" style={{ height: '120px' }}>
                      <div
                        className="w-full bg-green-500 rounded-t"
                        style={{ height: `${Math.max(completedH, 2)}%` }}
                      />
                      <div
                        className="w-full bg-blue-400 rounded-b"
                        style={{ height: `${Math.max(createdH, 2)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-gray-400 rotate-[-45deg] origin-top-left mt-1 w-6 truncate">
                      {dateLabel}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">Nessun dato disponibile</p>
          )}
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-500 inline-block" /> Completati
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-blue-400 inline-block" /> Creati
            </span>
          </div>
        </div>

        {/* Top Contributors */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            Top Contributori
          </h2>
          {topContributors.length > 0 ? (
            <div className="space-y-4">
              {topContributors.map((c, i) => (
                <div key={c.userId} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-sm font-semibold text-primary-700 dark:text-primary-400">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(c.minutesLogged / 60).toFixed(1)}h registrate &middot; {c.tasksCompleted} task completati
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">Nessun dato disponibile</p>
          )}
        </div>
      </div>

      {/* Summary Footer */}
      {overview && (
        <div className="card p-4 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
          <span>{overview.totalProjects} progetti totali</span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span>{overview.totalTasks} task totali</span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span>{overview.blockedTasks} bloccati</span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span>{overview.activeUsers} utenti attivi</span>
        </div>
      )}
    </div>
  )
}
