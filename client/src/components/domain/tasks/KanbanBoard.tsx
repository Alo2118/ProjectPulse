import { useCallback, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Calendar,
  ChevronRight,
  Clock,
  FolderKanban,
  Flag,
  GitBranch,
  GripVertical,
  MoreHorizontal,
  Plus,
  User,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn, formatDate, getAvatarColor, getUserInitials } from "@/lib/utils"
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
} from "@/lib/constants"
import { useTaskListQuery, useChangeTaskStatus } from "@/hooks/api/useTasks"

// ─── Types ───────────────────────────────────────────────────────────────────

interface KanbanTask {
  id: string
  code: string
  title: string
  status: string
  priority: string
  taskType?: string
  dueDate?: string | null
  assignee?: { id: string; firstName: string; lastName: string } | null
  project?: { id: string; name: string } | null
  milestone?: { id: string; title: string } | null
  phaseKey?: string | null
  subtasks?: Array<{ id: string; title: string; status: string }> | null
  _count?: { children?: number } | null
  completedSubtasks?: number
  totalSubtasks?: number
}

export interface KanbanBoardProps {
  projectId?: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const KANBAN_STATUSES = ["todo", "in_progress", "review", "done", "blocked"]

const COLUMN_LABELS: Record<string, string> = {
  todo: "Da iniziare",
  in_progress: "In corso",
  review: "In revisione",
  done: "Completato",
  blocked: "Bloccato",
}

const COLUMN_DOT: Record<string, string> = {
  todo: "bg-slate-400",
  in_progress: "bg-blue-500",
  review: "bg-amber-500",
  done: "bg-green-500",
  blocked: "bg-red-500",
}

const COLUMN_BORDER_TOP: Record<string, string> = {
  todo: "border-t-2 border-t-slate-400",
  in_progress: "border-t-2 border-t-blue-500",
  review: "border-t-2 border-t-amber-500",
  done: "border-t-2 border-t-green-500",
  blocked: "border-t-2 border-t-red-500",
}

const COLUMN_BG: Record<string, string> = {
  todo: "bg-muted/30",
  in_progress: "bg-blue-50/30 dark:bg-blue-950/20",
  review: "bg-amber-50/30 dark:bg-amber-950/20",
  done: "bg-green-50/30 dark:bg-green-950/20",
  blocked: "bg-red-50/30 dark:bg-red-950/20",
}

const COLUMN_COUNT_BADGE: Record<string, string> = {
  todo: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  done: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  blocked: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40",
  medium: "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800/40",
  high: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40",
  critical: "bg-red-100 text-red-800 border border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-700/50",
}

// Determine the next status to advance to
const NEXT_STATUS: Record<string, string> = {
  todo: "in_progress",
  in_progress: "review",
  review: "done",
}

const ADVANCE_LABEL: Record<string, string> = {
  todo: "Inizia",
  in_progress: "In revisione",
  review: "Completa",
}

// ─── Task Card ────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: KanbanTask
  isDragging?: boolean
}

