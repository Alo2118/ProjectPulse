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
  blockedReason?: string | null
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

// Column top border colors from mockup
const COLUMN_TOP_BORDER_COLOR: Record<string, string> = {
  todo: "#475569",
  in_progress: "#3b82f6",
  review: "#eab308",
  done: "#22c55e",
  blocked: "#ef4444",
}

// Column dot colors
const COLUMN_DOT_COLOR: Record<string, string> = {
  todo: "#475569",
  in_progress: "#3b82f6",
  review: "#eab308",
  done: "#22c55e",
  blocked: "#ef4444",
}

// Column count badge colors (bg + text)
const COLUMN_COUNT_STYLE: Record<string, React.CSSProperties> = {
  todo: { background: "rgba(71,85,105,0.15)", color: "#94a3b8" },
  in_progress: { background: "rgba(59,130,246,0.12)", color: "#60a5fa" },
  review: { background: "rgba(234,179,8,0.12)", color: "#facc15" },
  done: { background: "rgba(34,197,94,0.12)", color: "#4ade80" },
  blocked: { background: "rgba(239,68,68,0.12)", color: "#f87171" },
}

// Card border tint for active/review/blocked cards
const CARD_STATUS_BORDER: Record<string, string> = {
  in_progress: "rgba(59,130,246,0.25)",
  review: "rgba(234,179,8,0.2)",
  blocked: "rgba(239,68,68,0.25)",
}

// Priority badge styles
const PRIORITY_BADGE_STYLE: Record<string, React.CSSProperties> = {
  low: {
    background: "rgba(234,179,8,0.08)",
    color: "#facc15",
    border: "1px solid rgba(234,179,8,0.2)",
  },
  medium: {
    background: "rgba(249,115,22,0.08)",
    color: "#fb923c",
    border: "1px solid rgba(249,115,22,0.2)",
  },
  high: {
    background: "rgba(239,68,68,0.08)",
    color: "#f87171",
    border: "1px solid rgba(239,68,68,0.2)",
  },
  critical: {
    background: "rgba(239,68,68,0.15)",
    color: "#ef4444",
    border: "1px solid rgba(239,68,68,0.35)",
  },
}

