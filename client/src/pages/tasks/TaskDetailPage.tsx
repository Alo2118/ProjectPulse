import { useMemo } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import {
  Pencil,
  Calendar,
  Clock,
  User,
  FolderKanban,
  Flag,
  Layers,
  AlertTriangle,
  ExternalLink,
  GitBranch,
  MessageSquare,
  Timer,
} from "lucide-react"
import { toast } from "sonner"
import { EntityDetail } from "@/components/common/EntityDetail"
import { StatusBadge } from "@/components/common/StatusBadge"
import { MetaRow } from "@/components/common/MetaRow"
import { ParentLink } from "@/components/common/ParentLink"
import { RelatedEntitiesSidebar } from "@/components/common/RelatedEntitiesSidebar"
import { SidebarActionSuggestion } from "@/components/common/SidebarActionSuggestion"
import type { SidebarSuggestion } from "@/components/common/SidebarActionSuggestion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  useTaskQuery,
  useChangeTaskStatus,
  useDeleteTask,
  useSubtasksQuery,
} from "@/hooks/api/useTasks"
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TASK_TYPE_LABELS, TASK_TYPE_COLORS } from "@/lib/constants"
import { formatDate, formatDateTime } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { CommentSection } from "@/components/domain/tasks/CommentSection"
import { ChecklistSection } from "@/components/domain/tasks/ChecklistSection"
import { WorkflowStepper } from "@/components/common/WorkflowStepper"
import { taskWorkflow } from "@/lib/workflows/taskWorkflow"
import type { ValidationData } from "@/lib/workflow-engine"

interface TaskData {
  id: string
  code: string
  title: string
  description?: string | null
  taskType: string
  status: string
  priority: string
  startDate?: string | null
  dueDate?: string | null
  estimatedHours?: number | null
  actualHours?: number | null
  blockedReason?: string | null
  projectId?: string | null
  assigneeId?: string | null
  parentTaskId?: string | null
  createdAt?: string | null
  project?: { id: string; name: string; code: string } | null
  assignee?: { id: string; firstName: string; lastName: string } | null
  parentTask?: { id: string; code: string; title: string; taskType: string } | null
  subtasksSummary?: { total: number; completed: number } | null
  _count?: {
    comments: number
    timeEntries: number
    subtasks: number
  }
}

interface SubtaskRow {
  id: string
  code: string
  title: string
  status: string
  priority: string
  assignee?: { firstName: string; lastName: string } | null
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  useSetPageContext({ domain: 'task', entityId: id })
  const navigate = useNavigate()

  const { data: task, isLoading, error } = useTaskQuery(id ?? "")
  const { data: subtasks } = useSubtasksQuery(id ?? "")
  const changeStatus = useChangeTaskStatus()
  const deleteTask = useDeleteTask()

  const t = task as TaskData | undefined
  const subtaskList = (subtasks ?? []) as SubtaskRow[]

  const breadcrumbs = useMemo(() => {
    const crumbs: Array<{ label: string; href?: string; domain?: string }> = [
      { label: "Home", href: "/" },
    ]
    if (t?.project) {
      crumbs.push({ label: "Progetti", href: "/projects", domain: "project" })
      crumbs.push({
        label: t.project.name,
        href: `/projects/${t.project.id}`,
      })
    } else {
      crumbs.push({ label: "Task", href: "/tasks" })
    }
    if (t?.parentTask) {
      crumbs.push({
        label: t.parentTask.title,
        href: `/tasks/${t.parentTask.id}`,
      })
    }
    crumbs.push({ label: t?.title ?? "..." })
    return crumbs
  }, [t])

  const handleStatusChange = (newStatus: string) => {
    if (!id) return
    changeStatus.mutate(
      { id, status: newStatus },
      {
        onSuccess: () => toast.success("Stato aggiornato"),
        onError: () => toast.error("Errore nell'aggiornamento dello stato"),
      }
    )
  }

  const handleDelete = () => {
    if (!id) return
    deleteTask.mutate(id, {
      onSuccess: () => {
        toast.success("Task eliminato")
        navigate("/tasks")
      },
      onError: () => toast.error("Errore nell'eliminazione"),
    })
  }

  const badges = t ? (
    <>
      <StatusBadge status={t.status} labels={TASK_STATUS_LABELS} />
      <StatusBadge status={t.priority} labels={TASK_PRIORITY_LABELS} />
      <Badge variant="secondary" className={TASK_TYPE_COLORS[t.taskType]}>
        {TASK_TYPE_LABELS[t.taskType] ?? t.taskType}
      </Badge>
    </>
  ) : null

  const headerActions = t ? (
    <>
      <Select value={t.status} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" asChild>
        <Link to={`/tasks/${id}/edit`}>
          <Pencil className="h-4 w-4 mr-1" />
          Modifica
        </Link>
      </Button>
    </>
  ) : null

