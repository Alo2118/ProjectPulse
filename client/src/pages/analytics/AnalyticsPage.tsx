import { useMemo, useState } from "react"
import { Navigate } from "react-router-dom"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import {
  TrendingUp,
  TrendingDown,
  FolderKanban,
  ListChecks,
  Clock,
  CheckCircle2,
  AlertCircle,
  Flame,
} from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usePrivilegedRole } from "@/hooks/ui/usePrivilegedRole"
import {
  useAnalyticsOverviewQuery,
  useAnalyticsOverviewWithDeltaQuery,
  useTasksByStatusQuery,
  useHoursByProjectQuery,
  useTaskCompletionTrendQuery,
  useTopContributorsQuery,
  useDeliveryForecastQuery,
  useBudgetOverviewQuery,
  useBurndownQuery,
} from "@/hooks/api/useAnalytics"
import { useProjectListQuery } from "@/hooks/api/useProjects"
import { BurndownChart } from "@/components/domain/analytics/BurndownChart"
import { ProgressBar, getDomainGradient } from "@/components/common/ProgressBar"
import { TASK_STATUS_LABELS, STATUS_COLORS_HSL } from "@/lib/constants"
import { cn } from "@/lib/utils"

// Pie colors derived from STATUS_COLORS_HSL for consistent theming
const PIE_COLORS = [
  STATUS_COLORS_HSL.todo,
  STATUS_COLORS_HSL.in_progress,
  STATUS_COLORS_HSL.review,
  STATUS_COLORS_HSL.blocked,
  STATUS_COLORS_HSL.done,
  STATUS_COLORS_HSL.cancelled,
]

const CHART_COLORS = {
  primary: STATUS_COLORS_HSL.in_progress,
  secondary: STATUS_COLORS_HSL.done,
  accent: STATUS_COLORS_HSL.review,
  danger: STATUS_COLORS_HSL.blocked,
  purple: STATUS_COLORS_HSL.design,
}

interface KpiDelta {
  value: number
  label: string
}

function DeltaBadge({ delta }: { delta?: KpiDelta }) {
  if (!delta) return null
  const isUp = delta.value >= 0
  const Icon = isUp ? TrendingUp : TrendingDown
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        isUp ? "text-success" : "text-destructive"
      )}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(delta.value)}%
    </span>
  )
}

function KpiCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  )
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  )
}

