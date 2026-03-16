import React, { useState, useMemo } from "react"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { motion } from "framer-motion"
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  getISOWeek,
  format,
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
  barColor: string
}

interface ProjectRow {
  name: string
  dotColor: string
  barColor: string
  pct: number
  status: string
  statusClass: string
}

interface RiskRow {
  level: "Alto" | "Medio" | "Basso"
  name: string
  project: string
  projectColor: string
}

interface TeamRow {
  initials: string
  name: string
  avatarBg: string
  avatarColor: string
  barColor: string
  barPct: number
  hours: string
  tasks: string
}

interface MilestoneRow {
  dotColor: string
  name: string
  project: string
  pct: number
  pctColor: string
  date: string
  dateColor: string
}

interface TaskRow {
  id: string
  name: string
  project: string
  projectColor: string
  status: "completato" | "in-corso" | "revisione" | "bloccato" | "da-iniziare"
  op: string
  opName: string
  opBg: string
  opColor: string
  hours: number
  deadline: string
  closedAt: string
}

// ─── Static mock data ───────────────────────────────────────────────────────

const HOURS_DATA = [
  { day: "Lun", hours: 12 },
  { day: "Mar", hours: 15 },
  { day: "Mer", hours: 22 },
  { day: "Gio", hours: 18 },
  { day: "Ven", hours: 20 },
  { day: "Sab", hours: 0 },
  { day: "Dom", hours: 0 },
]

const DIREZIONE_KPIS: KpiCardData[] = [
  {
    label: "Task completati",
    value: "12",
    valueColor: "text-green-400",
    delta: "↑ 4",
    deltaDir: "up",
    subtitle: "vs 8 settimana scorsa",
    barColor: "from-green-800 to-green-500",
  },
  {
    label: "Ore lavorate",
    value: "87h",
    valueColor: "text-blue-400",
    delta: "↓ 5h",
    deltaDir: "down",
    subtitle: "su 3 risorse attive",
    barColor: "from-blue-800 to-blue-500",
  },
  {
    label: "Task aperti",
    value: "34",
    valueColor: "text-foreground",
    delta: "↑ 2",
    deltaDir: "up",
    subtitle: "5 in scadenza questa settimana",
    barColor: "from-slate-700 to-slate-500",
  },
  {
    label: "Rischi attivi",
    value: "3",
    valueColor: "text-orange-400",
    delta: "+1",
    deltaDir: "up",
    subtitle: "1 critico · 2 medi",
    barColor: "from-orange-900 to-orange-500",
  },
  {
    label: "Avanz. medio",
    value: "58%",
    valueColor: "text-indigo-300",
    delta: "↑ 6%",
    deltaDir: "up",
    subtitle: "su 4 progetti attivi",
    barColor: "from-indigo-900 to-indigo-500",
  },
]

const DIPENDENTE_KPIS: KpiCardData[] = [
  {
    label: "Miei task chiusi",
    value: "7",
    valueColor: "text-green-400",
    delta: "↑ 2",
    deltaDir: "up",
    subtitle: "vs 5 settimana scorsa",
    barColor: "from-green-800 to-green-500",
  },
  {
    label: "Ore lavorate",
    value: "36h",
    valueColor: "text-blue-400",
    delta: "↑ 3h",
    deltaDir: "up",
    subtitle: "su ~40h settimanali",
    barColor: "from-blue-800 to-blue-500",
  },
  {
    label: "Task aperti",
    value: "11",
    valueColor: "text-foreground",
    subtitle: "3 in scadenza questa settimana",
    barColor: "from-slate-700 to-slate-500",
  },
  {
    label: "In revisione",
    value: "2",
    valueColor: "text-yellow-400",
    subtitle: "in attesa di approvazione",
    barColor: "from-yellow-900 to-yellow-500",
  },
  {
    label: "Progetti attivi",
    value: "2",
    valueColor: "text-indigo-300",
    subtitle: "XR-200 · Med-Tracker",
    barColor: "from-indigo-900 to-indigo-500",
  },
]