// Advance status map
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
    task.dueDate != null &&
    task.status !== "done" &&
    task.status !== "cancelled" &&
    new Date(task.dueDate) < new Date()

  const advanceStatus = NEXT_STATUS[task.status]
  const advanceLabel = ADVANCE_LABEL[task.status]
  const isDone = task.status === "done"
  const isBlocked = task.status === "blocked"

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

  // Card border color
  const cardBorderColor = CARD_STATUS_BORDER[task.status] ?? "var(--border-default)"

  return (
    <div
      className={cn(
        "k-card group relative cursor-pointer",
        isDragging && "opacity-50 rotate-1 shadow-xl"
      )}
      style={{
        background: "var(--bg-elevated)",
        border: `1px solid ${cardBorderColor}`,
        borderRadius: "var(--radius)",
        padding: "11px 12px",
        transition: "all 0.15s",
        position: "relative",
        overflow: "hidden",
      }}
      onClick={() => navigate(`/tasks/${task.id}`)}
    >
      {/* Shine line */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)",
        }}
      />

      {/* Top: drag + title + actions */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6, marginBottom: 7 }}>
        {/* Drag handle */}
        <span
          className="k-card-drag"
          style={{
            color: "var(--text-muted)",
            cursor: "grab",
            flexShrink: 0,
            marginTop: 1,
            opacity: 0,
            transition: "opacity 0.15s",
          }}
        >
          <GripVertical className="h-3 w-3" />
        </span>

        {/* Title */}
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            lineHeight: 1.4,
            flex: 1,
            color: isDone ? "var(--text-muted)" : "var(--text-primary)",
            textDecoration: isDone ? "line-through" : undefined,
          }}
        >
          {task.title}
        </p>

        {/* More icon */}
        <button
          type="button"
          className="k-card-actions"
          style={{ opacity: 0, transition: "opacity 0.15s", display: "flex", gap: 3 }}
          onClick={(e) => e.stopPropagation()}
          aria-label="Azioni"
        >
          <span
            style={{
              width: 22,
              height: 22,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "1px solid transparent",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              color: "var(--text-muted)",
            }}
          >
            <MoreHorizontal className="h-3 w-3" />
          </span>
        </button>
      </div>

      {/* Context badges: project + priority */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
        {task.project && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 500,
              background: "rgba(59,130,246,0.08)",
              color: "#60a5fa",
              border: "1px solid rgba(59,130,246,0.2)",
              whiteSpace: "nowrap",
            }}
          >
            <FolderKanban className="h-2 w-2" />
            {task.project.name}
          </span>
        )}
        {task.milestone && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 500,
              background: "rgba(168,85,247,0.08)",
              color: "#c084fc",
              border: "1px solid rgba(168,85,247,0.2)",
              whiteSpace: "nowrap",
            }}
          >
            <Flag className="h-2 w-2" />
            {task.milestone.title}
          </span>
        )}
        {task.priority && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 500,
              whiteSpace: "nowrap",
              ...(PRIORITY_BADGE_STYLE[task.priority] ?? {}),
            }}
          >
            {TASK_PRIORITY_LABELS[task.priority] ?? task.priority}
          </span>
        )}
      </div>

      {/* Phase pill */}
      {(task.phaseKey || isBlocked) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 7px",
            borderRadius: 4,
            marginBottom: 8,
            background: isBlocked ? "rgba(239,68,68,0.06)" : "var(--bg-overlay)",
            border: isBlocked ? "1px solid rgba(239,68,68,0.15)" : "1px solid var(--border-default)",
            fontSize: 10,
            color: isBlocked ? "#f87171" : "var(--text-secondary)",
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              flexShrink: 0,
              background: isBlocked
                ? "#ef4444"
                : task.status === "in_progress"
                ? "#3b82f6"
                : task.status === "review"
                ? "#eab308"
                : "var(--status-idle)",
            }}
          />
          {isBlocked && task.blockedReason
            ? `Bloccato: ${task.blockedReason}`
            : task.phaseKey
            ? `Fase: ${task.phaseKey}`
            : "Nessuna fase"}
        </div>
      )}

      {/* Progress bar + subtask list (for in_progress with subtasks) */}
      {!isDone && subtaskList.length > 0 && (
        <>
          {totalSubtasks > 0 && (
            <div
              style={{
                height: 3,
                background: "var(--bg-overlay)",
                borderRadius: 99,
                overflow: "hidden",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 99,
                  width: `${totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0}%`,
                  background: "linear-gradient(90deg,#1d4ed8,#3b82f6)",
                }}
              />
            </div>
          )}
          <div
            style={{
              marginTop: 7,
              display: "flex",
              flexDirection: "column",
              gap: 3,
              borderTop: "1px solid var(--border-subtle)",
              paddingTop: 7,
            }}
          >
            {subtaskList.slice(0, 3).map((sub) => {
              const done = sub.status === "done"
              return (
                <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-secondary)" }}>
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 2,
                      border: done ? "1px solid rgba(34,197,94,0.4)" : "1px solid var(--border-default)",
                      background: done ? "rgba(34,197,94,0.15)" : "var(--bg-overlay)",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {done && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      textDecoration: done ? "line-through" : undefined,
                      color: done ? "var(--text-muted)" : undefined,
                    }}
                  >
                    {sub.title}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Footer: deadline + subtask count + avatar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 8,
          paddingTop: 8,
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isDone ? (
            task.dueDate && (
              <span style={{ fontSize: 10, color: "#4ade80", display: "flex", alignItems: "center", gap: 3 }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {formatDate(task.dueDate)}
              </span>
            )
          ) : (
            task.dueDate && (
              <span
                style={{
                  fontSize: 10,
                  color: isDueDateOverdue ? "#f87171" : "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <Calendar className="h-2.5 w-2.5" />
                {formatDate(task.dueDate)}
              </span>
            )
          )}
          {totalSubtasks > 0 && (
            <span style={{ fontSize: 10, color: completedSubtasks > 0 ? "#60a5fa" : "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
              <GitBranch className="h-2.5 w-2.5" />
              {completedSubtasks}/{totalSubtasks}
            </span>
          )}
        </div>

        {task.assignee ? (
          <div
            title={`${task.assignee.firstName} ${task.assignee.lastName}`}
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 8,
              fontWeight: 700,
              border: "1px solid var(--border-default)",
              flexShrink: 0,
            }}
            className={getAvatarColor(`${task.assignee.firstName} ${task.assignee.lastName}`)}
          >
            {getUserInitials(task.assignee.firstName, task.assignee.lastName)}
          </div>
        ) : (
          <User className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
        )}
      </div>

      {/* Quick actions — hover only */}
      <div
        className="k-quick-actions"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          marginTop: 8,
          paddingTop: 8,
          borderTop: "1px solid var(--border-subtle)",
          opacity: 0,
          transition: "opacity 0.15s",
        }}
      >
        {advanceStatus && (
          <button
            type="button"
            onClick={handleAdvance}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 500,
              cursor: "pointer",
              background: "rgba(45,140,240,0.1)",
              color: "#60a5fa",
              border: "1px solid rgba(45,140,240,0.2)",
              transition: "all 0.15s",
            }}
          >
            <ChevronRight className="h-2.5 w-2.5" />
            {advanceLabel}
          </button>
        )}
        {isBlocked && (
          <button
            type="button"
            onClick={handleAdvance}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 500,
              cursor: "pointer",
              background: "rgba(239,68,68,0.1)",
              color: "#f87171",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            Sblocca
          </button>
        )}
        <button
          type="button"
          onClick={handleLogTime}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 8px",
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 500,
            cursor: "pointer",
            background: "var(--bg-overlay)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-default)",
            transition: "all 0.15s",
          }}
        >
          <Clock className="h-2.5 w-2.5" />
          Log ore
        </button>
      </div>
    </div>
  )
}

