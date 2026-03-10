import { useNavigate, useSearchParams } from "react-router-dom"
import { FolderKanban, ArrowUpDown } from "lucide-react"
import { arrayMove } from "@dnd-kit/sortable"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import { EntityList, type Column, type FilterConfig } from "@/components/common/EntityList"
import { ProgressRing } from "@/components/common/ProgressRing"
import { DeadlineCell } from "@/components/common/DeadlineCell"
import { ProblemIndicators } from "@/components/common/ProblemIndicators"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useProjectListQuery, useReorderProjects } from "@/hooks/api/useProjects"
import { usePrivilegedRole } from "@/hooks/ui/usePrivilegedRole"
import {
  PROJECT_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  PROJECT_STATUS_GROUP_ORDER,
  COLLAPSED_BY_DEFAULT,
} from "@/lib/constants"
import { toast } from "sonner"

interface ProjectRow {
  id: string
  code: string
  name: string
  status: string
  priority: string
  sortOrder: number
  targetEndDate?: string | null
  owner?: { firstName: string; lastName: string } | null
  stats?: {
    completionPercentage?: number
    totalTasks?: number
    completedTasks?: number
    blockedTasks?: number
    openRisks?: number
  } | null
  _count?: { tasks?: number; risks?: number } | null
}

const columns: Column<ProjectRow>[] = [
  {
    key: "name",
    header: "Progetto",
    sortable: true,
    cell: (p) => {
      const pct = p.stats?.completionPercentage ?? 0
      const blockedTasks = p.stats?.blockedTasks ?? 0
      const openRisks = p.stats?.openRisks ?? (p._count?.risks ?? 0)
      const ownerName = p.owner
        ? `${p.owner.firstName[0]}. ${p.owner.lastName}`
        : null
      const priorityLabel = TASK_PRIORITY_LABELS[p.priority] ?? p.priority

      return (
        <div className="min-w-0 py-1 space-y-0.5">
          {/* Line 1: ring + name + problem indicators */}
          <div className="flex items-center gap-2 min-w-0">
            <ProgressRing value={pct} size="sm" showLabel animated={false} />
            <span className="font-medium text-sm truncate leading-tight flex-1 min-w-0">
              {p.name}
            </span>
            <ProblemIndicators
              blockedTasks={blockedTasks > 0 ? blockedTasks : undefined}
              openRisks={openRisks > 0 ? openRisks : undefined}
            />
          </div>

          {/* Line 2: owner + priority */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground pl-9">
            {ownerName && <span>{ownerName}</span>}
            {ownerName && <span aria-hidden="true">·</span>}
            <span>{priorityLabel}</span>
          </div>

          {/* Line 3: progress bar */}
          <div className="pl-9 pr-2">
            <Progress value={pct} className="h-1" />
          </div>
        </div>
      )
    },
  },
  {
    key: "targetEndDate",
    header: "Scadenza",
    sortable: true,
    className: "w-[130px]",
    cell: (p) => (
      <DeadlineCell dueDate={p.targetEndDate} status={p.status} />
    ),
  },
]

const filterConfig: FilterConfig[] = [
  {
    key: "search",
    label: "Cerca",
    type: "search",
    placeholder: "Cerca progetti...",
  },
  {
    key: "status",
    label: "Stato",
    type: "select",
    options: Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({
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
]

export default function ProjectListPage() {
  useSetPageContext({ domain: "project" })
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isPrivileged } = usePrivilegedRole()
  const reorderMutation = useReorderProjects()

  const filters = {
    page: searchParams.get("page") || "1",
    limit: "20",
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "",
    priority: searchParams.get("priority") || "",
    sortBy: searchParams.get("sortBy") || "sortOrder",
    sortOrder: searchParams.get("sortOrder") || "asc",
  }

  const isManualOrder = filters.sortBy === "sortOrder"
  const canDrag = isManualOrder && isPrivileged

  const { data, isLoading, error } = useProjectListQuery(filters)

  const projects = (data?.data ?? []) as ProjectRow[]
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

  const handleFilterClear = () => setSearchParams({})

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

  const handleResetToManualOrder = () => {
    const params = new URLSearchParams(searchParams)
    params.delete("sortBy")
    params.delete("sortOrder")
    setSearchParams(params)
  }

  const handleReorder = (activeId: string, overId: string) => {
    const oldIndex = projects.findIndex((p) => p.id === activeId)
    const newIndex = projects.findIndex((p) => p.id === overId)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(projects, oldIndex, newIndex)
    const items = reordered.map((p, i) => ({ id: p.id, sortOrder: i }))

    reorderMutation.mutate(items, {
      onError: () => {
        toast.error("Errore nel riordinamento")
      },
    })
  }

  const manualOrderButton = !isManualOrder ? (
    <Button variant="outline" size="sm" onClick={handleResetToManualOrder}>
      <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
      Ordine manuale
    </Button>
  ) : null

  // When a status filter is active, disable groupBy to show flat filtered results
  const useGroupBy = !filters.status

  return (
    <EntityList<ProjectRow>
      title="Progetti"
      icon={FolderKanban}
      data={projects}
      pagination={pagination}
      isLoading={isLoading}
      error={error ?? undefined}
      columns={columns}
      getId={(p) => p.id}
      filterConfig={filterConfig}
      filters={filters}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
      sortBy={filters.sortBy}
      sortOrder={filters.sortOrder as "asc" | "desc"}
      onSort={handleSort}
      onPageChange={handlePageChange}
      onRowClick={(p) => navigate(`/projects/${p.id}`)}
      createHref="/projects/new"
      createLabel="Nuovo Progetto"
      emptyIcon={FolderKanban}
      emptyTitle="Nessun progetto"
      emptyDescription="Crea il tuo primo progetto"
      headerExtra={manualOrderButton}
      draggable={canDrag}
      onReorder={canDrag ? handleReorder : undefined}
      groupBy={
        useGroupBy
          ? {
              getGroup: (p) => p.status,
              order: PROJECT_STATUS_GROUP_ORDER,
              labels: PROJECT_STATUS_LABELS,
              collapsedByDefault: COLLAPSED_BY_DEFAULT,
            }
          : undefined
      }
    />
  )
}