const PROJECTS: ProjectRow[] = [
  { name: "XR-200 Alpha", dotColor: "bg-blue-500", barColor: "from-blue-800 to-blue-500", pct: 62, status: "Attivo", statusClass: "bg-blue-500/10 text-blue-400 border-blue-500/25" },
  { name: "Med-Tracker v2", dotColor: "bg-green-500", barColor: "from-green-800 to-green-500", pct: 88, status: "Revisione", statusClass: "bg-amber-500/10 text-amber-400 border-amber-500/25" },
  { name: "OrthoScan Pro", dotColor: "bg-purple-500", barColor: "from-purple-800 to-purple-500", pct: 34, status: "Attivo", statusClass: "bg-blue-500/10 text-blue-400 border-blue-500/25" },
  { name: "ImplantDB 3.1", dotColor: "bg-orange-500", barColor: "from-orange-900 to-orange-500", pct: 15, status: "Avvio", statusClass: "bg-slate-500/10 text-slate-400 border-slate-500/25" },
]

const RISKS: RiskRow[] = [
  { level: "Alto", name: "Ritardo fornitura PCB rev.4", project: "XR-200", projectColor: "text-blue-400" },
  { level: "Medio", name: "Incompatibilità driver IMU su RTOS", project: "XR-200", projectColor: "text-blue-400" },
  { level: "Medio", name: "Validazione IEC 62304 in ritardo", project: "Med-Track", projectColor: "text-green-400" },
]

const TEAM_ROWS: TeamRow[] = [
  { initials: "MB", name: "Marco Bianchi", avatarBg: "bg-green-500/15", avatarColor: "text-green-400", barColor: "from-green-800 to-green-500", barPct: 82, hours: "36h", tasks: "7 task" },
  { initials: "NR", name: "Nicola Rossi", avatarBg: "bg-blue-500/15", avatarColor: "text-blue-400", barColor: "from-blue-800 to-blue-500", barPct: 65, hours: "28h", tasks: "3 task" },
  { initials: "GF", name: "Giulia Ferrari", avatarBg: "bg-purple-500/15", avatarColor: "text-purple-400", barColor: "from-purple-800 to-purple-500", barPct: 53, hours: "23h", tasks: "2 task" },
]

const MILESTONES: MilestoneRow[] = [
  { dotColor: "bg-green-400", name: "Med-Tracker — M4 Validazione", project: "Med-Tracker v2", pct: 88, pctColor: "text-green-400", date: "14 mar", dateColor: "text-orange-400" },
  { dotColor: "bg-blue-400", name: "XR-200 — M3 Sviluppo", project: "XR-200 Alpha", pct: 67, pctColor: "text-blue-400", date: "28 mar", dateColor: "text-muted-foreground" },
  { dotColor: "bg-purple-400", name: "OrthoScan — M1 Analisi req.", project: "OrthoScan Pro", pct: 90, pctColor: "text-purple-400", date: "2 apr", dateColor: "text-muted-foreground" },
]