function ChartError({ message = "Errore nel caricamento" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
      <AlertCircle className="h-8 w-8 mb-2" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

export default function AnalyticsPage() {
  useSetPageContext({ domain: 'analytics' })
  const { isPrivileged } = usePrivilegedRole()

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  const overview = useAnalyticsOverviewQuery()
  const deltas = useAnalyticsOverviewWithDeltaQuery()
  const tasksByStatus = useTasksByStatusQuery()
  const hoursByProject = useHoursByProjectQuery()
  const completionTrend = useTaskCompletionTrendQuery(30)
  const topContributors = useTopContributorsQuery()
  const deliveryForecast = useDeliveryForecastQuery()
  const budgetOverview = useBudgetOverviewQuery()
  const projectList = useProjectListQuery({ limit: 100 })
  const burndown = useBurndownQuery(selectedProjectId)

  const kpis = useMemo(() => {
    const o = overview.data
    const d = deltas.data
    if (!o) return []
    return [
      {
        label: "Progetti Attivi",
        value: o.activeProjects ?? 0,
        icon: FolderKanban,
        delta: d?.activeProjects,
      },
      {
        label: "Task Totali",
        value: o.totalTasks ?? 0,
        icon: ListChecks,
        delta: d?.totalTasks,
      },
      {
        label: "Ore Settimana",
        value: o.weeklyHours ?? 0,
        icon: Clock,
        delta: d?.weeklyHours,
      },
      {
        label: "Task Completati",
        value: o.completedTasks ?? 0,
        icon: CheckCircle2,
        delta: d?.completedTasks,
      },
    ]
  }, [overview.data, deltas.data])

  const pieData = useMemo(() => {
    if (!tasksByStatus.data) return []
    return (tasksByStatus.data as Array<{ status: string; count: number }>).map((item) => ({
      name: TASK_STATUS_LABELS[item.status] ?? item.status,
      value: item.count,
    }))
  }, [tasksByStatus.data])

  const barData = useMemo(() => {
    if (!hoursByProject.data) return []
    return (hoursByProject.data as Array<{ projectName: string; totalMinutes: number }>).map(
      (item) => ({
        name: item.projectName?.length > 15 ? item.projectName.slice(0, 15) + "..." : item.projectName,
        ore: Math.round((item.totalMinutes ?? 0) / 60),
      })
    )
  }, [hoursByProject.data])

  const trendData = useMemo(() => {
    if (!completionTrend.data) return []
    return (completionTrend.data as Array<{ date: string; completed: number }>).map((item) => ({
      data: item.date?.slice(5) ?? "",
      completati: item.completed,
    }))
  }, [completionTrend.data])

  const contributorsData = useMemo(() => {
    if (!topContributors.data) return []
    return (topContributors.data as Array<{ name: string; completedTasks: number }>).map((item) => ({
      nome: item.name,
      task: item.completedTasks,
    }))
  }, [topContributors.data])

  const projects = useMemo(() => {
    if (!projectList.data?.data) return []
    return (projectList.data.data as Array<{ id: string; name: string; code: string }>)
  }, [projectList.data])

  const forecastData = useMemo(() => {
    if (!deliveryForecast.data) return []
    return deliveryForecast.data as Array<{
      projectId: string
      projectName: string
      velocityTasksPerWeek: number
      remainingTasks: number
      estimatedCompletionDays: number | null
      healthStatus: 'healthy' | 'at_risk' | 'critical'
    }>
  }, [deliveryForecast.data])

  const budgetData = useMemo(() => {
    if (!budgetOverview.data) return []
    return budgetOverview.data as Array<{
      projectId: string
      projectName: string
      totalHoursLogged: number
      estimatedHours: number
      budgetUsedPercent: number
      status: 'on_track' | 'at_risk' | 'over_budget'
    }>
  }, [budgetOverview.data])

  if (isPrivileged === false) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Analytics</h1>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overview.isLoading
          ? Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
          : kpis.map((kpi) => {
              const Icon = kpi.icon
              return (
                <Card key={kpi.label}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-bold text-foreground">{kpi.value}</span>
                      <DeltaBadge delta={kpi.delta} />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
      </div>

      {/* Charts 2x2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Task per Stato */}
        {tasksByStatus.isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Task per Stato</CardTitle>
            </CardHeader>
            <CardContent>
              {tasksByStatus.isError ? (
                <ChartError />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Ore per Progetto */}
        {hoursByProject.isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ore per Progetto</CardTitle>
            </CardHeader>
            <CardContent>
              {hoursByProject.isError ? (
                <ChartError />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="ore" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Trend Completamento */}
        {completionTrend.isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trend Completamento</CardTitle>
            </CardHeader>
            <CardContent>
              {completionTrend.isError ? (
                <ChartError />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="data" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="completati"
                      stroke={CHART_COLORS.secondary}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Top Contributori */}
        {topContributors.isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Contributori</CardTitle>
            </CardHeader>
            <CardContent>
              {topContributors.isError ? (
                <ChartError />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={contributorsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="task" fill={CHART_COLORS.purple} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Burndown Chart with Project Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="h-4 w-4 text-muted-foreground" />
              Burndown per Progetto
            </CardTitle>
            <Select
              value={selectedProjectId ?? "__none__"}
              onValueChange={(val) => setSelectedProjectId(val === "__none__" ? null : val)}
            >
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="Seleziona progetto..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Tutti i progetti</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <BurndownChart
            data={burndown.data}
            isLoading={burndown.isLoading && !!selectedProjectId}
            isError={burndown.isError}
          />
        </CardContent>
      </Card>

      {/* Delivery Forecast */}
      {deliveryForecast.isLoading ? (
        <ChartSkeleton />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Previsione Consegne</CardTitle>
          </CardHeader>
          <CardContent>
            {deliveryForecast.isError ? (
              <ChartError message="Errore nel caricamento previsioni" />
            ) : forecastData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nessun progetto attivo con dati sufficienti
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Progetto</TableHead>
                    <TableHead className="text-right">Velocità</TableHead>
                    <TableHead className="text-right">Rimanenti</TableHead>
                    <TableHead className="text-right">Stima (gg)</TableHead>
                    <TableHead className="text-right">Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecastData.map((row) => (
                    <TableRow key={row.projectId}>
                      <TableCell className="font-medium">{row.projectName}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.velocityTasksPerWeek.toFixed(1)} task/sett
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.remainingTasks}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.estimatedCompletionDays !== null ? `${row.estimatedCompletionDays} gg` : '\u2014'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          className={cn(
                            row.healthStatus === 'healthy' && 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                            row.healthStatus === 'at_risk' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
                            row.healthStatus === 'critical' && 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                          )}
                        >
                          {row.healthStatus === 'healthy' ? 'In linea' : row.healthStatus === 'at_risk' ? 'A rischio' : 'Critico'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Budget Overview */}
      {budgetOverview.isLoading ? (
        <ChartSkeleton />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Budget Ore per Progetto</CardTitle>
          </CardHeader>
          <CardContent>
            {budgetOverview.isError ? (
              <ChartError message="Errore nel caricamento budget" />
            ) : budgetData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nessun progetto con budget ore configurato
              </p>
            ) : (
              <div className="space-y-4">
                {budgetData.map((row) => (
                  <div key={row.projectId} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{row.projectName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {row.totalHoursLogged}h / {row.estimatedHours}h
                        </span>
                        <Badge
                          className={cn(
                            'text-xs',
                            row.status === 'on_track' && 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                            row.status === 'at_risk' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
                            row.status === 'over_budget' && 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                          )}
                        >
                          {row.status === 'on_track' ? 'In budget' : row.status === 'at_risk' ? 'Attenzione' : 'Sforato'}
                        </Badge>
                      </div>
                    </div>
                    <ProgressBar
                      value={row.budgetUsedPercent}
                      gradient={getDomainGradient(
                        row.status === 'over_budget' ? 'risk' : 'project'
                      )}
                      size="standard"
                      showLabel
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
