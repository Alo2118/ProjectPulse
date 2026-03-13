import { useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import {
  Edit,
  AlertTriangle,
  XCircle,
  ChevronRight,
  Clock,
  Plus,
  FileText,
  Upload,
  Users,
  CheckSquare,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { EntityDetail } from "@/components/common/EntityDetail"
import { StatusBadge } from "@/components/common/StatusBadge"
import { DeadlineCell } from "@/components/common/DeadlineCell"
import { ProjectPhasesStepper } from "@/components/common/WorkflowStepper"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  useProjectQuery,
  useProjectStatsQuery,
  useDeleteProject,
  useProjectPhasesQuery,
  useAdvancePhase,
} from "@/hooks/api/useProjects"
import { useTaskListQuery } from "@/hooks/api/useTasks"
import { useRisksByProjectQuery } from "@/hooks/api/useRisks"
import { useDocumentsByProjectQuery } from "@/hooks/api/useDocuments"
import { useProjectMembersQuery } from "@/hooks/api/useProjectMembers"
import { useRecentActivityQuery, type RecentActivityItem } from "@/hooks/api/useDashboard"
import { useActivityQuery } from "@/hooks/api/useActivity"
import { useSummaryQuery } from "@/hooks/api/useStats"
import { useRelatedQuery } from "@/hooks/api/useRelated"
import { TagEditor } from "@/components/common/TagEditor"
import { ActivityTab } from "@/components/common/ActivityTab"
import { useThemeConfig } from "@/hooks/ui/useThemeConfig"
import { usePrivilegedRole } from "@/hooks/ui/usePrivilegedRole"
import {
  PROJECT_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  RISK_STATUS_LABELS,
  RISK_CATEGORY_LABELS,
  RISK_LEVEL_COLORS,
  RISK_LEVEL_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  PROJECT_ROLE_LABELS,
  STATUS_COLORS,
  getRiskLevel,
} from "@/lib/constants"
import { cn, formatDate, formatRelative, getUserInitials, getAvatarColor } from "@/lib/utils"

// ---- Interfaces ----

interface ProjectData {
  id: string
  code: string
  name: string
  description?: string | null
  status: string
  priority: string
  startDate?: string | null
  targetEndDate?: string | null
  actualEndDate?: string | null
  budgetHours?: number | null
  managerId?: string | null
  manager?: { firstName: string; lastName: string } | null
  createdAt: string
  updatedAt: string
}

interface ProjectStats {
  totalTasks?: number
  completedTasks?: number
  completionPercentage?: number
  totalRisks?: number
  totalDocuments?: number
}

interface TaskRow {
  id: string
  title: string
  taskType: string
  status: string
  priority: string
  dueDate?: string | null
  parentTaskId?: string | null
  assignee?: { firstName: string; lastName: string } | null
  _count?: { subtasks?: number; children?: number }
}

interface TaskNode extends TaskRow {
  children: TaskNode[]
}

interface RiskRow {
  id: string
  code: string
  title: string
  description?: string | null
  category: string
  probability: string
  impact: string
  status: string
  owner?: { firstName: string; lastName: string } | null
}

interface DocumentRow {
  id: string
  code: string
  title: string
  type: string
  status: string
  version: number
  fileSize?: number | null
  createdBy?: { firstName: string; lastName: string } | null
  updatedAt: string
}

interface MemberRow {
  id: string
  projectRole: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
    isActive: boolean
  }
}

// ---- Helpers ----