const TASK_DATA: TaskRow[] = [
  { id: "T-038", name: "Integrazione librerie I2C — test ping", project: "XR-200", projectColor: "text-blue-400", status: "completato", op: "MB", opName: "Marco B.", opBg: "bg-green-500/15", opColor: "text-green-400", hours: 4, deadline: "20 mar", closedAt: "08 mar" },
  { id: "T-039", name: "Review specifiche IEC 62368-1 §8.4", project: "XR-200", projectColor: "text-blue-400", status: "completato", op: "NR", opName: "Nicola R.", opBg: "bg-blue-500/15", opColor: "text-blue-400", hours: 3, deadline: "10 mar", closedAt: "06 mar" },
  { id: "T-040", name: "Stesura piano di validazione v0.3", project: "Med-Track", projectColor: "text-green-400", status: "completato", op: "GF", opName: "Giulia F.", opBg: "bg-purple-500/15", opColor: "text-purple-400", hours: 5, deadline: "09 mar", closedAt: "07 mar" },
  { id: "T-041", name: "Aggiornamento FMEA dispositivo", project: "Med-Track", projectColor: "text-green-400", status: "completato", op: "NR", opName: "Nicola R.", opBg: "bg-blue-500/15", opColor: "text-blue-400", hours: 2.5, deadline: "08 mar", closedAt: "08 mar" },
  { id: "T-042", name: "Integrazione sensori IMU", project: "XR-200", projectColor: "text-blue-400", status: "in-corso", op: "MB", opName: "Marco B.", opBg: "bg-green-500/15", opColor: "text-green-400", hours: 18, deadline: "20 mar", closedAt: "—" },
  { id: "T-043", name: "Firmware core v0.8", project: "XR-200", projectColor: "text-blue-400", status: "revisione", op: "MB", opName: "Marco B.", opBg: "bg-green-500/15", opColor: "text-green-400", hours: 12, deadline: "22 mar", closedAt: "—" },
  { id: "T-044", name: "Raccolta requisiti utente OrthoScan", project: "OrthoScan", projectColor: "text-purple-400", status: "completato", op: "GF", opName: "Giulia F.", opBg: "bg-purple-500/15", opColor: "text-purple-400", hours: 6, deadline: "07 mar", closedAt: "07 mar" },
  { id: "T-045", name: "Analisi schema elettrico rev.3", project: "XR-200", projectColor: "text-blue-400", status: "completato", op: "MB", opName: "Marco B.", opBg: "bg-green-500/15", opColor: "text-green-400", hours: 2.5, deadline: "05 mar", closedAt: "05 mar" },
  { id: "T-046", name: "Setup ambiente CI/CD Med-Tracker", project: "Med-Track", projectColor: "text-green-400", status: "in-corso", op: "NR", opName: "Nicola R.", opBg: "bg-blue-500/15", opColor: "text-blue-400", hours: 7, deadline: "14 mar", closedAt: "—" },
  { id: "T-047", name: "Calibrazione filtro Kalman", project: "XR-200", projectColor: "text-blue-400", status: "da-iniziare", op: "MB", opName: "Marco B.", opBg: "bg-green-500/15", opColor: "text-green-400", hours: 0, deadline: "25 mar", closedAt: "—" },
  { id: "T-048", name: "Documentazione API modulo BLE", project: "Med-Track", projectColor: "text-green-400", status: "bloccato", op: "GF", opName: "Giulia F.", opBg: "bg-purple-500/15", opColor: "text-purple-400", hours: 1, deadline: "12 mar", closedAt: "—" },
  { id: "T-049", name: "Test integrazione database pazienti", project: "Med-Track", projectColor: "text-green-400", status: "revisione", op: "NR", opName: "Nicola R.", opBg: "bg-blue-500/15", opColor: "text-blue-400", hours: 4, deadline: "11 mar", closedAt: "—" },
  { id: "T-050", name: "Prototipo UI schermata principale", project: "OrthoScan", projectColor: "text-purple-400", status: "in-corso", op: "GF", opName: "Giulia F.", opBg: "bg-purple-500/15", opColor: "text-purple-400", hours: 9, deadline: "20 mar", closedAt: "—" },
  { id: "T-051", name: "Revisione SRS §3 — requisiti hw", project: "XR-200", projectColor: "text-blue-400", status: "completato", op: "NR", opName: "Nicola R.", opBg: "bg-blue-500/15", opColor: "text-blue-400", hours: 3, deadline: "06 mar", closedAt: "06 mar" },
  { id: "T-052", name: "Configurazione registro I2C @ 400kHz", project: "XR-200", projectColor: "text-blue-400", status: "in-corso", op: "MB", opName: "Marco B.", opBg: "bg-green-500/15", opColor: "text-green-400", hours: 5.5, deadline: "20 mar", closedAt: "—" },
  { id: "T-053", name: "Redazione manuale utente v0.1", project: "Med-Track", projectColor: "text-green-400", status: "bloccato", op: "GF", opName: "Giulia F.", opBg: "bg-purple-500/15", opColor: "text-purple-400", hours: 2, deadline: "15 mar", closedAt: "—" },
]

const HEATMAP_DATA = [
  2, 5, 8, 3, 6, 0, 0,
  4, 7, 5, 9, 3, 0, 0,
  6, 2, 8, 4, 7, 0, 0,
  3, 6, 9, 5, 8, 0, 0,
]