function TaskCard({ task, isDragging = false }: TaskCardProps) {
  const navigate = useNavigate()
  const changeStatus = useChangeTaskStatus()

  const subtaskList = task.subtasks ?? []
  const totalSubtasks = task.totalSubtasks ?? subtaskList.length
  const completedSubtasks =
    task.completedSubtasks ??
    subtaskList.filter((s) => s.status === "done").length

  const isDueDateOverdue =
    task.dueDate != null && new Date(task.dueDate) < new Date()

  const advanceStatus = NEXT_STATUS[task.status]
  const advanceLabel = ADVANCE_LABEL[task.status]

  function handleAdvance(e: React.MouseEvent) {
    e.stopPropagation()
    if (advanceStatus) {
      changeStatus.mutate({ id: task.id, status: advanceStatus })
    }
  }

  function handleLogTime(e: React.MouseEvent) {
    e.stopPropagation()
    navigate(`/time-tracking?taskId=${task.id}`)
  }

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card cursor-pointer card-hover",
        isDragging && "opacity-50 rotate-1 shadow-xl"
      )}
      onClick={() => navigate(`/tasks/${task.id}`)}
    >
      {/* Top section: drag handle + title + actions */}
      <div className="flex items-start gap-2 px-3 pt-3 pb-2">
        {/* Drag handle — shown on hover, managed by parent SortableTaskCard */}
        <span className="mt-0.5 flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab touch-none">
          <GripVertical className="h-3.5 w-3.5" />
        </span>

        {/* Title */}
        <p className="flex-1 text-[13px] font-semibold leading-snug text-foreground min-w-0">
          {task.title}
        </p>

        {/* More actions icon */}
        <button
          type="button"
          className="flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-accent"
          onClick={(e) => e.stopPropagation()}
          aria-label="Azioni"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Context badges: project + milestone + priority */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2">
        {task.project && (
          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40">
            <FolderKanban className="h-2.5 w-2.5" />
            {task.project.name}
          </span>
        )}
        {task.milestone && (
          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200/60 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800/40">
            <Flag className="h-2.5 w-2.5" />
            {task.milestone.title}
          </span>
        )}
        {task.priority && (
          <span
            className={cn(
              "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
              PRIORITY_COLORS[task.priority] ?? ""
            )}
          >
            {TASK_PRIORITY_LABELS[task.priority] ?? task.priority}
          </span>
        )}
      </div>

      {/* Phase pill */}
      {task.phaseKey && (
        <div className="mx-3 mb-2 flex items-center gap-1.5 rounded px-2 py-1 bg-muted/60 border border-border/60">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
          <span className="text-[10px] text-muted-foreground">
            Fase: {task.phaseKey}
          </span>
        </div>
      )}

      {/* Inline subtask checkboxes — shown only when subtasks present */}
      {subtaskList.length > 0 && (
        <div className="mx-3 mb-2 flex flex-col gap-1 border-t border-border/40 pt-2">
          {subtaskList.slice(0, 3).map((sub) => {
            const done = sub.status === "done"
            return (
              <div key={sub.id} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-3 w-3 rounded-sm border flex-shrink-0 flex items-center justify-center",
                    done
                      ? "bg-green-100 border-green-400/60 dark:bg-green-950/30 dark:border-green-600/40"
                      : "bg-muted border-border"
                  )}
                >
                  {done && (
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-green-600 dark:text-green-400"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span
                  className={cn(
                    "text-[11px] leading-tight truncate",
                    done
                      ? "line-through text-muted-foreground"
                      : "text-foreground/80"
                  )}
                >
                  {sub.title}
                </span>
              </div>
            )
          })}
          {subtaskList.length > 3 && (
            <span className="text-[10px] text-muted-foreground pl-4.5">
              +{subtaskList.length - 3} altri
            </span>
          )}
        </div>
      )}

      {/* Footer: deadline + subtask count + assignee avatar */}
      <div className="flex items-center justify-between border-t border-border/40 mx-3 pt-2 pb-2">
        <div className="flex items-center gap-2">
          {task.dueDate && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px]",
                isDueDateOverdue
                  ? "text-red-500 dark:text-red-400"
                  : "text-muted-foreground"
              )}
            >
              <Calendar className="h-3 w-3" />
              {formatDate(task.dueDate)}
            </span>
          )}
          {totalSubtasks > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <GitBranch className="h-3 w-3" />
              <span
                className={cn(
                  completedSubtasks > 0 && "text-blue-600 dark:text-blue-400"
                )}
              >
                {completedSubtasks}/{totalSubtasks}
              </span>
            </span>
          )}
        </div>

        {task.assignee ? (
          <div
            className={cn(
              "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white",
              getAvatarColor(
                `${task.assignee.firstName} ${task.assignee.lastName}`
              )
            )}
            title={`${task.assignee.firstName} ${task.assignee.lastName}`}
          >
            {getUserInitials(task.assignee.firstName, task.assignee.lastName)}
          </div>
        ) : (
          <User className="h-4 w-4 text-muted-foreground/40" />
        )}
      </div>

      {/* Quick actions — visible on hover only */}
      <div className="flex items-center gap-1 border-t border-border/40 mx-3 pt-2 pb-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {advanceStatus && (
          <button
            type="button"
            onClick={handleAdvance}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors"
          >
            <ChevronRight className="h-3 w-3" />
            {advanceLabel}
          </button>
        )}
        <button
          type="button"
          onClick={handleLogTime}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium bg-muted text-muted-foreground border border-border hover:border-blue-400/40 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <Clock className="h-3 w-3" />
          Log
        </button>
      </div>
    </div>
  )
}

// ─── Sortable wrapper ─────────────────────────────────────────────────────────

function SortableTaskCard({ task }: { task: KanbanTask }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} isDragging={isDragging} />
    </div>
  )
}

