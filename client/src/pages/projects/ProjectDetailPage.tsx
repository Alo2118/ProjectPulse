import { useMemo } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import {
  AlertTriangle,
  Calendar,
  CheckSquare,
  Clock,
  Edit,
  ExternalLink,
  FileText,
  Signal,
  Target,
  User,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { EntityDetail } from "@/components/common/EntityDetail"
import { StatusBadge } from "@/components/common/StatusBadge"
import { MetaRow } from "@/components/common/MetaRow"
import { ProjectTreeSidebar } from "@/components/common/ProjectTreeSidebar"
import { RelatedEntitiesSidebar } from "@/components/common/RelatedEntitiesSidebar"
import { SidebarActionSuggestion } from "@/components/common/SidebarActionSuggestion"
import type { SidebarSuggestion } from "@/components/common/SidebarActionSuggestion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useProjectQuery,
  useProjectStatsQuery,
  useChangeProjectStatus,
  useDeleteProject,
} from "@/hooks/api/useProjects"
import { useTaskListQuery } from "@/hooks/api/useTasks"
import { useRisksByProjectQuery } from "@/hooks/api/useRisks"
import { useDocumentsByProjectQuery } from "@/hooks/api/useDocuments"
import { useProjectMembersQuery } from "@/hooks/api/useProjectMembers"
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
  STATUS_COLORS_HSL,
} from "@/lib/constants"
import { formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { ProgressSummary } from "@/components/common/ProgressSummary"
import { WorkflowStepper } from "@/components/common/WorkflowStepper"
import { projectWorkflow } from "@/lib/workflows/projectWorkflow"
import type { ValidationData } from "@/lib/workflow-engine"

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

interface ProjectWorkflowStepperWrapperProps {
  project: ProjectData
  stats?: ProjectStats
  tasks: TaskRow[]
  members: MemberRow[]
  docs: DocumentRow[]
  onAdvance: (status: string) => void
}

function ProjectWorkflowStepperWrapper({
  project,
  stats,
  tasks,
  members,
  docs,
  onAdvance,
}: ProjectWorkflowStepperWrapperProps) {
  const validationData: ValidationData = {
    milestoneCount: tasks.filter((t) => t.taskType === "milestone").length,
    teamSize: members.length,
    hasDescription: !!(project.description && project.description.trim().length > 0),
    completionPercent: stats?.completionPercentage ?? 0,
    blockedTaskCount: tasks.filter((t) => t.status === "blocked").length,
    completedTaskCount: stats?.completedTasks ?? 0,
    taskCount: stats?.totalTasks ?? 0,
    attachmentCount: docs.length,
    hoursLogged: 0,
  }

  // Determine the current project workflow phase key
  const workflowPhaseKey = project.status

  // Only render for workflow phases (not maintenance/completed/on_hold/cancelled)
  const workflowPhaseKeys = projectWorkflow.phases.map((p) => p.key)
  if (!workflowPhaseKeys.includes(workflowPhaseKey)) return null

  return (
    <WorkflowStepper
      workflow={projectWorkflow}
      currentPhase={workflowPhaseKey}
      validationData={validationData}
      onAdvance={onAdvance}
      canAdvancePhase={true}
    />
  )
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

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date()
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  useSetPageContext({ domain: 'project', entityId: id })
  const navigate = useNavigate()

  const { data: project, isLoading, error } = useProjectQuery(id!)
  const { data: stats } = useProjectStatsQuery(id!)
  const changeStatus = useChangeProjectStatus()
  const deleteProject = useDeleteProject()

  // Tab data
  const { data: tasksData, isLoading: tasksLoading } = useTaskListQuery({
    projectId: id!,
    includeSubtasks: true,
    limit: 50,
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

  // ---- Sidebar: related entities ----
  const relatedItems = useMemo(() => {
    if (!p) return []
    const blockedCount = tasks.filter((t) => t.status === "blocked").length
    const inProgressCount = tasks.filter((t) => t.status === "in_progress").length
    return [
      {
        icon: CheckSquare,
        label: "Task",
        total: s?.totalTasks ?? tasks.length,
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
        icon: AlertTriangle,
        label: "Rischi",
        total: risks.length,
        domain: "risk",
      },
      {
        icon: FileText,
        label: "Documenti",
        total: docs.length,
        domain: "document",
      },
    ]
  }, [p, s, tasks, risks, docs, id])

  // ---- Sidebar: suggestions ----
  const projectSuggestions = useMemo((): SidebarSuggestion[] => {
    if (!p) return []
    const blockedCount = tasks.filter((t) => t.status === "blocked").length
    const completionPctVal = s?.completionPercentage ?? 0

    if (blockedCount > 0) {
      return [
        {
          icon: "🔴",
          message: `${blockedCount} task bloccati in questo progetto`,
          actionLabel: "Vedi bloccati →",
          actionHref: `/tasks?projectId=${id}&status=blocked`,
        },
      ]
    }
    if (completionPctVal >= 100) {
      return [
        {
          icon: "✅",
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
            icon: "⏰",
            message: `Scadenza tra ${daysLeft}gg ma solo ${Math.round(completionPctVal)}% completato`,
            actionLabel: "Vedi task →",
            actionHref: `/tasks?projectId=${id}`,
          },
        ]
      }
    }
    return []
  }, [p, s, tasks, id])

  const handleStatusChange = (status: string) => {
    changeStatus.mutate(
      { id: id!, status },
      {
        onSuccess: () => toast.success("Stato aggiornato"),
        onError: () => toast.error("Errore nell'aggiornamento dello stato"),
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
    return (
      <div key={node.id}>
        <Link
          to={`/tasks/${node.id}`}
          className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors border-b last:border-b-0"
          style={{ paddingLeft: `${16 + depth * 24}px` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {depth > 0 && (
              <span className="text-muted-foreground/40 text-xs">└</span>
            )}
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
              <span
                className={cn(
                  "text-xs",
                  node.status !== "done" &&
                    node.status !== "cancelled" &&
                    isOverdue(node.dueDate) &&
                    "text-destructive font-medium"
                )}
              >
                {formatDate(node.dueDate)}
              </span>
            )}
            {node.assignee && (
              <span className="text-xs text-muted-foreground">
                {node.assignee.firstName} {node.assignee.lastName}
              </span>
            )}
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
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
    <Card className="mt-4">
      <CardContent className="p-0">
        {taskTree.map((node) => renderTaskNode(node, 0))}
      </CardContent>
    </Card>
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
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
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
                  <span className="text-xs text-muted-foreground">
                    {r.owner.firstName} {r.owner.lastName}
                  </span>
                )}
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
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
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
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
                  <span className="text-xs text-muted-foreground">
                    {d.createdBy.firstName} {d.createdBy.lastName}
                  </span>
                )}
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
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
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                  {m.user.firstName[0]}
                  {m.user.lastName[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {m.user.firstName} {m.user.lastName}
                  </p>
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
          ))}
        </div>
      </CardContent>
    </Card>
  )

  // ---- Sidebar ----
  const sidebar = p ? (
    <div className="space-y-4">
      {/* Status section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Stato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <MetaRow icon={Signal} label="Stato">
            <StatusBadge status={p.status} labels={PROJECT_STATUS_LABELS} />
          </MetaRow>
          <MetaRow icon={Target} label="Priorità">
            <StatusBadge status={p.priority} labels={TASK_PRIORITY_LABELS} />
          </MetaRow>
          <MetaRow icon={Calendar} label="Scadenza">
            {p.targetEndDate ? formatDate(p.targetEndDate) : "—"}
          </MetaRow>
          <MetaRow icon={User} label="Responsabile">
            {p.manager
              ? `${p.manager.firstName} ${p.manager.lastName}`
              : "—"}
          </MetaRow>
          <MetaRow icon={Calendar} label="Data Inizio">
            {p.startDate ? formatDate(p.startDate) : "—"}
          </MetaRow>
          <MetaRow icon={Clock} label="Budget">
            {p.budgetHours != null ? `${p.budgetHours}h` : "—"}
          </MetaRow>
          <MetaRow icon={Users} label="Membri">
            {members.length > 0 ? `${members.length}` : "—"}
          </MetaRow>
          <MetaRow icon={Calendar} label="Creato il">
            {formatDate(p.createdAt)}
          </MetaRow>
        </CardContent>
      </Card>

      {/* Project tree */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Struttura Progetto</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectTreeSidebar projectId={p.id} />
        </CardContent>
      </Card>

      {/* Related entities */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Entita Collegate</CardTitle>
        </CardHeader>
        <CardContent>
          <RelatedEntitiesSidebar items={relatedItems} />
        </CardContent>
      </Card>

      {/* Suggestion */}
      <SidebarActionSuggestion suggestions={projectSuggestions} />
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
        p?.description
          ? `${p.description.slice(0, 120)}${p.description.length > 120 ? "..." : ""}`
          : undefined
      }
      headerActions={
        p ? (
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/projects/${id}/edit`}>
                <Edit className="h-4 w-4 mr-1" />
                Modifica
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Cambia Stato
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {Object.entries(PROJECT_STATUS_LABELS)
                  .filter(([key]) => key !== p.status)
                  .map(([key, label]) => (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => handleStatusChange(key)}
                    >
                      {label}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : undefined
      }
      beforeContent={
        p ? (
          <ProjectWorkflowStepperWrapper
            project={p}
            stats={s}
            tasks={tasks}
            members={members}
            docs={docs}
            onAdvance={handleStatusChange}
          />
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
                    {/* Progress summary */}
                    <Card>
                      <CardContent className="p-5">
                        <ProgressSummary
                          progress={Math.round(completionPct)}
                          total={s?.totalTasks ?? tasks.length}
                          completed={s?.completedTasks ?? tasks.filter((t) => t.status === "done").length}
                          statusBreakdown={Object.entries(TASK_STATUS_LABELS).map(([status, label]) => ({
                            key: status,
                            label,
                            count: tasks.filter((t) => t.status === status).length,
                            color: STATUS_COLORS_HSL[status] ?? STATUS_COLORS_HSL.todo,
                          }))}
                        />
                      </CardContent>
                    </Card>

                    {/* Full description if truncated in subtitle */}
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

                    {/* Dettagli progetto */}
                    <Card>
                      <CardContent className="p-5">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-sm mb-3">Dettagli</h3>
                          <MetaRow icon={Signal} label="Stato">
                            <StatusBadge status={p.status} labels={PROJECT_STATUS_LABELS} />
                          </MetaRow>
                          <MetaRow icon={Target} label="Priorità">
                            <StatusBadge status={p.priority} labels={TASK_PRIORITY_LABELS} />
                          </MetaRow>
                          <MetaRow icon={Calendar} label="Data Inizio">
                            {p.startDate ? formatDate(p.startDate) : "—"}
                          </MetaRow>
                          <MetaRow icon={Calendar} label="Scadenza">
                            {p.targetEndDate ? formatDate(p.targetEndDate) : "—"}
                          </MetaRow>
                          <MetaRow icon={Clock} label="Budget">
                            {p.budgetHours != null ? `${p.budgetHours}h` : "—"}
                          </MetaRow>
                          <MetaRow icon={User} label="Responsabile">
                            {p.manager
                              ? `${p.manager.firstName} ${p.manager.lastName}`
                              : "—"}
                          </MetaRow>
                          <MetaRow icon={Users} label="Membri">
                            {members.length > 0 ? `${members.length}` : "—"}
                          </MetaRow>
                          <MetaRow icon={Calendar} label="Creato il">
                            {formatDate(p.createdAt)}
                          </MetaRow>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ),
              },
              {
                key: "tasks",
                label: "Task",
                count: s?.totalTasks,
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
