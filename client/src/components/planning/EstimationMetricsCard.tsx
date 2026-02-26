import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Target, TrendingUp, AlertCircle, Activity } from 'lucide-react'
import { formatHoursFromDecimal } from '@utils/dateFormatters'

interface EstimationByUser {
  userId: string
  firstName: string
  lastName: string
  avgAccuracyRatio: number
  tasksCompleted: number
  avgEstimatedHours: number
  avgActualHours: number
  overrunRate: number
}

interface EstimationByType {
  taskType: string
  avgAccuracyRatio: number
  avgDurationHours: number
  count: number
}

interface EstimationOverall {
  avgAccuracyRatio: number
  totalTasksAnalyzed: number
  overrunRate: number
  avgVelocity: number
}

interface EstimationMetricsCardProps {
  byUser: EstimationByUser[]
  byType: EstimationByType[]
  overall: EstimationOverall
  isLoading?: boolean
}

const TYPE_LABELS: Record<string, string> = {
  milestone: 'Milestone',
  task: 'Task',
  subtask: 'Subtask',
}

export function EstimationMetricsCard({ byUser, byType, overall, isLoading }: EstimationMetricsCardProps) {
  const chartData = useMemo(
    () =>
      byUser.map((u) => ({
        name: `${u.firstName} ${u.lastName.charAt(0)}.`,
        accuracyRatio: Number((u.avgAccuracyRatio * 100).toFixed(0)),
        tasksCompleted: u.tasksCompleted,
        overrunRate: Number((u.overrunRate * 100).toFixed(0)),
      })),
    [byUser]
  )

  if (isLoading) {
    return (
      <div className="card p-5 space-y-4">
        <div className="skeleton h-6 w-48" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-lg" />
          ))}
        </div>
        <div className="skeleton h-48 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5 text-cyan-500" />
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          Precisione Stime
        </h3>
      </div>

      {/* KPI summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-3 text-center">
          <div className="flex justify-center mb-1">
            <Target className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {(overall.avgAccuracyRatio * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Accuratezza Media</p>
        </div>
        <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-3 text-center">
          <div className="flex justify-center mb-1">
            <Activity className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {overall.avgVelocity.toFixed(1)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Task/Settimana</p>
        </div>
        <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-3 text-center">
          <div className="flex justify-center mb-1">
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {(overall.overrunRate * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Tasso Sforamento</p>
        </div>
        <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-3 text-center">
          <div className="flex justify-center mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {overall.totalTasksAnalyzed}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Task Analizzati</p>
        </div>
      </div>

      {/* Chart: accuracy by user */}
      {chartData.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
            Accuratezza per Utente (actual/stimato %)
          </p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #1f2937)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f9fafb',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value}%`, 'Accuratezza']}
                />
                <ReferenceLine y={100} stroke="#10b981" strokeDasharray="4 4" label={{ value: '100% (perfetto)', fontSize: 10, fill: '#10b981' }} />
                <Bar dataKey="accuracyRatio" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* By type table */}
      {byType.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
            Per Tipo di Task
          </p>
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {byType.map((t) => (
              <div key={t.taskType} className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-700 dark:text-slate-300">{TYPE_LABELS[t.taskType] ?? t.taskType}</span>
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span>~{formatHoursFromDecimal(t.avgDurationHours)}</span>
                  <span className={`font-medium ${
                    t.avgAccuracyRatio > 1.2 ? 'text-red-500' : t.avgAccuracyRatio < 0.8 ? 'text-amber-500' : 'text-emerald-500'
                  }`}>
                    {(t.avgAccuracyRatio * 100).toFixed(0)}%
                  </span>
                  <span>{t.count} task</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
