import { useMemo, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ShieldAlert } from "lucide-react"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import { EntityList, type Column, type FilterConfig } from "@/components/common/EntityList"
import { StatusDot } from "@/components/common/StatusDot"
import { ParentLink } from "@/components/common/ParentLink"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  RISK_STATUS_LABELS,
  RISK_CATEGORY_LABELS,
  RISK_PROBABILITY_LABELS,
  RISK_IMPACT_LABELS,
  RISK_SCORE_MAP,
} from "@/lib/constants"
import { cn } from "@/lib/utils"
import { useRiskListQuery } from "@/hooks/api/useRisks"

interface Risk {
  id: string
  code: string
  title: string
  category: string
  probability: string
  impact: string
  status: string
  project?: { id: string; name: string }
  owner?: { id: string; firstName: string; lastName: string } | null
  createdAt: string
}

// --- Score helpers ---

function computeScore(probability: string, impact: string): number {
  const p = RISK_SCORE_MAP[probability] ?? 1
  const i = RISK_SCORE_MAP[impact] ?? 1
  return p * i
}

type RiskSeverity = "critical" | "high" | "medium" | "low" | "mitigated"

function getRiskSeverity(risk: Risk): RiskSeverity {
  if (risk.status === "mitigated" || risk.status === "closed") return "mitigated"
  const score = computeScore(risk.probability, risk.impact)
  if (score >= 7) return "critical"
  if (score >= 5) return "high"
  if (score >= 3) return "medium"
  return "low"
}

const SEVERITY_LABELS: Record<RiskSeverity, string> = {
  critical: "Critici",
  high: "Alti",
  medium: "Medi",
  low: "Bassi",
  mitigated: "Mitigati/Chiusi",
}

const SEVERITY_ORDER: RiskSeverity[] = ["critical", "high", "medium", "low", "mitigated"]

// Max possible score = 3×3 = 9
const MAX_SCORE = 9

const SEVERITY_BADGE_CLASSES: Record<RiskSeverity, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  high: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/30",
  medium: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30",
  low: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800/30",
  mitigated: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30",
}

const SEVERITY_PROGRESS_CLASSES: Record<RiskSeverity, string> = {
  critical: "[&>div]:bg-destructive",
  high: "[&>div]:bg-orange-500 dark:[&>div]:bg-orange-400",
  medium: "[&>div]:bg-amber-500 dark:[&>div]:bg-amber-400",
  low: "[&>div]:bg-slate-400 dark:[&>div]:bg-slate-500",
  mitigated: "[&>div]:bg-green-500 dark:[&>div]:bg-green-400",
}

// --- Columns ---

const columns: Column<Risk>[] = [
  {
    key: "title",
    header: "Rischio",
    sortable: true,
    cell: (item) => {
      const score = computeScore(item.probability, item.impact)
      const severity = getRiskSeverity(item)
      const scorePct = Math.round((score / MAX_SCORE) * 100)
      const pLabel = RISK_PROBABILITY_LABELS[item.probability] ?? item.probability
      const iLabel = RISK_IMPACT_LABELS[item.impact] ?? item.impact
      const categoryLabel = RISK_CATEGORY_LABELS[item.category] ?? item.category
      const ownerName = item.owner
        ? `${item.owner.firstName[0]}. ${item.owner.lastName}`
        : null

      return (
        <div className="min-w-0 py-1 space-y-0.5">
          {/* Line 1: status dot + P×I badge + title */}
          <div className="flex items-center gap-2 min-w-0">
            <StatusDot status={item.status} size="md" />
            <span
              className={cn(
                "shrink-0 text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded border",
                SEVERITY_BADGE_CLASSES[severity]
              )}
              title={`Probabilità: ${pLabel} · Impatto: ${iLabel}`}
            >
              P{RISK_SCORE_MAP[item.probability] ?? "?"}×I{RISK_SCORE_MAP[item.impact] ?? "?"}
            </span>
            <span className="font-medium text-sm truncate leading-tight flex-1 min-w-0">
              {item.title}
            </span>
          </div>

          {/* Line 2: parent project + owner */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground pl-5">
            {item.project ? (
              <ParentLink
                name={item.project.name}
                href={`/projects/${item.project.id}`}
                domain="project"
              />
            ) : null}
            {item.project && ownerName && (
              <span aria-hidden="true" className="text-muted-foreground/50">·</span>
            )}
            {ownerName && <span className="truncate">{ownerName}</span>}
          </div>

          {/* Line 3: category badge + score bar */}
          <div className="flex items-center gap-2 pl-5">
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 shrink-0 text-muted-foreground"
            >
              {categoryLabel}
            </Badge>
            <Progress
              value={scorePct}
              className={cn("h-1 flex-1 max-w-[80px]", SEVERITY_PROGRESS_CLASSES[severity])}
            />
          </div>
        </div>
      )
    },
  },
  {
    key: "score",
    header: "Rischio",
    className: "w-[90px] text-right",
    cell: (item) => {
      const score = computeScore(item.probability, item.impact)
      const severity = getRiskSeverity(item)
      const severityLabel =
        severity === "mitigated"
          ? RISK_STATUS_LABELS[item.status] ?? item.status
          : SEVERITY_LABELS[severity]

      return (
        <div className="flex flex-col items-end gap-0.5">
          <span
            className={cn(
              "text-2xl font-bold tabular-nums leading-none",
              severity === "critical" && "text-destructive",
              severity === "high" && "text-orange-600 dark:text-orange-400",
              severity === "medium" && "text-amber-600 dark:text-amber-400",
              severity === "low" && "text-slate-500",
              severity === "mitigated" && "text-green-600 dark:text-green-400"
            )}
          >
            {score}
          </span>
          <span className="text-[10px] text-muted-foreground leading-none">{severityLabel}</span>
        </div>
      )
    },
  },
]

// --- Filter config ---

const STATUS_OPTIONS = Object.entries(RISK_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const CATEGORY_OPTIONS = Object.entries(RISK_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const filterConfig: FilterConfig[] = [
  { key: "search", label: "Cerca", type: "search", placeholder: "Cerca rischi..." },
  { key: "status", label: "Stato", type: "select", options: STATUS_OPTIONS },
  { key: "category", label: "Categoria", type: "select", options: CATEGORY_OPTIONS },
]

// --- Page ---

function RiskListPage() {
  useSetPageContext({ domain: "risk" })
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(
    () => ({
      search: searchParams.get("search") ?? "",
      status: searchParams.get("status") ?? "",
      category: searchParams.get("category") ?? "",
      page: searchParams.get("page") ?? "1",
    }),
    [searchParams]
  )

  const { data, isLoading, error } = useRiskListQuery(filters)

  const items: Risk[] = data?.data ?? []
  const pagination = data?.pagination

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
  }, [setSearchParams])

  const handlePageChange = useCallback(
    (page: number) => handleFilterChange("page", String(page)),
    [handleFilterChange]
  )

  // Disable groupBy when filtering by status (show flat results)
  const useGroupBy = !filters.status

  return (
    <EntityList<Risk>
      title="Rischi"
      icon={ShieldAlert}
      data={items}
      pagination={pagination}
      isLoading={isLoading}
      error={error as Error | null}
      columns={columns}
      getId={(item) => item.id}
      filterConfig={filterConfig}
      filters={filters}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
      onPageChange={handlePageChange}
      onRowClick={(item) => navigate(`/risks/${item.id}`)}
      createHref="/risks/new"
      createLabel="Nuovo rischio"
      emptyTitle="Nessun rischio"
      emptyDescription="Non ci sono rischi registrati."
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
  )
}

export default RiskListPage
