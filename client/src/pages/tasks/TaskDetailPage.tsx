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
  AlertTriangle,
  GitBranch,
  ChevronRight,
  Upload,
  Download,
  FileText,
  FilePlus,
  Timer,
  Plus,
  MoreHorizontal,
} from "lucide-react"
import { toast } from "sonner"
import { EntityDetail } from "@/components/common/EntityDetail"
import { StatusBadge } from "@/components/common/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  useTaskQuery,
  useChangeTaskStatus,
  useDeleteTask,
  useSubtasksQuery,
} from "@/hooks/api/useTasks"
import { useTimeEntryListQuery } from "@/hooks/api/useTimeEntries"
import { useActivityQuery } from "@/hooks/api/useActivity"
import { useAttachmentListQuery } from "@/hooks/api/useAttachments"
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_TYPE_LABELS,
  TASK_TYPE_COLORS,
  STATUS_COLORS,
} from "@/lib/constants"
import { formatDate, formatDateTime, getUserInitials, getAvatarColor, formatFileSize } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { CommentSection } from "@/components/domain/tasks/CommentSection"
import { ChecklistSection } from "@/components/domain/tasks/ChecklistSection"
import { WorkflowStepper } from "@/components/common/WorkflowStepper"
import { taskWorkflow } from "@/lib/workflows/taskWorkflow"
import type { ValidationData } from "@/lib/workflow-engine"

// ---- Types ----

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
  phaseKey?: string | null
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
  dueDate?: string | null
  assignee?: { firstName: string; lastName: string } | null
}

interface TimeEntryRow {
  id: string
  description?: string | null
  startTime?: string | null
  endTime?: string | null
  hours?: number | null
  durationMinutes?: number | null
  user?: { id: string; firstName: string; lastName: string } | null
}

interface AttachmentRow {
  id: string
  fileName: string
  fileType?: string | null
  fileSize?: number | null
  createdAt: string
  uploader?: { firstName: string; lastName: string } | null
}

// ---- Helpers ----

function getNextStatus(current: string): string | null {
  const flow: Record<string, string> = {
    todo: "in_progress",
    in_progress: "review",
    review: "done",
  }
  return flow[current] ?? null
}

function getNextStatusLabel(current: string): string {
  const next = getNextStatus(current)
  if (!next) return ""
  return TASK_STATUS_LABELS[next] ?? next
}

