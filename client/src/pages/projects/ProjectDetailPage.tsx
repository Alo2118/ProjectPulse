import { useMemo } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import { Edit, ExternalLink, AlertTriangle, XCircle } from "lucide-react"
import { toast } from "sonner"
import { EntityDetail } from "@/components/common/EntityDetail"
import { StatusBadge } from "@/components/common/StatusBadge"
import { DeadlineCell } from "@/components/common/DeadlineCell"
import { ProjectTreeSidebar } from "@/components/common/ProjectTreeSidebar"
import { RelatedEntitiesSidebar } from "@/components/common/RelatedEntitiesSidebar"
import { SidebarActionSuggestion } from "@/components/common/SidebarActionSuggestion"
import type { SidebarSuggestion } from "@/components/common/SidebarActionSuggestion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  useProjectQuery,
  useProjectStatsQuery,
  useChangeProjectStatus,
  useDeleteProject,
  useProjectPhasesQuery,
  useAdvancePhase,
} from "@/hooks/api/useProjects"
import { useTaskListQuery } from "@/hooks/api/useTasks"
import { useRisksByProjectQuery } from "@/hooks/api/useRisks"
import { useDocumentsByProjectQuery } from "@/hooks/api/useDocuments"
import { useProjectMembersQuery } from "@/hooks/api/useProjectMembers"
import { useThemeConfig } from "@/hooks/ui/useThemeConfig"
import { usePrivilegedRole } from "@/hooks/ui/usePrivilegedRole"
import {
  PROJECT_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  TASK_TYPE_COLORS,
  RISK_STATUS_LABELS,
  RISK_CATEGORY_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  PROJECT_ROLE_LABELS,
  STATUS_COLORS,
} from "@/lib/constants"
import { cn, formatDate, getUserInitials, getAvatarColor } from "@/lib/utils"
import { ProgressRing } from "@/components/common/ProgressRing"
import { ProjectPhasesStepper } from "@/components/common/WorkflowStepper"

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
}

interface TaskNode extends TaskRow {
  children: TaskNode[]
}

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

