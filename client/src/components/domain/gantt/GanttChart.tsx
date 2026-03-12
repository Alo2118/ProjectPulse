import { useMemo, useRef, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  differenceInDays,
  addDays,
  startOfDay,
  format,
  parseISO,
  isWeekend,
  startOfWeek,
  addWeeks,
  getWeek,
} from "date-fns"
import { it } from "date-fns/locale"
import { motion } from "framer-motion"
import {
  ChevronRight,
  ChevronDown,
  FolderKanban,
  Flag,
  CheckSquare,
  ChevronsUpDown,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { getUserInitials, getAvatarColor } from "@/lib/utils"
import { GANTT_BAR_COLORS, TASK_STATUS_LABELS, STATUS_COLORS } from "@/lib/constants"
import { useGanttTasksQuery } from "@/hooks/api/useTasks"

// ─── Types ────────────────────────────────────────────────────────────────────

interface GanttTask {
  id: string
  code: string
  title: string
  status: string
  taskType: string
  startDate?: string | null
  dueDate?: string | null
  completionPercentage?: number | null
  assignee?: { id: string; firstName: string; lastName: string } | null
  project?: { id: string; name: string; status: string } | null
  parentId?: string | null
  dependencies?: string[]
}

interface ProjectNode {
  id: string
  name: string
  status: string
  milestones: MilestoneNode[]
  tasks: GanttTask[] // root-level tasks not under a milestone
}

interface MilestoneNode {
  id: string
  title: string
  dueDate?: string | null
  completionPercentage?: number | null
  status: string
  tasks: GanttTask[]
}

type FlatRow =
  | { kind: "project"; node: ProjectNode }
  | { kind: "milestone"; node: MilestoneNode; projectId: string }
  | { kind: "task"; task: GanttTask }

type ZoomLevel = "week" | "month" | "quarter"

interface ZoomConfig {
  dayWidth: number
  label: string
  /** number of days in the visible window */
  windowDays: number
}

interface GanttChartProps {
  projectId?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ZOOM_CONFIG: Record<ZoomLevel, ZoomConfig> = {
  week: { dayWidth: 20, label: "Settimana", windowDays: 42 },
  month: { dayWidth: 8, label: "Mese", windowDays: 120 },
  quarter: { dayWidth: 4, label: "Trimestre", windowDays: 270 },
}

const ROW_HEIGHT = 36
const HEADER_HEIGHT = 56
const LEFT_PANEL_WIDTH = 280

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(d: string | null | undefined): Date | null {
  if (!d) return null
  try {
    return startOfDay(parseISO(d))
  } catch {
    return null
  }
}

function buildTree(tasks: GanttTask[]): ProjectNode[] {
  // Collect unique projects
  const projectMap = new Map<string, ProjectNode>()

  for (const task of tasks) {
    const proj = task.project
    if (!proj) continue
    if (!projectMap.has(proj.id)) {
      projectMap.set(proj.id, {
        id: proj.id,
        name: proj.name,
        status: proj.status,
        milestones: [],
        tasks: [],
      })
    }
  }

  // Group milestones
  const milestoneMap = new Map<string, MilestoneNode>()
  for (const task of tasks) {
    if (task.taskType !== "milestone") continue
    const proj = task.project
    if (!proj) continue
    const projNode = projectMap.get(proj.id)
    if (!projNode) continue
    const msNode: MilestoneNode = {
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      completionPercentage: task.completionPercentage,
      status: task.status,
      tasks: [],
    }
    projNode.milestones.push(msNode)
    milestoneMap.set(task.id, msNode)
  }

  // Assign tasks to milestones or project root
  for (const task of tasks) {
    if (task.taskType === "milestone") continue
    const proj = task.project
    if (!proj) continue
    const projNode = projectMap.get(proj.id)
    if (!projNode) continue

    if (task.parentId && milestoneMap.has(task.parentId)) {
      milestoneMap.get(task.parentId)!.tasks.push(task)
    } else if (task.parentId) {
      // Subtask under another task — still find which milestone owns the parent
      const parentMs = [...milestoneMap.values()].find((ms) =>
        ms.tasks.some((t) => t.id === task.parentId)
      )
      if (parentMs) {
        parentMs.tasks.push(task)
      } else {
        projNode.tasks.push(task)
      }
    } else {
      projNode.tasks.push(task)
    }
  }

  return [...projectMap.values()]
}

function buildFlatRows(
  projects: ProjectNode[],
  collapsed: Set<string>
): FlatRow[] {
  const rows: FlatRow[] = []
  for (const proj of projects) {
    rows.push({ kind: "project", node: proj })
    if (collapsed.has(proj.id)) continue
    for (const ms of proj.milestones) {
      rows.push({ kind: "milestone", node: ms, projectId: proj.id })
      if (!collapsed.has(ms.id)) {
        for (const task of ms.tasks) {
          rows.push({ kind: "task", task })
        }
      }
    }
    for (const task of proj.tasks) {
      rows.push({ kind: "task", task })
    }
  }
  return rows
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface AssigneeAvatarProps {
  assignee: { firstName: string; lastName: string }
  size?: "xs" | "sm"
}

function AssigneeAvatar({ assignee, size = "xs" }: AssigneeAvatarProps) {
  const initials = getUserInitials(assignee.firstName, assignee.lastName)
  const color = getAvatarColor(`${assignee.firstName} ${assignee.lastName}`)
  const sizeClass = size === "xs" ? "h-4 w-4 text-[8px]" : "h-5 w-5 text-[9px]"
  return (
    <span
      className={cn(
        "inline-flex flex-shrink-0 items-center justify-center rounded-full font-bold text-white",
        sizeClass,
        color
      )}
      title={`${assignee.firstName} ${assignee.lastName}`}
    >
      {initials}
    </span>
  )
}

interface GanttBarProps {
  task: GanttTask
  left: number
  width: number
  onClick: () => void
}

function GanttBar({ task, left, width, onClick }: GanttBarProps) {
  const pct = task.completionPercentage ?? 0
  const isBlocked = task.status === "blocked"
  const barBase = GANTT_BAR_COLORS[task.status] ?? "bg-slate-400"
  const showLabel = width > 80

  const tooltipContent = (
    <div className="space-y-1 text-xs">
      <p className="font-semibold">{task.title}</p>
      <p className="text-muted-foreground">
        {TASK_STATUS_LABELS[task.status] ?? task.status} · {pct}%
      </p>
      {task.startDate && (
        <p className="text-muted-foreground">
          Inizio: {format(parseISO(task.startDate), "dd/MM/yyyy")}
        </p>
      )}
      {task.dueDate && (
        <p className="text-muted-foreground">
          Fine: {format(parseISO(task.dueDate), "dd/MM/yyyy")}
        </p>
      )}
      {task.assignee && (
        <p className="text-muted-foreground">
          Assegnato a: {task.assignee.firstName} {task.assignee.lastName}
        </p>
      )}
    </div>
  )

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            className={cn(
              "absolute top-[6px] h-6 cursor-pointer overflow-hidden rounded",
              "border transition-[filter] hover:brightness-110 focus:outline-none focus:ring-1 focus:ring-ring",
              isBlocked
                ? "border-red-500/50 bg-red-500/20"
                : cn(barBase, "bg-opacity-25 border-current/50")
            )}
            style={{ left, width: Math.max(width, 8) }}
            onClick={onClick}
            onKeyDown={(e) => e.key === "Enter" && onClick()}
          >
            {/* Progress fill */}
            {pct > 0 && (
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded opacity-40",
                  isBlocked ? "bg-red-500" : barBase
                )}
                style={{ width: `${pct}%` }}
              />
            )}

            {/* Label + assignee */}
            {showLabel && (
              <div className="relative flex h-full items-center justify-between gap-1 px-2">
                <span className="truncate text-[10px] font-semibold leading-none text-white/90">
                  {task.title}
                </span>
                {task.assignee && (
                  <AssigneeAvatar assignee={task.assignee} size="xs" />
                )}
              </div>
            )}

            {/* Blocked indicator for narrow bars */}
            {!showLabel && isBlocked && (
              <div className="flex h-full items-center justify-center">
                <AlertCircle className="h-3 w-3 text-red-400" />
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px]">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface MilestoneDiamondProps {
  left: number
  milestone: MilestoneNode
  today: Date
}

function MilestoneDiamond({ left, milestone, today }: MilestoneDiamondProps) {
  const dueDate = parseDate(milestone.dueDate)
  const pct = milestone.completionPercentage ?? 0
  const isOverdue = dueDate !== null && dueDate < today && pct < 100
  const isDone = milestone.status === "done" || pct >= 100

  const tooltipContent = (
    <div className="space-y-1 text-xs">
      <p className="font-semibold">{milestone.title}</p>
      {milestone.dueDate && (
        <p className="text-muted-foreground">
          Scadenza: {format(parseISO(milestone.dueDate), "dd/MM/yyyy")}
        </p>
      )}
      <p className="text-muted-foreground">Avanzamento: {pct}%</p>
      {isOverdue && (
        <p className="text-red-400 text-[10px]">Milestone in ritardo</p>
      )}
    </div>
  )

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "absolute top-[10px] h-4 w-4 cursor-pointer rounded-[3px] transition-[filter] hover:brightness-125",
              "rotate-45",
              isOverdue
                ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                : isDone
                ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                : "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]"
            )}
            style={{ left: left - 8 }}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px]">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ─── Header rendering helpers ─────────────────────────────────────────────────