const STATUS_CONFIG: Record<TaskRow["status"], { label: string; dotClass: string; badgeClass: string }> = {
  completato:   { label: "Completato",   dotClass: "bg-green-500",  badgeClass: "bg-green-500/10 text-green-400 border-green-500/25" },
  "in-corso":   { label: "In corso",     dotClass: "bg-blue-500",   badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/25" },
  revisione:    { label: "Revisione",    dotClass: "bg-yellow-500", badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/25" },
  bloccato:     { label: "Bloccato",     dotClass: "bg-red-500",    badgeClass: "bg-red-500/10 text-red-400 border-red-500/25" },
  "da-iniziare":{ label: "Da iniziare",  dotClass: "bg-slate-500",  badgeClass: "bg-slate-500/10 text-slate-400 border-slate-500/25" },
}

const RISK_CONFIG: Record<RiskRow["level"], { className: string }> = {
  Alto:  { className: "bg-red-500/10 text-red-400 border-red-500/20" },
  Medio: { className: "bg-orange-500/8 text-orange-400 border-orange-500/20" },
  Basso: { className: "bg-yellow-500/8 text-yellow-400 border-yellow-500/20" },
}

// ─── Animation variants ──────────────────────────────────────────────────────

const containerVariants = {
  animate: { transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({ kpi }: { kpi: KpiCardData }) {
  // Convert Tailwind gradient class to CSS gradient for --kpi-gradient
  const gradientMap: Record<string, string> = {
    "from-green-800 to-green-500":   "linear-gradient(90deg, #166534, #22c55e)",
    "from-blue-800 to-blue-500":     "linear-gradient(90deg, #1e3a5f, #3b82f6)",
    "from-slate-700 to-slate-500":   "linear-gradient(90deg, #334155, #64748b)",
    "from-orange-900 to-orange-500": "linear-gradient(90deg, #7c2d12, #f97316)",
    "from-indigo-900 to-indigo-500": "linear-gradient(90deg, #1e1b4b, #6366f1)",
    "from-yellow-900 to-yellow-500": "linear-gradient(90deg, #422006, #eab308)",
  }
  const cssGradient = gradientMap[kpi.barColor] ?? "linear-gradient(90deg, #3730a3, #6366f1)"

  return (
    <Card
      className="kpi-accent card-hover overflow-hidden"
      style={{ "--kpi-gradient": cssGradient } as React.CSSProperties}
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
  data: typeof HOURS_DATA
  totalLabel: string
  avgLabel: string
  peakLabel: string
}

function HoursBarChart({ data, totalLabel, avgLabel, peakLabel }: HoursBarChartProps) {
  const maxHours = Math.max(...data.map((d) => d.hours))
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
              const isPeak = entry.hours === maxHours && entry.hours > 0
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    isWeekend
                      ? "hsl(var(--border))"
                      : isPeak
                      ? "#4ade80"
                      : "#3b82f6"
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
          <span className="font-bold text-blue-400 ml-1.5 text-data">{totalLabel}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Media/giorno</span>
          <span className="font-bold text-foreground ml-1.5 text-data">{avgLabel}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Picco</span>
          <span className="font-bold text-green-400 ml-1.5 text-data">{peakLabel}</span>
        </span>
      </div>
    </div>
  )
}

function DonutChart() {
  const total = 44
  const circ = 2 * Math.PI * 30
  const segments = [
    { value: 12, color: "#22c55e", label: "Completati", textColor: "text-green-400" },
    { value: 14, color: "#3b82f6", label: "In corso", textColor: "text-blue-400" },
    { value: 5,  color: "#eab308", label: "In revisione", textColor: "text-yellow-400" },
    { value: 10, color: "#475569", label: "Da iniziare", textColor: "text-slate-400" },
    { value: 3,  color: "#ef4444", label: "Bloccati", textColor: "text-red-400" },
  ]

  let offset = 0
  const arcs = segments.map((seg) => {
    const dash = (seg.value / total) * circ
    const gap = circ - dash
    const arc = { dash, gap, offset, ...seg }
    offset += dash
    return arc
  })

  return (
    <div className="flex items-center gap-4">
      <svg width="90" height="90" viewBox="0 0 90 90" className="flex-shrink-0">
        <circle
          cx="45" cy="45" r="30"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="10"
        />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx="45" cy="45" r="30"
            fill="none"
            stroke={arc.color}
            strokeWidth="10"
            strokeDasharray={`${arc.dash} ${arc.gap}`}
            strokeDashoffset={-arc.offset}
            transform="rotate(-90 45 45)"
          />
        ))}
        <text
          x="45" y="41"
          textAnchor="middle"
          fill="hsl(var(--foreground))"
          fontSize="14"
          fontWeight="700"
        >
          {total}
        </text>
        <text
          x="45" y="52"
          textAnchor="middle"
          fill="hsl(var(--muted-foreground))"
          fontSize="7"
        >
          task
        </text>
      </svg>
      <div className="flex flex-col gap-1.5 flex-1">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-[11px]">
            <span
              className="w-2 h-2 rounded-sm flex-shrink-0"
              style={{ background: seg.color }}
            />
            <span className="text-muted-foreground flex-1">{seg.label}</span>
            <span className={cn("font-semibold", seg.textColor)}>{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProjectRows({ projects }: { projects: ProjectRow[] }) {
  return (
    <div className="divide-y divide-border/50">
      {projects.map((p) => (
        <div key={p.name} className="flex items-center gap-2.5 py-2">
          <span className={cn("w-2 h-2 rounded-full flex-shrink-0", p.dotColor)} />
          <span className="flex-1 text-xs font-medium truncate text-foreground">{p.name}</span>
          <div className="w-20 flex-shrink-0">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full bg-gradient-to-r", p.barColor)}
                style={{ width: `${p.pct}%` }}
              />
            </div>
          </div>
          <span className="text-xs font-semibold w-8 text-right flex-shrink-0 text-foreground">
            {p.pct}%
          </span>
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0 flex-shrink-0", p.statusClass)}
          >
            {p.status}
          </Badge>
        </div>
      ))}
    </div>
  )
}

function RisksCard({ risks }: { risks: RiskRow[] }) {
  return (
    <div className="space-y-3">
      <div className="divide-y divide-border/50">
        {risks.map((r, i) => (
          <div key={i} className="flex items-center gap-2 py-1.5">
            <Badge
              variant="outline"
              className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 flex-shrink-0 min-w-[42px] text-center justify-center", RISK_CONFIG[r.level].className)}
            >
              {r.level}
            </Badge>
            <span className="flex-1 text-xs font-medium truncate text-foreground">{r.name}</span>
            <span className={cn("text-[10px] whitespace-nowrap flex-shrink-0", r.projectColor)}>
              {r.project}
            </span>
          </div>
        ))}
      </div>
      <div className="h-px bg-border" />
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center bg-red-500/6 border border-red-500/15 rounded p-2">
          <div className="text-base font-bold text-red-400">1</div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Critico</div>
        </div>
        <div className="text-center bg-orange-500/6 border border-orange-500/15 rounded p-2">
          <div className="text-base font-bold text-orange-400">2</div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Medio</div>
        </div>
        <div className="text-center bg-slate-500/8 border border-slate-500/20 rounded p-2">
          <div className="text-base font-bold text-slate-400">0</div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Basso</div>
        </div>
      </div>
    </div>
  )
}

function TeamRows({ rows }: { rows: TeamRow[] }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto_auto] text-[9px] font-semibold uppercase tracking-wider text-muted-foreground pb-1 border-b border-border mb-1">
        <span>Risorsa</span>
        <span className="text-right min-w-[38px]">Ore</span>
        <span className="text-right min-w-[55px]">Task chiusi</span>
      </div>
      <div className="divide-y divide-border/50">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-2.5 py-2">
            <span
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0",
                r.avatarBg,
                r.avatarColor
              )}
            >
              {r.initials}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-foreground">{r.name}</div>
              <div className="h-1 rounded-full bg-muted overflow-hidden mt-1">
                <div
                  className={cn("h-full rounded-full bg-gradient-to-r", r.barColor)}
                  style={{ width: `${r.barPct}%` }}
                />
              </div>
            </div>
            <span className="text-xs font-semibold text-blue-400 min-w-[36px] text-right">
              {r.hours}
            </span>
            <span className="text-[10px] text-muted-foreground min-w-[50px] text-right">
              {r.tasks}
            </span>
          </div>
        ))}
      </div>
      <div className="h-px bg-border" />
      <div className="flex gap-4 text-[10px] pt-1">
        <span>
          <span className="text-muted-foreground">Totale team</span>
          <span className="font-bold text-blue-400 ml-1.5">87h</span>
        </span>
        <span>
          <span className="text-muted-foreground">Capacità</span>
          <span className="font-bold text-foreground ml-1.5">120h</span>
        </span>
        <span>
          <span className="text-muted-foreground">Utilizzo</span>
          <span className="font-bold text-indigo-300 ml-1.5">72.5%</span>
        </span>
      </div>
    </div>
  )
}

