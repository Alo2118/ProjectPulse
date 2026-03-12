import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FolderKanban,
  CheckSquare,
  Clock,
  AlertTriangle,
  Star,
  Calendar,
  Plus,
  Play,
  Ban,
  LayoutGrid,
} from 'lucide-react'
import { useSetPageContext } from '@/hooks/ui/usePageContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { KpiStrip, type KpiCard } from '@/components/common/KpiStrip'
import { AlertStrip, type AlertItem } from '@/components/common/AlertStrip'
import { RoleSwitcher } from '@/components/common/RoleSwitcher'
import { ProgressGradient } from '@/components/common/ProgressGradient'
import { DeadlineCell } from '@/components/common/DeadlineCell'
import { StatusBadge } from '@/components/common/StatusBadge'
import { StatusDot } from '@/components/common/StatusDot'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { cn, formatHours } from '@/lib/utils'
import { PROJECT_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/lib/constants'
import type { ContextGradient } from '@/lib/constants'
import {
  useDashboardStatsQuery,
  useAttentionItemsQuery,
  useMyTasksTodayQuery,
  useRecentActivityQuery,
  type AttentionItem,
  type MyTaskToday,
  type RecentActivityItem,
} from '@/hooks/api/useDashboard'
import { useProjectListQuery } from '@/hooks/api/useProjects'
import { useTaskListQuery } from '@/hooks/api/useTasks'
import { usePrivilegedRole } from '@/hooks/ui/usePrivilegedRole'

// --- Animation variants ---

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

// --- Types ---

type ViewRole = 'direzione' | 'dipendente'

// --- Attention → AlertStrip adapter ---

function attentionToAlerts(items: AttentionItem[]): AlertItem[] {
  return items.map((item) => ({
    id: item.entityId,
    severity:
      item.type === 'critical_risk' || item.type === 'blocked_task'
        ? 'critical' as const
        : item.type === 'due_soon'
          ? 'warning' as const
          : 'info' as const,
    title: item.title,
    subtitle: item.extra ?? undefined,
    projectName: item.projectName ?? undefined,
    time: item.dueDate
      ? new Date(item.dueDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
      : '',
  }))
}

// --- KPI builders ---

function buildDirezioneKpis(stats: {
  activeProjects: number
  activeProjectsDelta: number
  openTasks: number
  openTasksDelta: number
  weeklyHours: number
  weeklyHoursDelta: number
  openRisks: number
  criticalRisks: number
  budgetUsedPercent: number | null
} | null): KpiCard[] {
  if (!stats) return []
  return [
    {
      label: 'Progetti attivi',
      value: stats.activeProjects,
      trend: stats.activeProjectsDelta !== 0
        ? { value: `${stats.activeProjectsDelta > 0 ? '+' : ''}${stats.activeProjectsDelta}`, direction: stats.activeProjectsDelta > 0 ? 'up' : 'down' }
        : undefined,
      color: 'project' as ContextGradient,
      icon: FolderKanban,
    },
    {
      label: 'Task aperti team',
      value: stats.openTasks,
      trend: stats.openTasksDelta !== 0
        ? { value: `${stats.openTasksDelta > 0 ? '+' : ''}${stats.openTasksDelta}`, direction: stats.openTasksDelta > 0 ? 'down' : 'up' }
        : undefined,
      color: 'task' as ContextGradient,
      icon: CheckSquare,
    },
    {
      label: 'Ore settimana team',
      value: `${formatHours(stats.weeklyHours * 60)}`,
      trend: stats.weeklyHoursDelta !== 0
        ? { value: `${stats.weeklyHoursDelta > 0 ? '+' : ''}${stats.weeklyHoursDelta}h`, direction: stats.weeklyHoursDelta > 0 ? 'up' : 'down' }
        : undefined,
      color: 'success' as ContextGradient,
      icon: Clock,
    },
    {
      label: 'Rischi attivi',
      value: stats.openRisks,
      subtitle: stats.criticalRisks > 0 ? `${stats.criticalRisks} critici` : undefined,
      color: 'warning' as ContextGradient,
      icon: AlertTriangle,
    },
    {
      label: 'Budget usato',
      value: stats.budgetUsedPercent != null ? `${stats.budgetUsedPercent}%` : '—',
      color: 'success' as ContextGradient,
    },
  ]
}

function buildDipendenteKpis(
  stats: { openTasks: number; openTasksDelta: number; weeklyHours: number; weeklyHoursDelta: number; completedTasksThisWeek: number } | null,
  myTasks: MyTaskToday[]
): KpiCard[] {
  if (!stats) return []
  const todayCount = myTasks.length
  return [
    {
      label: 'I miei task',
      value: stats.openTasks,
      trend: stats.openTasksDelta !== 0
        ? { value: `${stats.openTasksDelta > 0 ? '+' : ''}${stats.openTasksDelta}`, direction: stats.openTasksDelta > 0 ? 'down' : 'up' }
        : undefined,
      color: 'task' as ContextGradient,
      icon: CheckSquare,
    },
    {
      label: 'Da fare oggi',
      value: todayCount,
      color: 'warning' as ContextGradient,
      icon: Calendar,
    },
    {
      label: 'Ore questa settimana',
      value: `${formatHours(stats.weeklyHours * 60)}`,
      color: 'success' as ContextGradient,
      icon: Clock,
    },
    {
      label: 'Completati settimana',
      value: stats.completedTasksThisWeek,
      color: 'project' as ContextGradient,
      icon: CheckSquare,
    },
  ]
}

// --- Tab: Milestone ---

interface MilestoneTask {
  id: string
  title: string
  taskType: string
  status: string
  dueDate: string | null
  project?: { id: string; name: string } | null
  stats?: { completionPercentage?: number } | null
}

function MilestonePanel() {
  const navigate = useNavigate()
  const { data, isLoading } = useTaskListQuery({
    taskType: 'milestone',
    status: '',
    page: '1',
    limit: '12',
    sortBy: 'dueDate',
    sortOrder: 'asc',
  })

  const milestones = (data?.data ?? []) as MilestoneTask[]

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="mb-2 h-4 w-3/4" />
            <Skeleton className="mb-3 h-3 w-1/2" />
            <Skeleton className="h-1 w-full" />
          </Card>
        ))}
      </div>
    )
  }

  if (milestones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <Star className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Nessuna milestone attiva</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {milestones.map((ms, i) => {
        const pct = ms.stats?.completionPercentage ?? 0
        const colors: ContextGradient[] = ['project', 'warning', 'milestone', 'task', 'success', 'indigo']
        const color = colors[i % colors.length]

        return (
          <motion.div
            key={ms.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.2 }}
          >
            <Card
              className="relative cursor-pointer overflow-hidden p-4 transition-all hover:border-primary/30"
              onClick={() => navigate(`/tasks/${ms.id}`)}
            >
              {/* Left accent */}
              <div className="absolute inset-y-0 left-0 w-[3px] bg-primary" />
              <div className="pl-2">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold leading-snug">{ms.title}</span>
                  <DeadlineCell dueDate={ms.dueDate} status={ms.status} />
                </div>
                {ms.project && (
                  <p className="mb-2 text-[11px] text-muted-foreground">{ms.project.name}</p>
                )}
                <ProgressGradient value={pct} context={color} />
                <p className="mt-1 text-right text-[10px] text-muted-foreground">{pct}% completato</p>
              </div>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

// --- Tab: Task (3-column: urgenti, in scadenza, bloccati) ---

function TaskPanel() {
  const navigate = useNavigate()

  // Fetch urgent tasks (high priority, due today or overdue)
  const { data: urgentData } = useTaskListQuery({
    priority: 'high',
    status: '',
    page: '1',
    limit: '6',
    sortBy: 'dueDate',
    sortOrder: 'asc',
  })

  // Fetch blocked tasks
  const { data: blockedData } = useTaskListQuery({
    status: 'blocked',
    page: '1',
    limit: '6',
    sortBy: 'dueDate',
    sortOrder: 'asc',
  })

  // Fetch upcoming (this week)
  const { data: upcomingData } = useTaskListQuery({
    status: 'in_progress',
    page: '1',
    limit: '6',
    sortBy: 'dueDate',
    sortOrder: 'asc',
  })

  interface TaskItem {
    id: string
    title: string
    status: string
    priority: string
    dueDate: string | null
    project?: { id: string; name: string } | null
    assignee?: { firstName: string; lastName: string } | null
    blockedReason?: string | null
  }

  const urgent = (urgentData?.data ?? []) as TaskItem[]
  const upcoming = (upcomingData?.data ?? []) as TaskItem[]
  const blocked = (blockedData?.data ?? []) as TaskItem[]

  function TaskCard({ task }: { task: TaskItem }) {
    const isBlocked = task.status === 'blocked'
    return (
      <div
        className={cn(
          'flex cursor-pointer items-start gap-2 rounded-md border p-3 transition-colors hover:border-primary/20',
          isBlocked && 'border-l-[3px] border-l-red-500/40 bg-red-500/5'
        )}
        onClick={() => navigate(`/tasks/${task.id}`)}
      >
        <StatusDot status={task.status} size="md" className="mt-1 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium leading-snug">{task.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {task.project && (
              <span className="text-[10px] text-muted-foreground">{task.project.name}</span>
            )}
            {task.priority === 'high' || task.priority === 'critical' ? (
              <Badge variant="outline" className="h-4 px-1 text-[9px] border-red-500/30 text-red-500">
                {TASK_PRIORITY_LABELS[task.priority] ?? task.priority}
              </Badge>
            ) : null}
            {task.dueDate && (
              <DeadlineCell dueDate={task.dueDate} status={task.status} />
            )}
          </div>
          {isBlocked && task.blockedReason && (
            <div className="mt-1.5 rounded border border-red-500/20 bg-red-500/5 px-2 py-1">
              <p className="text-[10px] text-red-500">{task.blockedReason}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Urgenti */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <AlertTriangle className="h-3 w-3" />
          Urgenti / Oggi
          <Badge variant="outline" className="ml-auto h-4 px-1.5 text-[9px]">{urgent.length}</Badge>
        </div>
        <div className="space-y-2">
          {urgent.map((t) => <TaskCard key={t.id} task={t} />)}
          {urgent.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">Nessun task urgente</p>
          )}
        </div>
      </div>

      {/* In scadenza */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <Calendar className="h-3 w-3" />
          In scadenza — questa settimana
          <Badge variant="outline" className="ml-auto h-4 px-1.5 text-[9px]">{upcoming.length}</Badge>
        </div>
        <div className="space-y-2">
          {upcoming.map((t) => <TaskCard key={t.id} task={t} />)}
          {upcoming.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">Nessun task in scadenza</p>
          )}
        </div>
      </div>

      {/* Bloccati */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-red-500">
          <Ban className="h-3 w-3" />
          Bloccati
          <Badge variant="outline" className="ml-auto h-4 border-red-500/30 px-1.5 text-[9px] text-red-500">{blocked.length}</Badge>
        </div>
        <div className="space-y-2">
          {blocked.map((t) => <TaskCard key={t.id} task={t} />)}
          {blocked.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">Nessun task bloccato</p>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Tab: Progetti ---

interface ProjectSummary {
  id: string
  name: string
  status: string
  stats?: { completionPercentage?: number; totalTasks?: number; completedTasks?: number; openRisks?: number } | null
  _count?: { tasks?: number; risks?: number } | null
  targetEndDate?: string | null
}

function ProjectPanel() {
  const navigate = useNavigate()
  const { data, isLoading } = useProjectListQuery({
    page: '1',
    limit: '12',
    sortBy: 'sortOrder',
    sortOrder: 'asc',
    status: 'active',
  })

  const projects = (data?.data ?? []) as ProjectSummary[]

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="mb-2 h-4 w-3/4" />
            <Skeleton className="mb-3 h-3 w-1/2" />
            <Skeleton className="h-1 w-full" />
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p, i) => {
        const pct = p.stats?.completionPercentage ?? 0
        const taskCount = p.stats?.totalTasks ?? p._count?.tasks ?? 0
        const riskCount = p.stats?.openRisks ?? p._count?.risks ?? 0

        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.2 }}
          >
            <Card
              className="relative cursor-pointer overflow-hidden p-4 transition-all hover:border-primary/30"
              onClick={() => navigate(`/projects/${p.id}`)}
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <span className="text-sm font-semibold leading-snug">{p.name}</span>
                <StatusBadge status={p.status} labels={PROJECT_STATUS_LABELS} />
              </div>
              <p className="mb-3 text-[11px] text-muted-foreground">
                {taskCount} task · {riskCount} rischi
              </p>
              <ProgressGradient value={pct} context="project" />
              <p className="mt-1 text-right text-[11px] font-bold tabular-nums">{pct}%</p>
              {p.targetEndDate && (
                <div className="mt-2 border-t border-border pt-2">
                  <DeadlineCell dueDate={p.targetEndDate} status={p.status} />
                </div>
              )}
              {/* Bottom accent bar */}
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-700 to-blue-500" />
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

// --- Main Component ---

export default function HomePage() {
  useSetPageContext({ domain: 'home' })
  const navigate = useNavigate()
  const { isPrivileged } = usePrivilegedRole()

  const [viewRole, setViewRole] = useState<ViewRole>(() =>
    isPrivileged ? 'direzione' : 'dipendente'
  )

  // Data hooks
  const statsQuery = useDashboardStatsQuery()
  const attentionQuery = useAttentionItemsQuery(8)
  const myTasksQuery = useMyTasksTodayQuery()
  const activityQuery = useRecentActivityQuery(10)

  const stats = statsQuery.data ?? null
  const attention = (attentionQuery.data ?? []) as AttentionItem[]
  const myTasks = (myTasksQuery.data ?? []) as MyTaskToday[]
  const activity = (activityQuery.data ?? []) as RecentActivityItem[]

  // KPI cards based on view role
  const kpiCards = useMemo(() => {
    if (viewRole === 'direzione') return buildDirezioneKpis(stats)
    return buildDipendenteKpis(stats, myTasks)
  }, [viewRole, stats, myTasks])

  // Alerts from attention items
  const alerts = useMemo(() => attentionToAlerts(attention), [attention])

  const today = new Date()
  const dateStr = today.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const weekNum = Math.ceil(
    ((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7
  )

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: 'Workspace' }, { label: 'Dashboard' }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Badge variant="outline" className="gap-1.5 border-blue-500/25 bg-blue-500/10 text-blue-500">
              <LayoutGrid className="h-3 w-3" />
              Dashboard
            </Badge>
            <h1 className="text-xl font-bold tracking-tight">Command Center</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Panoramica operativa — <span className="font-semibold text-foreground/70">{dateStr}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigate('/tasks/new')}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Nuovo Task
          </Button>
        </div>
      </div>

      {/* Role switcher + date chip */}
      <div className="flex items-center gap-3">
        {isPrivileged && <RoleSwitcher value={viewRole} onChange={setViewRole} />}
        <Badge variant="outline" className="text-[10px] font-semibold border-primary/20 bg-primary/5 text-primary">
          {dateStr} · Sett. {weekNum}
        </Badge>
        <span className="ml-auto text-[11px] text-muted-foreground">
          Vista: <span className="font-semibold text-foreground/70">{viewRole === 'direzione' ? 'Direzione' : 'Dipendente'}</span>
          {viewRole === 'direzione' ? ' · dati aggregati team' : ' · i miei dati'}
        </span>
      </div>

      {/* KPI Strip */}
      {statsQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="mb-2 h-3 w-20" />
              <Skeleton className="h-7 w-12" />
            </Card>
          ))}
        </div>
      ) : (
        <KpiStrip cards={kpiCards} />
      )}

      {/* Alert strip */}
      <AlertStrip alerts={alerts} />

      {/* Domain tabs */}
      <Tabs defaultValue="milestone">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="milestone" className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5" />
            Milestone
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="task" className="flex items-center gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" />
            Task
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-1.5">
            <FolderKanban className="h-3.5 w-3.5" />
            Progetti
          </TabsTrigger>
        </TabsList>

        <TabsContent value="milestone">
          <MilestonePanel />
        </TabsContent>

        <TabsContent value="calendar">
          {/* Simplified calendar — My Tasks Today + Activity Feed in 2-col layout */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* My Tasks Today */}
            <Card>
              <CardContent className="p-4">
                <h3 className="mb-3 text-sm font-semibold">I Miei Task Oggi</h3>
                {myTasksQuery.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : myTasks.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">Nessun task per oggi</p>
                ) : (
                  <div className="space-y-1">
                    {myTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md p-2 transition-colors hover:bg-accent/50"
                        onClick={() => navigate(`/tasks/${task.id}`)}
                      >
                        <StatusDot status={task.status} size="md" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{task.title}</p>
                          {task.project && (
                            <p className="text-[10px] text-muted-foreground">{task.project.name}</p>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                          <Play className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <Card>
              <CardContent className="p-4">
                <h3 className="mb-3 text-sm font-semibold">Attività Recente</h3>
                {activityQuery.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-6 w-full" />
                    ))}
                  </div>
                ) : activity.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">Nessuna attività recente</p>
                ) : (
                  <div className="space-y-2">
                    {activity.slice(0, 8).map((item) => (
                      <div key={item.id} className="flex items-start gap-2 border-b border-border py-1.5 last:border-0">
                        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs">
                            <span className="font-medium">{item.user.firstName} {item.user.lastName}</span>{' '}
                            <span className="text-muted-foreground">{item.action.toLowerCase()}</span>{' '}
                            {item.entityName && (
                              <span className="font-medium">{item.entityName}</span>
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground tabular-nums">
                            {new Date(item.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="task">
          <TaskPanel />
        </TabsContent>

        <TabsContent value="projects">
          <ProjectPanel />
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
