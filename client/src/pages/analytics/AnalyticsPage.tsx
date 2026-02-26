/**
 * Analytics Page - Dashboard with interactive Recharts charts
 * @module pages/analytics/AnalyticsPage
 */

import { useEffect, useMemo } from 'react'
import { useAnalyticsStore } from '@stores/analyticsStore'
import {
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { BudgetOverviewSection } from '@/components/dashboard/BudgetOverviewSection'
import DeliveryOutlookSection from '@/components/dashboard/DeliveryOutlookSection'
import { TeamPerformanceSection } from '@/components/dashboard/TeamPerformanceSection'
import { HudPanelHeader } from '@/components/ui/hud'
import { formatDuration } from '@utils/dateFormatters'

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
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  todo: '#9CA3AF',
  in_progress: '#3B82F6',
  review: '#EAB308',
  blocked: '#EF4444',
  done: '#22C55E',
  cancelled: '#D1D5DB',
}

const PIE_COLORS = ['#3B82F6', '#22C55E', '#F97316', '#8B5CF6', '#EC4899', '#14B8A6', '#EAB308', '#EF4444']

export default function AnalyticsPage() {
  const {
    overview,
    tasksByStatus,
    hoursByProject,
    completionTrend,
    topContributors,
    teamWorkload,
    deliveryForecast,
    trendPeriodDays,
    setTrendPeriodDays,
    budgetOverview,
    isLoading,
    fetchAll,
  } = useAnalyticsStore()

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const statusChartData = useMemo(
    () =>
      tasksByStatus.map((t) => ({
        name: TASK_STATUS_LABELS[t.status as TaskStatus] || t.status,
        value: t.count,
        fill: STATUS_COLORS[t.status] || '#6B7280',
      })),
    [tasksByStatus]
  )

  const hoursChartData = useMemo(
    () =>
      hoursByProject.map((h) => ({
        name: h.projectName,
        fullName: h.projectName,
        ore: Math.round((h.totalMinutes / 60) * 10) / 10,
        oreLabel: formatDuration(h.totalMinutes),
      })),
    [hoursByProject]
  )

  const trendData = useMemo(() => {
    const recent = completionTrend.slice(-14)
    return recent.map((d) => ({
      date: new Date(d.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
      Completati: d.completed,
      Creati: d.created,
    }))
  }, [completionTrend])

  if (isLoading && !overview) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <div className="skeleton h-8 w-32" />
          <div className="skeleton h-4 w-64 mt-2" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="skeleton h-4 w-24" />
                  <div className="skeleton h-7 w-12" />
                </div>
                <div className="skeleton w-12 h-12 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-6">
              <div className="skeleton h-6 w-40 mb-4" />
              <div className="skeleton h-48 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const completionRate =
    overview && overview.totalTasks > 0
      ? Math.round((overview.completedTasks / overview.totalTasks) * 100)
      : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Analytics</h1>
        <p className="mt-1 page-subtitle">
          Panoramica delle metriche di progetto
        </p>
      </div>

      {/* KPI Cards */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
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
            value={formatDuration(overview.totalMinutesLogged)}
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
        {/* Tasks by Status - Horizontal Bar Chart */}
        <div className="card p-6">
          <h2 className="section-heading text-base mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-400" />
            Task per Stato
          </h2>
          {statusChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={statusChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F9FAFB',
                    fontSize: '13px',
                  }}
                  formatter={(value: number) => [`${value} task`, 'Conteggio']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {statusChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-sm">Nessun dato disponibile</p>
          )}
        </div>

        {/* Hours by Project - Pie Chart */}
        <div className="card p-6">
          <h2 className="section-heading text-base mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            Ore per Progetto
          </h2>
          {hoursChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={hoursChartData}
                  dataKey="ore"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, oreLabel }: { name: string; oreLabel: string }) => `${name}: ${oreLabel}`}
                  labelLine={{ stroke: '#9CA3AF' }}
                >
                  {hoursChartData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F9FAFB',
                    fontSize: '13px',
                  }}
                  formatter={(value: number, _name: string, entry: { payload?: { fullName?: string } }) => [
                    `${value}h`,
                    entry.payload?.fullName || _name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-sm">Nessun dato disponibile</p>
          )}
        </div>

        {/* Task Completion Trend - Line Chart */}
        <div className="card p-6">
          <h2 className="section-heading text-base mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-slate-400" />
            Trend Ultimi 14 Giorni
          </h2>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F9FAFB',
                    fontSize: '13px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="Completati"
                  stroke="#22C55E"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#22C55E' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="Creati"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#3B82F6' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-sm">Nessun dato disponibile</p>
          )}
        </div>

        {/* Top Contributors */}
        <div className="card p-6">
          <h2 className="section-heading text-base mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-400" />
            Top Contributori
          </h2>
          {topContributors.length > 0 ? (
            <div className="space-y-4">
              {topContributors.map((c, i) => (
                <div key={c.userId} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-sm font-semibold text-cyan-700 dark:text-cyan-400">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDuration(c.minutesLogged)} registrate &middot; {c.tasksCompleted} task completati
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-sm">Nessun dato disponibile</p>
          )}
        </div>
      </div>

      {/* Budget Overview */}
      <BudgetOverviewSection data={budgetOverview} />

      {/* Delivery Outlook — moved here from Dashboard */}
      <div>
        <div className="mb-3">
          <HudPanelHeader title="PREVISIONI CONSEGNA" />
        </div>
        <DeliveryOutlookSection
          forecasts={deliveryForecast}
          isLoading={isLoading}
        />
      </div>

      {/* Team Performance — moved here from Dashboard */}
      <div>
        <div className="mb-3">
          <HudPanelHeader title="PERFORMANCE TEAM" />
        </div>
        <TeamPerformanceSection
          topContributors={topContributors}
          completionTrend={completionTrend}
          teamWorkload={teamWorkload}
          isLoading={isLoading}
          trendPeriodDays={trendPeriodDays}
          onTrendPeriodChange={setTrendPeriodDays}
        />
      </div>

      {/* Summary Footer */}
      {overview && (
        <div className="card p-4 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400">
          <span>{overview.totalProjects} progetti totali</span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span>{overview.totalTasks} task totali</span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span>{overview.blockedTasks} bloccati</span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span>{overview.activeUsers} utenti attivi</span>
        </div>
      )}
    </div>
  )
}