function buildTaskTree(tasks: TaskRow[]): TaskNode[] {
  const map = new Map<string, TaskNode>()
  const roots: TaskNode[] = []

  for (const t of tasks) {
    map.set(t.id, { ...t, children: [] })
  }

  for (const t of tasks) {
    const node = map.get(t.id)!
    if (t.parentTaskId && map.has(t.parentTaskId)) {
      map.get(t.parentTaskId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

// Risk severity uses centralized getRiskLevel() from constants

const DOC_TYPE_ICON_COLOR: Record<string, string> = {
  design_input: "text-blue-500",
  design_output: "text-purple-500",
  verification_report: "text-green-500",
  validation_report: "text-teal-500",
  change_control: "text-orange-500",
}

const TASK_LIMIT = 50

// ---- Sub-components ----

function TabSkeleton() {
  return (
    <div className="space-y-3 pt-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

// KPI mini-card
function KpiCard({
  label,
  value,
  sub,
  gradient,
  children,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  gradient?: string
  children?: React.ReactNode
}) {
  return (
    <Card
      className="kpi-accent card-hover"
      style={gradient ? ({ "--kpi-gradient": gradient } as React.CSSProperties) : undefined}
    >
      <CardContent className="p-3">
        <p className="text-kpi-label mb-1.5">{label}</p>
        <p className="text-kpi-value text-foreground leading-none">{value}</p>
        {sub && <p className="text-micro text-muted-foreground mt-1.5">{sub}</p>}
        {children}
      </CardContent>
    </Card>
  )
}

// Collapsible milestone card for the Tasks tab
function MilestoneCard({
  milestone,
  isCurrentPhase,
  projectId,
}: {
  milestone: TaskNode
  isCurrentPhase: boolean
  projectId: string
}) {
  const [open, setOpen] = useState(true)
  const taskCount = milestone.children.length
  const doneCount = milestone.children.filter((c) => c.status === "done").length
  const pct = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0

  return (
    <Card
      className={cn(
        "overflow-hidden card-accent-left card-hover",
        isCurrentPhase && "ring-2 ring-primary/40"
      )}
      style={{ "--card-gradient": "var(--gradient-milestone)" } as React.CSSProperties}
    >
      {/* Milestone header */}
      <div
        className={cn(
          "flex items-center gap-3 pl-6 pr-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors",
          "border-b border-border"
        )}
        onClick={() => setOpen((v) => !v)}
        role="button"
        aria-expanded={open}
      >
        {/* Chevron */}
        <motion.div
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.15 }}
          className="shrink-0"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </motion.div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-section-title text-foreground truncate">
            {milestone.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-micro text-muted-foreground tabular-nums text-data">
              {taskCount} task
            </span>
            {milestone.dueDate && (
              <>
                <span className="text-micro text-muted-foreground">·</span>
                <DeadlineCell dueDate={milestone.dueDate} status={milestone.status} />
              </>
            )}
          </div>
        </div>

        {/* Status + progress */}
        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge status={milestone.status} labels={TASK_STATUS_LABELS} />
          <div className="w-24 hidden sm:block">
            <div className="flex items-center gap-1.5">
              <div className="flex-1 progress-shine">
                <Progress value={pct} className="h-1.5" />
              </div>
              <span className="text-micro tabular-nums text-muted-foreground w-7 text-right font-semibold">
                {pct}%
              </span>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0"
            title="Aggiungi task"
            onClick={(e) => {
              e.stopPropagation()
              window.location.href = `/tasks/new?projectId=${projectId}&parentTaskId=${milestone.id}`
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Task list */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {milestone.children.length === 0 ? (
              <div className="px-4 py-3 text-xs text-muted-foreground italic">
                Nessun task in questa milestone
              </div>
            ) : (
              <div className="divide-y divide-border">
                {milestone.children.map((task) => (
                  <TaskItem key={task.id} task={task} depth={1} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

function TaskItem({ task, depth }: { task: TaskNode; depth: number }) {
  const pl = depth === 1 ? "pl-10" : "pl-16"
  const isDone = task.status === "done"
  return (
    <>
      <Link
        to={`/tasks/${task.id}`}
        className={cn(
          "flex items-center gap-3 py-2.5 pr-4 row-accent group",
          pl
        )}
      >
        {/* Task checkbox indicator (14px rounded, filled if done) */}
        <div
          className={cn(
            "h-3.5 w-3.5 rounded-sm border shrink-0 flex items-center justify-center",
            isDone
              ? "border-green-400/60 bg-green-500/15 dark:bg-green-500/10"
              : "border-border bg-card"
          )}
        >
          {isDone && (
            <svg className="h-2.5 w-2.5 text-green-500" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="2 6 5 9 10 3" />
            </svg>
          )}
        </div>
        <span
          className={cn(
            "flex-1 text-sm truncate",
            isDone ? "line-through text-muted-foreground" : "text-foreground/90"
          )}
        >
          {task.title}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={task.status} labels={TASK_STATUS_LABELS} />
          {task.dueDate && (
            <DeadlineCell dueDate={task.dueDate} status={task.status} />
          )}
          {task.assignee && (
            <Avatar className="h-5 w-5">
              <AvatarFallback
                className={cn(
                  "text-[9px] text-white",
                  getAvatarColor(`${task.assignee.firstName} ${task.assignee.lastName}`)
                )}
              >
                {getUserInitials(task.assignee.firstName, task.assignee.lastName)}
              </AvatarFallback>
            </Avatar>
          )}
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </Link>
      {task.children.map((sub) => (
        <TaskItem key={sub.id} task={sub} depth={depth + 1} />
      ))}
    </>
  )
}

// Activity color dot — colored by action type
const ACTIVITY_DOT_COLOR: Record<string, string> = {
  created: "bg-blue-500",
  updated: "bg-primary",
  deleted: "bg-destructive",
  completed: "bg-green-500",
  assigned: "bg-purple-500",
  commented: "bg-cyan-500",
}

function getActivityDotColor(action: string): string {
  const key = Object.keys(ACTIVITY_DOT_COLOR).find((k) => action.toLowerCase().includes(k))
  return ACTIVITY_DOT_COLOR[key ?? ""] ?? "bg-muted-foreground"
}

// Activity feed item — timeline dot pattern from mockup
function ActivityRow({ item }: { item: RecentActivityItem }) {
  const name = `${item.user.firstName} ${item.user.lastName}`
  const dotColor = getActivityDotColor(item.action)
  return (
    <div className="flex items-start gap-3 py-2.5">
      {/* 8px colored timeline dot */}
      <div className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0", dotColor)} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground leading-snug">
          <span className="font-medium">{name}</span>{" "}
          <span className="text-muted-foreground">{item.action}</span>
          {item.entityName && (
            <span className="font-medium"> {item.entityName}</span>
          )}
        </p>
        <p className="text-micro text-muted-foreground mt-0.5">
          {formatRelative(item.createdAt)}
        </p>
      </div>
    </div>
  )
}

// ---- Main component ----

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  useSetPageContext({ domain: "project", entityId: id })
  const navigate = useNavigate()
  const { emojis } = useThemeConfig()

  const { data: project, isLoading, error } = useProjectQuery(id!)
  const { data: stats } = useProjectStatsQuery(id!)
  const { data: phasesData } = useProjectPhasesQuery(id!)
  const advancePhase = useAdvancePhase()
  const deleteProject = useDeleteProject()
  const { isPrivileged: canManageProject } = usePrivilegedRole()

  const { data: tasksData, isLoading: tasksLoading } = useTaskListQuery({
    projectId: id!,
    includeSubtasks: true,
    limit: TASK_LIMIT,
  })
  const { data: risksData, isLoading: risksLoading } = useRisksByProjectQuery(id!)
  const { data: docsData, isLoading: docsLoading } = useDocumentsByProjectQuery(id!)
  const { data: membersData } = useProjectMembersQuery(id!)
  const { data: activityData } = useRecentActivityQuery(8)
  const { data: projectActivity } = useActivityQuery('project', id!)
  const { data: _summaryKpis } = useSummaryQuery('project', id!)
  const { data: relatedData } = useRelatedQuery('project', id!, ['risks', 'documents', 'team'])

  const p = project as ProjectData | undefined
  const s = stats as ProjectStats | undefined

  const tasks = ((tasksData as Record<string, unknown>)?.data ?? []) as TaskRow[]
  const risks = (risksData ?? []) as RiskRow[]
  const docs = (docsData ?? []) as DocumentRow[]
  const members = (membersData ?? []) as MemberRow[]
  const activity = (activityData ?? []) as RecentActivityItem[]
  const scopedActivity = projectActivity ?? []

  const totalTaskCount = s?.totalTasks ?? tasks.length
  const completedCount = s?.completedTasks ?? tasks.filter((t) => t.status === "done").length
  const completionPct = s?.completionPercentage ?? 0
  const tasksTruncated = totalTaskCount > TASK_LIMIT

  // Days left
  const daysLeft = useMemo(() => {
    if (!p?.targetEndDate) return null
    return Math.ceil((new Date(p.targetEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  }, [p?.targetEndDate])

  // Milestone count
  const milestoneCount = useMemo(
    () => tasks.filter((t) => t.taskType === "milestone").length,
    [tasks]
  )

  // Open risk count
  const openRisksCount = useMemo(
    () => risks.filter((r) => r.status === "open").length,
    [risks]
  )
  const criticalRisksCount = useMemo(() => {
    return risks.filter((r) => {
      const level = getRiskLevel(Number(r.probability) * Number(r.impact))
      return (level === "critical" || level === "high") && r.status === "open"
    }).length
  }, [risks])

  // Advance phase handler
  const handleAdvancePhase = (targetPhaseKey: string) => {
    advancePhase.mutate(
      { id: id!, targetPhaseKey },
      {
        onSuccess: () => toast.success("Fase avanzata"),
        onError: (err: Error) => toast.error(err.message || "Errore nell'avanzamento fase"),
      }
    )
  }

  const handleDelete = () => {
    deleteProject.mutate(id!, {
      onSuccess: () => {
        toast.success("Progetto eliminato")
        navigate("/projects")
      },
      onError: () => toast.error("Errore nell'eliminazione del progetto"),
    })
  }

  // ---- KPI Row ----
  const kpiRow = p ? (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {/* Avanzamento */}
      <KpiCard
        label="Avanzamento"
        value={`${Math.round(completionPct)}%`}
        sub={`${completedCount} di ${totalTaskCount} task`}
        gradient="var(--gradient-project)"
      >
        <div className="mt-2 progress-shine">
          <Progress value={Math.round(completionPct)} className="h-1.5" />
        </div>
      </KpiCard>

      {/* Task */}
      <KpiCard
        label="Task"
        value={totalTaskCount}
        sub={`${completedCount} chiusi · ${totalTaskCount - completedCount} aperti`}
        gradient="var(--gradient-task)"
      />

      {/* Ore loggate */}
      <KpiCard
        label="Ore loggate"
        value={p.budgetHours != null ? `${p.budgetHours}h` : "—"}
        sub="budget totale"
        gradient="var(--gradient-success)"
      />

      {/* Rischi aperti */}
      <KpiCard
        label="Rischi aperti"
        value={openRisksCount}
        sub={criticalRisksCount > 0 ? `${criticalRisksCount} critici` : "nessuno critico"}
        gradient={criticalRisksCount > 0 ? "var(--gradient-danger)" : "var(--gradient-warning)"}
      />

      {/* Team */}
      <Card
        className="kpi-accent card-hover"
        style={{ "--kpi-gradient": "var(--gradient-milestone)" } as React.CSSProperties}
      >
        <CardContent className="p-3">
          <p className="text-kpi-label mb-1.5">Team</p>
          <div className="flex items-center gap-1">
            {members.slice(0, 4).map((m) => {
              const fullName = `${m.user.firstName} ${m.user.lastName}`
              return (
                <Avatar key={m.id} className="h-6 w-6 -ml-1 first:ml-0 ring-1 ring-background">
                  <AvatarFallback
                    className={cn("text-[9px] text-white", getAvatarColor(fullName))}
                  >
                    {getUserInitials(m.user.firstName, m.user.lastName)}
                  </AvatarFallback>
                </Avatar>
              )
            })}
            {members.length > 4 && (
              <span className="text-micro text-muted-foreground ml-1">+{members.length - 4}</span>
            )}
          </div>
          <p className="text-micro text-muted-foreground mt-1.5">{members.length} membri</p>
        </CardContent>
      </Card>
    </div>
  ) : undefined

  // ---- Condition banners + Phase stepper ----
  const beforeContent = p ? (
    <div className="space-y-2">
      {p.status === "on_hold" && (
        <div className="rounded-md border border-warning bg-warning/10 p-3 text-sm text-warning-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Progetto in pausa
        </div>
      )}
      {p.status === "cancelled" && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive-foreground flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0" />
          Progetto cancellato
        </div>
      )}
      {phasesData && p.status === "active" && (
        <ProjectPhasesStepper
          phasesData={phasesData}
          onAdvance={canManageProject ? handleAdvancePhase : undefined}
        />
      )}
    </div>
  ) : undefined

  // ---- Header actions ----
  const headerActions = p ? (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link to={`/time-tracking?projectId=${id}`}>
          <Clock className="h-4 w-4 mr-1" />
          Log ore
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link to={`/tasks/new?projectId=${id}`}>
          <Plus className="h-4 w-4 mr-1" />
          Aggiungi task
        </Link>
      </Button>
      {canManageProject && phasesData?.canAdvance && phasesData?.nextPhaseKey && (
        <Button
          size="sm"
          onClick={() => handleAdvancePhase(phasesData.nextPhaseKey!)}
          disabled={advancePhase.isPending}
        >
          Avanza fase
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      )}
      {canManageProject && (
        <Button variant="outline" size="sm" asChild>
          <Link to={`/projects/${id}/edit`}>
            <Edit className="h-4 w-4 mr-1" />
            Modifica
          </Link>
        </Button>
      )}
    </div>
  ) : undefined

  // ---- Task tree for tab ----
  const taskTree = useMemo(() => buildTaskTree(tasks), [tasks])
  const milestones = taskTree.filter((n) => n.taskType === "milestone")
  const rootTasks = taskTree.filter((n) => n.taskType !== "milestone")

  // ---- Tab: Panoramica ----
  const overviewTab = p ? (
    <div className="space-y-4 pt-4">
      {/* Info grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">Inizio</p>
            <p className="text-sm font-medium" style={{ fontFamily: "var(--font-data)" }}>
              {p.startDate ? formatDate(p.startDate) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">Scadenza</p>
            <div className="flex justify-center">
              {p.targetEndDate ? (
                <DeadlineCell dueDate={p.targetEndDate} status={p.status} />
              ) : (
                <span className="text-sm font-medium">—</span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">Budget</p>
            <p className="text-sm font-medium" style={{ fontFamily: "var(--font-data)" }}>
              {p.budgetHours != null ? `${p.budgetHours}h` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">Responsabile</p>
            <p className="text-sm font-medium truncate">
              {p.manager ? `${p.manager.firstName} ${p.manager.lastName}` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Progress detail */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-section-title flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-primary" />
                Avanzamento
              </p>
              <span
                className="text-lg font-bold tabular-nums"
                style={{ fontFamily: "var(--font-data)" }}
              >
                {Math.round(completionPct)}%
              </span>
            </div>
            <Progress value={Math.round(completionPct)} className="h-2 mb-3" />
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(TASK_STATUS_LABELS).map(([status, label]) => {
                const count = tasks.filter((t) => t.status === status).length
                if (count === 0) return null
                return (
                  <Badge
                    key={status}
                    variant="secondary"
                    className={cn("text-[10px] px-1.5 py-0 tabular-nums", STATUS_COLORS[status])}
                  >
                    {label} {count}
                  </Badge>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Activity feed */}
        <Card>
          <CardContent className="p-4">
            <p className="text-section-title mb-2">Attività recente</p>
            {(scopedActivity.length > 0 ? scopedActivity : activity).length === 0 ? (
              <p className="text-xs text-muted-foreground">Nessuna attività recente</p>
            ) : (
              <div className="divide-y divide-border">
                {(scopedActivity.length > 0 ? scopedActivity : activity).slice(0, 5).map((item: RecentActivityItem) => (
                  <ActivityRow key={item.id} item={item} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {p.description && (
        <Card>
          <CardContent className="p-4">
            <p className="text-section-title mb-2">Descrizione</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {p.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Team members */}
      {members.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-section-title mb-3 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-green-500" />
              Team ({members.length})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {members.map((m) => {
                const fullName = `${m.user.firstName} ${m.user.lastName}`
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 rounded-md border border-border p-2"
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback
                        className={cn("text-[10px] text-white", getAvatarColor(fullName))}
                      >
                        {getUserInitials(m.user.firstName, m.user.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{fullName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {PROJECT_ROLE_LABELS[m.projectRole] ?? m.projectRole}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  ) : null

  // ---- Tab: Tasks (milestone tree) ----
  const tasksTab = tasksLoading ? (
    <TabSkeleton />
  ) : tasks.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <CheckSquare className="h-8 w-8 text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground mb-3">Nessun task associato</p>
      <Button size="sm" asChild>
        <Link to={`/tasks/new?projectId=${id}`}>Crea Task</Link>
      </Button>
    </div>
  ) : (
    <div className="space-y-3 mt-4">
      {tasksTruncated && (
        <div className="flex items-center gap-2 rounded-md border border-warning/50 bg-warning/10 px-3 py-2">
          <span className="text-xs text-warning">
            {emojis.warning} Mostrati {TASK_LIMIT} di {totalTaskCount} task.
          </span>
          <Button variant="ghost" size="sm" className="h-6 text-xs" asChild>
            <Link to={`/tasks?projectId=${id}`}>Vedi tutti →</Link>
          </Button>
        </div>
      )}

      {/* Milestones */}
      {milestones.map((ms) => (
        <MilestoneCard
          key={ms.id}
          milestone={ms}
          isCurrentPhase={false}
          projectId={id!}
        />
      ))}

      {/* Root tasks (no milestone parent) */}
      {rootTasks.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-2 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Task senza milestone
              </p>
            </div>
            <div className="divide-y divide-border">
              {rootTasks.map((task) => (
                <TaskItem key={task.id} task={task} depth={1} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  // ---- Tab: Risks ----
  const risksTab = risksLoading ? (
    <TabSkeleton />
  ) : risks.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm text-muted-foreground mb-3">Nessun rischio associato</p>
      {canManageProject && (
        <Button size="sm" asChild>
          <Link to={`/risks/new?projectId=${id}`}>Crea Rischio</Link>
        </Button>
      )}
    </div>
  ) : (
    <div className="space-y-2 mt-4">
      {risks.map((r) => {
        const score = Number(r.probability) * Number(r.impact)
        const level = getRiskLevel(score)
        const riskGradient = level === "critical" || level === "high"
          ? "var(--gradient-danger)"
          : level === "medium"
            ? "var(--gradient-warning)"
            : undefined
        return (
          <Card
            key={r.id}
            className="card-accent-left card-hover"
            style={riskGradient ? ({ "--card-gradient": riskGradient } as React.CSSProperties) : undefined}
          >
            <CardContent className="pl-6 pr-4 py-4">
              <div className="flex items-start gap-4">
                {/* Score box */}
                <div
                  className={cn(
                    "h-8 w-8 rounded flex items-center justify-center shrink-0 text-xs font-bold",
                    RISK_LEVEL_COLORS[level]
                  )}
                  title={RISK_LEVEL_LABELS[level]}
                >
                  {score}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/risks/${r.id}`}
                        className="text-sm font-semibold hover:underline truncate block"
                      >
                        {r.title}
                      </Link>
                      {r.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {r.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <Badge
                          variant="secondary"
                          className={cn("text-[10px] px-1.5", RISK_LEVEL_COLORS[level])}
                        >
                          {RISK_LEVEL_LABELS[level]} · P:{r.probability} I:{r.impact}
                        </Badge>
                        <StatusBadge status={r.status} labels={RISK_STATUS_LABELS} />
                        <Badge variant="secondary" className="text-[10px] px-1.5">
                          {RISK_CATEGORY_LABELS[r.category] ?? r.category}
                        </Badge>
                        {r.owner && (
                          <span className="text-[10px] text-muted-foreground">
                            Owner: {r.owner.firstName} {r.owner.lastName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {canManageProject && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                          <Link to={`/risks/${r.id}`}>Gestisci</Link>
                        </Button>
                        {r.status === "open" && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs">
                            Chiudi
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )

  // ---- Tab: Documents ----
  const documentsTab = docsLoading ? (
    <TabSkeleton />
  ) : (
    <div
      className="mt-4"
      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}
    >
      {docs.map((d) => {
        const iconColor = DOC_TYPE_ICON_COLOR[d.type] ?? "text-muted-foreground"
        return (
          <Link key={d.id} to={`/documents/${d.id}`}>
            <Card className="h-full card-hover cursor-pointer group">
              <CardContent className="p-4 flex flex-col gap-2">
                <FileText className={cn("h-7 w-7", iconColor)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:underline">{d.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    v{d.version} · {formatDate(d.updatedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5"
                  >
                    {DOCUMENT_TYPE_LABELS[d.type] ?? d.type}
                  </Badge>
                  <StatusBadge status={d.status} labels={DOCUMENT_STATUS_LABELS} />
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}

      {/* Upload zone */}
      <Link to={`/documents/new?projectId=${id}`}>
        <Card className="h-full border-dashed hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="p-4 flex flex-col items-center justify-center gap-2 h-full min-h-[120px] text-center">
            <Upload className="h-6 w-6 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">Carica documento</p>
          </CardContent>
        </Card>
      </Link>
    </div>
  )

  // ---- Badges in header ----
  const headerBadges = p ? (
    <>
      <Badge
        variant="secondary"
        className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] px-1.5"
      >
        Progetto
      </Badge>
      <StatusBadge status={p.status} labels={PROJECT_STATUS_LABELS} />
      <StatusBadge status={p.priority} labels={TASK_PRIORITY_LABELS} />
      {milestoneCount > 0 && (
        <Badge variant="secondary" className="text-[10px] px-1.5">
          {milestoneCount} milestone
        </Badge>
      )}
      {p.targetEndDate && (
        <span className="text-xs text-muted-foreground">
          Scadenza: {formatDate(p.targetEndDate)}
          {daysLeft !== null && daysLeft >= 0 && (
            <span className={cn("ml-1 font-medium", daysLeft <= 14 ? "text-destructive" : "text-success")}>
              tra {daysLeft}gg
            </span>
          )}
        </span>
      )}
    </>
  ) : undefined

  return (
    <EntityDetail
      isLoading={isLoading}
      error={error ?? undefined}
      notFound={!isLoading && !error && !p}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Progetti", href: "/projects", domain: "project" },
        { label: p?.name ?? "..." },
      ]}
      title={p?.name}
      subtitle={
        p
          ? [
              p.code,
              p.description
                ? p.description.slice(0, 100) + (p.description.length > 100 ? "..." : "")
                : null,
            ]
              .filter(Boolean)
              .join(" · ")
          : undefined
      }
      colorBar="linear-gradient(180deg, #1d4ed8, #3b82f6)"
      badges={headerBadges}
      tagEditor={id ? <TagEditor entityType="project" entityId={id} className="mt-1" /> : undefined}
      headerActions={headerActions}
      kpiRow={kpiRow}
      beforeContent={beforeContent}
      tabs={
        p
          ? [
              {
                key: "overview",
                label: "Panoramica",
                content: overviewTab,
              },
              {
                key: "tasks",
                label: "Task",
                count: totalTaskCount,
                content: tasksTab,
              },
              {
                key: "risks",
                label: "Rischi",
                count: s?.totalRisks ?? risks.length,
                content: risksTab,
              },
              {
                key: "documents",
                label: "Documenti",
                count: s?.totalDocuments ?? docs.length,
                content: documentsTab,
              },
              {
                key: "activity",
                label: "Attività",
                content: (
                  <div className="mt-4">
                    <ActivityTab entityType="project" entityId={id!} />
                  </div>
                ),
              },
            ]
          : undefined
      }
      sidebar={
        relatedData ? (
          <div className="space-y-4">
            {/* Related risks */}
            {Array.isArray(relatedData.risks) && relatedData.risks.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Rischi correlati
                </p>
                <div className="space-y-1.5">
                  {(relatedData.risks as Array<{ id: string; title: string; status?: string }>).slice(0, 5).map((r) => (
                    <Link
                      key={r.id}
                      to={`/risks/${r.id}`}
                      className="flex items-center gap-2 text-xs hover:text-primary transition-colors"
                    >
                      <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                      <span className="truncate">{r.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {/* Related documents */}
            {Array.isArray(relatedData.documents) && relatedData.documents.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Documenti correlati
                </p>
                <div className="space-y-1.5">
                  {(relatedData.documents as Array<{ id: string; title: string }>).slice(0, 5).map((d) => (
                    <Link
                      key={d.id}
                      to={`/documents/${d.id}`}
                      className="flex items-center gap-2 text-xs hover:text-primary transition-colors"
                    >
                      <FileText className="h-3 w-3 text-purple-500 shrink-0" />
                      <span className="truncate">{d.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {/* Related team */}
            {Array.isArray(relatedData.team) && relatedData.team.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Team
                </p>
                <div className="space-y-1.5">
                  {(relatedData.team as Array<{ id: string; firstName?: string; lastName?: string; name?: string }>).slice(0, 5).map((u) => (
                    <div key={u.id} className="flex items-center gap-2 text-xs">
                      <Users className="h-3 w-3 text-green-500 shrink-0" />
                      <span className="truncate">{u.name ?? `${u.firstName ?? ''} ${u.lastName ?? ''}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : undefined
      }
      onDelete={canManageProject ? handleDelete : undefined}
      deleteConfirmMessage="Sei sicuro di voler eliminare questo progetto?"
      isDeleting={deleteProject.isPending}
    />
  )
}
