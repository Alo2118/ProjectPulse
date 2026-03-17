import { useState, useMemo, useCallback } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import { ShieldAlert, AlertTriangle, Shield, ShieldCheck, Download, Plus } from "lucide-react"
import { motion } from "framer-motion"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import { EntityList } from "@/components/common/EntityList"
import { PageHeader } from "@/components/layout/PageHeader"
import { DomainBadge } from "@/components/common/DomainBadge"
import { KpiStrip, type KpiCard } from "@/components/common/KpiStrip"
import { SearchBox } from "@/components/common/SearchBox"
import { ChipFilter } from "@/components/common/ChipFilter"
import { EmptyState } from "@/components/common/EmptyState"
import { RiskRow, type RiskRowData } from "@/components/domain/risks/RiskRow"
import { RiskDrawer, type RiskDrawerData } from "@/components/domain/risks/RiskDrawer"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getRiskLevel } from "@/lib/constants"
import { useRiskListQuery } from "@/hooks/api/useRisks"
import { useStatsQuery } from "@/hooks/api/useStats"

// ── Types ─────────────────────────────────────────────────────────────────────

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
  updatedAt?: string | null
}

type RiskSeverity = "critical" | "high" | "medium" | "low" | "mitigated"

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeScore(probability: number, impact: number): number {
  return probability * impact
}

function getRiskSeverity(risk: Risk): RiskSeverity {
  if (risk.status === "mitigated" || risk.status === "closed") return "mitigated"
  return getRiskLevel(computeScore(risk.probability, risk.impact))
}

function toRiskRowData(r: Risk): RiskRowData {
  return {
    id: r.id,
    code: r.code,
    title: r.title,
    probability: r.probability,
    impact: r.impact,
    status: r.status,
    severity: getRiskSeverity(r),
    project: r.project,
    owner: r.owner,
    linkedTasks: r.linkedTasks,
  }
}