function MilestoneItems({ items }: { items: MilestoneRow[] }) {
  return (
    <div className="space-y-1.5">
      {items.map((m, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 px-3 py-2 bg-accent/30 border border-border rounded hover:border-indigo-500/25 transition-colors cursor-pointer"
        >
          <span className={cn("w-2 h-2 rounded-full flex-shrink-0", m.dotColor)} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-foreground truncate">{m.name}</div>
            <div className="text-[10px] text-muted-foreground">{m.project}</div>
          </div>
          <span className={cn("text-xs font-semibold whitespace-nowrap min-w-[32px] text-right", m.pctColor)}>
            {m.pct}%
          </span>
          <span className={cn("text-[10px] whitespace-nowrap ml-2", m.dateColor)}>
            {m.date}
          </span>
        </div>
      ))}
    </div>
  )
}

interface TaskTableProps {
  tasks: TaskRow[]
  filterStatus: string
  filterOp: string
  filterProject: string
  onFilterStatus: (v: string) => void
  onFilterOp: (v: string) => void
  onFilterProject: (v: string) => void
}

function TaskTable({
  tasks,
  filterStatus,
  filterOp,
  filterProject,
  onFilterStatus,
  onFilterOp,
  onFilterProject,
}: TaskTableProps) {
  const filtered = useMemo(() => {
    return tasks.filter(
      (t) =>
        (!filterStatus || t.status === filterStatus) &&
        (!filterOp || t.op === filterOp) &&
        (!filterProject || t.project === filterProject)
    )
  }, [tasks, filterStatus, filterOp, filterProject])

  const counts = useMemo(() => {
    const done = tasks.filter((t) => t.status === "completato").length
    const active = tasks.filter((t) => t.status === "in-corso").length
    const review = tasks.filter((t) => t.status === "revisione").length
    const blocked = tasks.filter((t) => t.status === "bloccato").length
    return { done, active, review, blocked }
  }, [tasks])

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
            {counts.active} in corso
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
              <SelectItem value="">Tutti gli stati</SelectItem>
              <SelectItem value="completato">Completati</SelectItem>
              <SelectItem value="in-corso">In corso</SelectItem>
              <SelectItem value="revisione">In revisione</SelectItem>
              <SelectItem value="bloccato">Bloccati</SelectItem>
              <SelectItem value="da-iniziare">Da iniziare</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterOp} onValueChange={onFilterOp}>
            <SelectTrigger className="h-7 text-[11px] w-[130px]">
              <SelectValue placeholder="Tutti gli operatori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tutti gli operatori</SelectItem>
              <SelectItem value="MB">Marco Bianchi</SelectItem>
              <SelectItem value="NR">Nicola Rossi</SelectItem>
              <SelectItem value="GF">Giulia Ferrari</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterProject} onValueChange={onFilterProject}>
            <SelectTrigger className="h-7 text-[11px] w-[130px]">
              <SelectValue placeholder="Tutti i progetti" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tutti i progetti</SelectItem>
              <SelectItem value="XR-200">XR-200 Alpha</SelectItem>
              <SelectItem value="Med-Track">Med-Tracker v2</SelectItem>
              <SelectItem value="OrthoScan">OrthoScan Pro</SelectItem>
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
        filtered.map((t) => {
          const s = STATUS_CONFIG[t.status]
          return (
            <div
              key={t.id}
              className="row-accent grid grid-cols-[2fr_1fr_1fr_1fr_60px_90px_80px] px-4 py-2 border-b border-border/40 last:border-0 items-center cursor-pointer text-xs"
            >
              <div className="flex items-center gap-1.5 pr-3 min-w-0">
                <span className="font-mono text-[9px] text-muted-foreground flex-shrink-0">{t.id}</span>
                <span className="truncate font-medium text-foreground">{t.name}</span>
              </div>
              <span className={cn("text-[11px] font-medium", t.projectColor)}>{t.project}</span>
              <div className="flex items-center gap-1.5">
                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", s.dotClass)} />
                <span className="text-[11px] font-medium text-foreground">{s.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0",
                    t.opBg,
                    t.opColor
                  )}
                >
                  {t.op}
                </span>
                <span className="text-[11px] font-medium text-foreground truncate">{t.opName}</span>
              </div>
              <span className="text-right text-xs font-semibold text-blue-400 text-data">
                {t.hours > 0 ? `${t.hours}h` : "—"}
              </span>
              <span className="text-[11px] text-orange-400">{t.deadline}</span>
              <span className="text-[11px] text-muted-foreground">{t.closedAt}</span>
            </div>
          )
        })
      )}
    </Card>
  )
}

