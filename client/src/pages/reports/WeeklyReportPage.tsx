import React, { useState, useMemo } from "react"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import { cn, formatDate, getDeadlineUrgency, getUserInitials } from "@/lib/utils"
import { toast } from "sonner"
import { motion } from "framer-motion"
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  getISOWeek,
  format,
  parseISO,
  differenceInDays,
  startOfDay,
  addDays,
} from "date-fns"
import { it } from "date-fns/locale"
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Download,
  Send,
  Clock,
  CheckSquare,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  Flag,
  ListChecks,
  BarChart2,
  CalendarDays,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import {
  useWeeklyReportPreviewQuery,
  useGenerateWeeklyReport,
} from "@/hooks/api/useWeeklyReports"
import { useTaskListQuery } from "@/hooks/api/useTasks"
import { useProjectListQuery } from "@/hooks/api/useProjects"
import { useRiskListQuery } from "@/hooks/api/useRisks"
import { useTeamTimeReportQuery, useMyTimeReportQuery } from "@/hooks/api/useTimeEntries"
import { useCurrentUser } from "@/hooks/api/useAuth"
import type { Task, Project, Risk, TimeEntry, TeamTimeReport } from "@/types"
import {
  PROJECT_STATUS_LABELS,
  RISK_LEVEL_LABELS,
  getRiskLevel,
} from "@/lib/constants"

// ─── Types ──────────────────────────────────────────────────────────────────

type RoleView = "direzione" | "dipendente"
type PeriodView = "week" | "month" | "quarter"

interface KpiCardData {
  label: string
  value: string
  valueColor: string
  delta?: string
  deltaDir?: "up" | "down"
  subtitle: string
  gradient: string
}

interface HoursDayEntry {
  day: string
  hours: number
}

// ─── Animation variants ──────────────────────────────────────────────────────

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]

function buildHoursPerDay(entries: TimeEntry[], weekStart: Date): HoursDayEntry[] {
  const slots: HoursDayEntry[] = DAY_LABELS.map((day) => ({ day, hours: 0 }))
  for (const entry of entries) {
    if (!entry.startTime) continue
    const d = parseISO(entry.startTime)
    const diff = differenceInDays(startOfDay(d), startOfDay(weekStart))
    if (diff >= 0 && diff <= 6) {
      const minutes = entry.duration ?? 0
      slots[diff].hours = Math.round((slots[diff].hours * 60 + minutes) / 60 * 10) / 10
    }
  }
  return slots
}

function buildHeatmapData(entries: TimeEntry[], weekEnd: Date): number[] {
  const cells = new Array<number>(28).fill(0)
  const refMonday = startOfDay(addDays(startOfWeek(weekEnd, { weekStartsOn: 1 }), -21))
  for (const entry of entries) {
    if (!entry.startTime) continue
    const d = startOfDay(parseISO(entry.startTime))
    const diff = differenceInDays(d, refMonday)
    if (diff >= 0 && diff < 28) {
      cells[diff] = Math.round((cells[diff] * 60 + (entry.duration ?? 0)) / 60 * 10) / 10
    }
  }
  return cells
}