// ─── Drag overlay card (simplified) ──────────────────────────────────────────

function TaskCardOverlay({ task }: { task: KanbanTask }) {
  return (
    <div className="rounded-lg border bg-card shadow-2xl px-3 py-2.5 w-[272px] rotate-2 opacity-90">
      <p className="text-[13px] font-semibold leading-snug text-foreground">
        {task.title}
      </p>
      {task.project && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          {task.project.name}
        </p>
      )}
    </div>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────

interface ColumnProps {
  status: string
  tasks: KanbanTask[]
}

function KanbanColumn({ status, tasks }: ColumnProps) {
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks])

  return (
    <div
      className={cn(
        "flex w-[280px] flex-shrink-0 flex-col rounded-lg border",
        COLUMN_BORDER_TOP[status],
        COLUMN_BG[status]
      )}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-card/80 border-b border-border/60 rounded-t-lg">
        <span
          className={cn("h-[7px] w-[7px] rounded-full flex-shrink-0", COLUMN_DOT[status])}
        />
        <span className="flex-1 text-[12px] font-semibold text-foreground">
          {COLUMN_LABELS[status] ?? TASK_STATUS_LABELS[status] ?? status}
        </span>
        <span
          className={cn(
            "text-[10px] font-semibold px-1.5 py-0.5 rounded",
            COLUMN_COUNT_BADGE[status]
          )}
        >
          {tasks.length}
        </span>
      </div>

      {/* Cards area */}
      <ScrollArea className="flex-1" style={{ maxHeight: "calc(100vh - 260px)" }}>
        <SortableContext
          items={taskIds}
          strategy={verticalListSortingStrategy}
          id={status}
        >
          <div className="flex flex-col gap-1.5 p-2">
            {tasks.map((task) => (
              <SortableTaskCard key={task.id} task={task} />
            ))}

            {tasks.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-border/50 py-8 text-center">
                <p className="text-[11px] text-muted-foreground">Nessun task</p>
              </div>
            )}
          </div>
        </SortableContext>
      </ScrollArea>

      {/* Add task button */}
      <div className="px-2 pb-2">
        <button
          type="button"
          className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Aggiungi task
        </button>
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function KanbanSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto p-1">
      {KANBAN_STATUSES.map((status) => (
        <div
          key={status}
          className={cn(
            "w-[280px] flex-shrink-0 rounded-lg border",
            COLUMN_BORDER_TOP[status],
            COLUMN_BG[status]
          )}
        >
          {/* Header skeleton */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-card/80 border-b border-border/60 rounded-t-lg">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-4 w-6 rounded" />
          </div>
          {/* Card skeletons */}
          <div className="flex flex-col gap-1.5 p-2">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-28 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Board ────────────────────────────────────────────────────────────────────

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const filters: Record<string, unknown> = { limit: 200 }
  if (projectId) filters.projectId = projectId

  const { data, isLoading } = useTaskListQuery(filters)
  const changeStatus = useChangeTaskStatus()

  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const tasks: KanbanTask[] = useMemo(
    () => (data?.data ?? []) as KanbanTask[],
    [data]
  )

  const columns = useMemo(() => {
    const grouped: Record<string, KanbanTask[]> = {}
    for (const status of KANBAN_STATUSES) {
      grouped[status] = []
    }
    for (const task of tasks) {
      if (grouped[task.status]) {
        grouped[task.status].push(task)
      }
    }
    return grouped
  }, [tasks])

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = tasks.find((t) => t.id === event.active.id)
      setActiveTask(task ?? null)
    },
    [tasks]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTask(null)
      const { active, over } = event
      if (!over) return

      const draggedTaskId = active.id as string
      const draggedTask = tasks.find((t) => t.id === draggedTaskId)
      if (!draggedTask) return

      let targetStatus: string | undefined

      const overTask = tasks.find((t) => t.id === over.id)
      if (overTask) {
        targetStatus = overTask.status
      } else if (KANBAN_STATUSES.includes(over.id as string)) {
        targetStatus = over.id as string
      }

      if (targetStatus && targetStatus !== draggedTask.status) {
        changeStatus.mutate({ id: draggedTaskId, status: targetStatus })
      }
    },
    [tasks, changeStatus]
  )

  if (isLoading) {
    return <KanbanSkeleton />
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 pt-1">
        {KANBAN_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={columns[status]}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && <TaskCardOverlay task={activeTask} />}
      </DragOverlay>
    </DndContext>
  )
}
