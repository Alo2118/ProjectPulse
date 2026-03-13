import { useState, useMemo, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  ShieldAlert,
  AlertTriangle,
  Shield,
  ShieldCheck,
  CheckSquare,
  Eye,
  Pencil,
} from "lucide-react"
import { motion } from "framer-motion"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import { EntityList, type Column, type FilterConfig } from "@/components/common/EntityList"
import { EntityRow } from "@/components/common/EntityRow"
import { TagFilter } from "@/components/common/TagFilter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  RISK_STATUS_LABELS,
  RISK_CATEGORY_LABELS,
  RISK_SCALE_LABELS,
  getRiskLevel,
} from "@/lib/constants"
import type { KpiCard } from "@/components/common/KpiStrip"
import { cn } from "@/lib/utils"
import { useRiskListQuery } from "@/hooks/api/useRisks"
import { useStatsQuery } from "@/hooks/api/useStats"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Risk {
  id: string
  code: string
  title: string
  description?: string | null
  category: string
  probability: number
  impact: number
  status: string
  mitigation?: string | null
  project?: { id: string; name: string } | null
  owner?: { id: string; firstName: string; lastName: string } | null
  linkedTasks?: Array<{ id: string; title: string; status: string }> | null
  createdAt: string
  updatedAt?: string
}

// ---------------------------------------------------------------------------
// Score & severity helpers
// ---------------------------------------------------------------------------

function computeScore(probability: number, impact: number): number {
  return probability * impact
}

type RiskSeverity = "critical" | "high" | "medium" | "low" | "mitigated"

function getRiskSeverity(risk: Risk): RiskSeverity {
  if (risk.status === "mitigated" || risk.status === "closed") return "mitigated"
  const score = computeScore(risk.probability, risk.impact)
  return getRiskLevel(score)
}

const SEVERITY_LABELS: Record<RiskSeverity, string> = {
  critical: "Critici",
  high: "Alti",
  medium: "Medi",
  low: "Bassi",
  mitigated: "Mitigati/Chiusi",
}

const SEVERITY_ORDER: RiskSeverity[] = ["critical", "high", "medium", "low", "mitigated"]

const SEVERITY_BADGE_CLASSES: Record<RiskSeverity, string> = {
  critical:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30",
  high: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/30",
  medium:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30",
  low: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800/30",
  mitigated:
    "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30",
}

const SEVERITY_DISPLAY_LABELS: Record<RiskSeverity, string> = {
  critical: "Critico",
  high: "Alto",
  medium: "Medio",
  low: "Basso",
  mitigated: "Mitigato",
}

const SEVERITY_DOT_COLOR: Record<RiskSeverity, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-500",
  low: "bg-slate-400",
  mitigated: "bg-green-500",
}

const SEVERITY_ROW_BORDER: Record<RiskSeverity, string> = {
  critical: "border-l-[3px] border-l-red-500/70",
  high: "border-l-[3px] border-l-orange-500/60",
  medium: "border-l-[3px] border-l-amber-500/50",
  low: "border-l-[3px] border-l-slate-400/40",
  mitigated: "border-l-[3px] border-l-green-500/35",
}

// Risk status labels (mockup uses "In mitigazione" for mitigated)
const RISK_STATUS_DISPLAY: Record<string, string> = {
  open: "Aperto",
  mitigated: "In mitigazione",
  accepted: "Accettato",
  closed: "Chiuso",
}

const RISK_STATUS_BADGE_CLASSES: Record<string, string> = {
  open: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30",
  mitigated:
    "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/30",
  accepted:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30",
  closed:
    "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30",
}

// Score badge classes
function getScoreBadgeClass(score: number): string {
  if (score >= 15)
    return "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
  if (score >= 10)
    return "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
  if (score >= 5)
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
  return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DotRating({
  value,
  max = 3,
  color,
}: {
  value: number
  max?: number
  color: string
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            i < value ? color : "bg-muted border border-border"
          )}
        />
      ))}
    </div>
  )
}

