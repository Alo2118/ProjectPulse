/**
 * Advanced KPI Section - Burndown, Velocity, Lead Time, Risk Exposure for direzione
 */

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import { Activity, TrendingDown, Zap, ShieldAlert } from 'lucide-react'

interface TaskCompletionTrend {
  date: string
  completed: number
  created: number
}

interface TopContributor {
  userId: string
  firstName: string
  lastName: string
  minutesLogged: number
  tasksCompleted: number
}

interface ProjectHealth {
  projectId: string
  projectCode: string
  projectName: string
  openRisks: number
  highRisks: number
  tasksBlocked: number
  healthStatus: 'healthy' | 'at_risk' | 'critical'
}

interface OverviewStats {
  totalTasks: number
  completedTasks: number
  openRisks: number
  blockedTasks: number
  activeProjects: number
}

interface AdvancedKPISectionProps {
  completionTrend: TaskCompletionTrend[]
  topContributors: TopContributor[]
  projectHealth: ProjectHealth[]
  overview: OverviewStats | null
  isLoading?: boolean
}

function formatDate(dateString: string): string {
  const d = new Date(dateString)
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`
}

// Custom tooltip for charts
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 dark:bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-white mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export function AdvancedKPISection({
  completionTrend,
  topContributors,
  projectHealth,
  overview,
  isLoading,
}: AdvancedKPISectionProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="skeleton h-6 w-40 mb-4" />
            <div className="skeleton h-48 w-full" />
          </div>
        ))}
      </div>
    )
  }

  // Burndown: cumulative remaining tasks over time
  const last30 = completionTrend.slice(-30)
  let remaining = overview?.totalTasks ?? 0
  const burndownData = last30.map((d) => {
    remaining = Math.max(0, remaining - d.completed)
    return {
      date: formatDate(d.date),
      rimanenti: remaining,
      completati: d.completed,
    }
  })

  // Velocity: tasks completed per week (group by week)
  const velocityMap = new Map<string, number>()
  completionTrend.slice(-56).forEach((d) => {
    const date = new Date(d.date)
    const monday = new Date(date)
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7))
    const weekLabel = monday.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
    velocityMap.set(weekLabel, (velocityMap.get(weekLabel) ?? 0) + d.completed)
  })
  const velocityData = Array.from(velocityMap.entries())
    .slice(-8)
    .map(([week, tasks]) => ({ settimana: week, task: tasks }))

  // Lead time proxy: avg days between creation and completion (use trend ratio)
  const recentTrend = completionTrend.slice(-14)
  const totalCompleted = recentTrend.reduce((s, d) => s + d.completed, 0)
  const throughput = totalCompleted > 0 ? totalCompleted / 14 : 0
  const wip = (overview?.totalTasks ?? 0) - (overview?.completedTasks ?? 0)
  const leadTimeDays = throughput > 0 ? Math.round(wip / throughput) : null

  // Risk exposure: high-risk projects
  const riskExposure = projectHealth
    .filter((p) => p.openRisks > 0 || p.tasksBlocked > 0)
    .sort((a, b) => b.highRisks - a.highRisks)
    .slice(0, 8)
    .map((p) => ({
      progetto: p.projectCode,
      alto: p.highRisks,
      aperti: p.openRisks,
    }))

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary-500" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Analytics Avanzate</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Burndown Chart */}
        <div className="card">
          <div className="p-4 border-b border-gray-200/30 dark:border-white/5 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Burndown Task</h3>
            <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">ultimi 30 giorni</span>
          </div>
          <div className="p-4">
            {burndownData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                Nessun dato disponibile
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={burndownData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="burndownGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="rimanenti"
                    name="Task rimanenti"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#burndownGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Team Velocity */}
        <div className="card">
          <div className="p-4 border-b border-gray-200/30 dark:border-white/5 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Velocità Team</h3>
            <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">task/settimana (8 sett.)</span>
          </div>
          <div className="p-4">
            {velocityData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                Nessun dato disponibile
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={velocityData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="settimana" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="task" name="Task completati" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                {/* Lead time card */}
                <div className="mt-3 pt-3 border-t border-gray-200/30 dark:border-white/5 flex items-center justify-between">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Lead time stimato</div>
                  <div className="text-lg font-bold text-amber-500">
                    {leadTimeDays !== null ? `~${leadTimeDays} giorni` : 'N/D'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Risk Exposure */}
        <div className="card">
          <div className="p-4 border-b border-gray-200/30 dark:border-white/5 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Risk Exposure</h3>
            <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">per progetto</span>
          </div>
          <div className="p-4">
            {riskExposure.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-green-500 text-sm font-medium">
                Nessun rischio aperto
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={riskExposure}
                  layout="vertical"
                  margin={{ top: 4, right: 8, left: 20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis
                    type="category"
                    dataKey="progetto"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    width={50}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="alto" name="Rischi alti" fill="#ef4444" radius={[0, 3, 3, 0]} stackId="a" />
                  <Bar dataKey="aperti" name="Rischi totali" fill="#f97316" radius={[0, 3, 3, 0]} stackId="b" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Contributor Velocity */}
        <div className="card">
          <div className="p-4 border-b border-gray-200/30 dark:border-white/5 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Output Individuale</h3>
            <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">task completati</span>
          </div>
          <div className="p-4">
            {topContributors.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                Nessun dato disponibile
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={topContributors.slice(0, 8).map((c) => ({
                    nome: c.firstName,
                    task: c.tasksCompleted,
                    ore: Math.round(c.minutesLogged / 60),
                  }))}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="nome" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
                          <p className="font-medium text-white mb-1">{label}</p>
                          <p className="text-emerald-400">Task: {payload[0]?.value}</p>
                          <p className="text-blue-400">
                            Ore: {formatHours((payload[0]?.payload?.ore ?? 0) * 60)}
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="task" name="Task completati" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