interface HeaderGroup {
  label: string
  startIndex: number
  count: number
}

interface HeaderData {
  topGroups: HeaderGroup[]
  bottomCols: Array<{ label: string; isToday: boolean; isWeekend: boolean }>
}

function buildHeaderData(
  days: Date[],
  today: Date,
  zoom: ZoomLevel
): HeaderData {
  const MONTHS_IT = [
    "Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic",
  ]

  if (zoom === "week") {
    // Top row: month names; bottom row: day numbers
    const topGroups: HeaderGroup[] = []
    const bottomCols: Array<{ label: string; isToday: boolean; isWeekend: boolean }> = []

    let lastMonthKey = ""
    days.forEach((day, i) => {
      const monthKey = `${day.getFullYear()}-${day.getMonth()}`
      if (monthKey !== lastMonthKey) {
        topGroups.push({
          label: MONTHS_IT[day.getMonth()] + " " + day.getFullYear(),
          startIndex: i,
          count: 0,
        })
        lastMonthKey = monthKey
      }
      topGroups[topGroups.length - 1].count++
      bottomCols.push({
        label: String(day.getDate()),
        isToday: day.getTime() === today.getTime(),
        isWeekend: isWeekend(day),
      })
    })
    return { topGroups, bottomCols }
  }

  if (zoom === "month") {
    // Top row: month names; bottom row: abbreviated weekday (L M M G V S D)
    const DAYS_IT = ["D", "L", "M", "M", "G", "V", "S"]
    const topGroups: HeaderGroup[] = []
    const bottomCols: Array<{ label: string; isToday: boolean; isWeekend: boolean }> = []

    let lastMonthKey = ""
    days.forEach((day, i) => {
      const monthKey = `${day.getFullYear()}-${day.getMonth()}`
      if (monthKey !== lastMonthKey) {
        topGroups.push({
          label: MONTHS_IT[day.getMonth()] + " " + day.getFullYear(),
          startIndex: i,
          count: 0,
        })
        lastMonthKey = monthKey
      }
      topGroups[topGroups.length - 1].count++
      bottomCols.push({
        label: DAYS_IT[day.getDay()],
        isToday: day.getTime() === today.getTime(),
        isWeekend: isWeekend(day),
      })
    })
    return { topGroups, bottomCols }
  }

  // Quarter zoom: top row = month names (by week); bottom row = week numbers
  // Each column represents one week
  const topGroups: HeaderGroup[] = []
  const bottomCols: Array<{ label: string; isToday: boolean; isWeekend: boolean }> = []

  // In quarter mode days[] stores the Monday of each week
  let lastMonthKey = ""
  days.forEach((weekStart, i) => {
    const monthKey = `${weekStart.getFullYear()}-${weekStart.getMonth()}`
    if (monthKey !== lastMonthKey) {
      topGroups.push({
        label: MONTHS_IT[weekStart.getMonth()] + " " + weekStart.getFullYear(),
        startIndex: i,
        count: 0,
      })
      lastMonthKey = monthKey
    }
    topGroups[topGroups.length - 1].count++
    const weekNum = getWeek(weekStart, { locale: it })
    bottomCols.push({
      label: `S${weekNum}`,
      isToday: false,
      isWeekend: false,
    })
  })
  return { topGroups, bottomCols }
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GanttChart({ projectId }: GanttChartProps) {
  const navigate = useNavigate()
  const scrollBodyRef = useRef<HTMLDivElement>(null)
  const scrollHeaderRef = useRef<HTMLDivElement>(null)
  const leftBodyRef = useRef<HTMLDivElement>(null)

  const filters: Record<string, unknown> = {}
  if (projectId) filters.projectId = projectId

  const { data: rawTasks, isLoading } = useGanttTasksQuery(filters)

  const [zoom, setZoom] = useState<ZoomLevel>("month")
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const { dayWidth, windowDays } = ZOOM_CONFIG[zoom]

  // For quarter zoom we work in weeks, not days
  const isQuarter = zoom === "quarter"
  const unitWidth = isQuarter ? dayWidth * 7 : dayWidth

  const toggleNode = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const expandAll = useCallback(() => setCollapsed(new Set()), [])
  const collapseAll = useCallback(() => {
    if (!rawTasks) return
    const tasks = rawTasks as GanttTask[]
    const ids = new Set<string>()
    for (const t of tasks) {
      if (t.taskType === "milestone") ids.add(t.id)
      if (t.project) ids.add(t.project.id)
    }
    setCollapsed(ids)
  }, [rawTasks])

  const allExpanded = collapsed.size === 0

  // Build tree structure
  const projects = useMemo<ProjectNode[]>(() => {
    if (!rawTasks) return []
    return buildTree(rawTasks as GanttTask[])
  }, [rawTasks])

  // Flat rows for rendering (respects collapse state)
  const flatRows = useMemo<FlatRow[]>(
    () => buildFlatRows(projects, collapsed),
    [projects, collapsed]
  )

  // Tasks with dates (for timeline range)
  const tasksWithDates = useMemo<GanttTask[]>(() => {
    if (!rawTasks) return []
    return (rawTasks as GanttTask[]).filter((t) => t.startDate || t.dueDate)
  }, [rawTasks])

  const tasksWithoutDates = useMemo(() => {
    if (!rawTasks) return 0
    return (rawTasks as GanttTask[]).filter((t) => !t.startDate && !t.dueDate).length
  }, [rawTasks])

  // Compute timeline date range
  const { rangeStart, columnUnits } = useMemo(() => {
    const today = startOfDay(new Date())

    if (isQuarter) {
      // Use weeks as units
      const weekCount = Math.ceil(windowDays / 7)
      const start = startOfWeek(addDays(today, -Math.floor(windowDays / 3)), { weekStartsOn: 1 })
      const weeks = Array.from({ length: weekCount }, (_, i) => addWeeks(start, i))
      return { rangeStart: start, columnUnits: weeks }
    }

    if (tasksWithDates.length === 0) {
      const start = addDays(today, -7)
      const days = Array.from({ length: windowDays }, (_, i) => addDays(start, i))
      return { rangeStart: start, columnUnits: days }
    }

    let earliest = today
    let latest = today
    let first = true

    for (const task of tasksWithDates) {
      const s = parseDate(task.startDate)
      const e = parseDate(task.dueDate)
      const dates = [s, e].filter((d): d is Date => d !== null)
      for (const d of dates) {
        if (first || d < earliest) earliest = d
        if (first || d > latest) latest = d
        first = false
      }
    }

    const paddedStart = addDays(earliest, -7)
    const paddedEnd = addDays(latest, 14)
    const span = Math.max(differenceInDays(paddedEnd, paddedStart), windowDays)
    const days = Array.from({ length: span }, (_, i) => addDays(paddedStart, i))
    return { rangeStart: paddedStart, columnUnits: days }
  }, [tasksWithDates, isQuarter, windowDays])

  const today = startOfDay(new Date())
  const totalWidth = columnUnits.length * unitWidth

  // Compute today line X position
  const todayX = useMemo(() => {
    if (isQuarter) {
      const weekDiff = differenceInDays(today, rangeStart) / 7
      return weekDiff * unitWidth
    }
    const diff = differenceInDays(today, rangeStart)
    return diff * dayWidth + dayWidth / 2
  }, [isQuarter, today, rangeStart, unitWidth, dayWidth])

  // Build header data
  const headerData = useMemo(
    () => buildHeaderData(columnUnits, today, zoom),
    [columnUnits, today, zoom]
  )

  // Compute bar position for a task
  const getBarPosition = useCallback(
    (task: GanttTask): { left: number; width: number } | null => {
      if (isQuarter) {
        const s = parseDate(task.startDate)
        const e = parseDate(task.dueDate)
        if (!s && !e) return null
        const startDay = s ?? e!
        const endDay = e ?? s!
        const startWeeks = differenceInDays(startDay, rangeStart) / 7
        const endWeeks = differenceInDays(endDay, rangeStart) / 7
        const left = startWeeks * unitWidth + 2
        const width = Math.max((endWeeks - startWeeks) * unitWidth, 6) - 4
        return { left, width }
      }
      const s = parseDate(task.startDate)
      const e = parseDate(task.dueDate)
      if (!s && !e) return null
      const startDay = s ?? e!
      const endDay = e ?? s!
      const startOffset = differenceInDays(startDay, rangeStart)
      const endOffset = differenceInDays(endDay, rangeStart)
      const left = startOffset * dayWidth + 2
      const width = Math.max((endOffset - startOffset + 1) * dayWidth, 8) - 4
      return { left, width }
    },
    [isQuarter, rangeStart, dayWidth, unitWidth]
  )

  // Get diamond X for milestone
  const getMilestoneX = useCallback(
    (ms: MilestoneNode): number | null => {
      const d = parseDate(ms.dueDate)
      if (!d) return null
      if (isQuarter) {
        return (differenceInDays(d, rangeStart) / 7) * unitWidth
      }
      return differenceInDays(d, rangeStart) * dayWidth + dayWidth / 2
    },
    [isQuarter, rangeStart, dayWidth, unitWidth]
  )

  // Sync scroll between left panel and right panel (vertical), and header/body (horizontal)
  const handleBodyScroll = useCallback(() => {
    const body = scrollBodyRef.current
    const header = scrollHeaderRef.current
    const leftBody = leftBodyRef.current
    if (!body) return
    if (header) header.scrollLeft = body.scrollLeft
    if (leftBody) leftBody.scrollTop = body.scrollTop
  }, [])

  const handleLeftScroll = useCallback(() => {
    const leftBody = leftBodyRef.current
    const body = scrollBodyRef.current
    if (!leftBody || !body) return
    body.scrollTop = leftBody.scrollTop
  }, [])

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-2 p-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-28" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    )
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  const hasData = projects.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-3"
    >
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Zoom selector */}
        <div className="flex items-center gap-0.5 rounded-md border bg-muted/40 p-0.5">
          {(Object.keys(ZOOM_CONFIG) as ZoomLevel[]).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setZoom(level)}
              className={cn(
                "rounded px-3 py-1 text-xs font-semibold transition-colors",
                zoom === level
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {ZOOM_CONFIG[level].label}
            </button>
          ))}
        </div>

        {/* Expand / collapse all */}
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={allExpanded ? collapseAll : expandAll}
        >
          <ChevronsUpDown className="h-3.5 w-3.5" />
          {allExpanded ? "Comprimi tutto" : "Espandi tutto"}
        </Button>

        {/* Task count badge */}
        {rawTasks && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {(rawTasks as GanttTask[]).length} task
          </Badge>
        )}
      </div>

      {/* Warning about tasks without dates */}
      {tasksWithoutDates > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {tasksWithoutDates} task senza date non{" "}
          {tasksWithoutDates === 1 ? "visualizzabile" : "visualizzabili"}
        </div>
      )}

      {/* ── Empty state ── */}
      {!hasData && (
        <div className="rounded-lg border-2 border-dashed border-muted py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Nessun task con date disponibili
          </p>
        </div>
      )}

      {/* ── Main Gantt ── */}
      {hasData && (
        <div className="overflow-hidden rounded-lg border bg-background">
          <div className="flex" style={{ height: "calc(100vh - 280px)", minHeight: 300 }}>

            {/* ── LEFT PANEL ── */}
            <div
              className="flex flex-shrink-0 flex-col border-r bg-card"
              style={{ width: LEFT_PANEL_WIDTH }}
            >
              {/* Left header */}
              <div
                className="flex flex-shrink-0 items-center gap-2 border-b px-3"
                style={{ height: HEADER_HEIGHT }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  GANTT
                </span>
                <Badge variant="secondary" className="text-[9px]">
                  {flatRows.length}
                </Badge>
              </div>

              {/* Left body — scrollable vertically */}
              <div
                ref={leftBodyRef}
                className="flex-1 overflow-y-auto overflow-x-hidden"
                onScroll={handleLeftScroll}
                style={{ scrollbarWidth: "none" }}
              >
                {flatRows.map((row, i) => {
                  if (row.kind === "project") {
                    const isCollapsed = collapsed.has(row.node.id)
                    const childCount =
                      row.node.milestones.length + row.node.tasks.length
                    return (
                      <button
                        key={`proj-${row.node.id}-${i}`}
                        type="button"
                        className="flex w-full items-center gap-1.5 border-b bg-muted/30 px-2 text-left transition-colors hover:bg-accent"
                        style={{ height: ROW_HEIGHT }}
                        onClick={() => toggleNode(row.node.id)}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                        )}
                        <FolderKanban className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                        <span className="min-w-0 flex-1 truncate text-xs font-bold">
                          {row.node.name}
                        </span>
                        {childCount > 0 && (
                          <Badge
                            variant="secondary"
                            className="flex-shrink-0 text-[9px] px-1 py-0"
                          >
                            {childCount}
                          </Badge>
                        )}
                        <span
                          className={cn(
                            "flex-shrink-0 rounded-full px-1.5 py-px text-[9px] font-semibold",
                            STATUS_COLORS[row.node.status] ?? "bg-muted text-muted-foreground"
                          )}
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/projects/${row.node.id}`)
                          }}
                        >
                          {row.node.status === "active"
                            ? "Attivo"
                            : row.node.status === "on_hold"
                            ? "Pausa"
                            : row.node.status === "completed"
                            ? "Completato"
                            : row.node.status === "cancelled"
                            ? "Annullato"
                            : row.node.status}
                        </span>
                      </button>
                    )
                  }

                  if (row.kind === "milestone") {
                    const isCollapsed = collapsed.has(row.node.id)
                    const pct = row.node.completionPercentage ?? 0
                    const dueDate = parseDate(row.node.dueDate)
                    const isOverdue =
                      dueDate !== null && dueDate < today && pct < 100
                    return (
                      <button
                        key={`ms-${row.node.id}-${i}`}
                        type="button"
                        className="flex w-full items-center gap-1.5 border-b border-border/40 pl-5 pr-2 text-left transition-colors hover:bg-accent"
                        style={{ height: ROW_HEIGHT }}
                        onClick={() => toggleNode(row.node.id)}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                        )}
                        <Flag
                          className={cn(
                            "h-3 w-3 flex-shrink-0",
                            isOverdue ? "text-red-500" : "text-purple-500"
                          )}
                        />
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-[11px] font-semibold",
                            isOverdue
                              ? "text-red-500"
                              : "text-muted-foreground"
                          )}
                        >
                          {row.node.title}
                        </span>
                        <span className="flex-shrink-0 text-[9px] text-muted-foreground">
                          {pct}%
                        </span>
                      </button>
                    )
                  }

                  // task
                  const task = row.task
                  const isBlocked = task.status === "blocked"
                  return (
                    <div
                      key={`task-${task.id}-${i}`}
                      className="flex items-center gap-1.5 border-b border-border/30 pl-9 pr-2 transition-colors hover:bg-accent"
                      style={{ height: ROW_HEIGHT }}
                    >
                      <CheckSquare className="h-3 w-3 flex-shrink-0 text-muted-foreground/60" />
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left text-[11px] text-muted-foreground hover:text-foreground"
                        onClick={() => navigate(`/tasks/${task.id}`)}
                      >
                        {task.title}
                      </button>
                      {isBlocked && (
                        <span className="flex-shrink-0 rounded-[2px] border border-red-500/20 bg-red-500/10 px-1 py-px text-[8px] font-bold uppercase text-red-400">
                          Bloccato
                        </span>
                      )}
                      {task.assignee && (
                        <AssigneeAvatar assignee={task.assignee} size="xs" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              {/* Timeline header — horizontal scroll only, no vertical */}
              <div
                ref={scrollHeaderRef}
                className="flex-shrink-0 overflow-hidden border-b bg-card"
                style={{ height: HEADER_HEIGHT }}
              >
                <div
                  className="relative h-full"
                  style={{ width: totalWidth }}
                >
                  {/* Top row: month/quarter group labels */}
                  <div className="absolute top-0 flex h-7 w-full items-center border-b border-border/40">
                    {headerData.topGroups.map((grp, i) => (
                      <div
                        key={i}
                        className="absolute flex h-full items-center overflow-hidden border-r border-border/40 pl-2"
                        style={{
                          left: grp.startIndex * unitWidth,
                          width: grp.count * unitWidth,
                        }}
                      >
                        <span className="truncate text-[10px] font-bold text-muted-foreground">
                          {grp.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Bottom row: day/week column labels */}
                  <div className="absolute bottom-0 flex h-7 w-full items-center">
                    {headerData.bottomCols.map((col, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex h-full flex-shrink-0 items-center justify-center border-r border-border/20",
                          col.isWeekend && "bg-muted/40",
                          col.isToday && "bg-primary/10"
                        )}
                        style={{ width: unitWidth }}
                      >
                        <span
                          className={cn(
                            "text-[9px] font-medium",
                            col.isWeekend && "opacity-50",
                            col.isToday
                              ? "font-bold text-primary"
                              : "text-muted-foreground"
                          )}
                        >
                          {col.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chart body — scrollable both axes */}
              <div
                ref={scrollBodyRef}
                className="relative flex-1 overflow-auto"
                onScroll={handleBodyScroll}
              >
                <div
                  className="relative"
                  style={{
                    width: totalWidth,
                    height: flatRows.length * ROW_HEIGHT,
                  }}
                >
                  {/* Weekend / grid column backgrounds */}
                  {headerData.bottomCols.map((col, i) =>
                    col.isWeekend ? (
                      <div
                        key={i}
                        className="pointer-events-none absolute inset-y-0 bg-muted/25"
                        style={{ left: i * unitWidth, width: unitWidth }}
                      />
                    ) : null
                  )}

                  {/* Vertical grid lines */}
                  {headerData.bottomCols.map((col, i) => (
                    <div
                      key={`vline-${i}`}
                      className={cn(
                        "pointer-events-none absolute top-0 w-px",
                        col.isToday
                          ? "bg-primary/40 z-10"
                          : "bg-border/30"
                      )}
                      style={{
                        left: i * unitWidth,
                        height: flatRows.length * ROW_HEIGHT,
                      }}
                    />
                  ))}

                  {/* Today line (red) */}
                  {todayX >= 0 && todayX <= totalWidth && (
                    <div
                      className="pointer-events-none absolute top-0 z-10 w-0.5 bg-red-500/70"
                      style={{
                        left: todayX,
                        height: flatRows.length * ROW_HEIGHT,
                      }}
                    />
                  )}

                  {/* Row backgrounds + bars */}
                  {flatRows.map((row, idx) => {
                    const top = idx * ROW_HEIGHT
                    const rowBg =
                      row.kind === "project"
                        ? "bg-muted/20 border-b border-border"
                        : "border-b border-border/30"

                    return (
                      <div
                        key={idx}
                        className={cn("absolute left-0 right-0", rowBg)}
                        style={{ top, height: ROW_HEIGHT, width: totalWidth }}
                      >
                        {/* Task bar */}
                        {row.kind === "task" && (() => {
                          const pos = getBarPosition(row.task)
                          if (!pos) return null
                          return (
                            <GanttBar
                              task={row.task}
                              left={pos.left}
                              width={pos.width}
                              onClick={() => navigate(`/tasks/${row.task.id}`)}
                            />
                          )
                        })()}

                        {/* Milestone diamond */}
                        {row.kind === "milestone" && (() => {
                          const x = getMilestoneX(row.node)
                          if (x === null) return null
                          return (
                            <MilestoneDiamond
                              left={x}
                              milestone={row.node}
                              today={today}
                            />
                          )
                        })()}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