function OwnerCell({
  owner,
}: {
  owner?: { id: string; firstName: string; lastName: string } | null
}) {
  if (!owner) return <span className="text-xs text-muted-foreground">—</span>
  const initials = `${owner.firstName[0] ?? ""}${owner.lastName[0] ?? ""}`.toUpperCase()
  const shortName = `${owner.firstName[0]}. ${owner.lastName}`
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Avatar className="h-5 w-5 shrink-0">
        <AvatarFallback className="text-[9px] font-bold">{initials}</AvatarFallback>
      </Avatar>
      <span className="text-xs text-muted-foreground truncate">{shortName}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Severity chip filter
// ---------------------------------------------------------------------------

type SevFilter = "all" | "critical" | "high" | "medium" | "low"
type StaFilter = "all" | "open" | "mitigated" | "closed"

const SEV_CHIPS: { value: SevFilter; label: string }[] = [
  { value: "all", label: "Tutti" },
  { value: "critical", label: "Critico" },
  { value: "high", label: "Alto" },
  { value: "medium", label: "Medio" },
  { value: "low", label: "Basso" },
]

const STA_CHIPS: { value: StaFilter; label: string }[] = [
  { value: "all", label: "Tutti" },
  { value: "open", label: "Aperto" },
  { value: "mitigated", label: "In mitigazione" },
  { value: "closed", label: "Chiuso" },
]

// Dot colors for chip-dot spans (severity)
const SEV_DOT_COLORS: Record<SevFilter, string | null> = {
  all: null,
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-400",
  low: "bg-slate-400",
}

// Dot colors for chip-dot spans (status)
const STA_DOT_COLORS: Record<StaFilter, string | null> = {
  all: null,
  open: "bg-red-500",
  mitigated: "bg-indigo-500",
  closed: "bg-green-500",
}

// Active background tint (10% opacity) matching each severity/status
const SEV_ACTIVE_BG: Record<SevFilter, string> = {
  all: "bg-accent/20 border-border text-foreground",
  critical: "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400",
  high: "bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400",
  medium: "bg-amber-400/10 border-amber-400/30 text-amber-700 dark:text-amber-400",
  low: "bg-slate-400/10 border-slate-400/30 text-slate-700 dark:text-slate-400",
}

const STA_ACTIVE_BG: Record<StaFilter, string> = {
  all: "bg-accent/20 border-border text-foreground",
  open: "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400",
  mitigated: "bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-400",
  closed: "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400",
}

function ChipFilter<T extends string>({
  label,
  chips,
  value,
  onChange,
  dotColors,
  activeBg,
}: {
  label: string
  chips: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  dotColors: Record<T, string | null>
  activeBg: Record<T, string>
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
        {label}
      </span>
      {chips.map((chip) => {
        const isActive = value === chip.value
        const dotColor = dotColors[chip.value]
        return (
          <button
            key={chip.value}
            type="button"
            onClick={() => onChange(chip.value)}
            className={cn(
              "chip-filter",
              isActive && activeBg[chip.value]
            )}
          >
            {dotColor && (
              <span className={cn("chip-dot", dotColor)} />
            )}
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Detail drawer (Sheet)
// ---------------------------------------------------------------------------

function RiskDrawer({
  risk,
  open,
  onClose,
}: {
  risk: Risk | null
  open: boolean
  onClose: () => void
}) {
  if (!risk) return null

  const severity = getRiskSeverity(risk)
  const score = computeScore(risk.probability, risk.impact)
  const dotColor = SEVERITY_DOT_COLOR[severity]
  const probValue = risk.probability
  const impactValue = risk.impact
  const linkedTasks = risk.linkedTasks ?? []

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent
        side="right"
        className="w-[420px] sm:max-w-[420px] p-0 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className={cn(
                "text-[11px] font-semibold border",
                SEVERITY_BADGE_CLASSES[severity]
              )}
            >
              {severity === "critical" && (
                <AlertTriangle className="h-2.5 w-2.5 mr-1" />
              )}
              {SEVERITY_DISPLAY_LABELS[severity]}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-[11px] font-semibold border",
                RISK_STATUS_BADGE_CLASSES[risk.status] ??
                  "bg-muted text-muted-foreground border-border"
              )}
            >
              {RISK_STATUS_DISPLAY[risk.status] ?? risk.status}
            </Badge>
          </div>
          <SheetTitle className="text-[15px] font-bold leading-snug pr-8">
            {risk.title}
          </SheetTitle>
          <p className="text-[11px] text-muted-foreground mt-1">
            {risk.code}
            {risk.project ? ` · ${risk.project.name}` : ""}
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Parametri rischio */}
          <DrawerSection title="Parametri rischio">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Probabilità
                </p>
                <DotRating value={probValue} max={5} color={dotColor} />
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {RISK_SCALE_LABELS[risk.probability] ?? String(risk.probability)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Impatto
                </p>
                <DotRating value={impactValue} max={5} color={dotColor} />
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {RISK_SCALE_LABELS[risk.impact] ?? String(risk.impact)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Score (P×I)
                </p>
                <span
                  className={cn(
                    "inline-flex items-center justify-center w-7 h-5 rounded text-[11px] font-bold",
                    getScoreBadgeClass(score)
                  )}
                >
                  {score}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Responsabile
                </p>
                <OwnerCell owner={risk.owner} />
              </div>
            </div>
          </DrawerSection>

          {/* Descrizione */}
          {risk.description && (
            <DrawerSection title="Descrizione">
              <div className="text-xs text-muted-foreground leading-relaxed bg-muted/40 rounded-md px-3 py-2.5 border border-border/60">
                {risk.description}
              </div>
            </DrawerSection>
          )}

          {/* Piano di mitigazione */}
          {risk.mitigation && (
            <DrawerSection title="Piano di mitigazione">
              <div className="text-xs text-muted-foreground leading-relaxed bg-indigo-500/[0.04] rounded-md px-3 py-2.5 border border-indigo-500/[0.12]">
                {risk.mitigation}
              </div>
            </DrawerSection>
          )}

          {/* Task collegati */}
          <DrawerSection title="Task collegati">
            {linkedTasks.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic">
                Nessun task collegato
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {linkedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-muted/40 border border-border/60"
                  >
                    <CheckSquare className="h-3 w-3 text-cyan-500 shrink-0" />
                    <span className="flex-1 text-xs font-medium truncate min-w-0">
                      {task.title}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0 shrink-0"
                    >
                      {task.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </DrawerSection>

          {/* Storico modifiche */}
          <DrawerSection title="Storico modifiche">
            <HistoryTimeline risk={risk} />
          </DrawerSection>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function DrawerSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5 pb-1.5 border-b border-border/60">
        {title}
      </p>
      {children}
    </div>
  )
}

// Minimal history from risk audit fields — the backend might not have a history
// array. We synthesise a simple timeline from createdAt / updatedAt and status.
function HistoryTimeline({ risk }: { risk: Risk }) {
  const items = useMemo(() => {
    const entries: { date: string; text: string; type: string }[] = []
    if (risk.createdAt) {
      entries.push({
        date: new Date(risk.createdAt).toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        text: "Rischio identificato e registrato",
        type: "open",
      })
    }
    if (
      risk.status === "mitigated" &&
      risk.updatedAt &&
      risk.updatedAt !== risk.createdAt
    ) {
      entries.push({
        date: new Date(risk.updatedAt).toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        text: "Piano di mitigazione attivato",
        type: "mitigated",
      })
    }
    if (risk.status === "closed" && risk.updatedAt) {
      entries.push({
        date: new Date(risk.updatedAt).toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        text: "Rischio chiuso",
        type: "closed",
      })
    }
    return entries.reverse()
  }, [risk])

  if (items.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground italic">
        Nessuno storico disponibile
      </p>
    )
  }

  const dotColor: Record<string, string> = {
    open: "border-orange-400",
    mitigated: "border-indigo-400",
    closed: "border-green-400",
    critical: "border-red-400",
  }

  return (
    <div className="flex flex-col">
      {items.map((item, i) => (
        <div
          key={i}
          className={cn(
            "flex gap-2.5 py-2",
            i < items.length - 1 && "border-b border-border/40"
          )}
        >
          <div
            className={cn(
              "mt-[3px] h-2 w-2 shrink-0 rounded-full border-2",
              dotColor[item.type] ?? "border-muted-foreground"
            )}
          />
          <span className="text-[10px] text-muted-foreground whitespace-nowrap w-[72px] shrink-0">
            {item.date}
          </span>
          <span className="text-[11px] text-muted-foreground leading-snug">
            {item.text}
          </span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

function buildColumns(
  onDrawerOpen: (risk: Risk) => void,
  navigate: (path: string) => void
): Column<Risk>[] {
  return [
    {
      key: "code",
      header: "ID",
      className: "w-[90px]",
      cell: (item) => (
        <span className="text-micro font-bold text-muted-foreground tabular-nums">
          {item.code}
        </span>
      ),
    },
    {
      key: "title",
      header: "Titolo rischio",
      sortable: true,
      cell: (item) => {
        const linkedCount = item.linkedTasks?.length ?? 0
        return (
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-semibold leading-tight truncate">{item.title}</p>
            <p className="text-[10px] text-muted-foreground">
              {linkedCount > 0
                ? `${linkedCount} task collegat${linkedCount === 1 ? "o" : "i"}`
                : "Nessun task collegato"}
            </p>
          </div>
        )
      },
    },
    {
      key: "project",
      header: "Progetto",
      className: "w-[160px]",
      cell: (item) =>
        item.project ? (
          <span className="text-xs text-muted-foreground">{item.project.name}</span>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        ),
    },
    {
      key: "severity",
      header: "Severità",
      className: "w-[100px]",
      cell: (item) => {
        const severity = getRiskSeverity(item)
        return (
          <Badge
            variant="outline"
            className={cn(
              "text-[11px] font-semibold border gap-1",
              SEVERITY_BADGE_CLASSES[severity]
            )}
          >
            {severity === "critical" && <AlertTriangle className="h-2.5 w-2.5" />}
            {SEVERITY_DISPLAY_LABELS[severity]}
          </Badge>
        )
      },
    },
    {
      key: "probability",
      header: "Prob.",
      className: "w-[80px]",
      cell: (item) => {
        const severity = getRiskSeverity(item)
        return (
          <div title={RISK_SCALE_LABELS[item.probability] ?? String(item.probability)}>
            <DotRating value={item.probability} max={5} color={SEVERITY_DOT_COLOR[severity]} />
          </div>
        )
      },
    },
    {
      key: "impact",
      header: "Impatto",
      className: "w-[80px]",
      cell: (item) => {
        const severity = getRiskSeverity(item)
        return (
          <div title={RISK_SCALE_LABELS[item.impact] ?? String(item.impact)}>
            <DotRating value={item.impact} max={5} color={SEVERITY_DOT_COLOR[severity]} />
          </div>
        )
      },
    },
    {
      key: "score",
      header: "Score",
      className: "w-[64px]",
      cell: (item) => {
        const score = computeScore(item.probability, item.impact)
        return (
          <span
            className={cn(
              "inline-flex items-center justify-center w-7 h-5 rounded text-[11px] font-bold tabular-nums",
              getScoreBadgeClass(score)
            )}
          >
            {score}
          </span>
        )
      },
    },
    {
      key: "status",
      header: "Stato",
      className: "w-[130px]",
      cell: (item) => (
        <Badge
          variant="outline"
          className={cn(
            "text-[11px] font-semibold border",
            RISK_STATUS_BADGE_CLASSES[item.status] ??
              "bg-muted text-muted-foreground border-border"
          )}
        >
          {RISK_STATUS_DISPLAY[item.status] ??
            RISK_STATUS_LABELS[item.status] ??
            item.status}
        </Badge>
      ),
    },
    {
      key: "owner",
      header: "Responsabile",
      className: "w-[130px]",
      cell: (item) => <OwnerCell owner={item.owner} />,
    },
    {
      key: "actions",
      header: "",
      className: "w-[80px]",
      cell: (item) => (
        <div className="row-actions flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Dettaglio"
            onClick={(e) => {
              e.stopPropagation()
              onDrawerOpen(item)
            }}
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Modifica"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/risks/${item.id}/edit`)
            }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
  ]
}

// ---------------------------------------------------------------------------
// Filter config
// ---------------------------------------------------------------------------

const CATEGORY_OPTIONS = Object.entries(RISK_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const filterConfig: FilterConfig[] = [
  { key: "search", label: "Cerca", type: "search", placeholder: "Cerca per titolo, ID..." },
  { key: "category", label: "Categoria", type: "select", options: CATEGORY_OPTIONS },
]

// ---------------------------------------------------------------------------
// KPI strip — computed from list data
// ---------------------------------------------------------------------------

function buildKpiCards(items: Risk[]): KpiCard[] {
  const total = items.length
  const criticalCount = items.filter((r) => getRiskSeverity(r) === "critical").length
  const criticalOpenCount = items.filter(
    (r) => getRiskSeverity(r) === "critical" && r.status === "open"
  ).length
  const mitCount = items.filter((r) => r.status === "mitigated").length
  const closedCount = items.filter((r) => r.status === "closed").length
  const closurePct = total > 0 ? `${Math.round((closedCount / total) * 100)}% tasso chiusura` : "0% tasso chiusura"

  return [
    {
      label: "Totale rischi",
      value: total,
      color: "danger",
      icon: ShieldAlert,
      subtitle: `${criticalCount} critici · ${mitCount} in corso`,
    },
    {
      label: "Critici",
      value: criticalCount,
      color: "danger",
      icon: AlertTriangle,
      subtitle: `${criticalOpenCount} aperti`,
    },
    {
      label: "In mitigazione",
      value: mitCount,
      color: "indigo",
      icon: Shield,
      subtitle: "piani attivi",
    },
    {
      label: "Chiusi",
      value: closedCount,
      color: "success",
      icon: ShieldCheck,
      subtitle: closurePct,
    },
  ]
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function RiskListPage() {
  useSetPageContext({ domain: "risk" })
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Server-side filters
  const filters = useMemo(
    () => ({
      search: searchParams.get("search") ?? "",
      category: searchParams.get("category") ?? "",
      page: searchParams.get("page") ?? "1",
    }),
    [searchParams]
  )

  // Client-side chip filters (not sent to API — applied locally)
  const [sevFilter, setSevFilter] = useState<SevFilter>("all")
  const [staFilter, setStaFilter] = useState<StaFilter>("all")
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  // Drawer state
  const [drawerRisk, setDrawerRisk] = useState<Risk | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data, isLoading, error } = useRiskListQuery(filters)
  const { data: serverKpiCards } = useStatsQuery('risks')

  const rawItems: Risk[] = data?.data ?? []
  const pagination = data?.pagination

  // Apply client-side chip filters
  const items = useMemo(() => {
    return rawItems.filter((r) => {
      const severity = getRiskSeverity(r)
      const matchSev = sevFilter === "all" || severity === sevFilter
      const matchSta =
        staFilter === "all" ||
        r.status === staFilter ||
        (staFilter === "mitigated" && r.status === "mitigated")
      return matchSev && matchSta
    })
  }, [rawItems, sevFilter, staFilter])

  // Prefer server-computed KPIs, fall back to client-side computed
  const clientKpiCards = useMemo(() => buildKpiCards(rawItems), [rawItems])
  const kpiCards = serverKpiCards ?? clientKpiCards

  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (value) {
          next.set(key, value)
        } else {
          next.delete(key)
        }
        if (key !== "page") next.delete("page")
        return next
      })
    },
    [setSearchParams]
  )

  const handleFilterClear = useCallback(() => {
    setSearchParams(new URLSearchParams())
    setSevFilter("all")
    setStaFilter("all")
    setSelectedTagIds([])
  }, [setSearchParams])

  const handlePageChange = useCallback(
    (page: number) => handleFilterChange("page", String(page)),
    [handleFilterChange]
  )

  const handleDrawerOpen = useCallback((risk: Risk) => {
    setDrawerRisk(risk)
    setDrawerOpen(true)
  }, [])

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false)
  }, [])

  // Render row for list view using EntityRow
  const renderRow = useCallback(
    (r: Risk) => {
      const severity = getRiskSeverity(r)
      const score = computeScore(r.probability, r.impact)
      return (
        <EntityRow
          id={r.id}
          name={r.title}
          status={r.status}
          entityType="risk"
          onClick={() => handleDrawerOpen(r)}
          code={r.code}
          subtitle={r.project?.name}
          assignee={r.owner ?? undefined}
          extraBadges={
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-semibold border gap-1",
                SEVERITY_BADGE_CLASSES[severity]
              )}
            >
              {severity === "critical" && <AlertTriangle className="h-2.5 w-2.5" />}
              {SEVERITY_DISPLAY_LABELS[severity]} ({score})
            </Badge>
          }
        />
      )
    },
    [handleDrawerOpen]
  )

  // Disable groupBy when a status chip is active
  const useGroupBy = staFilter === "all" && sevFilter === "all"

  const columns = useMemo(
    () => buildColumns(handleDrawerOpen, navigate),
    [handleDrawerOpen, navigate]
  )

  // Row-level left border by severity + row-accent for hover state + group for row-actions reveal
  const rowClassName = useCallback(
    (item: Risk) => {
      const severity = getRiskSeverity(item)
      return cn("group", SEVERITY_ROW_BORDER[severity])
    },
    []
  )

  // Extra toolbar: chip filters
  const chipFilters = (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-3 flex-wrap"
    >
      <div className="w-px h-5 bg-border shrink-0" />
      <ChipFilter
        label="Severità"
        chips={SEV_CHIPS}
        value={sevFilter}
        onChange={setSevFilter}
        dotColors={SEV_DOT_COLORS}
        activeBg={SEV_ACTIVE_BG}
      />
      <div className="w-px h-5 bg-border shrink-0" />
      <ChipFilter
        label="Stato"
        chips={STA_CHIPS}
        value={staFilter}
        onChange={setStaFilter}
        dotColors={STA_DOT_COLORS}
        activeBg={STA_ACTIVE_BG}
      />
    </motion.div>
  )

  return (
    <>
      <EntityList<Risk>
        title="Registro Rischi"
        icon={ShieldAlert}
        data={items}
        pagination={useGroupBy ? pagination : undefined}
        isLoading={isLoading}
        error={error as Error | null}
        columns={columns}
        getId={(item) => item.id}
        filterConfig={filterConfig}
        filters={filters}
        onFilterChange={handleFilterChange}
        onFilterClear={handleFilterClear}
        onPageChange={handlePageChange}
        onRowClick={handleDrawerOpen}
        createHref="/risks/new"
        createLabel="Nuovo rischio"
        emptyTitle="Nessun rischio"
        emptyDescription="Non ci sono rischi corrispondenti ai filtri selezionati."
        kpiStrip={kpiCards}
        renderRow={renderRow}
        headerExtra={chipFilters}
        afterFilters={
          <TagFilter
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
          />
        }
        rowClassName={rowClassName}
        groupBy={
          useGroupBy
            ? {
                getGroup: (r) => getRiskSeverity(r),
                order: SEVERITY_ORDER,
                labels: SEVERITY_LABELS,
                collapsedByDefault: ["mitigated"],
              }
            : undefined
        }
      />

      <RiskDrawer
        risk={drawerRisk}
        open={drawerOpen}
        onClose={handleDrawerClose}
      />
    </>
  )
}

export default RiskListPage