const TASK_STATUS_DISPLAY: Record<string, { label: string; dotClass: string; badgeClass: string }> = {
  done:        { label: "Completato",  dotClass: "bg-green-500",  badgeClass: "bg-green-500/10 text-green-400 border-green-500/25" },
  in_progress: { label: "In corso",   dotClass: "bg-blue-500",   badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/25" },
  review:      { label: "Revisione",  dotClass: "bg-yellow-500", badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/25" },
  blocked:     { label: "Bloccato",   dotClass: "bg-red-500",    badgeClass: "bg-red-500/10 text-red-400 border-red-500/25" },
  todo:        { label: "Da iniziare",dotClass: "bg-slate-500",  badgeClass: "bg-slate-500/10 text-slate-400 border-slate-500/25" },
  cancelled:   { label: "Annullato",  dotClass: "bg-gray-500",   badgeClass: "bg-gray-500/10 text-gray-400 border-gray-500/25" },
}

function milestoneProgress(task: Task): number {
  if (task.subtasks && task.subtasks.length > 0) {
    const done = task.subtasks.filter((s) => s.status === "done").length
    return Math.round((done / task.subtasks.length) * 100)
  }
  if (task.status === "done") return 100
  if (task.status === "review") return 80
  if (task.status === "in_progress") return 50
  return 0
}

function deadlineColor(dueDate: string | null | undefined): string {
  const urgency = getDeadlineUrgency(dueDate)
  if (urgency === "overdue" || urgency === "urgent") return "text-red-400"
  if (urgency === "soon") return "text-orange-400"
  return "text-muted-foreground"
}

const PROJECT_GRADIENT_KEYS = ["primary", "success", "milestone", "warning", "indigo", "slate"] as const
type GradientKey = typeof PROJECT_GRADIENT_KEYS[number]

const GRADIENT_CSS: Record<GradientKey, string> = {
  primary: "from-blue-800 to-blue-500",
  success: "from-green-800 to-green-500",
  milestone: "from-purple-800 to-purple-500",
  warning: "from-orange-900 to-orange-500",
  indigo: "from-indigo-900 to-indigo-500",
  slate: "from-slate-700 to-slate-500",
}

const DOT_COLORS: Record<GradientKey, string> = {
  primary: "bg-blue-500",
  success: "bg-green-500",
  milestone: "bg-purple-500",
  warning: "bg-orange-500",
  indigo: "bg-indigo-500",
  slate: "bg-slate-500",
}

const AVATAR_BG_CLASSES = [
  "bg-green-500/15 text-green-400",
  "bg-blue-500/15 text-blue-400",
  "bg-purple-500/15 text-purple-400",
  "bg-orange-500/15 text-orange-400",
  "bg-indigo-500/15 text-indigo-400",
]

const containerVariants = {
  animate: { transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({ kpi }: { kpi: KpiCardData }) {
  return (
    <Card
      className="kpi-accent card-hover overflow-hidden"
      style={{ "--kpi-gradient": kpi.gradient } as React.CSSProperties}
    >
      <CardContent className="p-4">
        <p className="text-kpi-label mb-1">
          {kpi.label}
        </p>
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className={cn("text-kpi-value-lg leading-none text-data", kpi.valueColor)}>
            {kpi.value}
          </span>
          {kpi.delta && (
            <span
              className={cn(
                "text-[10px] font-semibold inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded",
                kpi.deltaDir === "up"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-red-500/10 text-red-400"
              )}
            >
              {kpi.deltaDir === "up" ? (
                <TrendingUp className="h-2.5 w-2.5" />
              ) : (
                <TrendingDown className="h-2.5 w-2.5" />
              )}
              {kpi.delta}
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">{kpi.subtitle}</p>
      </CardContent>
    </Card>
  )
}

interface HoursBarChartProps {
  data: HoursDayEntry[]
  isLoading?: boolean
}

function HoursBarChart({ data, isLoading }: HoursBarChartProps) {
  const workDays = data.filter((d, i) => i < 5 && d.hours > 0)
  const totalHours = data.reduce((s, d) => s + d.hours, 0)
  const avgHours = workDays.length > 0 ? totalHours / workDays.length : 0
  const maxEntry = data.reduce((a, b) => (b.hours > a.hours ? b : a), { day: "—", hours: 0 })

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />
  }

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={80}>
        <BarChart data={data} barCategoryGap="20%">
          <XAxis
            dataKey="day"
            tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <RechartsTooltip
            cursor={{ fill: "hsl(var(--accent))" }}
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
              fontSize: 11,
              color: "hsl(var(--foreground))",
            }}
            formatter={(value: number) => [`${value}h`, "Ore"]}
          />
          <Bar dataKey="hours" radius={[3, 3, 0, 0]}>
            {data.map((entry, index) => {
              const isWeekend = index >= 5
              const isPeak = entry.hours > 0 && entry.hours === maxEntry.hours
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    isWeekend
                      ? "hsl(var(--border))"
                      : isPeak
                      ? "hsl(var(--success))"
                      : "hsl(var(--primary))"
                  }
                />
              )
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 text-[10px]">
        <span>
          <span className="text-muted-foreground">Totale</span>
          <span className="font-bold text-blue-400 ml-1.5 text-data">
            {totalHours > 0 ? `${totalHours.toFixed(1)}h` : "—"}
          </span>
        </span>
        <span>
          <span className="text-muted-foreground">Media/giorno</span>
          <span className="font-bold text-foreground ml-1.5 text-data">
            {avgHours > 0 ? `${avgHours.toFixed(1)}h` : "—"}
          </span>
        </span>
        <span>
          <span className="text-muted-foreground">Picco</span>
          <span className="font-bold text-green-400 ml-1.5 text-data">
            {maxEntry.hours > 0 ? `${maxEntry.day} · ${maxEntry.hours}h` : "—"}
          </span>
        </span>
      </div>
    </div>
  )
}

function DonutChart({ tasks, isLoading }: { tasks: Task[]; isLoading?: boolean }) {
  const counts = useMemo(() => ({
    done: tasks.filter((t) => t.status === "done").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    review: tasks.filter((t) => t.status === "review").length,
    todo: tasks.filter((t) => t.status === "todo").length,
    blocked: tasks.filter((t) => t.status === "blocked").length,
  }), [tasks])
  const total = Object.values(counts).reduce((s, v) => s + v, 0)
  const circ = 2 * Math.PI * 30
  const segments = [
    { value: counts.done,        color: "hsl(var(--success))",          label: "Completati",   textColor: "text-green-400" },
    { value: counts.in_progress, color: "hsl(var(--primary))",          label: "In corso",     textColor: "text-blue-400" },
    { value: counts.review,      color: "hsl(var(--warning))",          label: "In revisione", textColor: "text-yellow-400" },
    { value: counts.todo,        color: "hsl(var(--muted-foreground))", label: "Da iniziare",  textColor: "text-slate-400" },
    { value: counts.blocked,     color: "hsl(var(--destructive))",      label: "Bloccati",     textColor: "text-red-400" },
  ]
  if (isLoading) {
    return (
      <div className="flex items-center gap-4">
        <Skeleton className="w-[90px] h-[90px] rounded-full flex-shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-3 w-full" />)}
        </div>
      </div>
    )
  }
  let offset = 0
  const arcs = segments.map((seg) => {
    const dash = total > 0 ? (seg.value / total) * circ : 0
    const gap = circ - dash
    const arc = { dash, gap, offset, ...seg }
    offset += dash
    return arc
  })
  return (
    <div className="flex items-center gap-4">
      <svg width="90" height="90" viewBox="0 0 90 90" className="flex-shrink-0">
        <circle cx="45" cy="45" r="30" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
        {arcs.map((arc, i) => (
          <circle key={i} cx="45" cy="45" r="30" fill="none" stroke={arc.color} strokeWidth="10"
            strokeDasharray={`${arc.dash} ${arc.gap}`} strokeDashoffset={-arc.offset} transform="rotate(-90 45 45)" />
        ))}
        <text x="45" y="41" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="14" fontWeight="700">{total}</text>
        <text x="45" y="52" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="7">task</text>
      </svg>
      <div className="flex flex-col gap-1.5 flex-1">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-[11px]">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: seg.color }} />
            <span className="text-muted-foreground flex-1">{seg.label}</span>
            <span className={cn("font-semibold", seg.textColor)}>{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProjectRows({ projects, isLoading }: { projects: Project[]; isLoading?: boolean }) {
  if (isLoading) return <div className="divide-y divide-border/50">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 my-1" />)}</div>
  if (projects.length === 0) return <p className="text-xs text-muted-foreground text-center py-4">Nessun progetto attivo</p>
  return (
    <div className="divide-y divide-border/50">
      {projects.map((p, idx) => {
        const gKey = PROJECT_GRADIENT_KEYS[idx % PROJECT_GRADIENT_KEYS.length]
        const stats = p.taskStats
        const pct = stats && stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
        const statusLabel = PROJECT_STATUS_LABELS[p.status] ?? p.status
        const statusClass =
          p.status === "active" ? "bg-blue-500/10 text-blue-400 border-blue-500/25" :
          p.status === "completed" ? "bg-green-500/10 text-green-400 border-green-500/25" :
          p.status === "on_hold" ? "bg-amber-500/10 text-amber-400 border-amber-500/25" :
                                   "bg-slate-500/10 text-slate-400 border-slate-500/25"
        return (
        <div key={p.id} className="flex items-center gap-2.5 py-2">
          <span className={cn("w-2 h-2 rounded-full flex-shrink-0", DOT_COLORS[gKey])} />
          <span className="flex-1 text-xs font-medium truncate text-foreground">{p.name}</span>
          <div className="w-20 flex-shrink-0">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={cn("h-full rounded-full bg-gradient-to-r", GRADIENT_CSS[gKey])} style={{ width: `${pct}%` }} />
            </div>
          </div>
          <span className="text-xs font-semibold w-8 text-right flex-shrink-0 text-foreground">{pct}%</span>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 flex-shrink-0", statusClass)}>
            {statusLabel}
          </Badge>
        </div>
        )
      })}
    </div>
  )
}

function RisksCard({ risks, isLoading }: { risks: Risk[]; isLoading?: boolean }) {
  if (isLoading) return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-7" />)}</div>
  if (risks.length === 0) return <p className="text-xs text-muted-foreground text-center py-4">Nessun rischio aperto</p>
  const criticalCount = risks.filter((r) => getRiskLevel(r.probability * r.impact) === "critical").length
  const highCount     = risks.filter((r) => getRiskLevel(r.probability * r.impact) === "high").length
  const mediumCount   = risks.filter((r) => getRiskLevel(r.probability * r.impact) === "medium").length
  const lowCount      = risks.filter((r) => getRiskLevel(r.probability * r.impact) === "low").length
  return (
    <div className="space-y-3">
      <div className="divide-y divide-border/50">
        {risks.slice(0, 5).map((r) => {
          const level = getRiskLevel(r.probability * r.impact)
          const levelLabel = RISK_LEVEL_LABELS[level] ?? level
          const levelClass =
            level === "critical" ? "bg-red-500/10 text-red-400 border-red-500/20" :
            level === "high"     ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
            level === "medium"   ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                   "bg-green-500/10 text-green-400 border-green-500/20"
          return (
          <div key={r.id} className="flex items-center gap-2 py-1.5">
            <Badge variant="outline" className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 flex-shrink-0 min-w-[42px] text-center justify-center", levelClass)}>
              {levelLabel}
            </Badge>
            <span className="flex-1 text-xs font-medium truncate text-foreground">{r.title}</span>
            <span className="text-[10px] whitespace-nowrap flex-shrink-0 text-muted-foreground">
              {r.project?.name ?? "—"}
            </span>
          </div>
          )
        })}
      </div>
      <div className="h-px bg-border" />
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center bg-red-500/6 border border-red-500/15 rounded p-2">
          <div className="text-base font-bold text-red-400">{criticalCount}</div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Critico</div>
        </div>
        <div className="text-center bg-orange-500/6 border border-orange-500/15 rounded p-2">
          <div className="text-base font-bold text-orange-400">{highCount}</div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Alto</div>
        </div>
        <div className="text-center bg-amber-500/8 border border-amber-500/20 rounded p-2">
          <div className="text-base font-bold text-amber-400">{mediumCount}</div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Medio</div>
        </div>
        <div className="text-center bg-slate-500/8 border border-slate-500/20 rounded p-2">
          <div className="text-base font-bold text-slate-400">{lowCount}</div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Basso</div>
        </div>
      </div>
    </div>
  )
}

function TeamRows({ report, tasks, isLoading }: { report: TeamTimeReport | undefined; tasks: Task[]; isLoading?: boolean }) {
  if (isLoading) return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
  if (!report || report.byUser.length === 0) return <p className="text-xs text-muted-foreground text-center py-4">Nessun dato disponibile</p>
  const maxHours = Math.max(...report.byUser.map((u) => u.totalMinutes / 60), 1)
  const totalHours = report.summary.totalHours
  const doneByUser: Record<string, number> = {}
  for (const t of tasks) {
    if (t.status === "done" && t.assigneeId) {
      doneByUser[t.assigneeId] = (doneByUser[t.assigneeId] ?? 0) + 1
    }
  }
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto_auto] text-[9px] font-semibold uppercase tracking-wider text-muted-foreground pb-1 border-b border-border mb-1">
        <span>Risorsa</span>
        <span className="text-right min-w-[38px]">Ore</span>
        <span className="text-right min-w-[55px]">Task chiusi</span>
      </div>
      <div className="divide-y divide-border/50">
        {report.byUser.map((u, idx) => {
          const hours = u.totalMinutes / 60
          const barPct = Math.round((hours / maxHours) * 100)
          const avClasses = AVATAR_BG_CLASSES[idx % AVATAR_BG_CLASSES.length]
          const initials = `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase()
          const gKey = PROJECT_GRADIENT_KEYS[idx % PROJECT_GRADIENT_KEYS.length]
          const doneTasks = doneByUser[u.userId] ?? 0
          return (
          <div key={u.userId} className="flex items-center gap-2.5 py-2">
            <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0", avClasses)}>{initials}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-foreground">{u.firstName} {u.lastName}</div>
              <div className="h-1 rounded-full bg-muted overflow-hidden mt-1">
                <div className={cn("h-full rounded-full bg-gradient-to-r", GRADIENT_CSS[gKey])} style={{ width: `${barPct}%` }} />
              </div>
            </div>
            <span className="text-xs font-semibold text-blue-400 min-w-[36px] text-right">{hours.toFixed(1)}h</span>
            <span className="text-[10px] text-muted-foreground min-w-[50px] text-right">{doneTasks} task</span>
          </div>
          )
        })}
      </div>
      <div className="h-px bg-border" />
      <div className="flex gap-4 text-[10px] pt-1">
        <span><span className="text-muted-foreground">Totale team</span><span className="font-bold text-blue-400 ml-1.5">{totalHours.toFixed(1)}h</span></span>
        <span><span className="text-muted-foreground">Risorse</span><span className="font-bold text-foreground ml-1.5">{report.byUser.length}</span></span>
      </div>
    </div>
  )
}

function MilestoneItems({ milestones, isLoading }: { milestones: Task[]; isLoading?: boolean }) {
  if (isLoading) return <div className="space-y-1.5">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
  if (milestones.length === 0) return <p className="text-xs text-muted-foreground text-center py-4">Nessuna milestone nei prossimi 30 giorni</p>
  return (
    <div className="space-y-1.5">
      {milestones.map((m, idx) => {
        const gKey = PROJECT_GRADIENT_KEYS[idx % PROJECT_GRADIENT_KEYS.length]
        const pct = milestoneProgress(m)
        const pctColorClass = pct >= 80 ? "text-green-400" : pct >= 50 ? "text-blue-400" : "text-muted-foreground"
        const dtColor = deadlineColor(m.dueDate)
        return (
        <div key={m.id} className="flex items-center gap-2.5 px-3 py-2 bg-accent/30 border border-border rounded hover:border-indigo-500/25 transition-colors cursor-pointer">
          <span className={cn("w-2 h-2 rounded-full flex-shrink-0", DOT_COLORS[gKey])} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-foreground truncate">{m.title}</div>
            <div className="text-[10px] text-muted-foreground">{m.project?.name ?? "—"}</div>
          </div>
          <span className={cn("text-xs font-semibold whitespace-nowrap min-w-[32px] text-right", pctColorClass)}>{pct}%</span>
          <span className={cn("text-[10px] whitespace-nowrap ml-2", dtColor)}>{m.dueDate ? formatDate(m.dueDate, "d MMM") : "—"}</span>
        </div>
        )
      })}
    </div>
  )
}

interface TaskTableProps {
  tasks: Task[]
  isLoading?: boolean
  filterStatus: string
  filterOp: string
  filterProject: string
  onFilterStatus: (v: string) => void
  onFilterOp: (v: string) => void
  onFilterProject: (v: string) => void
}

function TaskTable({ tasks, isLoading, filterStatus, filterOp, filterProject, onFilterStatus, onFilterOp, onFilterProject }: TaskTableProps) {
  const assignees = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    for (const t of tasks) {
      if (t.assignee) map.set(t.assignee.id, { id: t.assignee.id, name: `${t.assignee.firstName} ${t.assignee.lastName}` })
    }
    return Array.from(map.values())
  }, [tasks])
  const projectOpts = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    for (const t of tasks) {
      if (t.project) map.set(t.project.id, { id: t.project.id, name: t.project.name })
    }
    return Array.from(map.values())
  }, [tasks])
  const filtered = useMemo(() => tasks.filter(
    (t) =>
      (filterStatus === "__all__" || t.status === filterStatus) &&
      (filterOp === "__all__" || t.assigneeId === filterOp) &&
      (filterProject === "__all__" || t.projectId === filterProject)
  ), [tasks, filterStatus, filterOp, filterProject])

  const counts = useMemo(() => ({
    done:        tasks.filter((t) => t.status === "done").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    review:      tasks.filter((t) => t.status === "review").length,
    blocked:     tasks.filter((t) => t.status === "blocked").length,
  }), [tasks])

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-border"><Skeleton className="h-4 w-48" /></div>
        <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 flex-wrap">
          <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Stato task — settimana corrente
          </span>
          <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-400 border-green-500/25">
            {counts.done} chiusi
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/25">
            {counts.in_progress} in corso
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/25">
            {counts.review} in revisione
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/25">
            {counts.blocked} bloccati
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Select value={filterStatus} onValueChange={onFilterStatus}>
            <SelectTrigger className="h-7 text-[11px] w-[130px]">
              <SelectValue placeholder="Tutti gli stati" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tutti gli stati</SelectItem>
              <SelectItem value="done">Completati</SelectItem>
              <SelectItem value="in_progress">In corso</SelectItem>
              <SelectItem value="review">In revisione</SelectItem>
              <SelectItem value="blocked">Bloccati</SelectItem>
              <SelectItem value="todo">Da iniziare</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterOp} onValueChange={onFilterOp}>
            <SelectTrigger className="h-7 text-[11px] w-[140px]">
              <SelectValue placeholder="Tutti gli operatori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tutti gli operatori</SelectItem>
              {assignees.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterProject} onValueChange={onFilterProject}>
            <SelectTrigger className="h-7 text-[11px] w-[140px]">
              <SelectValue placeholder="Tutti i progetti" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tutti i progetti</SelectItem>
              {projectOpts.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_60px_90px_80px] px-4 py-2 bg-muted/50 border-b border-border text-table-header">
        <span>Task</span>
        <span>Progetto</span>
        <span>Stato</span>
        <span>Operatore</span>
        <span className="text-right">Ore</span>
        <span>Scadenza</span>
        <span>Chiuso il</span>
      </div>

      {/* Table rows */}
      {filtered.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-muted-foreground">
          Nessun task trovato
        </div>
      ) : (
        filtered.map((t, idx) => {
          const s = TASK_STATUS_DISPLAY[t.status] ?? TASK_STATUS_DISPLAY["todo"]
          const assigneeName = t.assignee
            ? `${t.assignee.firstName} ${t.assignee.lastName}`
            : "—"
          const initials = t.assignee
            ? getUserInitials(t.assignee.firstName, t.assignee.lastName)
            : "?"
          const avatarBg = AVATAR_BG_CLASSES[idx % AVATAR_BG_CLASSES.length]
          const hoursVal = t.actualHours ?? 0
          const dueDateText = t.dueDate ? formatDate(t.dueDate, "d MMM") : "—"
          const dueDateClass = deadlineColor(t.dueDate)
          const closedText =
            t.status === "done" && t.updatedAt ? formatDate(t.updatedAt, "d MMM") : "—"
          return (
            <div
              key={t.id}
              className="row-accent grid grid-cols-[2fr_1fr_1fr_1fr_60px_90px_80px] px-4 py-2 border-b border-border/40 last:border-0 items-center cursor-pointer text-xs"
            >
              <div className="flex items-center gap-1.5 pr-3 min-w-0">
                <span className="font-mono text-[9px] text-muted-foreground flex-shrink-0">{t.code}</span>
                <span className="truncate font-medium text-foreground">{t.title}</span>
              </div>
              <span className="text-[11px] font-medium text-blue-400 truncate">
                {t.project?.name ?? "—"}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", s.dotClass)} />
                <span className="text-[11px] font-medium text-foreground">{s.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0",
                    avatarBg
                  )}
                >
                  {initials}
                </span>
                <span className="text-[11px] font-medium text-foreground truncate">{assigneeName}</span>
              </div>
              <span className="text-right text-xs font-semibold text-blue-400 text-data">
                {hoursVal > 0 ? `${hoursVal}h` : "—"}
              </span>
              <span className={cn("text-[11px]", dueDateClass)}>{dueDateText}</span>
              <span className="text-[11px] text-muted-foreground">{closedText}</span>
            </div>
          )
        })
      )}
    </Card>
  )
}

function ActivityHeatmap({ data, isLoading }: { data: number[]; isLoading?: boolean }) {
  const heatData = data.length === 28 ? data : new Array<number>(28).fill(0)
  const maxVal = Math.max(...heatData, 1)
  const days = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]

  if (isLoading) {
    return (
      <div className="space-y-1">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {days.map((d) => (
            <Skeleton key={d} className="h-2 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 28 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {days.map((d) => (
          <span key={d} className="text-[9px] text-muted-foreground text-center font-medium">
            {d}
          </span>
        ))}
      </div>
      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {heatData.map((v, i) => {
          const isWeekend = i % 7 >= 5
          const intensity = maxVal > 0 ? v / maxVal : 0
          return (
            <div
              key={i}
              title={`${v.toFixed(1)}h`}
              className="aspect-square rounded cursor-default transition-opacity hover:opacity-70"
              style={{
                background:
                  isWeekend || v === 0
                    ? "hsl(var(--muted))"
                    : `hsl(var(--primary) / ${0.15 + intensity * 0.85})`,
                opacity: isWeekend ? 0.4 : 1,
              }}
            />
          )
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-[10px] text-muted-foreground">Meno</span>
        <div className="w-3 h-3 rounded-sm bg-muted" />
        <div className="w-3 h-3 rounded-sm" style={{ background: "hsl(var(--primary) / 0.2)" }} />
        <div className="w-3 h-3 rounded-sm" style={{ background: "hsl(var(--primary) / 0.4)" }} />
        <div className="w-3 h-3 rounded-sm" style={{ background: "hsl(var(--primary) / 0.65)" }} />
        <div className="w-3 h-3 rounded-sm bg-primary" />
        <span className="text-[10px] text-muted-foreground">Più</span>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function WeeklyReportPage() {
  useSetPageContext({ domain: "analytics" })

  const [weekOffset, setWeekOffset] = useState(0)
  const [period, setPeriod] = useState<PeriodView>("week")
  const [roleView, setRoleView] = useState<RoleView>("direzione")
  const [filterStatus, setFilterStatus] = useState("__all__")
  const [filterOp, setFilterOp] = useState("__all__")
  const [filterProject, setFilterProject] = useState("__all__")

  const currentUser = useCurrentUser()
  const preview = useWeeklyReportPreviewQuery()
  const generateReport = useGenerateWeeklyReport()

  // Week date range derived from offset
  const { weekStart, weekEnd, weekNumber, weekRangeLabel } = useMemo(() => {
    const base = new Date()
    const ws = startOfWeek(addWeeks(base, weekOffset), { weekStartsOn: 1 })
    const we = endOfWeek(addWeeks(base, weekOffset), { weekStartsOn: 1 })
    const wn = getISOWeek(ws)
    const label = `${format(ws, "d MMM", { locale: it })} — ${format(we, "d MMM yyyy", { locale: it })}`
    return { weekStart: ws, weekEnd: we, weekNumber: wn, weekRangeLabel: label }
  }, [weekOffset])

  // Real data hooks
  const tasksQuery = useTaskListQuery({ limit: 200 })
  const projectsQuery = useProjectListQuery({ limit: 100 })
  const risksQuery = useRiskListQuery({ limit: 100, status: "open" })
  const teamTimeQuery = useTeamTimeReportQuery({
    from: weekStart.toISOString(),
    to: weekEnd.toISOString(),
  })
  const myTimeQuery = useMyTimeReportQuery({
    from: weekStart.toISOString(),
    to: weekEnd.toISOString(),
  })

  // Extract arrays from paginated responses
  const allTasks = useMemo<Task[]>(() => {
    const raw = tasksQuery.data
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    if (typeof raw === "object" && "data" in raw && Array.isArray((raw as { data: unknown }).data))
      return (raw as { data: Task[] }).data
    return []
  }, [tasksQuery.data])

  const activeProjects = useMemo<Project[]>(() => {
    const raw = projectsQuery.data
    let list: Project[] = []
    if (!raw) return list
    if (Array.isArray(raw)) list = raw
    else if (typeof raw === "object" && "data" in raw && Array.isArray((raw as { data: unknown }).data))
      list = (raw as { data: Project[] }).data
    return list.filter((p) => p.status === "active")
  }, [projectsQuery.data])

  const openRisks = useMemo<Risk[]>(() => {
    const raw = risksQuery.data
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    if (typeof raw === "object" && "data" in raw && Array.isArray((raw as { data: unknown }).data))
      return (raw as { data: Risk[] }).data
    return []
  }, [risksQuery.data])

  const milestones = useMemo(
    () => allTasks.filter((t) => t.taskType === "milestone"),
    [allTasks]
  )

  const hoursData = useMemo(
    () => buildHoursPerDay((myTimeQuery.data as { entries?: TimeEntry[] })?.entries ?? [], weekStart),
    [myTimeQuery.data, weekStart]
  )

  const heatmapData = useMemo(
    () => buildHeatmapData((myTimeQuery.data as { entries?: TimeEntry[] })?.entries ?? [], weekEnd),
    [myTimeQuery.data, weekEnd]
  )

  // My tasks (assigned to current user)
  const myTasks = useMemo(() => {
    if (!currentUser.data) return []
    return allTasks.filter((t) => t.assigneeId === currentUser.data?.id)
  }, [allTasks, currentUser.data])

  // My upcoming deadlines
  const myDeadlines = useMemo(() => {
    return myTasks
      .filter((t) => t.dueDate && t.status !== "done" && t.status !== "cancelled")
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
      .slice(0, 6)
  }, [myTasks])

  // My active projects (derived from tasks assigned to me)
  const myActiveProjects = useMemo(() => {
    const seen = new Map<string, { name: string; taskCount: number; inProgressCount: number }>()
    for (const t of myTasks) {
      if (!t.project) continue
      const existing = seen.get(t.project.id) ?? { name: t.project.name, taskCount: 0, inProgressCount: 0 }
      existing.taskCount++
      if (t.status === "in_progress") existing.inProgressCount++
      seen.set(t.project.id, existing)
    }
    return Array.from(seen.entries()).map(([id, v], idx) => ({
      id,
      name: v.name,
      taskCount: v.taskCount,
      inProgressCount: v.inProgressCount,
      gradientKey: PROJECT_GRADIENT_KEYS[idx % PROJECT_GRADIENT_KEYS.length],
    }))
  }, [myTasks])

  // My hours by project
  type ByProject = Array<{ projectId: string; projectName: string; totalMinutes: number }>
  const myProjectHours = useMemo(
    () => ((myTimeQuery.data as { byProject?: ByProject } | undefined)?.byProject ?? []) as ByProject,
    [myTimeQuery.data]
  )

  // Build KPIs from real data
  const kpis: KpiCardData[] = useMemo(() => {
    const doneCount = allTasks.filter((t) => t.status === "done").length
    const totalHours = teamTimeQuery.data?.summary?.totalHours ?? 0
    const blockedCount = allTasks.filter((t) => t.status === "blocked").length
    const criticalRisks = openRisks.filter(
      (r) => getRiskLevel(r.probability * r.impact) === "critical"
    ).length
    return [
      {
        label: "Task chiusi",
        value: String(doneCount),
        valueColor: "text-green-400",
        subtitle: "completati questa settimana",
        gradient: "var(--gradient-success, linear-gradient(135deg, #22c55e, #16a34a))",
      },
      {
        label: "Ore loggate",
        value: `${Math.round(totalHours)}h`,
        valueColor: "text-blue-400",
        subtitle: "ore totali team",
        gradient: "var(--gradient-project, linear-gradient(135deg, #3b82f6, #2563eb))",
      },
      {
        label: "Progetti attivi",
        value: String(activeProjects.length),
        valueColor: "text-indigo-400",
        subtitle: "in corso",
        gradient: "var(--gradient-indigo, linear-gradient(135deg, #6366f1, #4f46e5))",
      },
      {
        label: "Rischi critici",
        value: String(criticalRisks),
        valueColor: criticalRisks > 0 ? "text-red-400" : "text-green-400",
        subtitle: `${openRisks.length} rischi aperti totali`,
        gradient: "var(--gradient-warning, linear-gradient(135deg, #f97316, #ea580c))",
      },
      {
        label: "Task bloccati",
        value: String(blockedCount),
        valueColor: blockedCount > 0 ? "text-red-400" : "text-green-400",
        subtitle: "da sbloccare",
        gradient: "var(--gradient-primary, linear-gradient(135deg, #64748b, #475569))",
      },
    ]
  }, [allTasks, teamTimeQuery.data, activeProjects, openRisks])

  // Build dipendente KPIs from personal data
  const dipKpis: KpiCardData[] = useMemo(() => {
    const myTimeData = myTimeQuery.data as { totalMinutes?: number; entries?: TimeEntry[]; byProject?: Array<{ projectId: string; projectName: string; totalMinutes: number }> } | undefined
    const myHours = Math.round((myTimeData?.totalMinutes ?? 0) / 60)
    const myProjects = myTimeData?.byProject?.length ?? 0
    return [
      {
        label: "Le mie ore",
        value: `${myHours}h`,
        valueColor: "text-blue-400",
        subtitle: "questa settimana",
        gradient: "var(--gradient-project, linear-gradient(135deg, #3b82f6, #2563eb))",
      },
      {
        label: "Task assegnati",
        value: String(allTasks.filter((t) => t.status !== "done").length),
        valueColor: "text-indigo-400",
        subtitle: "da completare",
        gradient: "var(--gradient-indigo, linear-gradient(135deg, #6366f1, #4f46e5))",
      },
      {
        label: "Completati",
        value: String(allTasks.filter((t) => t.status === "done").length),
        valueColor: "text-green-400",
        subtitle: "questa settimana",
        gradient: "var(--gradient-success, linear-gradient(135deg, #22c55e, #16a34a))",
      },
      {
        label: "Progetti",
        value: String(myProjects),
        valueColor: "text-purple-400",
        subtitle: "con ore loggate",
        gradient: "var(--gradient-milestone, linear-gradient(135deg, #a855f7, #9333ea))",
      },
      {
        label: "Media/giorno",
        value: `${myHours > 0 ? (myHours / 5).toFixed(1) : "0"}h`,
        valueColor: "text-foreground",
        subtitle: "5 giorni lavorativi",
        gradient: "var(--gradient-primary, linear-gradient(135deg, #64748b, #475569))",
      },
    ]
  }, [allTasks, myTimeQuery.data])

  const handleExportPDF = () => {
    toast.info("Esportazione PDF in corso…")
  }

  const handleSendReport = () => {
    generateReport.mutate(undefined, {
      onSuccess: () => toast.success("Report inviato con successo"),
      onError: () => toast.error("Errore nell'invio del report"),
    })
  }

  return (
    <motion.div
      className="space-y-0"
      variants={containerVariants}
      initial="animate"
      animate="animate"
    >
      {/* ── Page Header ─────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-start justify-between gap-4 pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Badge
              variant="outline"
              className="text-[11px] font-semibold bg-indigo-500/12 text-indigo-300 border-indigo-500/25 flex items-center gap-1.5"
            >
              <Activity className="h-3 w-3" />
              Report
            </Badge>
            <h1 className="text-page-title text-foreground leading-none">
              Weekly Overview
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Riepilogo settimanale attività, avanzamento progetti e ore lavorate
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Esporta PDF
          </Button>
          <Button
            size="sm"
            className="bg-indigo-600/80 hover:bg-indigo-600 text-white border-indigo-500/50"
            onClick={handleSendReport}
            disabled={generateReport.isPending}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Invia report
          </Button>
        </div>
      </motion.div>

      {/* ── Week Selector Bar ────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-center gap-2.5 pb-5">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          className="w-7 h-7 flex items-center justify-center bg-card border border-border rounded hover:border-indigo-500/40 hover:text-indigo-300 text-muted-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-sm font-semibold text-foreground min-w-[210px] text-center">
          {weekRangeLabel}
        </span>
        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          className="w-7 h-7 flex items-center justify-center bg-card border border-border rounded hover:border-indigo-500/40 hover:text-indigo-300 text-muted-foreground transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <Badge
          variant="outline"
          className="text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border-indigo-500/25 ml-1"
        >
          Settimana {weekNumber}
        </Badge>

        {/* Period toggle */}
        <div className="flex items-center gap-1 ml-4">
          {(["week", "month", "quarter"] as PeriodView[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "text-[11px] px-2.5 py-1 rounded transition-colors",
                period === p
                  ? "text-indigo-300 bg-indigo-500/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {p === "week" ? "Settimana" : p === "month" ? "Mese" : "Trimestre"}
            </button>
          ))}
        </div>

        {/* Role toggle */}
        <div className="flex items-center gap-1 bg-card border border-border rounded-md p-0.5 ml-auto">
          <button
            onClick={() => setRoleView("direzione")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-semibold transition-colors",
              roleView === "direzione"
                ? "bg-muted text-indigo-300"
                : "text-muted-foreground"
            )}
          >
            <Users className="h-2.5 w-2.5" />
            Direzione
          </button>
          <button
            onClick={() => setRoleView("dipendente")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-semibold transition-colors",
              roleView === "dipendente"
                ? "bg-muted text-green-400"
                : "text-muted-foreground"
            )}
          >
            <Users className="h-2.5 w-2.5" />
            Dipendente
          </button>
        </div>
      </motion.div>

      {/* ══ VISTA DIREZIONE ══════════════════════════════════════════ */}
      {roleView === "direzione" && (
        <>
          {/* KPI Strip */}
          <motion.div variants={itemVariants} className="grid grid-cols-5 gap-2.5 pb-5">
            {preview.isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-3 w-20 mb-2" />
                      <Skeleton className="h-7 w-12 mb-1" />
                      <Skeleton className="h-2.5 w-28" />
                    </CardContent>
                  </Card>
                ))
              : kpis.map((kpi) => <KpiCard key={kpi.label} kpi={kpi} />)}
          </motion.div>

          {/* Row 1: Ore per giorno + Task per stato */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 pb-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-table-header">
                    <Clock className="h-3 w-3" />
                    Ore per giorno
                  </div>
                  <span className="text-[10px] font-normal text-muted-foreground">settimana corrente</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <HoursBarChart
                  data={hoursData}
                  isLoading={myTimeQuery.isLoading}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-1.5 text-table-header">
                  <BarChart2 className="h-3 w-3" />
                  Task per stato
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <DonutChart tasks={allTasks} isLoading={tasksQuery.isLoading} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Row 2: Avanzamento progetti + Rischi */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 pb-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-table-header">
                    <TrendingUp className="h-3 w-3" />
                    Avanzamento progetti
                  </div>
                  <span className="text-[10px] font-normal text-muted-foreground">{activeProjects.length} attivi</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ProjectRows projects={activeProjects} isLoading={projectsQuery.isLoading} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-table-header">
                    <AlertTriangle className="h-3 w-3" />
                    Rischi aperti
                  </div>
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] px-2 py-0 font-normal">
                    Vedi tutti
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <RisksCard risks={openRisks} isLoading={risksQuery.isLoading} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Row 3: Ore per risorsa + Milestone in scadenza */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 pb-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-table-header">
                    <Users className="h-3 w-3" />
                    Ore per risorsa
                  </div>
                  <span className="text-[10px] font-normal text-muted-foreground">settimana corrente</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <TeamRows report={teamTimeQuery.data} tasks={allTasks} isLoading={teamTimeQuery.isLoading} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-table-header">
                    <Flag className="h-3 w-3" />
                    Milestone prossime
                  </div>
                  <span className="text-[10px] font-normal text-muted-foreground">30 giorni</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <MilestoneItems milestones={milestones} isLoading={tasksQuery.isLoading} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Full-width task table */}
          <motion.div variants={itemVariants} className="pb-5">
            <TaskTable
              tasks={allTasks}
              isLoading={tasksQuery.isLoading}
              filterStatus={filterStatus}
              filterOp={filterOp}
              filterProject={filterProject}
              onFilterStatus={setFilterStatus}
              onFilterOp={setFilterOp}
              onFilterProject={setFilterProject}
            />
          </motion.div>

          {/* Activity Heatmap */}
          <motion.div variants={itemVariants} className="pb-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-table-header">
                    <CalendarDays className="h-3 w-3" />
                    Attività ultime 4 settimane
                  </div>
                  <span className="text-[10px] font-normal text-muted-foreground">attività = ore log + task chiusi</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ActivityHeatmap data={heatmapData} isLoading={myTimeQuery.isLoading} />
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}

      {/* ══ VISTA DIPENDENTE ═════════════════════════════════════════ */}
      {roleView === "dipendente" && (
        <>
          {/* KPI personali */}
          <motion.div variants={itemVariants} className="grid grid-cols-5 gap-2.5 pb-5">
            {dipKpis.map((kpi) => (
              <KpiCard key={kpi.label} kpi={kpi} />
            ))}
          </motion.div>

          {/* Row 1: Ore personali + Task aperti miei */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 pb-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-table-header">
                    <Clock className="h-3 w-3" />
                    Le mie ore per giorno
                  </div>
                  <div className="flex items-center gap-1.5 normal-case">
                    <span className="w-4 h-4 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center text-[8px] font-bold">
                      {currentUser.data
                        ? getUserInitials(currentUser.data.firstName, currentUser.data.lastName)
                        : "?"}
                    </span>
                    <span className="text-[11px] font-semibold text-foreground">
                      {currentUser.data
                        ? `${currentUser.data.firstName} ${currentUser.data.lastName}`
                        : "—"}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <HoursBarChart
                  data={hoursData}
                  isLoading={myTimeQuery.isLoading}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-table-header">
                    <CheckSquare className="h-3 w-3" />
                    Miei task aperti
                  </div>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    {myTasks.filter((t) => t.status !== "done" && t.status !== "cancelled").length} totali
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {tasksQuery.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
                  </div>
                ) : myTasks.filter((t) => t.status !== "done" && t.status !== "cancelled").length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nessun task aperto</p>
                ) : (
                  <>
                    <div className="divide-y divide-border/50">
                      {myTasks
                        .filter((t) => t.status !== "done" && t.status !== "cancelled")
                        .slice(0, 6)
                        .map((t) => {
                          const s = TASK_STATUS_DISPLAY[t.status] ?? TASK_STATUS_DISPLAY["todo"]
                          return (
                            <div key={t.id} className="flex items-center gap-2 py-1.5">
                              <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", s.dotClass)} />
                              <span className="flex-1 text-xs font-medium truncate text-foreground">{t.title}</span>
                              <span className="text-[10px] whitespace-nowrap flex-shrink-0 text-blue-400">
                                {t.project?.name ?? "—"}
                              </span>
                              <Badge variant="outline" className={cn("text-[10px] ml-1.5 flex-shrink-0", s.badgeClass)}>
                                {s.label}
                              </Badge>
                            </div>
                          )
                        })}
                    </div>
                    {myTasks.filter((t) => t.status !== "done").length > 6 && (
                      <Button variant="ghost" size="sm" className="mt-2 h-6 text-[11px] px-2">
                        Vedi tutti i {myTasks.filter((t) => t.status !== "done").length} task
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Row 2: I miei progetti + Scadenze imminenti */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 pb-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-1.5 text-table-header">
                  <TrendingUp className="h-3 w-3" />
                  I miei progetti
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {myActiveProjects.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nessun progetto assegnato</p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {myActiveProjects.map((p) => {
                      const gKey = p.gradientKey
                      return (
                        <div key={p.id} className="flex items-center gap-2.5 py-2">
                          <span className={cn("w-2 h-2 rounded-full flex-shrink-0", DOT_COLORS[gKey])} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-foreground">{p.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {p.taskCount} miei task · {p.inProgressCount} in corso
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {myProjectHours.length > 0 && (
                  <>
                    <div className="h-px bg-border" />
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Ore questa settimana per progetto
                      </p>
                      {(() => {
                        const maxMins = Math.max(...myProjectHours.map((p) => p.totalMinutes), 1)
                        return myProjectHours.map((p, idx) => {
                          const hours = Math.round(p.totalMinutes / 60 * 10) / 10
                          const pct = Math.round((p.totalMinutes / maxMins) * 100)
                          const gKey = PROJECT_GRADIENT_KEYS[idx % PROJECT_GRADIENT_KEYS.length]
                          return (
                            <div key={p.projectId} className="flex items-center gap-2 mb-1.5">
                              <span className="text-xs min-w-[90px] text-blue-400 truncate">{p.projectName}</span>
                              <div className="flex-1">
                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={cn("h-full rounded-full bg-gradient-to-r", GRADIENT_CSS[gKey])}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                              <span className="text-xs font-semibold min-w-[28px] text-right text-blue-400">
                                {hours}h
                              </span>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-1.5 text-table-header">
                  <CalendarDays className="h-3 w-3" />
                  Scadenze imminenti
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-1.5">
                {myDeadlines.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nessuna scadenza imminente</p>
                ) : (
                  myDeadlines.map((t) => {
                    const dtColor = deadlineColor(t.dueDate)
                    const dotCls = (() => {
                      const u = getDeadlineUrgency(t.dueDate)
                      if (u === "overdue" || u === "urgent") return "bg-red-400"
                      if (u === "soon") return "bg-orange-400"
                      return "bg-blue-400"
                    })()
                    const borderCls = (() => {
                      const u = getDeadlineUrgency(t.dueDate)
                      if (u === "overdue" || u === "urgent") return "border-red-500/25"
                      return "border-border"
                    })()
                    return (
                      <div
                        key={t.id}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 bg-accent/30 border rounded hover:border-indigo-500/25 transition-colors cursor-pointer",
                          borderCls
                        )}
                      >
                        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dotCls)} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-foreground truncate">{t.title}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {t.project?.name ?? "—"} · {(TASK_STATUS_DISPLAY[t.status] ?? TASK_STATUS_DISPLAY["todo"]).label}
                          </div>
                        </div>
                        <span className={cn("text-[10px] font-semibold whitespace-nowrap", dtColor)}>
                          {t.dueDate ? formatDate(t.dueDate, "d MMM") : "—"}
                        </span>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </motion.div>
  )
}
