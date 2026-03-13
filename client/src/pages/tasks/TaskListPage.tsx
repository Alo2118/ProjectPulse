import { useCallback, useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import {
  ListChecks,
  List,
  Table2,
  LayoutGrid,
  GanttChart as GanttChartIcon,
  CalendarDays,
  Plus,
  Play,
  CheckCircle2,
  Trash2,
  XCircle,
} from "lucide-react"
import { KanbanBoard } from "@/components/domain/tasks/KanbanBoard"
import { GanttChart } from "@/components/domain/gantt/GanttChart"
import { CalendarView } from "@/components/domain/calendar/CalendarView"
import { EntityList, type Column, type FilterConfig } from "@/components/common/EntityList"
import { EntityRow } from "@/components/common/EntityRow"
import { TagFilter } from "@/components/common/TagFilter"
import { ListFilters } from "@/components/common/ListFilters"
import { StatusDot } from "@/components/common/StatusDot"
import { DeadlineCell } from "@/components/common/DeadlineCell"
import { ProblemIndicators } from "@/components/common/ProblemIndicators"
import { ParentLink } from "@/components/common/ParentLink"
import { RecurrenceBadge } from "@/components/common/RecurrenceBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useTaskListQuery, useBulkUpdateTasks, useBulkDeleteTasks } from "@/hooks/api/useTasks"
import { useStatsQuery } from "@/hooks/api/useStats"
import { useAttentionItemsQuery } from "@/hooks/api/useDashboard"
import { useSelectionStore } from "@/stores/selectionStore"
import { useListKeyboardNav } from "@/hooks/ui/useListKeyboardNav"
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_TYPE_LABELS,
  TASK_TYPE_COLORS,
  TASK_STATUS_GROUP_ORDER,
  COLLAPSED_BY_DEFAULT,
} from "@/lib/constants"
import type { AlertItem } from "@/components/common/AlertStrip"
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
  { key: "gantt", label: "Gantt", icon: GanttChartIcon },
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
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  // Selection store
  const { selectedIds, toggle, selectAll, clear } = useSelectionStore()

  // Bulk mutations
  const bulkUpdate = useBulkUpdateTasks()
  const bulkDelete = useBulkDeleteTasks()

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
      ...(selectedTagIds.length > 0 ? { tags: selectedTagIds.join(",") } : {}),
    }),
    [searchParams, selectedTagIds]
  )

  const { data, isLoading, error } = useTaskListQuery(filters)
  const { data: kpiCards } = useStatsQuery('tasks')
  const { data: attentionItems } = useAttentionItemsQuery()

  const tasks = (data?.data ?? []) as TaskRow[]
  const pagination = data?.pagination as
    | { page: number; limit: number; total: number; pages: number }
    | undefined

  // Keyboard navigation (only in list/table view)
  const isListView = viewMode === "list" || viewMode === "table"
  const handleKeyboardSelect = useCallback(
    (task: TaskRow) => navigate(`/tasks/${task.id}`),
    [navigate]
  )
  const { focusedIndex } = useListKeyboardNav({
    items: tasks,
    getId: (t) => t.id,
    onSelect: handleKeyboardSelect,
    enabled: isListView,
  })

  // Bulk action handlers
  const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds])

  const handleBulkStatus = useCallback(
    (status: string) => {
      if (selectedArray.length === 0) return
      bulkUpdate.mutate(
        { taskIds: selectedArray, updates: { status } },
        {
          onSuccess: () => {
            toast.success(`${selectedArray.length} task aggiornati a "${TASK_STATUS_LABELS[status] ?? status}"`)
            clear()
          },
          onError: () => {
            toast.error("Errore nell'aggiornamento dei task")
          },
        }
      )
    },
    [selectedArray, bulkUpdate, clear]
  )

  const handleBulkDelete = useCallback(() => {
    if (selectedArray.length === 0) return
    bulkDelete.mutate(
      { taskIds: selectedArray },
      {
        onSuccess: () => {
          toast.success(`${selectedArray.length} task eliminati`)
          clear()
        },
        onError: () => {
          toast.error("Errore nell'eliminazione dei task")
        },
      }
    )
  }, [selectedArray, bulkDelete, clear])

  const handleSelectAll = useCallback(() => {
    const allIds = tasks.map((t) => t.id)
    selectAll(allIds)
  }, [tasks, selectAll])

  const isBulkLoading = bulkUpdate.isPending || bulkDelete.isPending

  const bulkActions = (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleBulkStatus("in_progress")}
        disabled={isBulkLoading}
        className="gap-1.5"
      >
        <Play className="h-3.5 w-3.5" />
        Avvia
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleBulkStatus("done")}
        disabled={isBulkLoading}
        className="gap-1.5"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        Completa
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleBulkDelete}
        disabled={isBulkLoading}
        className="gap-1.5 text-destructive hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Elimina
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={clear}
        disabled={isBulkLoading}
        className="gap-1.5"
      >
        <XCircle className="h-3.5 w-3.5" />
        Deseleziona
      </Button>
    </>
  )

  // Alert items from attention query (filter to task-relevant items)
  const alertItems: AlertItem[] | undefined = attentionItems
    ? attentionItems
        .filter((item) => item.type === 'blocked_task' || item.type === 'due_soon')
        .map((item) => ({
          id: item.entityId,
          severity: (item.type === 'blocked_task' ? 'critical' : 'warning') as AlertItem['severity'],
          title: item.title,
          subtitle: item.extra ?? undefined,
          projectName: item.projectName ?? undefined,
          time: item.dueDate ? formatRelative(item.dueDate) : '',
        }))
    : undefined

  // Render row for list view using EntityRow
  const renderRow = useCallback(
    (t: TaskRow) => (
      <EntityRow
        id={t.id}
        name={t.title}
        status={t.status}
        entityType="task"
        onClick={() => navigate(`/tasks/${t.id}`)}
        code={t.code}
        deadline={t.dueDate ?? undefined}
        subtitle={t.project?.name}
        assignee={t.assignee ?? undefined}
        indicators={{
          comments: t._count?.comments,
          checklistTotal: t._count?.subtasks ?? t._count?.children,
          checklistDone: t._count?.subtasks ?? t._count?.children,
        }}
        extraBadges={
          <Badge
            variant="secondary"
            className={cn("text-[10px] px-1.5 py-0", TASK_TYPE_COLORS[t.taskType])}
          >
            {TASK_TYPE_LABELS[t.taskType] ?? t.taskType}
          </Badge>
        }
      />
    ),
    [navigate]
  )

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

  const projectId = searchParams.get("projectId") || undefined

  if (viewMode === "board" || viewMode === "gantt" || viewMode === "calendar") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-page-title text-foreground">Task</h1>
          <div className="flex items-center gap-2">
            {viewToggle}
            <Button size="sm" asChild>
              <Link to="/tasks/new">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Nuovo Task
              </Link>
            </Button>
          </div>
        </div>

        <ListFilters
          filters={filterConfig}
          values={filters}
          onChange={handleFilterChange}
          onClear={handleFilterClear}
        />

        {/* Quick chip filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { key: "", label: "Tutti", dot: "bg-muted-foreground" },
            { key: "in_progress", label: "In corso", dot: "bg-blue-500" },
            { key: "blocked", label: "Bloccati", dot: "bg-red-500" },
            { key: "review", label: "In revisione", dot: "bg-amber-500" },
            { key: "done", label: "Completati", dot: "bg-green-500" },
          ].map((chip) => (
            <button
              key={chip.key}
              type="button"
              className={cn("chip-filter", filters.status === chip.key && "active")}
              onClick={() => handleFilterChange("status", chip.key)}
            >
              <span className={cn("chip-dot", chip.dot)} />
              {chip.label}
            </button>
          ))}
        </div>

        {viewMode === "board" && <KanbanBoard projectId={projectId} />}
        {viewMode === "gantt" && <GanttChart projectId={projectId} />}
        {viewMode === "calendar" && <CalendarView projectId={projectId} />}
      </div>
    )
  }

  const useGroupBy = !filters.status

  const chipFilterRow = (
    <div className="flex items-center gap-1.5 flex-wrap">
      {[
        { key: "", label: "Tutti", dot: "bg-muted-foreground" },
        { key: "in_progress", label: "In corso", dot: "bg-blue-500" },
        { key: "blocked", label: "Bloccati", dot: "bg-red-500" },
        { key: "review", label: "In revisione", dot: "bg-amber-500" },
        { key: "done", label: "Completati", dot: "bg-green-500" },
      ].map((chip) => (
        <button
          key={chip.key}
          type="button"
          className={cn("chip-filter", filters.status === chip.key && "active")}
          onClick={() => handleFilterChange("status", chip.key)}
        >
          <span className={cn("chip-dot", chip.dot)} />
          {chip.label}
        </button>
      ))}
    </div>
  )

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
      afterFilters={
        <div className="flex items-center gap-2 flex-wrap">
          {chipFilterRow}
          <TagFilter
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
          />
        </div>
      }
      alertItems={alertItems}
      renderRow={viewMode === "list" ? renderRow : undefined}
      rowClassName={(t) =>
        cn("row-accent", t.status === "blocked" ? "bg-destructive/5" : undefined)
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
      selectedIds={selectedIds}
      onSelectToggle={toggle}
      onSelectAll={handleSelectAll}
      bulkActions={bulkActions}
      focusedIndex={focusedIndex}
      kpiStrip={kpiCards}
    />
  )
}
