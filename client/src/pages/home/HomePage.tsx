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
  Star,
  Flag,
} from 'lucide-react'
import { useSetPageContext } from '@/hooks/ui/usePageContext'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { KpiStrip, type KpiCard } from '@/components/common/KpiStrip'
import { AlertStrip, type AlertItem } from '@/components/common/AlertStrip'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { RoleToggle } from '@/components/common/RoleToggle'
import { cn, formatHours } from '@/lib/utils'
import { DOMAIN_COLORS } from '@/lib/constants'
import type { ContextGradient } from '@/lib/constants'
import {
  useDashboardStatsQuery,
  useAttentionItemsQuery,
  useMyTasksTodayQuery,
  type AttentionItem,
  type MyTaskToday,
} from '@/hooks/api/useDashboard'
import { useProjectListQuery } from '@/hooks/api/useProjects'
import { useTaskListQuery } from '@/hooks/api/useTasks'
import { usePrivilegedRole } from '@/hooks/ui/usePrivilegedRole'
import {
  MilestoneGrid,
  ProjectGrid,
  TaskColumns,
  DomainTabs,
  CalendarPanel,
  type MilestoneCardData,
  type ProjectCardData,
  type TaskItemData,
  type DomainTab,
  type CalendarEvent,
} from '@/components/domain/dashboard'

// --- Animation variants ---

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

// --- Types ---

type ViewRole = 'direzione' | 'dipendente'

interface ProjectApiItem {
  id: string
  name: string
  status: string
  targetEndDate?: string | null
  stats?: { completionPercentage?: number; totalTasks?: number; openRisks?: number } | null
  _count?: { tasks?: number; milestones?: number } | null
}

interface TaskApiItem {
  id: string
  title: string
  name?: string
  status: string
  priority?: string
  taskType?: string
  endDate?: string | null
  dueDate?: string | null
  project?: { id: string; name: string } | null
  assignees?: Array<{ firstName: string; lastName: string }> | null
  blockedByRisk?: { id: string; code: string; title: string } | null
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
      subtitle: stats.criticalRisks > 0 ? `${stats.criticalRisks} in fase critica` : undefined,
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
      value: myTasks.length,
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

// --- Task adapter: API → TaskItemData ---

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function toTaskItem(task: TaskApiItem): TaskItemData {
  const endDate = task.endDate ?? task.dueDate ?? null
  const assignee = task.assignees?.[0]
  return {
    id: task.id,
    name: task.title ?? task.name ?? '',
    priority: task.priority ?? 'medium',
    projectName: task.project?.name ?? '',
    endDate,
    assigneeName: assignee ? `${assignee.firstName} ${assignee.lastName}` : undefined,
    status: task.status,
    isBlocked: task.status === 'blocked',
    blockReason: task.blockedByRisk?.title,
    riskId: task.blockedByRisk?.id,
    riskLabel: task.blockedByRisk?.title ?? (task.blockedByRisk?.code ? `Rischio ${task.blockedByRisk.code}` : undefined),
  }
}

// --- Milestone adapter ---

// Maps project index → gradient (cycles through domain colors)
const PROJECT_GRADIENTS = [
  DOMAIN_COLORS.project.gradient,
  DOMAIN_COLORS.milestone.gradient,
  DOMAIN_COLORS.task.gradient,
  DOMAIN_COLORS.risk.gradient,
  DOMAIN_COLORS.team.gradient,
  DOMAIN_COLORS.planning.gradient,
]

function toMilestoneCard(task: TaskApiItem, idx: number): MilestoneCardData {
  const gradient = PROJECT_GRADIENTS[idx % PROJECT_GRADIENTS.length]
  // Extract hex from first color stop of gradient
  const hex = [
    '#3b82f6', '#a855f7', '#22d3ee', '#f97316', '#22c55e', '#6366f1',
  ][idx % 6]
  return {
    id: task.id,
    name: task.title ?? task.name ?? '',
    projectName: task.project?.name ?? '',
    progress: 0, // milestones don't have direct progress in API — server can provide via stats
    endDate: task.endDate ?? task.dueDate ?? null,
    projectColor: hex,
    projectGradient: gradient,
  }
}

// --- Project adapter ---

function toProjectCard(project: ProjectApiItem, idx: number): ProjectCardData {
  const gradient = PROJECT_GRADIENTS[idx % PROJECT_GRADIENTS.length]
  const endDate = project.targetEndDate
  const days = endDate ? daysUntil(endDate) : null
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    progress: project.stats?.completionPercentage ?? 0,
    taskCount: project.stats?.totalTasks ?? project._count?.tasks ?? 0,
    milestoneCount: project._count?.milestones,
    openRisks: project.stats?.openRisks,
    daysUntilDeadline: days,
    gradient,
  }
}