function ActivityHeatmap() {
  const maxVal = Math.max(...HEATMAP_DATA)
  const days = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]

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
        {HEATMAP_DATA.map((v, i) => {
          const isWeekend = i % 7 >= 5
          const intensity = maxVal > 0 ? v / maxVal : 0
          return (
            <div
              key={i}
              title={`${v} attività`}
              className="aspect-square rounded cursor-default transition-opacity hover:opacity-70"
              style={{
                background:
                  isWeekend || v === 0
                    ? "hsl(var(--muted))"
                    : `rgba(99,102,241,${0.15 + intensity * 0.85})`,
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
        <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(99,102,241,0.2)" }} />
        <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(99,102,241,0.4)" }} />
        <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(99,102,241,0.65)" }} />
        <div className="w-3 h-3 rounded-sm bg-indigo-500" />
        <span className="text-[10px] text-muted-foreground">Più</span>
      </div>
    </div>
  )
}

// ─── Dipendente-view task list ────────────────────────────────────────────────

const DIP_TASKS = [
  { name: "Integrazione sensori IMU", project: "XR-200", projectColor: "text-blue-400", dotClass: "bg-blue-500", badge: "In corso", badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/25" },
  { name: "Configurazione registro I2C", project: "XR-200", projectColor: "text-blue-400", dotClass: "bg-blue-500", badge: "In corso", badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/25" },
  { name: "Firmware core v0.8", project: "XR-200", projectColor: "text-blue-400", dotClass: "bg-yellow-500", badge: "Revisione", badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/25" },
  { name: "Test validazione modulo BLE", project: "Med-Track", projectColor: "text-green-400", dotClass: "bg-slate-500", badge: "Da iniziare", badgeClass: "bg-slate-500/10 text-slate-400 border-slate-500/25" },
  { name: "Stesura SRS sezione 4", project: "Med-Track", projectColor: "text-green-400", dotClass: "bg-slate-500", badge: "Da iniziare", badgeClass: "bg-slate-500/10 text-slate-400 border-slate-500/25" },
]

const DIP_DEADLINES = [
  { name: "Configurazione I2C @ 400kHz", context: "XR-200 · Task", dotClass: "bg-red-400", dateText: "20 mar · 9 gg", dateColor: "text-red-400", borderClass: "border-red-500/25" },
  { name: "Firmware core v0.8", context: "XR-200 · In revisione", dotClass: "bg-orange-400", dateText: "22 mar · 11 gg", dateColor: "text-orange-400", borderClass: "" },
  { name: "Calibrazione sensore asse Z", context: "XR-200 · Subtask", dotClass: "bg-blue-400", dateText: "25 mar · 14 gg", dateColor: "text-muted-foreground", borderClass: "" },
  { name: "Test validazione BLE", context: "Med-Track · Task", dotClass: "bg-slate-400", dateText: "2 apr · 22 gg", dateColor: "text-muted-foreground", borderClass: "" },
]

// ─── Main Component ──────────────────────────────────────────────────────────

export default function WeeklyReportPage() {
  useSetPageContext({ domain: "analytics" })

  const [weekOffset, setWeekOffset] = useState(0)
  const [period, setPeriod] = useState<PeriodView>("week")
  const [roleView, setRoleView] = useState<RoleView>("direzione")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterOp, setFilterOp] = useState("")
  const [filterProject, setFilterProject] = useState("")

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

  // Merge preview data into KPIs where available
  const previewData = preview.data as Record<string, unknown> | undefined
  const completedCount = previewData
    ? (Array.isArray(previewData.completedTasks)
        ? previewData.completedTasks.length
        : typeof previewData.completedTasksCount === "number"
        ? previewData.completedTasksCount
        : null)
    : null

  const totalHoursFromAPI =
    previewData && typeof previewData.totalHours === "number"
      ? previewData.totalHours
      : null

  const kpis: KpiCardData[] = useMemo(() => {
    const base = [...DIREZIONE_KPIS]
    if (completedCount !== null) {
      base[0] = { ...base[0], value: String(completedCount) }
    }
    if (totalHoursFromAPI !== null) {
      base[1] = { ...base[1], value: `${totalHoursFromAPI}h` }
    }
    return base
  }, [completedCount, totalHoursFromAPI])

  const handleExportPDF = () => {
    toast.info("Esportazione PDF in corso…")
  }

  const handleSendReport = () => {
    generateReport.mutate(undefined, {
      onSuccess: () => toast.success("Report inviato con successo"),
      onError: () => toast.error("Errore nell'invio del report"),
    })
  }

  // Void to satisfy exhaustive-deps: weekStart/weekEnd are computed but only used for labels
  void weekStart
  void weekEnd

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
                  data={HOURS_DATA}
                  totalLabel="87h"
                  avgLabel="14.5h"
                  peakLabel="Mer · 22h"
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
                <DonutChart />
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
                  <span className="text-[10px] font-normal text-muted-foreground">4 attivi</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ProjectRows projects={PROJECTS} />
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
                <RisksCard risks={RISKS} />
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
                <TeamRows rows={TEAM_ROWS} />
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
                <MilestoneItems items={MILESTONES} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Full-width task table */}
          <motion.div variants={itemVariants} className="pb-5">
            <TaskTable
              tasks={TASK_DATA}
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
                <ActivityHeatmap />
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
            {DIPENDENTE_KPIS.map((kpi) => (
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
                    <span className="w-4 h-4 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center text-[8px] font-bold">MB</span>
                    <span className="text-[11px] font-semibold text-foreground">Marco Bianchi</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <HoursBarChart
                  data={[
                    { day: "Lun", hours: 7 },
                    { day: "Mar", hours: 8 },
                    { day: "Mer", hours: 9 },
                    { day: "Gio", hours: 6 },
                    { day: "Ven", hours: 6 },
                    { day: "Sab", hours: 0 },
                    { day: "Dom", hours: 0 },
                  ]}
                  totalLabel="36h"
                  avgLabel="7.2h"
                  peakLabel="4h"
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
                  <span className="text-[10px] font-normal text-muted-foreground">11 totali</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y divide-border/50">
                  {DIP_TASKS.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 py-1.5">
                      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", t.dotClass)} />
                      <span className="flex-1 text-xs font-medium truncate text-foreground">{t.name}</span>
                      <span className={cn("text-[10px] whitespace-nowrap flex-shrink-0", t.projectColor)}>
                        {t.project}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] ml-1.5 flex-shrink-0", t.badgeClass)}
                      >
                        {t.badge}
                      </Badge>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="mt-2 h-6 text-[11px] px-2">
                  Vedi tutti gli 11 task
                </Button>
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
                <div className="divide-y divide-border/50">
                  {[
                    { name: "XR-200 Alpha", dotColor: "bg-blue-500", barColor: "from-blue-800 to-blue-500", pct: 62, pctColor: "text-blue-400", subtitle: "7 miei task · 4 in corso" },
                    { name: "Med-Tracker v2", dotColor: "bg-green-500", barColor: "from-green-800 to-green-500", pct: 88, pctColor: "text-green-400", subtitle: "4 miei task · 1 in corso" },
                  ].map((p) => (
                    <div key={p.name} className="flex items-center gap-2.5 py-2">
                      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", p.dotColor)} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground">{p.subtitle}</div>
                      </div>
                      <div className="w-20 flex-shrink-0">
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full bg-gradient-to-r", p.barColor)}
                            style={{ width: `${p.pct}%` }}
                          />
                        </div>
                      </div>
                      <span className={cn("text-xs font-semibold w-8 text-right", p.pctColor)}>
                        {p.pct}%
                      </span>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-border" />
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Ore questa settimana per progetto
                  </p>
                  {[
                    { name: "XR-200 Alpha", color: "text-blue-400", barColor: "from-blue-800 to-blue-500", pct: 75, hours: "27h" },
                    { name: "Med-Tracker", color: "text-green-400", barColor: "from-green-800 to-green-500", pct: 25, hours: "9h" },
                  ].map((p) => (
                    <div key={p.name} className="flex items-center gap-2 mb-1.5">
                      <span className={cn("text-xs min-w-[90px]", p.color)}>{p.name}</span>
                      <div className="flex-1">
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full bg-gradient-to-r", p.barColor)}
                            style={{ width: `${p.pct}%` }}
                          />
                        </div>
                      </div>
                      <span className={cn("text-xs font-semibold min-w-[28px] text-right", p.color)}>
                        {p.hours}
                      </span>
                    </div>
                  ))}
                </div>
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
                {DIP_DEADLINES.map((d, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 bg-accent/30 border rounded hover:border-indigo-500/25 transition-colors cursor-pointer",
                      d.borderClass || "border-border"
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full flex-shrink-0", d.dotClass)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground truncate">{d.name}</div>
                      <div className="text-[10px] text-muted-foreground">{d.context}</div>
                    </div>
                    <span className={cn("text-[10px] font-semibold whitespace-nowrap", d.dateColor)}>
                      {d.dateText}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </motion.div>
  )
}