interface RiskRow {
  id: string
  code: string
  title: string
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

function TabSkeleton() {
  return (
    <div className="space-y-3 pt-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

const TASK_LIMIT = 50

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  useSetPageContext({ domain: 'project', entityId: id })
  const navigate = useNavigate()
  const { icons, emojis } = useThemeConfig()

  const { data: project, isLoading, error } = useProjectQuery(id!)
  const { data: stats } = useProjectStatsQuery(id!)
  const { data: phasesData } = useProjectPhasesQuery(id!)
  const changeStatus = useChangeProjectStatus()
  const advancePhase = useAdvancePhase()
  const deleteProject = useDeleteProject()
  const { isPrivileged: canManageProject } = usePrivilegedRole()

  // Tab data
  const { data: tasksData, isLoading: tasksLoading } = useTaskListQuery({
    projectId: id!,
    includeSubtasks: true,
    limit: TASK_LIMIT,
  })
  const { data: risksData, isLoading: risksLoading } =
    useRisksByProjectQuery(id!)
  const { data: docsData, isLoading: docsLoading } =
    useDocumentsByProjectQuery(id!)
  const { data: membersData, isLoading: membersLoading } =
    useProjectMembersQuery(id!)

  const p = project as ProjectData | undefined
  const s = stats as ProjectStats | undefined

  const tasks = ((tasksData as Record<string, unknown>)?.data ?? []) as TaskRow[]
  const risks = (risksData ?? []) as RiskRow[]
  const docs = (docsData ?? []) as DocumentRow[]
  const members = (membersData ?? []) as MemberRow[]

  const totalTaskCount = s?.totalTasks ?? tasks.length
  const tasksTruncated = totalTaskCount > TASK_LIMIT

  // Domain icons from theme
  const TaskIcon = icons.task
  const MilestoneIcon = icons.milestone
  const SubtaskIcon = icons.subtask
  const RiskIcon = icons.risk
  const DocIcon = icons.document

  // Task type → icon mapping
  const taskTypeIcon: Record<string, typeof TaskIcon> = {
    milestone: MilestoneIcon,
    task: TaskIcon,
    subtask: SubtaskIcon,
  }

  // ---- Sidebar: related entities ----
  const relatedItems = useMemo(() => {
    if (!p) return []
    const blockedCount = tasks.filter((t) => t.status === "blocked").length
    const inProgressCount = tasks.filter((t) => t.status === "in_progress").length
    return [
      {
        icon: TaskIcon,
        label: "Task",
        total: totalTaskCount,
        domain: "task",
        breakdowns: [
          ...(inProgressCount > 0
            ? [
                {
                  label: "in corso",
                  count: inProgressCount,
                  href: `/tasks?projectId=${id}&status=in_progress`,
                  variant: "default" as const,
                },
              ]
            : []),
          ...(blockedCount > 0
            ? [
                {
                  label: "bloccati",
                  count: blockedCount,
                  href: `/tasks?projectId=${id}&status=blocked`,
                  variant: "destructive" as const,
                },
              ]
            : []),
        ],
      },
      {
        icon: RiskIcon,
        label: "Rischi",
        total: risks.length,
        domain: "risk",
      },
      {
        icon: DocIcon,
        label: "Documenti",
        total: docs.length,
        domain: "document",
      },
    ]
  }, [p, s, tasks, risks, docs, id, TaskIcon, RiskIcon, DocIcon, totalTaskCount])

  // ---- Sidebar: suggestions ----
  const projectSuggestions = useMemo((): SidebarSuggestion[] => {
    if (!p) return []
    const blockedCount = tasks.filter((t) => t.status === "blocked").length
    const completionPctVal = s?.completionPercentage ?? 0

    if (blockedCount > 0) {
      return [
        {
          icon: emojis.blocked,
          message: `${blockedCount} task bloccati in questo progetto`,
          actionLabel: "Vedi bloccati →",
          actionHref: `/tasks?projectId=${id}&status=blocked`,
        },
      ]
    }
    if (completionPctVal >= 100) {
      return [
        {
          icon: emojis.completed,
          message: "Tutti i task completati",
          actionLabel: "Chiudi progetto →",
          actionHref: `/projects/${id}/edit`,
        },
      ]
    }
    if (p.targetEndDate) {
      const daysLeft = Math.ceil(
        (new Date(p.targetEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      if (daysLeft >= 0 && daysLeft <= 7 && completionPctVal < 50) {
        return [
          {
            icon: emojis.warning,
            message: `Scadenza tra ${daysLeft}gg ma solo ${Math.round(completionPctVal)}% completato`,
            actionLabel: "Vedi task →",
            actionHref: `/tasks?projectId=${id}`,
          },
        ]
      }
    }
    return []
  }, [p, s, tasks, id, emojis])

  const handleStatusChange = (status: string) => {
    changeStatus.mutate(
      { id: id!, status },
      {
        onSuccess: () => toast.success("Condizione aggiornata"),
        onError: () => toast.error("Errore nell'aggiornamento"),
      }
    )
  }

  const handleAdvancePhase = (targetPhaseKey: string) => {
    advancePhase.mutate(
      { id: id!, targetPhaseKey },
      {
        onSuccess: () => toast.success("Fase avanzata"),
        onError: (err: Error) =>
          toast.error(err.message || "Errore nell'avanzamento fase"),
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

  const completionPct = s?.completionPercentage ?? 0

  // ---- Tab: Tasks ----
  const taskTree = buildTaskTree(tasks)

  function renderTaskNode(node: TaskNode, depth: number) {
    const TypeIcon = taskTypeIcon[node.taskType] ?? TaskIcon
    return (
      <div key={node.id}>
        <Link
          to={`/tasks/${node.id}`}
          className={cn(
            "flex items-center justify-between py-2.5 hover:bg-muted/50 transition-colors border-b last:border-b-0 group",
            depth > 0 && "border-l-2 border-muted ml-4"
          )}
          style={{ paddingLeft: `${depth > 0 ? 12 : 16}px`, paddingRight: 16 }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <TypeIcon className={cn(
              "h-3.5 w-3.5 shrink-0",
              node.taskType === "milestone" ? "text-purple-500" : "text-muted-foreground"
            )} />
            <span
              className={cn(
                "text-sm truncate",
                node.taskType === "milestone"
                  ? "font-semibold"
                  : "font-medium"
              )}
            >
              {node.title}
            </span>
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] px-1.5 py-0 shrink-0",
                TASK_TYPE_COLORS[node.taskType]
              )}
            >
              {TASK_TYPE_LABELS[node.taskType] ?? node.taskType}
            </Badge>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <StatusBadge status={node.status} labels={TASK_STATUS_LABELS} />
            {node.dueDate && (
              <DeadlineCell dueDate={node.dueDate} status={node.status} />
            )}
            {node.assignee && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {node.assignee.firstName} {node.assignee.lastName}
              </span>
            )}
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>
        {node.children.length > 0 &&
          node.children.map((child) => renderTaskNode(child, depth + 1))}
      </div>
    )
  }

  const tasksTab = tasksLoading ? (
    <TabSkeleton />
  ) : tasks.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm text-muted-foreground mb-3">Nessun task associato</p>
      <Button size="sm" asChild>
        <Link to={`/tasks/new?projectId=${id}`}>Crea Task</Link>
      </Button>
    </div>
  ) : (
    <div className="space-y-2 mt-4">
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
      <Card>
        <CardContent className="p-0">
          {taskTree.map((node) => renderTaskNode(node, 0))}
        </CardContent>
      </Card>
    </div>
  )

  // ---- Tab: Risks ----
  const risksTab = risksLoading ? (
    <TabSkeleton />
  ) : risks.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm text-muted-foreground mb-3">
        Nessun rischio associato
      </p>
      <Button size="sm" asChild>
        <Link to={`/risks/new?projectId=${id}`}>Crea Rischio</Link>
      </Button>
    </div>
  ) : (
    <Card className="mt-4">
      <CardContent className="p-0">
        <div className="divide-y">
          {risks.map((r) => (
            <Link
              key={r.id}
              to={`/risks/${r.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <RiskIcon className="h-4 w-4 text-destructive/70 shrink-0" />
                <span className="text-sm font-medium truncate">
                  {r.title}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {RISK_CATEGORY_LABELS[r.category] ?? r.category}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <StatusBadge
                  status={r.status}
                  labels={RISK_STATUS_LABELS}
                />
                <Badge variant="outline" className="text-[10px] px-1.5">
                  P: {r.probability} / I: {r.impact}
                </Badge>
                {r.owner && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {r.owner.firstName} {r.owner.lastName}
                  </span>
                )}
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  // ---- Tab: Documents ----
  const documentsTab = docsLoading ? (
    <TabSkeleton />
  ) : docs.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm text-muted-foreground mb-3">
        Nessun documento associato
      </p>
      <Button size="sm" asChild>
        <Link to={`/documents/new?projectId=${id}`}>Carica Documento</Link>
      </Button>
    </div>
  ) : (
    <Card className="mt-4">
      <CardContent className="p-0">
        <div className="divide-y">
          {docs.map((d) => (
            <Link
              key={d.id}
              to={`/documents/${d.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <DocIcon className="h-4 w-4 text-purple-500/70 shrink-0" />
                <span className="text-sm font-medium truncate">
                  {d.title}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {DOCUMENT_TYPE_LABELS[d.type] ?? d.type}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <StatusBadge
                  status={d.status}
                  labels={DOCUMENT_STATUS_LABELS}
                />
                <Badge variant="outline" className="text-[10px] px-1.5">
                  v{d.version}
                </Badge>
                {d.createdBy && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {d.createdBy.firstName} {d.createdBy.lastName}
                  </span>
                )}
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  // ---- Tab: Members ----
  const membersTab = membersLoading ? (
    <TabSkeleton />
  ) : members.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm text-muted-foreground">
        Nessun membro assegnato
      </p>
    </div>
  ) : (
    <Card className="mt-4">
      <CardContent className="p-0">
        <div className="divide-y">
          {members.map((m) => {
            const fullName = `${m.user.firstName} ${m.user.lastName}`
            return (
              <div
                key={m.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-8 w-8 text-xs">
                    <AvatarFallback className={cn(getAvatarColor(fullName), "text-white")}>
                      {getUserInitials(m.user.firstName, m.user.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {m.user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <Badge variant="secondary" className="text-[10px] px-1.5">
                    {PROJECT_ROLE_LABELS[m.projectRole] ?? m.projectRole}
                  </Badge>
                  {!m.user.isActive && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 text-muted-foreground"
                    >
                      Disattivato
                    </Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )

  // ---- Sidebar ----
  const sidebar = p ? (
    <div className="space-y-4">
      {/* Related entities + suggestion combined */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Riepilogo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <RelatedEntitiesSidebar items={relatedItems} />
          {projectSuggestions.length > 0 && (
            <>
              <Separator />
              <SidebarActionSuggestion suggestions={projectSuggestions} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
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
                ? p.description.slice(0, 120) + (p.description.length > 120 ? "..." : "")
                : null,
            ]
              .filter(Boolean)
              .join(" · ")
          : undefined
      }
      badges={
        p ? (
          <>
            <StatusBadge status={p.status} labels={PROJECT_STATUS_LABELS} />
            <StatusBadge status={p.priority} labels={TASK_PRIORITY_LABELS} />
          </>
        ) : undefined
      }
      headerActions={
        p ? (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/projects/${id}/edit`}>
              <Edit className="h-4 w-4 mr-1" />
              Modifica
            </Link>
          </Button>
        ) : undefined
      }
      beforeContent={
        p ? (
          <div className="space-y-2">
            {p.status === "on_hold" && (
              <div className="rounded-md border border-warning bg-warning/10 p-3 text-sm text-warning-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Progetto in pausa
              </div>
            )}
            {p.status === "cancelled" && (
              <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive-foreground flex items-center gap-2">
                <XCircle className="h-4 w-4" />
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
      }
      sidebar={sidebar}
      tabs={
        p
          ? [
              {
                key: "overview",
                label: "Panoramica",
                content: (
                  <div className="space-y-4 pt-4">
                    {/* Progress + status badges */}
                    <Card>
                      <CardContent className="p-5">
                        <div className="flex items-center gap-4 mb-4">
                          <ProgressRing value={Math.round(completionPct)} size="lg" showLabel />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {s?.completedTasks ?? tasks.filter((t) => t.status === "done").length} di {totalTaskCount} completati
                            </p>
                            <p className="text-xs text-muted-foreground">{Math.round(completionPct)}% completamento</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(TASK_STATUS_LABELS).map(([status, label]) => {
                            const count = tasks.filter((t) => t.status === status).length
                            if (count === 0) return null
                            return (
                              <Badge
                                key={status}
                                variant="secondary"
                                className={cn("text-xs px-2 py-0.5 tabular-nums", STATUS_COLORS[status])}
                              >
                                {label} {count}
                              </Badge>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Key info cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Card>
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-muted-foreground mb-0.5">Inizio</p>
                          <p className="text-sm font-medium" style={{ fontFamily: 'var(--font-data)' }}>
                            {p.startDate ? formatDate(p.startDate) : "—"}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-muted-foreground mb-0.5">Scadenza</p>
                          <p className="text-sm font-medium">
                            {p.targetEndDate ? (
                              <DeadlineCell dueDate={p.targetEndDate} status={p.status} />
                            ) : "—"}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-muted-foreground mb-0.5">Budget</p>
                          <p className="text-sm font-medium" style={{ fontFamily: 'var(--font-data)' }}>
                            {p.budgetHours != null ? `${p.budgetHours}h` : "—"}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-muted-foreground mb-0.5">Responsabile</p>
                          <p className="text-sm font-medium truncate">
                            {p.manager
                              ? `${p.manager.firstName} ${p.manager.lastName}`
                              : "—"}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Full description if long */}
                    {p.description && p.description.length > 120 && (
                      <Card>
                        <CardContent className="p-5">
                          <h3 className="text-sm font-semibold mb-2">
                            Descrizione completa
                          </h3>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {p.description}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Project tree structure */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Struttura Progetto</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ProjectTreeSidebar projectId={p.id} />
                      </CardContent>
                    </Card>
                  </div>
                ),
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
                count: s?.totalRisks,
                content: risksTab,
              },
              {
                key: "documents",
                label: "Documenti",
                count: s?.totalDocuments,
                content: documentsTab,
              },
              {
                key: "members",
                label: "Membri",
                count: members.length || undefined,
                content: membersTab,
              },
            ]
          : undefined
      }
      onDelete={handleDelete}
      deleteConfirmMessage="Sei sicuro di voler eliminare questo progetto?"
      isDeleting={deleteProject.isPending}
    />
  )
}