  const detailsTab = t ? (
    <div className="space-y-4 pt-4">
      {/* Description */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">Descrizione</h3>
          {t.description ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {t.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Nessuna descrizione
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dettagli task */}
      <Card>
        <CardContent className="p-5">
          <div className="space-y-1">
            <h3 className="font-semibold text-sm mb-3">Dettagli</h3>
            <MetaRow icon={Layers} label="Stato">
              <StatusBadge status={t.status} labels={TASK_STATUS_LABELS} />
            </MetaRow>
            <MetaRow icon={Flag} label="Priorità">
              <StatusBadge status={t.priority} labels={TASK_PRIORITY_LABELS} />
            </MetaRow>
            <MetaRow icon={Layers} label="Tipo">
              <Badge variant="secondary" className={TASK_TYPE_COLORS[t.taskType]}>
                {TASK_TYPE_LABELS[t.taskType] ?? t.taskType}
              </Badge>
            </MetaRow>
            {t.project && (
              <MetaRow icon={FolderKanban} label="Progetto">
                <Link
                  to={`/projects/${t.project.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  {t.project.name}
                </Link>
              </MetaRow>
            )}
            <MetaRow icon={User} label="Assegnatario">
              {t.assignee
                ? `${t.assignee.firstName} ${t.assignee.lastName}`
                : "Non assegnato"}
            </MetaRow>
            <MetaRow icon={Calendar} label="Data Inizio">
              {t.startDate ? formatDate(t.startDate) : "—"}
            </MetaRow>
            <MetaRow icon={Calendar} label="Scadenza">
              <span
                className={cn(
                  t.dueDate &&
                    t.status !== "done" &&
                    t.status !== "cancelled" &&
                    new Date(t.dueDate) < new Date() &&
                    "text-destructive font-medium"
                )}
              >
                {t.dueDate ? formatDate(t.dueDate) : "—"}
              </span>
            </MetaRow>
            <MetaRow icon={Clock} label="Ore Stimate">
              {t.estimatedHours != null ? `${t.estimatedHours}h` : "—"}
            </MetaRow>
            <MetaRow icon={Clock} label="Ore Effettive">
              {t.actualHours != null ? `${t.actualHours}h` : "—"}
            </MetaRow>
            {t.createdAt && (
              <MetaRow icon={Calendar} label="Creato il">
                {formatDateTime(t.createdAt)}
              </MetaRow>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Blocked reason */}
      {t.status === "blocked" && t.blockedReason && (
        <Card className="border-destructive/50">
          <CardContent className="p-5">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-destructive mb-1">
                  Motivo del blocco
                </h3>
                <p className="text-sm text-muted-foreground">{t.blockedReason}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  ) : null

  const subtasksTab = (
    <Card>
      <CardContent className="p-5">
        {subtaskList.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nessun sottotask
          </p>
        ) : (
          <div className="divide-y">
            {subtaskList.map((sub) => (
              <Link
                key={sub.id}
                to={`/tasks/${sub.id}`}
                className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs text-muted-foreground shrink-0">
                    {sub.code}
                  </span>
                  <span className="text-sm font-medium truncate">{sub.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={sub.status} labels={TASK_STATUS_LABELS} />
                  <StatusBadge status={sub.priority} labels={TASK_PRIORITY_LABELS} />
                  {sub.assignee && (
                    <span className="text-xs text-muted-foreground">
                      {sub.assignee.firstName} {sub.assignee.lastName}
                    </span>
                  )}
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )

  const tabs = useMemo(
    () => [
      { key: "details", label: "Dettagli", content: detailsTab },
      {
        key: "subtasks",
        label: "Sottotask",
        content: subtasksTab,
        count: t?.subtasksSummary?.total ?? subtaskList.length,
      },
      {
        key: "comments",
        label: "Commenti",
        content: id ? <CommentSection taskId={id} /> : null,
      },
      {
        key: "checklist",
        label: "Checklist",
        content: id ? <ChecklistSection taskId={id} /> : null,
      },
    ],
    [detailsTab, subtasksTab, id, t, subtaskList.length]
  )

  // ---- Sidebar: related entities ----
  const taskRelatedItems = useMemo(() => {
    if (!t) return []
    return [
      {
        icon: GitBranch,
        label: "Sottotask",
        total: t._count?.subtasks ?? subtaskList.length,
        domain: "subtask",
      },
      {
        icon: MessageSquare,
        label: "Commenti",
        total: t._count?.comments ?? 0,
        domain: "task",
      },
      {
        icon: Timer,
        label: "Ore registrate",
        total: t._count?.timeEntries ?? 0,
        domain: "task",
      },
    ]
  }, [t, subtaskList.length])

  // ---- Sidebar: suggestions ----
  const taskSuggestions = useMemo((): SidebarSuggestion[] => {
    if (!t || !id) return []

    const subtaskTotal = t._count?.subtasks ?? subtaskList.length
    const subtaskDone = subtaskList.filter(
      (s) => s.status === "done" || s.status === "cancelled"
    ).length
    const allSubtasksDone = subtaskTotal > 0 && subtaskDone === subtaskTotal

    if (allSubtasksDone && t.status !== "done" && t.status !== "cancelled") {
      return [
        {
          icon: "✅",
          message: "Tutti i subtask completati — segna come completato?",
          actionLabel: "Completa task →",
          actionHref: `/tasks/${id}`,
        },
      ]
    }

    const timeEntryCount = t._count?.timeEntries ?? 0
    if (timeEntryCount === 0 && t.status !== "done" && t.status !== "cancelled") {
      return [
        {
          icon: "⏱️",
          message: "Nessuna ora registrata su questo task",
          actionLabel: "Avvia timer →",
          actionHref: `/time-tracking?taskId=${id}`,
        },
      ]
    }

    return []
  }, [t, id, subtaskList])

  // ---- Sidebar ----
  const sidebar = t ? (
    <div className="space-y-4">
      {/* Status section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Stato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <MetaRow icon={Layers} label="Stato">
            <StatusBadge status={t.status} labels={TASK_STATUS_LABELS} />
          </MetaRow>
          <MetaRow icon={Flag} label="Priorità">
            <StatusBadge status={t.priority} labels={TASK_PRIORITY_LABELS} />
          </MetaRow>
          <MetaRow icon={Layers} label="Tipo">
            <Badge variant="secondary" className={TASK_TYPE_COLORS[t.taskType]}>
              {TASK_TYPE_LABELS[t.taskType] ?? t.taskType}
            </Badge>
          </MetaRow>
          <MetaRow icon={User} label="Assegnatario">
            {t.assignee
              ? `${t.assignee.firstName} ${t.assignee.lastName}`
              : "Non assegnato"}
          </MetaRow>
          <MetaRow icon={Calendar} label="Data Inizio">
            {t.startDate ? formatDate(t.startDate) : "—"}
          </MetaRow>
          <MetaRow icon={Calendar} label="Scadenza">
            <span
              className={cn(
                t.dueDate &&
                  t.status !== "done" &&
                  t.status !== "cancelled" &&
                  new Date(t.dueDate) < new Date() &&
                  "text-destructive font-medium"
              )}
            >
              {t.dueDate ? formatDate(t.dueDate) : "—"}
            </span>
          </MetaRow>
          <MetaRow icon={Clock} label="Ore Stimate">
            {t.estimatedHours != null ? `${t.estimatedHours}h` : "—"}
          </MetaRow>
          <MetaRow icon={Clock} label="Ore Effettive">
            {t.actualHours != null ? `${t.actualHours}h` : "—"}
          </MetaRow>
        </CardContent>
      </Card>

      {/* Parent project link */}
      {t.project && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1.5">Progetto</p>
            <ParentLink
              name={t.project.name}
              href={`/projects/${t.project.id}`}
              domain="project"
              className="text-sm font-medium"
            />
          </CardContent>
        </Card>
      )}

      {/* Related entities */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Dettagli</CardTitle>
        </CardHeader>
        <CardContent>
          <RelatedEntitiesSidebar items={taskRelatedItems} />
        </CardContent>
      </Card>

      {/* Suggestion */}
      <SidebarActionSuggestion suggestions={taskSuggestions} />
    </div>
  ) : undefined

  return (
    <EntityDetail
      isLoading={isLoading}
      error={error ?? undefined}
      notFound={!isLoading && !error && !t}
      breadcrumbs={breadcrumbs}
      title={t?.title}
      subtitle={t?.code}
      badges={badges}
      headerActions={headerActions}
      beforeContent={
        t ? (
          <WorkflowStepper
            workflow={taskWorkflow}
            currentPhase={t.status}
            validationData={
              {
                hasAssignee: !!t.assigneeId,
                hasDescription: !!(t.description && t.description.trim().length > 0),
                hasChecklist: false,
                checklistProgress: 100,
                hoursLogged: t.actualHours ?? 0,
                hasApprover: false,
              } satisfies ValidationData
            }
            onAdvance={(nextPhase) => handleStatusChange(nextPhase)}
            onBlock={(reason) => {
              if (!id) return
              changeStatus.mutate(
                { id, status: "blocked", blockedReason: reason },
                {
                  onSuccess: () => toast.success("Task bloccato"),
                  onError: () => toast.error("Errore nel blocco del task"),
                }
              )
            }}
            canAdvancePhase={!changeStatus.isPending}
          />
        ) : undefined
      }
      sidebar={sidebar}
      tabs={tabs}
      onDelete={handleDelete}
      deleteConfirmMessage="Sei sicuro di voler eliminare questo task? Tutti i sottotask, commenti e checklist associati saranno eliminati."
      isDeleting={deleteTask.isPending}
    />
  )
}
