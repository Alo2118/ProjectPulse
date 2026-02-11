/**
 * Executive KPI Section - Key metrics for direzione role
 */

import {
  FolderKanban,
  Clock,
  AlertOctagon,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react'
import { CircularProgress } from '@/components/ui/CircularProgress'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { SparklineChart } from '@/components/ui/SparklineChart'

interface OverviewStats {
  totalProjects: number
  activeProjects: number
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  blockedTasks: number
  totalMinutesLogged: number
  openRisks: number
  activeUsers: number
}

interface ExecutiveKPISectionProps {
  overview: OverviewStats | null
  isLoading?: boolean
}

// Mock trend data - in production would come from backend
const TREND_DATA = {
  projects: [8, 10, 9, 11, 12, 11, 12],
  hours: [120, 145, 130, 160, 155, 170, 180],
}

function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  if (hours >= 1000) return `${(hours / 1000).toFixed(1)}k`
  return hours.toLocaleString('it-IT')
}

export function ExecutiveKPISection({ overview, isLoading }: ExecutiveKPISectionProps) {
  if (isLoading || !overview) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="skeleton h-16 w-16 rounded-full mx-auto mb-3" />
            <div className="skeleton h-4 w-20 mx-auto" />
          </div>
        ))}
      </div>
    )
  }

  const completionRate = overview.totalTasks > 0
    ? Math.round((overview.completedTasks / overview.totalTasks) * 100)
    : 0

  const kpis = [
    {
      label: 'Tasso Completamento',
      type: 'circular' as const,
      value: completionRate,
      subtitle: `${overview.completedTasks}/${overview.totalTasks} task`,
    },
    {
      label: 'Progetti Attivi',
      type: 'stat' as const,
      value: overview.activeProjects,
      icon: FolderKanban,
      trend: TREND_DATA.projects,
      trendColor: '#3b82f6',
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Ore Team (totali)',
      type: 'stat' as const,
      value: formatHours(overview.totalMinutesLogged),
      icon: Clock,
      trend: TREND_DATA.hours,
      trendColor: '#8b5cf6',
      gradient: 'from-purple-500 to-violet-600',
      suffix: 'h',
    },
    {
      label: 'Task Bloccati',
      type: 'alert' as const,
      value: overview.blockedTasks,
      icon: AlertOctagon,
      alertLevel: overview.blockedTasks > 0 ? 'critical' : 'ok',
    },
    {
      label: 'Rischi Aperti',
      type: 'alert' as const,
      value: overview.openRisks,
      icon: AlertTriangle,
      alertLevel: overview.openRisks > 5 ? 'critical' : overview.openRisks > 0 ? 'warning' : 'ok',
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary-500" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          KPI Aziendali
        </h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`card-hover p-4 text-center ${
              kpi.type === 'alert' && kpi.alertLevel === 'critical'
                ? 'border-red-500/30 dark:border-red-500/40 shadow-glow-red'
                : kpi.type === 'alert' && kpi.alertLevel === 'warning'
                  ? 'border-amber-500/30 dark:border-amber-500/40'
                  : ''
            }`}
          >
            {kpi.type === 'circular' && (
              <>
                <div className="flex justify-center mb-2">
                  <CircularProgress value={kpi.value as number} size="lg" color="auto" />
                </div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {kpi.label}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {kpi.subtitle}
                </p>
              </>
            )}

            {kpi.type === 'stat' && kpi.icon && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${kpi.gradient}`}>
                    <kpi.icon className="w-4 h-4 text-white" />
                  </div>
                  {kpi.trend && (
                    <div className="w-12 opacity-60">
                      <SparklineChart data={kpi.trend} color={kpi.trendColor || '#888'} height={24} />
                    </div>
                  )}
                </div>
                <AnimatedCounter
                  value={typeof kpi.value === 'number' ? kpi.value : 0}
                  className="text-2xl font-bold text-gray-900 dark:text-white"
                />
                {typeof kpi.value === 'string' && (
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {kpi.value}{kpi.suffix || ''}
                  </span>
                )}
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">
                  {kpi.label}
                </p>
              </>
            )}

            {kpi.type === 'alert' && kpi.icon && (
              <>
                <div
                  className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                    kpi.alertLevel === 'critical'
                      ? 'bg-red-500/10 dark:bg-red-500/20'
                      : kpi.alertLevel === 'warning'
                        ? 'bg-amber-500/10 dark:bg-amber-500/20'
                        : 'bg-green-500/10 dark:bg-green-500/20'
                  }`}
                >
                  <kpi.icon
                    className={`w-6 h-6 ${
                      kpi.alertLevel === 'critical'
                        ? 'text-red-500 animate-pulse'
                        : kpi.alertLevel === 'warning'
                          ? 'text-amber-500'
                          : 'text-green-500'
                    }`}
                  />
                </div>
                <AnimatedCounter
                  value={kpi.value as number}
                  className={`text-2xl font-bold ${
                    kpi.alertLevel === 'critical'
                      ? 'text-red-500'
                      : kpi.alertLevel === 'warning'
                        ? 'text-amber-500'
                        : 'text-green-500'
                  }`}
                />
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">
                  {kpi.label}
                </p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
