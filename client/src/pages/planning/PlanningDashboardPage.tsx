import { useState, useMemo } from "react"
import { Link, Navigate } from "react-router-dom"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import {
  Target,
  Gauge,
  TrendingUp,
  AlertTriangle,
  Plus,
  PackageOpen,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EmptyState } from "@/components/common/EmptyState"
import { usePrivilegedRole } from "@/hooks/ui/usePrivilegedRole"
import { useEstimationMetricsQuery, useTeamCapacityQuery, useBottlenecksQuery } from "@/hooks/api/usePlanning"
import { useProjectListQuery } from "@/hooks/api/useProjects"

function MetricSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-4 w-28 mb-2" />
        <Skeleton className="h-8 w-20" />
      </CardContent>
    </Card>
  )
}

export default function PlanningDashboardPage() {
  useSetPageContext({ domain: 'planning' })
  const { isPrivileged } = usePrivilegedRole()
  const [selectedProjectId, setSelectedProjectId] = useState("")

  const metrics = useEstimationMetricsQuery()
  const capacity = useTeamCapacityQuery()
  const projects = useProjectListQuery({ limit: 100 })
  const bottlenecks = useBottlenecksQuery(selectedProjectId)

  const projectList = useMemo(() => {
    const raw = projects.data
    if (!raw) return []
    const items = Array.isArray(raw) ? raw : raw.data
    return (items as Array<{ id: string; name: string }>) ?? []
  }, [projects.data])

  const capacityData = useMemo(() => {
    if (!capacity.data) return []
    return (capacity.data as Array<{ name: string; currentHours: number; targetHours: number }>).map(
      (m) => ({
        nome: m.name,
        attuali: m.currentHours ?? 0,
        target: m.targetHours ?? 0,
      })
    )
  }, [capacity.data])

  const metricCards = useMemo(() => {
    const m = metrics.data as Record<string, number> | undefined
    if (!m) return []
    return [
      {
        label: "Accuratezza Stime",
        value: `${Math.round(m.estimationAccuracy ?? 0)}%`,
        icon: Target,
      },
      {
        label: "Velocita Media",
        value: `${(m.averageVelocity ?? 0).toFixed(1)} task/sett`,
        icon: Gauge,
      },
      {
        label: "Tasso Completamento",
        value: `${Math.round(m.completionRate ?? 0)}%`,
        icon: TrendingUp,
      },
    ]
  }, [metrics.data])

  const bottleneckItems = useMemo(() => {
    if (!bottlenecks.data) return []
    return bottlenecks.data as Array<{ id?: string; message: string; severity?: string }>
  }, [bottlenecks.data])

  if (isPrivileged === false) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Pianificazione</h1>
        <Button asChild>
          <Link to="/planning/wizard">
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Piano
          </Link>
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.isLoading
          ? Array.from({ length: 3 }).map((_, i) => <MetricSkeleton key={i} />)
          : metricCards.map((mc) => {
              const Icon = mc.icon
              return (
                <Card key={mc.label}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-muted-foreground">{mc.label}</p>
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold text-foreground mt-2">{mc.value}</p>
                  </CardContent>
                </Card>
              )
            })}
      </div>

      {/* Team Capacity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Capacita Team</CardTitle>
        </CardHeader>
        <CardContent>
          {capacity.isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : capacityData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nessun dato disponibile
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={capacityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="nome" type="category" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="attuali" fill="hsl(var(--primary))" name="Ore Attuali" radius={[0, 4, 4, 0]} />
                <Bar dataKey="target" fill="hsl(var(--muted))" name="Ore Target" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Bottleneck Alerts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Colli di Bottiglia</CardTitle>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Seleziona progetto" />
              </SelectTrigger>
              <SelectContent>
                {projectList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedProjectId ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Seleziona un progetto per visualizzare i colli di bottiglia
            </p>
          ) : bottlenecks.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : bottleneckItems.length === 0 ? (
            <EmptyState
              icon={PackageOpen}
              title="Nessun collo di bottiglia"
              description="Il progetto non presenta criticita al momento"
            />
          ) : (
            <div className="space-y-2">
              {bottleneckItems.map((b, i) => (
                <div
                  key={b.id ?? i}
                  className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-3"
                >
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground">{b.message}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
