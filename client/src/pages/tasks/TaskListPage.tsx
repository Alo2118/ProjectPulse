import { useMemo } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import {
  ListChecks,
  List,
  Table2,
  LayoutGrid,
  GanttChart,
  CalendarDays,
  Construction,
} from "lucide-react"
import { EntityList, type Column, type FilterConfig } from "@/components/common/EntityList"
import { StatusDot } from "@/components/common/StatusDot"
import { DeadlineCell } from "@/components/common/DeadlineCell"
import { ProblemIndicators } from "@/components/common/ProblemIndicators"
import { ParentLink } from "@/components/common/ParentLink"
import { RecurrenceBadge } from "@/components/common/RecurrenceBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useTaskListQuery } from "@/hooks/api/useTasks"
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_TYPE_LABELS,
  TASK_TYPE_COLORS,
  TASK_STATUS_GROUP_ORDER,
  COLLAPSED_BY_DEFAULT,
} from "@/lib/constants"
import { cn, formatRelative } from "@/lib/utils"

interface TaskRow {
  id: string
  code: string
  title: string
  taskType: string
  status: string
  priority: string
  dueDate?: string | null
  blockedReason?: string | null
  isRecurring?: boolean
  recurrencePattern?: string | null
  lastExecutedAt?: string | null
  updatedAt?: string
  project?: { id: string; name: string } | null
  assignee?: { id: string; firstName: string; lastName: string } | null
  _count?: {
    comments?: number
    subtasks?: number
    children?: number
  } | null
}

const VIEW_MODES = [
  { key: "list", label: "Lista", icon: List },
  { key: "table", label: "Tabella", icon: Table2 },
  { key: "board", label: "Board", icon: LayoutGrid },
  { key: "gantt", label: "Gantt", icon: GanttChart },
  { key: "calendar", label: "Calendario", icon: CalendarDays },
] as const

function getTaskGroup(t: TaskRow): string {
  if (t.isRecurring && t.status !== "done" && t.status !== "cancelled") {
    return "recurring"
  }
  return t.status
}

