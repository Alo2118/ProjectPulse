import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FolderKanban,
  CheckSquare,
  Clock,
  AlertTriangle,
  Calendar,
  Plus,
  Activity,
  Bell,
  ChevronRight,
} from 'lucide-react'
import { useSetPageContext } from '@/hooks/ui/usePageContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { PROJECT_STATUS_LABELS } from '@/lib/constants'
import type { ContextGradient } from '@/lib/constants'
import {
  useDashboardStatsQuery,
  useAttentionItemsQuery,
  useMyTasksTodayQuery,
  useRecentActivityQuery,
  type AttentionItem,
  type MyTaskToday,
} from '@/hooks/api/useDashboard'
import { useProjectListQuery } from '@/hooks/api/useProjects'
import { useNotificationListQuery, useMarkNotificationRead } from '@/hooks/api/useNotifications'
import { usePrivilegedRole } from '@/hooks/ui/usePrivilegedRole'
import { useThemeConfig } from '@/hooks/ui/useThemeConfig'
import { useNotificationUIStore } from '@/stores/notificationUiStore'

// --- Animation variants ---

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

const containerVariants = {
  animate: { transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
}

// --- Types ---

type ViewRole = 'direzione' | 'dipendente'

interface ProjectSummary {
  id: string
  name: string
  status: string
  stats?: { completionPercentage?: number; totalTasks?: number; openRisks?: number } | null
  _count?: { tasks?: number; risks?: number } | null
  targetEndDate?: string | null
}

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

// --- Attention → AlertStrip adapter ---

function attentionToAlerts(items: AttentionItem[]): AlertItem[] {
  return items.map((item) => ({
    id: item.entityId,
    severity:
      item.type === 'critical_risk' || item.type === 'blocked_task'
        ? ('critical' as const)
        : item.type === 'due_soon'
          ? ('warning' as const)
          : ('info' as const),
    title: item.title,
    subtitle: item.extra ?? undefined,
    projectName: item.projectName ?? undefined,
    time: item.dueDate
      ? new Date(item.dueDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
      : '',
  }))
}

// --- KPI builders ---

function buildDirezioneKpis(
  stats: {
    activeProjects: number
    activeProjectsDelta: number
    openTasks: number
    openTasksDelta: number
    weeklyHours: number
    weeklyHoursDelta: number
    openRisks: number
    criticalRisks: number
    budgetUsedPercent: number | null
  } | null
): KpiCard[] {
  if (!stats) return []
  return [
    {
      label: 'Progetti attivi',
      value: stats.activeProjects,
      trend:
        stats.activeProjectsDelta !== 0
          ? {
              value: `${stats.activeProjectsDelta > 0 ? '+' : ''}${stats.activeProjectsDelta}`,
              direction: stats.activeProjectsDelta > 0 ? 'up' : 'down',
            }
          : undefined,
      color: 'project' as ContextGradient,
      icon: FolderKanban,
    },
    {
      label: 'Task aperti team',
      value: stats.openTasks,
      trend:
        stats.openTasksDelta !== 0
          ? {
              value: `${stats.openTasksDelta > 0 ? '+' : ''}${stats.openTasksDelta}`,
              direction: stats.openTasksDelta > 0 ? 'down' : 'up',
            }
          : undefined,
      color: 'task' as ContextGradient,
      icon: CheckSquare,
    },
    {
      label: 'Ore settimana team',
      value: `${formatHours(stats.weeklyHours * 60)}`,
      trend:
        stats.weeklyHoursDelta !== 0
          ? {
              value: `${stats.weeklyHoursDelta > 0 ? '+' : ''}${stats.weeklyHoursDelta}h`,
              direction: stats.weeklyHoursDelta > 0 ? 'up' : 'down',
            }
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
  stats: {
    openTasks: number
    openTasksDelta: number
    weeklyHours: number
    weeklyHoursDelta: number
    completedTasksThisWeek: number
  } | null,
  myTasks: MyTaskToday[]
): KpiCard[] {
  if (!stats) return []
  const todayCount = myTasks.length
  return [
    {
      label: 'I miei task',
      value: stats.openTasks,
      trend:
        stats.openTasksDelta !== 0
          ? {
              value: `${stats.openTasksDelta > 0 ? '+' : ''}${stats.openTasksDelta}`,
              direction: stats.openTasksDelta > 0 ? 'down' : 'up',
            }
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

// --- Section: My Tasks Today ---

function MyTasksSection({ myTasks, isLoading }: { myTasks: MyTaskToday[]; isLoading: boolean }) {
  const navigate = useNavigate()

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
            I miei task oggi
          </h3>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
            {myTasks.length}
          </Badge>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : myTasks.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-8 text-center">
            <CheckSquare className="h-7 w-7 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">Nessun task per oggi</p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="space-y-1"
          >
            {myTasks.slice(0, 20).map((task) => (
              <motion.div
                key={task.id}
                variants={itemVariants}
                transition={{ duration: 0.15 }}
                className="row-accent group flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 hover:bg-accent/50"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <StatusDot status={task.status} size="md" className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{task.title}</p>
                  {task.project && (
                    <p className="truncate text-[10px] text-muted-foreground">{task.project.name}</p>
                  )}
                </div>
                {task.dueDate && (
                  <DeadlineCell dueDate={task.dueDate} status={task.status} />
                )}
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </motion.div>
            ))}
          </motion.div>
        )}

        <div className="mt-3 border-t border-border pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full gap-1.5 text-xs text-muted-foreground"
            onClick={() => navigate('/tasks?scope=mine')}
          >
            Vedi tutti i miei task
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Section: Deadlines (next 7 days) ---

function DeadlinesSection() {
  const navigate = useNavigate()
  const { data, isLoading } = useMyTasksTodayQuery(7)
  const tasks = (data ?? []) as MyTaskToday[]

  // Group tasks by relative day label
  const grouped = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    const groups: Record<string, MyTaskToday[]> = {}

    for (const task of tasks) {
      if (!task.dueDate) {
        const key = 'Senza scadenza'
        groups[key] = groups[key] ?? []
        groups[key].push(task)
        continue
      }
      const d = new Date(task.dueDate)
      d.setHours(0, 0, 0, 0)
      let label: string
      if (d.getTime() < today.getTime()) {
        label = 'Scaduti'
      } else if (d.getTime() === today.getTime()) {
        label = 'Oggi'
      } else if (d.getTime() === tomorrow.getTime()) {
        label = 'Domani'
      } else {
        label = d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
      }
      groups[label] = groups[label] ?? []
      groups[label].push(task)
    }

    // Sort keys: Scaduti first, then Oggi, Domani, rest
    const order = ['Scaduti', 'Oggi', 'Domani']
    const sortedKeys = [
      ...order.filter((k) => k in groups),
      ...Object.keys(groups).filter((k) => !order.includes(k) && k !== 'Senza scadenza'),
      ...('Senza scadenza' in groups ? ['Senza scadenza'] : []),
    ]

    return sortedKeys.map((key) => ({ label: key, tasks: groups[key] }))
  }, [tasks])

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Scadenze — prossimi 7 giorni
          </h3>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-8 text-center">
            <Calendar className="h-7 w-7 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">Nessuna scadenza nei prossimi 7 giorni</p>
          </div>
        ) : (
          <div className="space-y-3">
            {grouped.map(({ label, tasks: groupTasks }) => (
              <div key={label}>
                <div
                  className={cn(
                    'mb-1 text-[10px] font-bold uppercase tracking-wider',
                    label === 'Scaduti'
                      ? 'text-red-500'
                      : label === 'Oggi'
                        ? 'text-orange-500'
                        : 'text-muted-foreground'
                  )}
                >
                  {label}
                </div>
                <div className="space-y-1">
                  {groupTasks.map((task) => (
                    <div
                      key={task.id}
                      className="group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50"
                      onClick={() => navigate(`/tasks/${task.id}`)}
                    >
                      <StatusDot status={task.status} size="sm" className="shrink-0" />
                      <span className="min-w-0 flex-1 truncate text-xs">{task.title}</span>
                      {task.project && (
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {task.project.name}
                        </span>
                      )}
                      {task.dueDate && (
                        <DeadlineCell dueDate={task.dueDate} status={task.status} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Section: Projects Overview ---

function ProjectsOverviewSection() {
  const navigate = useNavigate()
  const { effects } = useThemeConfig()
  const { data, isLoading } = useProjectListQuery({
    status: 'active',
    limit: '6',
    sortBy: 'sortOrder',
    sortOrder: 'asc',
    page: '1',
  })
  const projects = (data?.data ?? []) as ProjectSummary[]

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
            Progetti attivi
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 text-[11px] text-muted-foreground"
            onClick={() => navigate('/projects')}
          >
            Tutti
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-3">
                <Skeleton className="mb-2 h-3.5 w-3/4" />
                <Skeleton className="mb-2 h-2.5 w-1/2" />
                <Skeleton className="h-1.5 w-full" />
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-8 text-center">
            <FolderKanban className="h-7 w-7 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">Nessun progetto attivo</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {projects.map((p, i) => {
              const pct = p.stats?.completionPercentage ?? 0
              const taskCount = p.stats?.totalTasks ?? p._count?.tasks ?? 0
              const riskCount = p.stats?.openRisks ?? p._count?.risks ?? 0
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.18 }}
                >
                  <Card
                    className={cn(
                      'relative cursor-pointer overflow-hidden p-3',
                      effects.cardHover,
                      effects.cardShadow
                    )}
                    onClick={() => navigate(`/projects/${p.id}`)}
                  >
                    <div className="mb-1 flex items-start justify-between gap-1.5">
                      <span className="text-xs font-semibold leading-snug">{p.name}</span>
                      <StatusBadge status={p.status} labels={PROJECT_STATUS_LABELS} />
                    </div>
                    <p className="mb-2 text-[10px] text-muted-foreground">
                      {taskCount} task · {riskCount} rischi
                    </p>
                    <ProgressGradient value={pct} context="project" />
                    <p className="mt-0.5 text-right text-[10px] font-bold tabular-nums">{pct}%</p>
                    {p.targetEndDate && (
                      <div className="mt-1.5 border-t border-border pt-1.5">
                        <DeadlineCell dueDate={p.targetEndDate} status={p.status} />
                      </div>
                    )}
                    <div
                      className="absolute inset-x-0 bottom-0 h-0.5"
                      style={{ background: 'var(--gradient-project)' }}
                    />
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Section: Activity Feed ---

const ENTITY_TYPE_ROUTES: Record<string, string> = {
  task: '/tasks',
  project: '/projects',
  risk: '/risks',
  document: '/documents',
  milestone: '/tasks',
}

const ACTION_DOT_COLORS: Record<string, string> = {
  created: 'bg-green-500',
  updated: 'bg-blue-500',
  deleted: 'bg-red-500',
  completed: 'bg-emerald-500',
  assigned: 'bg-purple-500',
  commented: 'bg-amber-500',
}

function ActivityFeedSection() {
  const navigate = useNavigate()
  const { data, isLoading } = useRecentActivityQuery(12)
  const items = data ?? []

  function getRoute(entityType: string, entityId: string): string {
    const base = ENTITY_TYPE_ROUTES[entityType.toLowerCase()] ?? ''
    return base ? `${base}/${entityId}` : '#'
  }

  function getDotColor(action: string): string {
    const key = action.toLowerCase().split(' ')[0]
    return ACTION_DOT_COLORS[key] ?? 'bg-primary'
  }

  function formatRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return 'adesso'
    if (mins < 60) return `${mins}m fa`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h fa`
    const days = Math.floor(hrs / 24)
    return `${days}g fa`
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="flex flex-1 items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Attività recente
          </h3>
          <div className="flex h-2 w-2 items-center justify-center">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="mt-1 h-2 w-2 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-8 text-center">
            <Activity className="h-7 w-7 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">Nessuna attività recente</p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="space-y-0"
          >
            {items.map((item) => {
              const route = getRoute(item.entityType, item.entityId)
              const isClickable = route !== '#'
              return (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    'flex items-start gap-3 border-b border-border py-2.5 last:border-0',
                    isClickable && 'cursor-pointer hover:bg-accent/30 rounded-sm -mx-1 px-1'
                  )}
                  onClick={isClickable ? () => navigate(route) : undefined}
                >
                  <div className="relative mt-1.5 shrink-0">
                    <div
                      className={cn('h-2 w-2 rounded-full', getDotColor(item.action))}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-snug">
                      <span className="font-medium">
                        {item.user.firstName} {item.user.lastName}
                      </span>{' '}
                      <span className="text-muted-foreground">{item.action.toLowerCase()}</span>
                      {item.entityName && (
                        <>
                          {' '}
                          <span className="font-medium">{item.entityName}</span>
                        </>
                      )}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">
                      {formatRelativeTime(item.createdAt)}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Section: Notifications ---

function NotificationsSection() {
  const setPanelOpen = useNotificationUIStore((s) => s.setPanelOpen)
  const { data, isLoading } = useNotificationListQuery({ limit: 5 })
  const markRead = useMarkNotificationRead()

  const notifications = (data?.data ?? []) as NotificationItem[]
  const unreadCount = notifications.filter((n) => !n.isRead).length

  function formatRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return 'adesso'
    if (mins < 60) return `${mins}m fa`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h fa`
    const days = Math.floor(hrs / 24)
    return `${days}g fa`
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Bell className="h-4 w-4 text-muted-foreground" />
            Notifiche
            {unreadCount > 0 && (
              <Badge className="h-4 min-w-[1rem] px-1 text-[10px]">{unreadCount}</Badge>
            )}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 text-[11px] text-muted-foreground"
            onClick={() => setPanelOpen(true)}
          >
            Vedi tutte
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-8 text-center">
            <Bell className="h-7 w-7 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">Nessuna notifica</p>
          </div>
        ) : (
          <div className="space-y-0">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={cn(
                  'flex items-start gap-3 border-b border-border py-2.5 last:border-0',
                  !notif.isRead && 'bg-primary/5'
                )}
              >
                {!notif.isRead && (
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                )}
                {notif.isRead && <div className="mt-1.5 h-1.5 w-1.5 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium leading-snug">{notif.title}</p>
                  {notif.message && (
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                      {notif.message}
                    </p>
                  )}
                  <p className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">
                    {formatRelativeTime(notif.createdAt)}
                  </p>
                </div>
                {!notif.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 shrink-0 px-2 text-[10px] text-muted-foreground"
                    onClick={() => markRead.mutate(notif.id)}
                  >
                    Letto
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Greeting helper ---

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buongiorno'
  if (hour < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

// --- Main Component ---

export default function HomePage() {
  useSetPageContext({ domain: 'home' })
  const navigate = useNavigate()
  const { isPrivileged, user } = usePrivilegedRole()

  const [viewRole, setViewRole] = useState<ViewRole>(() =>
    isPrivileged ? 'direzione' : 'dipendente'
  )

  // Data hooks
  const statsQuery = useDashboardStatsQuery()
  const attentionQuery = useAttentionItemsQuery(8)
  const myTasksQuery = useMyTasksTodayQuery()

  const stats = statsQuery.data ?? null
  const attention = (attentionQuery.data ?? []) as AttentionItem[]
  const myTasks = (myTasksQuery.data ?? []) as MyTaskToday[]

  // KPI cards based on view role
  const kpiCards = useMemo(() => {
    if (viewRole === 'direzione') return buildDirezioneKpis(stats)
    return buildDipendenteKpis(stats, myTasks)
  }, [viewRole, stats, myTasks])

  // Alerts from attention items
  const alerts = useMemo(() => attentionToAlerts(attention), [attention])

  // Date / week info
  const today = new Date()
  const dateStr = today.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const weekNum = Math.ceil(
    ((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7
  )

  const greeting = getGreeting()
  const firstName = user?.firstName ?? ''

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

      {/* Header — greeting + date + week */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-page-title">
            {greeting}
            {firstName && (
              <span className="ml-1.5 text-muted-foreground">{firstName}</span>
            )}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground capitalize">
            {dateStr}
            <span className="mx-1.5 text-border">·</span>
            <span className="font-medium text-foreground/60">Settimana {weekNum}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isPrivileged && (
            <Button variant="outline" size="sm" onClick={() => navigate('/projects/new')}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Nuovo Progetto
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate('/tasks/new')}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Nuovo Task
          </Button>
        </div>
      </div>

      {/* Role switcher */}
      {isPrivileged && (
        <div className="flex items-center gap-3">
          <RoleSwitcher value={viewRole} onChange={setViewRole} />
          <span className="text-[11px] text-muted-foreground">
            Vista:{' '}
            <span className="font-semibold text-foreground/70">
              {viewRole === 'direzione' ? 'Direzione' : 'Dipendente'}
            </span>
            {viewRole === 'direzione' ? ' · dati aggregati team' : ' · i miei dati'}
          </span>
        </div>
      )}

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

      {/* Alert Strip */}
      <AlertStrip alerts={alerts} />

      {/* 2-column layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left column */}
        <div className="space-y-4 lg:col-span-7">
          <MyTasksSection myTasks={myTasks} isLoading={myTasksQuery.isLoading} />
          <DeadlinesSection />
          <ProjectsOverviewSection />
        </div>

        {/* Right column */}
        <div className="space-y-4 lg:col-span-5">
          <ActivityFeedSection />
          <NotificationsSection />
        </div>
      </div>
    </motion.div>
  )
}