// ─── CSS for hover states (injected via style tag) ──────────────────────────

const kanbanStyles = `
  .k-card:hover {
    border-color: rgba(45,140,240,0.3) !important;
    background: var(--bg-hover) !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  }
  .k-card:hover .k-card-drag { opacity: 1 !important; }
  .k-card:hover .k-card-actions { opacity: 1 !important; }
  .k-card:hover .k-quick-actions { opacity: 1 !important; }
`

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

// ─── Drag overlay card ────────────────────────────────────────────────────────

function TaskCardOverlay({ task }: { task: KanbanTask }) {
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius)",
        padding: "11px 12px",
        width: 280,
        transform: "rotate(2deg)",
        opacity: 0.9,
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      }}
    >
      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
        {task.title}
      </p>
      {task.project && (
        <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
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
  const dotColor = COLUMN_DOT_COLOR[status] ?? "#64748b"
  const topBorderColor = COLUMN_TOP_BORDER_COLOR[status] ?? "#64748b"
  const countStyle = COLUMN_COUNT_STYLE[status] ?? {}

  return (
    <div
      style={{
        width: 280,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 200px)",
      }}
    >
      {/* Column header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius) var(--radius) 0 0",
          borderBottom: "none",
          borderTop: `2px solid ${topBorderColor}`,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: dotColor,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            flex: 1,
            color: "var(--text-primary)",
          }}
        >
          {COLUMN_LABELS[status] ?? TASK_STATUS_LABELS[status] ?? status}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: "1px 6px",
            borderRadius: 3,
            ...countStyle,
          }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Cards area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "0 0 var(--radius) var(--radius)",
          padding: 8,
          display: "flex",
          flexDirection: "column",
          gap: 7,
          minHeight: 80,
          opacity: status === "done" ? 0.75 : 1,
        }}
      >
        <SortableContext
          items={taskIds}
          strategy={verticalListSortingStrategy}
          id={status}
        >
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} />
          ))}

          {tasks.length === 0 && (
            <div
              style={{
                padding: "24px 12px",
                textAlign: "center",
                border: "1px dashed var(--border-default)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Nessun task</p>
            </div>
          )}
        </SortableContext>

        {/* Add task row */}
        <div
          style={{
            padding: "6px 8px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "var(--text-muted)",
            fontSize: 11,
            cursor: "pointer",
            borderRadius: "var(--radius-sm)",
            transition: "all 0.15s",
          }}
          className="hover:bg-elevated hover:text-secondary"
        >
          <Plus className="h-3.5 w-3.5" />
          Aggiungi task
        </div>
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function KanbanSkeleton() {
  return (
    <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "0 0 20px" }}>
      {KANBAN_STATUSES.map((status) => (
        <div key={status} style={{ width: 280, flexShrink: 0 }}>
          <div
            style={{
              height: 44,
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderTop: `2px solid ${COLUMN_TOP_BORDER_COLOR[status]}`,
              borderRadius: "var(--radius) var(--radius) 0 0",
              borderBottom: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px" }}>
              <Skeleton className="h-[7px] w-[7px] rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="ml-auto h-4 w-6 rounded" />
            </div>
          </div>
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderTop: "none",
              borderRadius: "0 0 var(--radius) var(--radius)",
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 7,
            }}
          >
            <Skeleton className="h-24 w-full rounded" />
            <Skeleton className="h-20 w-full rounded" />
            <Skeleton className="h-28 w-full rounded" />
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
    <>
      {/* Inject hover CSS */}
      <style>{kanbanStyles}</style>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            overflowX: "auto",
            padding: "0 0 20px",
            alignItems: "flex-start",
          }}
        >
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
    </>
  )
}