const columns: Column<TaskRow>[] = [
  {
    key: "title",
    header: "Task",
    sortable: true,
    cell: (t) => {
      const comments = t._count?.comments
      const subtasks = t._count?.subtasks ?? t._count?.children
      const assigneeName = t.assignee
        ? `${t.assignee.firstName[0]}. ${t.assignee.lastName}`
        : null
      const isBlocked = t.status === "blocked"
      const showRecurrence = t.isRecurring && t.status !== "done" && t.status !== "cancelled"

      return (
        <div className="min-w-0 py-1 space-y-0.5">
          {/* Line 1: dot + title + problem indicators */}
          <div className="flex items-center gap-2 min-w-0">
            <StatusDot status={t.status} size="md" />
            <span className="font-medium text-sm truncate leading-tight flex-1 min-w-0">
              {t.title}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <Badge
                variant="secondary"
                className={cn("text-[10px] px-1.5 py-0", TASK_TYPE_COLORS[t.taskType])}
              >
                {TASK_TYPE_LABELS[t.taskType] ?? t.taskType}
              </Badge>
              <ProblemIndicators
                comments={comments && comments > 0 ? comments : undefined}
                checklistTotal={subtasks && subtasks > 0 ? subtasks : undefined}
                checklistDone={subtasks && subtasks > 0 ? subtasks : undefined}
              />
            </div>
          </div>

          {/* Line 2: parent link + assignee */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground pl-5">
            {t.project ? (
              <ParentLink
                name={t.project.name}
                href={`/projects/${t.project.id}`}
                domain="project"
              />
            ) : null}
            {t.project && assigneeName && (
              <span aria-hidden="true" className="text-muted-foreground/50">·</span>
            )}
            {assigneeName && <span className="truncate">{assigneeName}</span>}
          </div>

          {/* Line 3: blocked reason or recurrence badge */}
          {isBlocked && t.blockedReason && (
            <p className="text-xs text-destructive italic truncate pl-5">
              {t.blockedReason}
            </p>
          )}
          {!isBlocked && showRecurrence && (
            <div className="pl-5">
              <RecurrenceBadge
                pattern={t.recurrencePattern}
                lastExecuted={t.lastExecutedAt}
              />
            </div>
          )}
        </div>
      )
    },
  },
  {
    key: "dueDate",
    header: "Scadenza",
    sortable: true,
    className: "w-[130px]",
    cell: (t) => {
      if (t.isRecurring && t.status !== "done" && t.status !== "cancelled") {
        return t.updatedAt ? (
          <span className="text-xs text-muted-foreground">
            Ultima: {formatRelative(t.updatedAt)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )
      }
      return <DeadlineCell dueDate={t.dueDate} status={t.status} />
    },
  },
]

const filterConfig: FilterConfig[] = [
  {
    key: "search",
    label: "Cerca",
    type: "search",
    placeholder: "Cerca task...",
  },
  {
    key: "status",
    label: "Stato",
    type: "select",
    options: Object.entries(TASK_STATUS_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  },
  {
    key: "priority",
    label: "Priorità",
    type: "select",
    options: Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  },
  {
    key: "taskType",
    label: "Tipo",
    type: "select",
    options: Object.entries(TASK_TYPE_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  },
]

export default function TaskListPage() {
  useSetPageContext({ domain: "task" })
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const viewMode = searchParams.get("view") || "list"

  const filters = useMemo(
    () => ({
      page: searchParams.get("page") || "1",
      limit: "20",
      search: searchParams.get("search") || "",
      status: searchParams.get("status") || "",
      priority: searchParams.get("priority") || "",
      taskType: searchParams.get("taskType") || "",
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: searchParams.get("sortOrder") || "desc",
    }),
    [searchParams]
  )

  const { data, isLoading, error } = useTaskListQuery(filters)

  const tasks = (data?.data ?? []) as TaskRow[]
  const pagination = data?.pagination as
    | { page: number; limit: number; total: number; pages: number }
    | undefined

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    if (key !== "page") params.set("page", "1")
    setSearchParams(params)
  }

  const handleFilterClear = () => {
    const params = new URLSearchParams()
    if (viewMode !== "list") params.set("view", viewMode)
    setSearchParams(params)
  }

  const handlePageChange = (page: number) =>
    handleFilterChange("page", String(page))

  const handleSort = (key: string) => {
    const newOrder =
      filters.sortBy === key && filters.sortOrder === "asc" ? "desc" : "asc"
    const params = new URLSearchParams(searchParams)
    params.set("sortBy", key)
    params.set("sortOrder", newOrder)
    setSearchParams(params)
  }

  const handleViewChange = (mode: string) => {
    const params = new URLSearchParams(searchParams)
    if (mode === "list") {
      params.delete("view")
    } else {
      params.set("view", mode)
    }
    setSearchParams(params)
  }

  const viewToggle = (
    <div className="flex items-center rounded-md border bg-muted/50 p-0.5">
      {VIEW_MODES.map((mode) => {
        const Icon = mode.icon
        const active = viewMode === mode.key
        return (
          <Button
            key={mode.key}
            variant={active ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleViewChange(mode.key)}
            className={cn("h-8 px-2.5 gap-1.5", active && "shadow-sm")}
            title={mode.label}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">{mode.label}</span>
          </Button>
        )
      })}
    </div>
  )

  if (viewMode !== "list" && viewMode !== "table") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Task</h1>
          <div className="flex items-center gap-2">{viewToggle}</div>
        </div>

        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Construction className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">
            Vista {VIEW_MODES.find((m) => m.key === viewMode)?.label ?? viewMode}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">In arrivo nella Fase 9</p>
        </div>
      </div>
    )
  }

  // When a status filter is active, disable groupBy so filtered results are shown flat
  const useGroupBy = !filters.status

  return (
    <EntityList<TaskRow>
      title="Task"
      icon={ListChecks}
      data={tasks}
      pagination={pagination}
      isLoading={isLoading}
      error={error ?? undefined}
      columns={columns}
      getId={(t) => t.id}
      filterConfig={filterConfig}
      filters={filters}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
      sortBy={filters.sortBy}
      sortOrder={filters.sortOrder as "asc" | "desc"}
      onSort={handleSort}
      onPageChange={handlePageChange}
      onRowClick={(t) => navigate(`/tasks/${t.id}`)}
      createHref="/tasks/new"
      createLabel="Nuovo Task"
      emptyIcon={ListChecks}
      emptyTitle="Nessun task"
      emptyDescription="Crea il tuo primo task"
      headerExtra={viewToggle}
      rowClassName={(t) =>
        t.status === "blocked" ? "bg-destructive/5" : undefined
      }
      groupBy={
        useGroupBy
          ? {
              getGroup: getTaskGroup,
              order: TASK_STATUS_GROUP_ORDER,
              labels: { ...TASK_STATUS_LABELS, recurring: "Ricorrenti attive" },
              collapsedByDefault: COLLAPSED_BY_DEFAULT,
            }
          : undefined
      }
    />
  )
}
