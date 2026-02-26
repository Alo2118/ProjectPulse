/**
 * Team Performance Section - Team workload + task completion trend (28 days)
 */

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
} from 'recharts'
import { Users, TrendingUp, CheckSquare, Clock, AlertTriangle, TrendingDown } from 'lucide-react'
import PeriodSelector from '@/components/dashboard/PeriodSelector'
import { formatDuration } from '@utils/dateFormatters'

interface TopContributor {
  userId: string
  firstName: string
  lastName: string
  minutesLogged: number
  tasksCompleted: number
}

interface TaskCompletionTrend {
  date: string
  completed: number
  created: number
}

interface TeamWorkloadEntry {
  userId: string
  firstName: string
  lastName: string
  minutesLogged: number
  weeklyHoursTarget: number
  utilizationPercent: number
}

interface TeamPerformanceSectionProps {
  topContributors: TopContributor[]
  completionTrend: TaskCompletionTrend[]
  teamWorkload?: TeamWorkloadEntry[]
  isLoading?: boolean
  trendPeriodDays?: number
  onTrendPeriodChange?: (days: number) => void
}

function formatHours(minutes: number): string {
  return formatDuration(minutes)
}

function getBarColor(utilization: number): string {
  if (utilization > 100) return '#ef4444' // red-500 - overloaded
  if (utilization >= 80) return '#f59e0b' // amber-500 - high load
  return '#22c55e' // green-500 - healthy
}

export function TeamPerformanceSection({
  topContributors,
  completionTrend,
  teamWorkload,
  isLoading,
  trendPeriodDays,
  onTrendPeriodChange,
}: TeamPerformanceSectionProps) {
  const workloadData = useMemo(() => {
    if (!teamWorkload?.length) return []
    return [...teamWorkload]
      .sort((a, b) => b.minutesLogged - a.minutesLogged)
      .map((w) => ({
        name: `${w.firstName} ${w.lastName.charAt(0)}.`,
        hours: Math.round((w.minutesLogged / 60) * 10) / 10,
        target: w.weeklyHoursTarget,
        utilization: w.utilizationPercent,
        utilizationPercent: w.utilizationPercent,
      }))
  }, [teamWorkload])

  // 28-day trend data for area chart
  const trendData = useMemo(() => {
    return completionTrend.slice(-28).map((d) => ({
      date: new Date(d.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
      completed: d.completed,
      created: d.created,
    }))
  }, [completionTrend])

  const trendTotals = useMemo(() => {
    const data = completionTrend.slice(-28)
    return {
      completed: data.reduce((sum, d) => sum + d.completed, 0),
      created: data.reduce((sum, d) => sum + d.created, 0),
    }
  }, [completionTrend])

  const overloaded = (teamWorkload ?? []).filter((w) => w.utilizationPercent > 100).length
  const underutilized = (teamWorkload ?? []).filter((w) => w.utilizationPercent < 30).length

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-4">
          <div className="skeleton h-6 w-40 mb-4" />
          <div className="skeleton h-48 w-full" />
        </div>
        <div className="card p-4">
          <div className="skeleton h-6 w-40 mb-4" />
          <div className="skeleton h-48 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Team Workload */}
      <div className="card">
        <div className="p-4 border-b border-slate-200/30 dark:border-white/5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-500" />
            Carico Team
          </h2>
        </div>
        <div className="p-4">
          {workloadData.length === 0 ? (
            <WorkloadFallback topContributors={topContributors} />
          ) : (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={workloadData}
                    layout="vertical"
                    margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: 'currentColor' }}
                      className="text-gray-400 dark:text-gray-500"
                      axisLine={false}
                      tickLine={false}
                      unit="%"
                      domain={[0, 'dataMax']}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 12, fill: 'currentColor' }}
                      className="text-gray-500 dark:text-gray-400"
                      axisLine={false}
                      tickLine={false}
                      width={90}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0].payload as typeof workloadData[0]
                        return (
                          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-lg">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{d.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {d.hours}h / {d.target}h ({d.utilization}%)
                            </p>
                          </div>
                        )
                      }}
                    />
                    <ReferenceLine
                      x={80}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      label={{ value: '80%', position: 'top', fontSize: 10, fill: '#f59e0b' }}
                    />
                    <ReferenceLine
                      x={100}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      label={{ value: '100%', position: 'top', fontSize: 10, fill: '#ef4444' }}
                    />
                    <Bar dataKey="utilizationPercent" name="Utilizzo %" radius={[0, 4, 4, 0]} maxBarSize={24}>
                      {workloadData.map((entry, index) => (
                        <Cell key={index} fill={getBarColor(entry.utilizationPercent)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {(overloaded > 0 || underutilized > 0) && (
                <div className="mt-3 flex items-center gap-4 text-xs">
                  {overloaded > 0 && (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {overloaded} sovraccaricati
                    </span>
                  )}
                  {underutilized > 0 && (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <TrendingDown className="w-3.5 h-3.5" />
                      {underutilized} sottoutilizzati
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Task Completion Trend */}
      <div className="card">
        <div className="p-4 border-b border-slate-200/30 dark:border-white/5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-500" />
              Trend Task
            </h2>
            {onTrendPeriodChange && (
              <PeriodSelector
                value={trendPeriodDays ?? 30}
                onChange={onTrendPeriodChange}
              />
            )}
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-green-500">
              <CheckSquare className="w-3 h-3" /> {trendTotals.completed} completati
            </span>
            <span className="flex items-center gap-1 text-blue-500">
              <Clock className="w-3 h-3" /> {trendTotals.created} creati
            </span>
          </div>
        </div>
        <div className="p-4">
          {trendData.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nessun dato disponibile</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'currentColor' }}
                    className="text-gray-400 dark:text-gray-500"
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    className="text-gray-400 dark:text-gray-500"
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-lg">
                          <p className="text-xs font-medium text-gray-900 dark:text-white mb-1">{label}</p>
                          <p className="text-xs text-green-500">Completati: {payload[0]?.value}</p>
                          <p className="text-xs text-blue-500">Creati: {payload[1]?.value}</p>
                        </div>
                      )
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#completedGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="created"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    fill="url(#createdGrad)"
                    strokeDasharray="4 2"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Fallback when team workload data not available - shows top contributors */
function WorkloadFallback({ topContributors }: { topContributors: TopContributor[] }) {
  const maxMinutes = Math.max(...topContributors.map((c) => c.minutesLogged), 1)

  if (topContributors.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 dark:text-gray-400">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nessun dato disponibile</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {topContributors.map((contributor, index) => (
        <div key={contributor.userId} className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
              index === 0
                ? 'bg-gradient-to-br from-amber-400 to-amber-600'
                : index === 1
                  ? 'bg-gradient-to-br from-gray-300 to-gray-500'
                  : index === 2
                    ? 'bg-gradient-to-br from-amber-600 to-amber-800'
                    : 'bg-gradient-to-br from-gray-400 to-gray-600'
            }`}
          >
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {contributor.firstName} {contributor.lastName}
              </p>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatHours(contributor.minutesLogged)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-500"
                style={{ width: `${(contributor.minutesLogged / maxMinutes) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