function getFileIcon(fileType: string | null | undefined) {
  if (!fileType) return <FileText className="h-5 w-5 text-muted-foreground" />
  const t = fileType.toLowerCase()
  if (t.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />
  if (t.includes("image") || t.includes("png") || t.includes("jpg") || t.includes("jpeg"))
    return <FileText className="h-5 w-5 text-blue-500" />
  if (t.includes("word") || t.includes("doc"))
    return <FileText className="h-5 w-5 text-blue-600" />
  if (t.includes("excel") || t.includes("sheet") || t.includes("csv"))
    return <FileText className="h-5 w-5 text-green-600" />
  return <FileText className="h-5 w-5 text-muted-foreground" />
}

// ---- Sub-components ----

function KpiRow({ t, subtaskList }: { t: TaskData; subtaskList: SubtaskRow[] }) {
  const totalSubs = t.subtasksSummary?.total ?? t._count?.subtasks ?? subtaskList.length
  const doneSubs = t.subtasksSummary?.completed ?? subtaskList.filter((s) => s.status === "done" || s.status === "cancelled").length
  const completionPct = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 0
  const logged = t.actualHours ?? 0
  const estimated = t.estimatedHours ?? 0
  const assigneeName = t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : "Non assegnato"
  const assigneeInitials = t.assignee ? getUserInitials(t.assignee.firstName, t.assignee.lastName) : "—"
  const assigneeColor = t.assignee ? getAvatarColor(`${t.assignee.firstName}${t.assignee.lastName}`) : "bg-muted"

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {/* Avanzamento */}
      <Card>
        <CardContent className="p-3 space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Avanzamento</p>
          <p className="text-2xl font-bold text-foreground tabular-nums">{completionPct}%</p>
          <Progress value={completionPct} className="h-1.5" />
        </CardContent>
      </Card>

      {/* Subtask */}
      <Card>
        <CardContent className="p-3 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Subtask</p>
          <div className="flex items-baseline gap-1">
            <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-2xl font-bold text-foreground tabular-nums">{totalSubs}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {doneSubs} fatti · {totalSubs - doneSubs} aperti
          </p>
        </CardContent>
      </Card>

      {/* Ore loggate */}
      <Card>
        <CardContent className="p-3 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Ore loggate</p>
          <div className="flex items-baseline gap-1">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-2xl font-bold text-foreground tabular-nums">{logged}h</span>
          </div>
          {estimated > 0 && (
            <p className="text-[11px] text-muted-foreground">su {estimated}h stimate</p>
          )}
        </CardContent>
      </Card>

      {/* Assegnato a */}
      <Card>
        <CardContent className="p-3 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Assegnato a</p>
          <div className="flex items-center gap-2 mt-1">
            {t.assignee ? (
              <Avatar className="h-7 w-7">
                <AvatarFallback className={cn("text-white text-[10px] font-medium", assigneeColor)}>
                  {assigneeInitials}
                </AvatarFallback>
              </Avatar>
            ) : (
              <User className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-sm font-medium text-foreground truncate">{assigneeName}</span>
          </div>
        </CardContent>
      </Card>

      {/* Fase / Progetto */}
      <Card>
        <CardContent className="p-3 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Progetto</p>
          {t.project ? (
            <Link
              to={`/projects/${t.project.id}`}
              className="flex items-center gap-1.5 mt-1 group"
            >
              <FolderKanban className="h-4 w-4 text-blue-500 shrink-0" />
              <span className="text-sm font-medium text-primary group-hover:underline truncate">
                {t.project.name}
              </span>
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">—</p>
          )}
          {t.phaseKey && (
            <p className="text-[11px] text-muted-foreground">{t.phaseKey}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DetailsTab({ t }: { t: TaskData }) {
  const isDueDateOverdue =
    t.dueDate &&
    t.status !== "done" &&
    t.status !== "cancelled" &&
    new Date(t.dueDate) < new Date()

  return (
    <div className="space-y-4 pt-4">
      {/* Blocked reason banner */}
      {t.status === "blocked" && t.blockedReason && (
        <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">Motivo del blocco</p>
            <p className="text-sm text-muted-foreground mt-0.5">{t.blockedReason}</p>
          </div>
        </div>
      )}

      {/* Description */}
      <div
        className={cn(
          "rounded-md border border-border px-5 py-4 transition-colors",
          "hover:bg-muted/30 cursor-default"
        )}
      >
        <h3 className="text-sm font-semibold text-foreground mb-2">Descrizione</h3>
        {t.description ? (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {t.description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">Nessuna descrizione</p>
        )}
      </div>

      {/* Details grid */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Dettagli</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground w-24 shrink-0">Inizio</span>
              <span className="text-sm text-foreground">{t.startDate ? formatDate(t.startDate) : "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground w-24 shrink-0">Scadenza</span>
              <span className={cn("text-sm", isDueDateOverdue && "text-destructive font-medium")}>
                {t.dueDate ? formatDate(t.dueDate) : "—"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground w-24 shrink-0">Ore stimate</span>
              <span className="text-sm text-foreground">{t.estimatedHours != null ? `${t.estimatedHours}h` : "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground w-24 shrink-0">Ore effettive</span>
              <span className="text-sm text-foreground">{t.actualHours != null ? `${t.actualHours}h` : "—"}</span>
            </div>
            {t.parentTask && (
              <div className="flex items-center gap-2 sm:col-span-2">
                <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground w-24 shrink-0">Task padre</span>
                <Link
                  to={`/tasks/${t.parentTask.id}`}
                  className="text-sm text-primary hover:underline truncate"
                >
                  {t.parentTask.title}
                </Link>
              </div>
            )}
            {t.createdAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground w-24 shrink-0">Creato il</span>
                <span className="text-sm text-foreground">{formatDateTime(t.createdAt)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SubtasksTab({
  subtaskList,
  taskId,
}: {
  subtaskList: SubtaskRow[]
  taskId: string
}) {
  const total = subtaskList.length
  const done = subtaskList.filter((s) => s.status === "done" || s.status === "cancelled").length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="space-y-4 pt-4">
      {/* Progress header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{done} / {total} completati</span>
            <span className="font-medium tabular-nums">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link to={`/tasks/new?parentTaskId=${taskId}`}>
            <Plus className="h-4 w-4 mr-1" />
            Nuovo subtask
          </Link>
        </Button>
      </div>

      {/* Subtask list */}
      {subtaskList.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-10 text-center">
          <GitBranch className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nessun subtask</p>
        </div>
      ) : (
        <div className="space-y-1">
          {subtaskList.map((sub) => {
            const isOverdue =
              sub.dueDate &&
              sub.status !== "done" &&
              sub.status !== "cancelled" &&
              new Date(sub.dueDate) < new Date()
            const initials = sub.assignee ? getUserInitials(sub.assignee.firstName, sub.assignee.lastName) : null
            const color = sub.assignee ? getAvatarColor(`${sub.assignee.firstName}${sub.assignee.lastName}`) : "bg-muted"
            const isDone = sub.status === "done" || sub.status === "cancelled"

            return (
              <Link
                key={sub.id}
                to={`/tasks/${sub.id}`}
                className="flex items-center gap-3 rounded-md border border-border px-4 py-3 hover:bg-muted/40 transition-colors group"
              >
                {/* Checkbox visual */}
                <div
                  className={cn(
                    "h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors",
                    isDone
                      ? "border-green-500 bg-green-500"
                      : "border-border group-hover:border-primary/50"
                  )}
                >
                  {isDone && (
                    <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                      <path d="M10.28 2.28a.75.75 0 0 0-1.06 0L4.5 7l-1.72-1.72a.75.75 0 1 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.06 0l5.25-5.25a.75.75 0 0 0 0-1.06z" />
                    </svg>
                  )}
                </div>

                {/* Name */}
                <span className={cn("flex-1 text-sm font-medium truncate", isDone && "line-through text-muted-foreground")}>
                  {sub.title}
                </span>

                {/* Status + deadline + assignee */}
                <div className="flex items-center gap-2 shrink-0">
                  {sub.dueDate && (
                    <span className={cn("text-xs", isOverdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                      {formatDate(sub.dueDate)}
                    </span>
                  )}
                  <StatusBadge status={sub.status} labels={TASK_STATUS_LABELS} />
                  {initials && (
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className={cn("text-white text-[9px] font-medium", color)}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Add subtask dashed row */}
      <Link
        to={`/tasks/new?parentTaskId=${taskId}`}
        className="flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
      >
        <Plus className="h-4 w-4" />
        Aggiungi subtask
      </Link>
    </div>
  )
}

function TimeEntriesTab({
  taskId,
  estimatedHours,
}: {
  taskId: string
  estimatedHours?: number | null
}) {
  const { data, isLoading } = useTimeEntryListQuery({ taskId })
  const rawList = (data?.data ?? data ?? []) as TimeEntryRow[]

  const totalLogged = rawList.reduce((acc, e) => {
    if (e.hours != null) return acc + e.hours
    if (e.durationMinutes != null) return acc + e.durationMinutes / 60
    return acc
  }, 0)

  const estimated = estimatedHours ?? 0
  const remaining = Math.max(estimated - totalLogged, 0)
  const loggedPct = estimated > 0 ? Math.min(Math.round((totalLogged / estimated) * 100), 100) : 0

  return (
    <div className="space-y-4 pt-4">
      {/* Header with action */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Log Ore</h3>
        <Button size="sm" variant="outline" asChild>
          <Link to={`/time-tracking?taskId=${taskId}`}>
            <Timer className="h-4 w-4 mr-1" />
            Aggiungi voce
          </Link>
        </Button>
      </div>

      {/* 3-card summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Loggate</p>
            <p className="text-xl font-bold text-foreground tabular-nums">{totalLogged.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Stimate</p>
            <p className="text-xl font-bold text-foreground tabular-nums">{estimated > 0 ? `${estimated}h` : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Rimanenti</p>
            <p className={cn("text-xl font-bold tabular-nums", remaining === 0 && estimated > 0 ? "text-success" : "text-foreground")}>
              {estimated > 0 ? `${remaining.toFixed(1)}h` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      {estimated > 0 && (
        <div className="space-y-1">
          <Progress
            value={loggedPct}
            className={cn("h-2", loggedPct >= 100 && "[&>div]:bg-destructive")}
          />
          <p className="text-xs text-muted-foreground text-right">{loggedPct}% del budget ore utilizzato</p>
        </div>
      )}

      {/* Entries */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      ) : rawList.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-8 text-center">
          <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nessuna voce registrata</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Voci recenti</p>
          {rawList.map((entry) => {
            const firstName = entry.user?.firstName ?? "?"
            const lastName = entry.user?.lastName ?? "?"
            const initials = getUserInitials(firstName, lastName)
            const color = getAvatarColor(`${firstName}${lastName}`)
            const hours = entry.hours != null
              ? entry.hours
              : entry.durationMinutes != null
              ? entry.durationMinutes / 60
              : 0

            return (
              <div key={entry.id} className="flex items-center gap-3 rounded-md border border-border px-4 py-3">
                <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    {entry.description ?? "Voce ore"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.startTime ? formatDate(entry.startTime) : "—"}
                    {entry.endTime && entry.startTime && ` → ${formatDate(entry.endTime)}`}
                  </p>
                </div>
                <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">
                  {hours.toFixed(1)}h
                </span>
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className={cn("text-white text-[9px] font-medium", color)}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AttachmentsTab({ taskId }: { taskId: string }) {
  const { data, isLoading } = useAttachmentListQuery("task", taskId)
  const attachments = (data ?? []) as AttachmentRow[]

  return (
    <div className="space-y-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {attachments.length} {attachments.length === 1 ? "file allegato" : "file allegati"}
        </p>
        <Button size="sm" variant="outline">
          <Upload className="h-4 w-4 mr-1" />
          Carica file
        </Button>
      </div>

      {/* File list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      ) : attachments.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-8 text-center">
          <FilePlus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nessun allegato</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center gap-3 rounded-md border border-border px-4 py-3">
              {getFileIcon(att.fileType)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{att.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {att.fileType ?? "File"}
                  {att.fileSize != null && ` · ${formatFileSize(att.fileSize)}`}
                  {" · "}{formatDate(att.createdAt)}
                  {att.uploader && ` · ${att.uploader.firstName} ${att.uploader.lastName}`}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <Download className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      <div className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border py-8 text-center hover:border-primary/40 hover:bg-muted/20 transition-colors cursor-pointer">
        <Upload className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Trascina qui i file o clicca per caricare</p>
      </div>
    </div>
  )
}

// ---- Main component ----

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  useSetPageContext({ domain: "task", entityId: id })
  const navigate = useNavigate()

  const { data: task, isLoading, error } = useTaskQuery(id ?? "")
  const { data: subtasks } = useSubtasksQuery(id ?? "")
  const { data: taskActivity } = useActivityQuery('task', id ?? '')
  const changeStatus = useChangeTaskStatus()
  const deleteTask = useDeleteTask()

  const t = task as TaskData | undefined
  const subtaskList = (subtasks ?? []) as SubtaskRow[]

  // ---- Breadcrumbs ----
  const breadcrumbs = useMemo(() => {
    const crumbs: Array<{ label: string; href?: string; domain?: string }> = [
      { label: "Home", href: "/" },
    ]
    if (t?.project) {
      crumbs.push({ label: "Progetti", href: "/projects", domain: "project" })
      crumbs.push({ label: t.project.name, href: `/projects/${t.project.id}` })
    } else {
      crumbs.push({ label: "Task", href: "/tasks" })
    }
    if (t?.parentTask) {
      crumbs.push({ label: t.parentTask.title, href: `/tasks/${t.parentTask.id}` })
    }
    crumbs.push({ label: t?.title ?? "..." })
    return crumbs
  }, [t])

  // ---- Handlers ----
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

  // ---- Header: editable badges (visual chips linking to edit) ----
  const editableBadges = t ? (
    <div className="flex flex-wrap items-center gap-2">
      {/* Task type */}
      <Badge variant="secondary" className={TASK_TYPE_COLORS[t.taskType]}>
        {TASK_TYPE_LABELS[t.taskType] ?? t.taskType}
      </Badge>

      {/* Status chip */}
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium cursor-default",
          STATUS_COLORS[t.status]
        )}
      >
        {TASK_STATUS_LABELS[t.status] ?? t.status}
        <ChevronRight className="h-3 w-3 opacity-60" />
      </span>

      {/* Priority chip */}
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium cursor-default",
          STATUS_COLORS[t.priority]
        )}
      >
        <Flag className="h-3 w-3" />
        {TASK_PRIORITY_LABELS[t.priority] ?? t.priority}
      </span>

      {/* Assignee chip */}
      {t.assignee && (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-xs text-foreground cursor-default">
          <User className="h-3 w-3 text-muted-foreground" />
          {t.assignee.firstName} {t.assignee.lastName}
        </span>
      )}

      {/* Project chip */}
      {t.project && (
        <Link
          to={`/projects/${t.project.id}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-xs text-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          <FolderKanban className="h-3 w-3 text-muted-foreground" />
          {t.project.name}
        </Link>
      )}

      {/* Deadline chip */}
      {t.dueDate && (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-xs cursor-default",
            t.status !== "done" && t.status !== "cancelled" && new Date(t.dueDate) < new Date()
              ? "border-destructive/50 text-destructive"
              : "text-foreground"
          )}
        >
          <Calendar className="h-3 w-3 text-muted-foreground" />
          {formatDate(t.dueDate)}
        </span>
      )}
    </div>
  ) : null

  // ---- Header: action buttons ----
  const headerActions = t ? (
    <>
      <Button variant="outline" size="sm" asChild>
        <Link to={`/time-tracking?taskId=${id}`}>
          <Timer className="h-4 w-4 mr-1" />
          Log ore
        </Link>
      </Button>

      {/* Advance status button */}
      {getNextStatus(t.status) && (
        <Button
          size="sm"
          onClick={() => handleStatusChange(getNextStatus(t.status)!)}
          disabled={changeStatus.isPending}
        >
          {changeStatus.isPending ? "..." : `Avanza: ${getNextStatusLabel(t.status)}`}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      )}

      {/* Edit + more menu */}
      <Button variant="outline" size="sm" asChild>
        <Link to={`/tasks/${id}/edit`}>
          <Pencil className="h-4 w-4 mr-1" />
          Modifica
        </Link>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
            <DropdownMenuItem
              key={value}
              onClick={() => handleStatusChange(value)}
              disabled={value === t.status}
            >
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  ) : null

  // ---- KPI row ----
  const kpiRow = t ? <KpiRow t={t} subtaskList={subtaskList} /> : undefined

  // ---- Tabs ----
  const tabs = useMemo(
    () =>
      id && t
        ? [
            {
              key: "details",
              label: "Dettagli",
              content: <DetailsTab t={t} />,
            },
            {
              key: "subtasks",
              label: "Subtask",
              count: t.subtasksSummary?.total ?? t._count?.subtasks ?? subtaskList.length,
              content: <SubtasksTab subtaskList={subtaskList} taskId={id} />,
            },
            {
              key: "time",
              label: "Log ore",
              count: t._count?.timeEntries,
              content: <TimeEntriesTab taskId={id} estimatedHours={t.estimatedHours} />,
            },
            {
              key: "attachments",
              label: "Allegati",
              content: <AttachmentsTab taskId={id} />,
            },
            {
              key: "activity",
              label: "Attività",
              count: t._count?.comments,
              content: <CommentSection taskId={id} />,
            },
            {
              key: "checklist",
              label: "Checklist",
              content: <ChecklistSection taskId={id} />,
            },
          ]
        : [],
    [id, t, subtaskList]
  )

  return (
    <EntityDetail
      isLoading={isLoading}
      error={error ?? undefined}
      notFound={!isLoading && !error && !t}
      breadcrumbs={breadcrumbs}
      title={t?.title}
      subtitle={t?.code}
      editableBadges={editableBadges}
      headerActions={headerActions}
      colorBar="linear-gradient(90deg, hsl(187, 85%, 53%), hsl(217, 91%, 60%))"
      kpiRow={kpiRow}
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
      tabs={tabs}
      onDelete={handleDelete}
      deleteConfirmMessage="Sei sicuro di voler eliminare questo task? Tutti i sottotask, commenti e checklist associati saranno eliminati."
      isDeleting={deleteTask.isPending}
    />
  )
}