// --- Calendar events adapter (from milestones with endDate) ---

function toCalendarEvents(tasks: TaskApiItem[]): CalendarEvent[] {
  return tasks
    .filter((t) => t.taskType === 'milestone' && (t.endDate ?? t.dueDate))
    .map((t, idx) => {
      const dateStr = (t.endDate ?? t.dueDate)!
      return {
        id: t.id,
        name: t.title ?? t.name ?? '',
        projectName: t.project?.name ?? '',
        date: dateStr.slice(0, 10),
        color: ['#3b82f6', '#a855f7', '#22d3ee', '#f97316', '#22c55e', '#6366f1'][idx % 6],
        daysUntil: daysUntil(dateStr),
      }
    })
}

// --- Greeting ---

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buongiorno'
  if (hour < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

// --- Domain tabs config ---

const DOMAIN_TABS: DomainTab[] = [
  { id: 'ms',   label: 'Milestone',  icon: <Star size={12} /> },
  { id: 'cal',  label: 'Calendario', icon: <Calendar size={12} /> },
  { id: 'task', label: 'Task',       icon: <CheckSquare size={12} /> },
  { id: 'proj', label: 'Progetti',   icon: <FolderKanban size={12} /> },
]

// --- Main Component ---

export default function HomePage() {
  useSetPageContext({ domain: 'home' })
  const navigate = useNavigate()
  const { isPrivileged, user } = usePrivilegedRole()

  const [viewRole, setViewRole] = useState<ViewRole>(() =>
    isPrivileged ? 'direzione' : 'dipendente'
  )
  const [activeTab, setActiveTab] = useState('ms')

  // Data hooks
  const statsQuery = useDashboardStatsQuery()
  const attentionQuery = useAttentionItemsQuery(8)
  const myTasksQuery = useMyTasksTodayQuery()
  const projectsQuery = useProjectListQuery({ status: 'active', limit: '6', page: '1' })
  const tasksQuery = useTaskListQuery({ limit: '30', page: '1', sortBy: 'endDate', sortOrder: 'asc' })
  const milestonesQuery = useTaskListQuery({ taskType: 'milestone', limit: '10', page: '1', sortBy: 'endDate', sortOrder: 'asc' })

  const stats = statsQuery.data ?? null
  const attention = (attentionQuery.data ?? []) as AttentionItem[]
  const myTasks = (myTasksQuery.data ?? []) as MyTaskToday[]
  const projectsRaw = ((projectsQuery.data as { data?: ProjectApiItem[] } | undefined)?.data ?? []) as ProjectApiItem[]
  const tasksRaw = ((tasksQuery.data as { data?: TaskApiItem[] } | undefined)?.data ?? []) as TaskApiItem[]
  const milestonesRaw = ((milestonesQuery.data as { data?: TaskApiItem[] } | undefined)?.data ?? []) as TaskApiItem[]

  // KPI cards based on view role
  const kpiCards = useMemo(() => {
    if (viewRole === 'direzione') return buildDirezioneKpis(stats)
    return buildDipendenteKpis(stats, myTasks)
  }, [viewRole, stats, myTasks])

  // Alerts from attention items
  const alerts = useMemo(() => attentionToAlerts(attention), [attention])

  // Adapted data for domain panels
  const milestoneCards = useMemo(
    () => milestonesRaw.slice(0, 5).map((t, i) => toMilestoneCard(t, i)),
    [milestonesRaw]
  )

  const projectCards = useMemo(
    () => projectsRaw.slice(0, 6).map((p, i) => toProjectCard(p, i)),
    [projectsRaw]
  )

  const urgentTasks = useMemo<TaskItemData[]>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return tasksRaw
      .filter((t) => {
        const d = t.endDate ?? t.dueDate
        if (!d) return false
        return daysUntil(d) <= 0 && t.status !== 'done' && t.taskType !== 'milestone'
      })
      .map(toTaskItem)
  }, [tasksRaw])

  const dueSoonTasks = useMemo<TaskItemData[]>(() => {
    return tasksRaw
      .filter((t) => {
        const d = t.endDate ?? t.dueDate
        if (!d) return false
        const days = daysUntil(d)
        return days > 0 && days <= 7 && t.status !== 'done' && t.taskType !== 'milestone' && t.status !== 'blocked'
      })
      .map(toTaskItem)
  }, [tasksRaw])

  const blockedTasks = useMemo<TaskItemData[]>(() => {
    return tasksRaw
      .filter((t) => t.status === 'blocked' && t.taskType !== 'milestone')
      .map(toTaskItem)
  }, [tasksRaw])

  const calendarEvents = useMemo<CalendarEvent[]>(
    () => toCalendarEvents(milestonesRaw),
    [milestonesRaw]
  )

  // Counts for tabs
  const tabsWithCounts = useMemo<DomainTab[]>(() => [
    { ...DOMAIN_TABS[0], count: milestoneCards.length },
    { ...DOMAIN_TABS[1], count: calendarEvents.length },
    { ...DOMAIN_TABS[2], count: urgentTasks.length + blockedTasks.length },
    { ...DOMAIN_TABS[3], count: projectCards.length },
  ], [milestoneCards, calendarEvents, urgentTasks, blockedTasks, projectCards])

  // Date info
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

  const greeting = getGreeting()
  const firstName = user?.firstName ?? ''

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.22 }}
      className={cn('space-y-0', 'pp-ani')}
    >
      {/* Breadcrumbs */}
      <div className="pp-ani">
        <Breadcrumbs items={[{ label: 'Workspace' }, { label: 'Dashboard' }]} />
      </div>

      {/* Page header */}
      <div
        className="pp-ani"
        style={{
          padding: '14px 0 16px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          {/* Domain badge + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 10px 3px 7px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                background: 'rgba(59,130,246,0.12)',
                color: '#60a5fa',
                border: '1px solid rgba(59,130,246,0.25)',
              }}
            >
              <Flag size={12} />
              Dashboard
            </span>
            <h1
              style={{
                fontWeight: 700,
                fontSize: '22px',
                letterSpacing: '-0.3px',
                color: 'var(--text-primary)',
                lineHeight: 1.2,
              }}
            >
              {greeting}
              {firstName && (
                <span style={{ marginLeft: '6px', color: 'var(--text-secondary)' }}>{firstName}</span>
              )}
            </h1>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Panoramica operativa —{' '}
            <strong style={{ color: 'var(--text-secondary)' }}>{dateStr}</strong>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0 }}>
          {isPrivileged && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/projects/new')}
              style={{ fontSize: '12px' }}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Nuovo Progetto
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/tasks/new')}
            style={{ fontSize: '12px' }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Nuovo Task
          </Button>
        </div>
      </div>

      {/* Role toggle + date chip */}
      <div
        className="pp-ani pp-d1"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          paddingBottom: '14px',
        }}
      >
        {isPrivileged && (
          <RoleToggle value={viewRole} onChange={setViewRole} />
        )}
        <span
          style={{
            fontSize: '10px',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '4px',
            background: 'rgba(59,130,246,0.08)',
            color: '#60a5fa',
            border: '1px solid rgba(59,130,246,0.2)',
          }}
        >
          {today.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · Sett. {weekNum}
        </span>
        <div style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>
          Vista:{' '}
          <strong style={{ color: 'var(--text-secondary)' }}>
            {viewRole === 'direzione' ? 'Direzione' : 'Dipendente'}
          </strong>
          {viewRole === 'direzione' ? ' · dati aggregati team' : ' · i miei dati'}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="pp-ani pp-d2" style={{ paddingBottom: '16px' }}>
        {statsQuery.isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-[var(--radius)]" />
            ))}
          </div>
        ) : (
          <KpiStrip cards={kpiCards} columns={5} />
        )}
      </div>

      {/* Alert Strip */}
      {alerts.length > 0 && (
        <div className="pp-ani pp-d3" style={{ marginBottom: '16px' }}>
          <AlertStrip alerts={alerts} />
        </div>
      )}

      {/* Domain Tabs */}
      <div className="pp-ani pp-d4" style={{ marginBottom: '16px' }}>
        <DomainTabs
          tabs={tabsWithCounts}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Tab panels */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
      >
        {/* Milestones panel */}
        {activeTab === 'ms' && (
          milestonesQuery.isLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[110px] rounded-[var(--radius)]" />
              ))}
            </div>
          ) : (
            <MilestoneGrid milestones={milestoneCards} />
          )
        )}

        {/* Calendar panel */}
        {activeTab === 'cal' && (
          milestonesQuery.isLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '16px' }}>
              <Skeleton className="h-[340px] rounded-[var(--radius)]" />
              <Skeleton className="h-[340px] rounded-[var(--radius)]" />
            </div>
          ) : (
            <CalendarPanel events={calendarEvents} />
          )
        )}

        {/* Task columns panel */}
        {activeTab === 'task' && (
          tasksQuery.isLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-[72px] rounded-[var(--radius-sm)]" />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <TaskColumns
              urgentTasks={urgentTasks}
              dueSoonTasks={dueSoonTasks}
              blockedTasks={blockedTasks}
            />
          )
        )}

        {/* Projects grid panel */}
        {activeTab === 'proj' && (
          projectsQuery.isLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[140px] rounded-[var(--radius)]" />
              ))}
            </div>
          ) : (
            <ProjectGrid projects={projectCards} />
          )
        )}
      </motion.div>
    </motion.div>
  )
}