function toRiskDrawerData(r: Risk): RiskDrawerData {
  return {
    id: r.id,
    code: r.code,
    title: r.title,
    description: r.description,
    probability: r.probability,
    impact: r.impact,
    status: r.status,
    severity: getRiskSeverity(r),
    mitigation: r.mitigation,
    project: r.project,
    owner: r.owner,
    linkedTasks: r.linkedTasks,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

// ── KPI builder ───────────────────────────────────────────────────────────────

function buildKpiCards(items: Risk[]): KpiCard[] {
  const total = items.length
  const criticalCount = items.filter((r) => getRiskSeverity(r) === "critical").length
  const criticalOpenCount = items.filter(
    (r) => getRiskSeverity(r) === "critical" && r.status === "open"
  ).length
  const mitCount = items.filter((r) => r.status === "mitigated").length
  const closedCount = items.filter((r) => r.status === "closed").length
  const closurePct =
    total > 0 ? `${Math.round((closedCount / total) * 100)}% tasso chiusura` : "0% tasso chiusura"

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

// ── Filter chips data ─────────────────────────────────────────────────────────

type SevFilter = "all" | "critical" | "high" | "medium" | "low"
type StaFilter = "all" | "open" | "mitigated" | "closed"

const SEV_CHIPS: { value: SevFilter; label: string; activeStyle: React.CSSProperties }[] = [
  {
    value: "all",
    label: "Tutti",
    activeStyle: { background: "var(--bg-overlay)", color: "var(--text-primary)", borderColor: "rgba(255,255,255,0.12)" },
  },
  {
    value: "critical",
    label: "Critico",
    activeStyle: { background: "rgba(239,68,68,0.1)", color: "#f87171", borderColor: "rgba(239,68,68,0.25)" },
  },
  {
    value: "high",
    label: "Alto",
    activeStyle: { background: "rgba(249,115,22,0.08)", color: "#fb923c", borderColor: "rgba(249,115,22,0.2)" },
  },
  {
    value: "medium",
    label: "Medio",
    activeStyle: { background: "rgba(249,115,22,0.08)", color: "#fb923c", borderColor: "rgba(249,115,22,0.2)" },
  },
  {
    value: "low",
    label: "Basso",
    activeStyle: { background: "rgba(234,179,8,0.08)", color: "#facc15", borderColor: "rgba(234,179,8,0.2)" },
  },
]

const STA_CHIPS: { value: StaFilter; label: string; activeStyle: React.CSSProperties }[] = [
  {
    value: "all",
    label: "Tutti",
    activeStyle: { background: "var(--bg-overlay)", color: "var(--text-primary)", borderColor: "rgba(255,255,255,0.12)" },
  },
  {
    value: "open",
    label: "Aperto",
    activeStyle: { background: "rgba(239,68,68,0.08)", color: "#f87171", borderColor: "rgba(239,68,68,0.2)" },
  },
  {
    value: "mitigated",
    label: "In mitigazione",
    activeStyle: { background: "rgba(99,102,241,0.08)", color: "#a5b4fc", borderColor: "rgba(99,102,241,0.2)" },
  },
  {
    value: "closed",
    label: "Chiuso",
    activeStyle: { background: "rgba(34,197,94,0.08)", color: "#4ade80", borderColor: "rgba(34,197,94,0.2)" },
  },
]

// ── Loading skeleton ──────────────────────────────────────────────────────────

function RiskTableSkeleton() {
  return (
    <div style={{ padding: "0 28px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
        <thead>
          <tr>
            {["ID", "Titolo rischio", "Progetto", "Severità", "Prob.", "Impatto", "Score", "Stato", "Responsabile", ""].map(
              (h) => (
                <th
                  key={h}
                  style={{
                    padding: "8px 12px",
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--text-muted)",
                    borderBottom: "1px solid var(--border-default)",
                    textAlign: "left",
                    whiteSpace: "nowrap",
                    background: "var(--bg-surface)",
                  }}
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i}>
              {Array.from({ length: 10 }).map((_, j) => (
                <td key={j} style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-subtle)" }}>
                  <Skeleton className="h-4" style={{ width: j === 1 ? "80%" : "60%" }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Table component ───────────────────────────────────────────────────────────

function RiskTable({
  risks,
  onRiskClick,
  onEdit,
}: {
  risks: Risk[]
  onRiskClick: (risk: Risk) => void
  onEdit: (risk: Risk) => void
}) {
  if (risks.length === 0) {
    return (
      <div style={{ padding: "0 28px" }}>
        <EmptyState
          icon={ShieldAlert}
          title="Nessun rischio"
          description="Nessun rischio corrisponde ai filtri selezionati."
        />
      </div>
    )
  }

  return (
    <div style={{ padding: "0 28px", overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
        <thead>
          <tr>
            {[
              { label: "ID", width: 80 },
              { label: "Titolo rischio", width: undefined },
              { label: "Progetto", width: 150 },
              { label: "Severità", width: 90 },
              { label: "Prob.", width: 80 },
              { label: "Impatto", width: 80 },
              { label: "Score", width: 60 },
              { label: "Stato", width: 120 },
              { label: "Responsabile", width: 100 },
              { label: "", width: 80 },
            ].map((col, i) => (
              <th
                key={i}
                style={{
                  padding: "8px 12px",
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-muted)",
                  borderBottom: "1px solid var(--border-default)",
                  textAlign: "left",
                  whiteSpace: "nowrap",
                  background: "var(--bg-surface)",
                  position: "sticky",
                  top: 0,
                  zIndex: 5,
                  width: col.width,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {risks.map((risk) => (
            <RiskRow
              key={risk.id}
              risk={toRiskRowData(risk)}
              onClick={() => onRiskClick(risk)}
              onEdit={() => onEdit(risk)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function RiskListPage() {
  useSetPageContext({ domain: "risk" })
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Server-side filters
  const page = searchParams.get("page") ?? "1"
  const serverFilters = useMemo(
    () => ({
      search: searchParams.get("search") ?? "",
      category: searchParams.get("category") ?? "",
      page,
    }),
    [searchParams, page]
  )

  // Client-side chip filters
  const [sevFilter, setSevFilter] = useState<SevFilter>("all")
  const [staFilter, setStaFilter] = useState<StaFilter>("all")
  const [searchLocal, setSearchLocal] = useState(searchParams.get("search") ?? "")

  // Drawer state
  const [drawerRisk, setDrawerRisk] = useState<Risk | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data, isLoading, error } = useRiskListQuery(serverFilters)
  const { data: serverKpis } = useStatsQuery("risks")

  const rawItems: Risk[] = data?.data ?? []

  // Apply client-side chip filters + local search
  const items = useMemo(() => {
    return rawItems.filter((r) => {
      const severity = getRiskSeverity(r)
      const matchSev = sevFilter === "all" || severity === sevFilter
      const matchSta =
        staFilter === "all" ||
        r.status === staFilter ||
        (staFilter === "mitigated" && r.status === "mitigated")
      const matchSearch =
        !searchLocal ||
        r.title.toLowerCase().includes(searchLocal.toLowerCase()) ||
        r.code.toLowerCase().includes(searchLocal.toLowerCase())
      return matchSev && matchSta && matchSearch
    })
  }, [rawItems, sevFilter, staFilter, searchLocal])

  const clientKpis = useMemo(() => buildKpiCards(rawItems), [rawItems])
  const kpiCards = serverKpis ?? clientKpis

  const handleSearch = useCallback((v: string) => {
    setSearchLocal(v)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (v) next.set("search", v)
      else next.delete("search")
      next.delete("page")
      return next
    })
  }, [setSearchParams])

  const handleDrawerOpen = useCallback((risk: Risk) => {
    setDrawerRisk(risk)
    setDrawerOpen(true)
  }, [])

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false)
  }, [])

  const handleEdit = useCallback(
    (risk: Risk) => {
      navigate(`/risks/${risk.id}/edit`)
    },
    [navigate]
  )

  return (
    <>
      <EntityList
        breadcrumbs={[
          { label: "Workspace", href: "/" },
          { label: "Rischi" },
        ]}
        header={
          <PageHeader
            domainBadge={<DomainBadge domain="risk" label="Rischi" />}
            title="Registro Rischi"
            subtitle="ISO 14971 · Gestione rischi dispositivi medici"
            actions={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  style={{ fontSize: 12 }}
                >
                  <Download style={{ width: 13, height: 13 }} />
                  Esporta
                </Button>
                <Link to="/risks/new">
                  <Button
                    size="sm"
                    style={{
                      fontSize: 12,
                      background: "rgba(249,115,22,0.12)",
                      color: "#fb923c",
                      borderColor: "rgba(249,115,22,0.35)",
                    }}
                    variant="outline"
                  >
                    <Plus style={{ width: 13, height: 13 }} />
                    Nuovo Rischio
                  </Button>
                </Link>
              </>
            }
          />
        }
        kpiStrip={
          <div style={{ padding: "0 28px 20px" }}>
            <KpiStrip items={kpiCards} columns={4} />
          </div>
        }
        toolbar={
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-2.5 flex-wrap"
          >
            <SearchBox
              value={searchLocal}
              onChange={handleSearch}
              placeholder="Cerca per titolo, ID..."
            />

            <div
              style={{
                width: 1,
                height: 22,
                background: "var(--border-default)",
                flexShrink: 0,
              }}
            />

            {/* Severity chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-muted)",
                  flexShrink: 0,
                }}
              >
                Severità
              </span>
              {SEV_CHIPS.map((chip) => (
                <ChipFilter
                  key={chip.value}
                  label={chip.label}
                  isActive={sevFilter === chip.value}
                  activeColor={{
                    bg: chip.activeStyle.background as string,
                    text: chip.activeStyle.color as string,
                    border: chip.activeStyle.borderColor as string,
                  }}
                  onClick={() => setSevFilter(chip.value)}
                />
              ))}
            </div>

            <div
              style={{
                width: 1,
                height: 22,
                background: "var(--border-default)",
                flexShrink: 0,
              }}
            />

            {/* Status chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-muted)",
                  flexShrink: 0,
                }}
              >
                Stato
              </span>
              {STA_CHIPS.map((chip) => (
                <ChipFilter
                  key={chip.value}
                  label={chip.label}
                  isActive={staFilter === chip.value}
                  activeColor={{
                    bg: chip.activeStyle.background as string,
                    text: chip.activeStyle.color as string,
                    border: chip.activeStyle.borderColor as string,
                  }}
                  onClick={() => setStaFilter(chip.value)}
                />
              ))}
            </div>
          </motion.div>
        }
        isLoading={isLoading}
        loadingSkeleton={<RiskTableSkeleton />}
        isEmpty={!isLoading && items.length === 0 && !error}
        emptyState={
          <div style={{ padding: "0 28px" }}>
            <EmptyState
              icon={ShieldAlert}
              title="Nessun rischio"
              description="Nessun rischio corrisponde ai filtri selezionati."
            />
          </div>
        }
      >
        {!isLoading && (
          <RiskTable
            risks={items}
            onRiskClick={handleDrawerOpen}
            onEdit={handleEdit}
          />
        )}
      </EntityList>

      <RiskDrawer
        risk={drawerRisk ? toRiskDrawerData(drawerRisk) : null}
        open={drawerOpen}
        onClose={handleDrawerClose}
      />
    </>
  )
}

export default RiskListPage
