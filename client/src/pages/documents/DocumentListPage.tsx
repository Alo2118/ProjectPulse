import { useState, useMemo, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  FileText,
  CheckCircle,
  Clock,
  FileEdit,
  ChevronDown,
  Download,
  Eye,
  Upload,
  List,
  BookOpen,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import { EntityList } from "@/components/common/EntityList"
import { KpiStrip, type KpiCard } from "@/components/common/KpiStrip"
import { SearchBox } from "@/components/common/SearchBox"
import { ViewToggle } from "@/components/common/ViewToggle"
import { EmptyState } from "@/components/common/EmptyState"
import { TypePill } from "@/components/domain/documents/TypePill"
import { RevBadge } from "@/components/domain/documents/RevBadge"
import { DocCard } from "@/components/domain/documents/DocCard"
import { DocDrawer } from "@/components/domain/documents/DocDrawer"
import type { DocDrawerData } from "@/components/domain/documents/DocDrawer"
import { cn, formatDate, getUserInitials, getAvatarColor } from "@/lib/utils"
import { useDocumentListQuery } from "@/hooks/api/useDocuments"
import { useStatsQuery } from "@/hooks/api/useStats"
import type { ContextGradient } from "@/lib/constants"

// ── Types ─────────────────────────────────────────────────────────────────────

interface DocumentRow {
  id: string
  code: string
  title: string
  type: string
  status: string
  version: string
  description?: string | null
  filePath?: string | null
  fileSize?: number | null
  project?: { id: string; name: string } | null
  author?: { id: string; firstName: string; lastName: string } | null
  versions?: Array<{
    id: string
    version: string
    createdAt: string
    notes?: string | null
    author?: { id: string; firstName: string; lastName: string } | null
  }>
  createdAt: string
  updatedAt: string
}

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  approved: {
    label: "Approvato",
    className: "bg-green-500/8 text-green-400 border-green-500/20",
  },
  review: {
    label: "In revisione",
    className: "bg-yellow-500/8 text-yellow-400 border-yellow-500/20",
  },
  draft: {
    label: "Bozza",
    className: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  },
  obsolete: {
    label: "Obsoleto",
    className: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  },
}

function DocStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status]
  if (!config) return null
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border font-semibold whitespace-nowrap",
        config.className
      )}
      style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px" }}
    >
      {config.label}
    </span>
  )
}

// ── Project dot color ────────────────────────────────────────────────────────

const DOT_COLORS_HEX = [
  "#3b82f6",
  "#f97316",
  "#a855f7",
  "#22d3ee",
  "#22c55e",
  "#e11d48",
  "#eab308",
  "#14b8a6",
]

function hashName(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

function getProjectDotColorHex(name: string): string {
  return DOT_COLORS_HEX[hashName(name) % DOT_COLORS_HEX.length]
}

// ── List view sub-components ──────────────────────────────────────────────────

function AuthorCell({
  author,
}: {
  author?: { firstName: string; lastName: string } | null
}) {
  if (!author) return <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>—</span>
  const initials = getUserInitials(author.firstName, author.lastName)
  const colorClass = getAvatarColor(`${author.firstName}${author.lastName}`)
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full text-white font-bold shrink-0",
          colorClass
        )}
        style={{ width: "20px", height: "20px", fontSize: "8px" }}
      >
        {initials}
      </span>
      <span
        style={{ fontSize: "11px", color: "var(--text-secondary)" }}
        className="truncate max-w-[80px]"
      >
        {author.firstName[0]}. {author.lastName}
      </span>
    </div>
  )
}

// ── Chip filter (type + status) ───────────────────────────────────────────────

type TypeFilter = "all" | "IFU" | "DHF" | "Rischio" | "Audit" | "Spec" | "Other" | "design_input" | "design_output" | "verification_report" | "validation_report" | "change_control"
type StatusFilter = "all" | "approved" | "review" | "draft"

const TYPE_CHIPS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "Tutti" },
  { value: "IFU", label: "IFU" },
  { value: "DHF", label: "DHF" },
  { value: "Rischio", label: "Rischio" },
  { value: "Audit", label: "Audit" },
  { value: "Spec", label: "Spec" },
  { value: "design_input", label: "Design Input" },
  { value: "design_output", label: "Design Output" },
  { value: "verification_report", label: "Verifica" },
  { value: "validation_report", label: "Validazione" },
  { value: "change_control", label: "Change Ctrl" },
]

const STATUS_CHIPS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tutti" },
  { value: "approved", label: "Approvato" },
  { value: "review", label: "In revisione" },
  { value: "draft", label: "Bozza" },
]

const STATUS_ACTIVE_BG: Record<StatusFilter, string> = {
  all: "bg-accent/20 border-border text-foreground",
  approved: "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400",
  review: "bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400",
  draft: "bg-slate-500/10 border-slate-500/30 text-slate-700 dark:text-slate-400",
}

function ChipFilter<T extends string>({
  label,
  chips,
  value,
  onChange,
  activeBg,
}: {
  label: string
  chips: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  activeBg: Record<T, string>
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span
        style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}
        className="text-muted-foreground shrink-0"
      >
        {label}
      </span>
      {chips.map((chip) => {
        const isActive = value === chip.value
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
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}

// ── List table row ────────────────────────────────────────────────────────────

function DocTableRow({
  doc,
  onClick,
}: {
  doc: DocumentRow
  onClick: () => void
}) {
  return (
    <tr
      onClick={onClick}
      style={{ cursor: "pointer", transition: "background 0.12s" }}
      onMouseEnter={(e) => {
        const cells = e.currentTarget.querySelectorAll("td")
        cells.forEach((td) => { (td as HTMLElement).style.background = "var(--bg-elevated)" })
        const actions = e.currentTarget.querySelector(".row-actions") as HTMLElement | null
        if (actions) actions.style.opacity = "1"
      }}
      onMouseLeave={(e) => {
        const cells = e.currentTarget.querySelectorAll("td")
        cells.forEach((td) => { (td as HTMLElement).style.background = "" })
        const actions = e.currentTarget.querySelector(".row-actions") as HTMLElement | null
        if (actions) actions.style.opacity = "0"
      }}
    >
      {/* Title */}
      <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border-subtle)", verticalAlign: "middle" }}>
        <div
          style={{ fontSize: "12px", fontWeight: 600, marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "260px", color: "var(--text-primary)" }}
        >
          {doc.title}
        </div>
        {doc.filePath && (
          <div style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "monospace" }}>
            {doc.filePath.split("/").pop()}
          </div>
        )}
      </td>

      {/* Type */}
      <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border-subtle)", verticalAlign: "middle", width: "90px" }}>
        <TypePill type={doc.type} />
      </td>

      {/* Project */}
      <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border-subtle)", verticalAlign: "middle", width: "150px" }}>
        {doc.project ? (
          <div className="flex items-center gap-1.5">
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: getProjectDotColorHex(doc.project.name),
                flexShrink: 0,
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }} className="truncate">
              {doc.project.name}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>—</span>
        )}
      </td>

      {/* Rev */}
      <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border-subtle)", verticalAlign: "middle", width: "60px" }}>
        <RevBadge version={`Rev. ${doc.version}`} />
      </td>

      {/* Status */}
      <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border-subtle)", verticalAlign: "middle", width: "110px" }}>
        <DocStatusBadge status={doc.status} />
      </td>

      {/* Author */}
      <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border-subtle)", verticalAlign: "middle", width: "110px" }}>
        <AuthorCell author={doc.author} />
      </td>

      {/* Updated */}
      <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border-subtle)", verticalAlign: "middle", width: "110px" }}>
        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
          {formatDate(doc.updatedAt)}
        </span>
      </td>

      {/* Actions */}
      <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border-subtle)", verticalAlign: "middle", width: "80px" }}>
        <div className="row-actions flex items-center gap-1" style={{ opacity: 0, transition: "opacity 0.15s" }}>
          <button
            type="button"
            title="Dettaglio"
            onClick={(e) => { e.stopPropagation(); onClick() }}
            style={{
              width: "26px",
              height: "26px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px",
              border: "1px solid var(--border-default)",
              background: "var(--bg-elevated)",
              color: "var(--text-muted)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(45,140,240,0.35)"
              e.currentTarget.style.color = "#60a5fa"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-default)"
              e.currentTarget.style.color = "var(--text-muted)"
            }}
          >
            <Eye style={{ width: "12px", height: "12px" }} />
          </button>
          <button
            type="button"
            title="Scarica"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "26px",
              height: "26px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px",
              border: "1px solid var(--border-default)",
              background: "var(--bg-elevated)",
              color: "var(--text-muted)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(34,197,94,0.35)"
              e.currentTarget.style.color = "#4ade80"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-default)"
              e.currentTarget.style.color = "var(--text-muted)"
            }}
          >
            <Download style={{ width: "12px", height: "12px" }} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── List view ─────────────────────────────────────────────────────────────────

function DocListView({
  docs,
  onRowClick,
}: {
  docs: DocumentRow[]
  onRowClick: (doc: DocumentRow) => void
}) {
  if (docs.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Nessun documento"
        description="Nessun documento corrisponde ai filtri."
      />
    )
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: "860px",
        }}
      >
        <thead>
          <tr>
            {[
              { label: "Nome documento", w: undefined },
              { label: "Tipo", w: "90px" },
              { label: "Progetto", w: "150px" },
              { label: "Rev.", w: "60px" },
              { label: "Stato", w: "110px" },
              { label: "Responsabile", w: "110px" },
              { label: "Aggiornato", w: "110px" },
              { label: "", w: "80px" },
            ].map(({ label, w }) => (
              <th
                key={label}
                style={{
                  padding: "8px 12px",
                  fontSize: "10px",
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
                  width: w,
                }}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {docs.map((doc) => (
            <DocTableRow key={doc.id} doc={doc} onClick={() => onRowClick(doc)} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Project grouping view ─────────────────────────────────────────────────────

function DocProjectView({
  docs,
  onRowClick,
}: {
  docs: DocumentRow[]
  onRowClick: (doc: DocumentRow) => void
}) {
  // Group by project
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; docs: DocumentRow[] }>()
    const noProject: DocumentRow[] = []
    for (const doc of docs) {
      if (doc.project) {
        const key = doc.project.id
        const existing = map.get(key)
        if (existing) {
          existing.docs.push(doc)
        } else {
          map.set(key, { name: doc.project.name, docs: [doc] })
        }
      } else {
        noProject.push(doc)
      }
    }
    const result: { key: string; name: string; docs: DocumentRow[] }[] = []
    map.forEach((v, k) => result.push({ key: k, name: v.name, docs: v.docs }))
    if (noProject.length > 0) {
      result.push({ key: "__none__", name: "Senza progetto", docs: noProject })
    }
    return result
  }, [docs])

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggleGroup = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Nessun documento"
        description="Nessun documento corrisponde ai filtri."
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map(({ key, name, docs: groupDocs }) => {
        const isCollapsed = collapsed.has(key)
        const dotColor = key !== "__none__" ? getProjectDotColorHex(name) : "#64748b"

        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            style={{
              border: "1px solid var(--border-default)",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            {/* Group header */}
            <button
              type="button"
              onClick={() => toggleGroup(key)}
              className="w-full text-left"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 16px",
                background: "var(--bg-elevated)",
                cursor: "pointer",
                userSelect: "none",
                transition: "background 0.12s",
                border: "none",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-overlay)" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-elevated)" }}
            >
              {/* Glow dot */}
              <span
                style={{
                  width: "9px",
                  height: "9px",
                  borderRadius: "50%",
                  background: dotColor,
                  boxShadow: `0 0 5px ${dotColor}66`,
                  flexShrink: 0,
                  display: "inline-block",
                }}
              />
              <span
                style={{ fontSize: "13px", fontWeight: 700, flex: 1, color: "var(--text-primary)" }}
                className="truncate"
              >
                {name}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "3px",
                  background: "var(--bg-overlay)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border-default)",
                }}
              >
                {groupDocs.length} doc
              </span>
              <ChevronDown
                style={{
                  width: "14px",
                  height: "14px",
                  color: "var(--text-muted)",
                  flexShrink: 0,
                  transform: isCollapsed ? "rotate(-90deg)" : "none",
                  transition: "transform 0.2s",
                }}
              />
            </button>

            {/* Cards */}
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  key="body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ overflow: "hidden" }}
                >
                  <div
                    style={{
                      padding: "10px 12px",
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "8px",
                      background: "var(--bg-surface)",
                    }}
                  >
                    {groupDocs.map((doc) => (
                      <DocCard
                        key={doc.id}
                        doc={doc}
                        onClick={() => onRowClick(doc)}
                        statusBadge={<DocStatusBadge status={doc.status} />}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function DocumentListPage() {
  useSetPageContext({ domain: "document" })
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [selectedDoc, setSelectedDoc] = useState<DocumentRow | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // View mode: "list" | "proj"
  const viewMode = (searchParams.get("view") as "list" | "proj" | null) ?? "list"

  // Client-side filter state (type + status filters applied on fetched data)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const search = searchParams.get("search") ?? ""
  const page = searchParams.get("page") ?? "1"

  const apiFilters = useMemo(
    () => ({
      search,
      page,
      limit: "50",
    }),
    [search, page]
  )

  const { data, isLoading, error } = useDocumentListQuery(apiFilters)
  const { data: serverKpiCards } = useStatsQuery("documents")

  const rawItems: DocumentRow[] = data?.data ?? []
  const pagination = data?.pagination

  // Apply client-side filters (type + status)
  const items = useMemo(() => {
    return rawItems.filter((doc) => {
      const matchType = typeFilter === "all" || doc.type === typeFilter
      const matchStatus = statusFilter === "all" || doc.status === statusFilter
      return matchType && matchStatus
    })
  }, [rawItems, typeFilter, statusFilter])

  // KPI strip
  const totalDocs = pagination?.total ?? rawItems.length
  const approvedCount = rawItems.filter((d) => d.status === "approved").length
  const reviewCount = rawItems.filter((d) => d.status === "review").length
  const draftCount = rawItems.filter((d) => d.status === "draft").length
  const approvedPct = rawItems.length > 0 ? Math.round((approvedCount / rawItems.length) * 100) : 0

  const clientKpiCards: KpiCard[] = [
    {
      label: "Totale documenti",
      value: totalDocs,
      color: "indigo" as ContextGradient,
      icon: FileText,
    },
    {
      label: "Approvati",
      value: approvedCount,
      color: "success" as ContextGradient,
      icon: CheckCircle,
      subtitle: `${approvedPct}% del totale`,
    },
    {
      label: "In revisione",
      value: reviewCount,
      color: "warning" as ContextGradient,
      icon: Clock,
      subtitle: "in attesa approvazione",
    },
    {
      label: "Bozze",
      value: draftCount,
      color: "indigo" as ContextGradient,
      icon: FileEdit,
      subtitle: "in compilazione",
    },
  ]

  const kpiCards = serverKpiCards ?? clientKpiCards

  // Handlers
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set("search", value)
        else next.delete("search")
        next.delete("page")
        return next
      })
    },
    [setSearchParams]
  )

  const handleViewModeChange = useCallback(
    (mode: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (mode === "list") next.delete("view")
        else next.set("view", mode)
        return next
      })
    },
    [setSearchParams]
  )

  const handleRowClick = useCallback((doc: DocumentRow) => {
    setSelectedDoc(doc)
    setDrawerOpen(true)
  }, [])

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false)
    setTimeout(() => setSelectedDoc(null), 300)
  }, [])

  // Map DocumentRow → DocDrawerData
  const drawerDoc: DocDrawerData | null = selectedDoc
    ? {
        id: selectedDoc.id,
        title: selectedDoc.title,
        type: selectedDoc.type,
        status: selectedDoc.status,
        version: selectedDoc.version,
        description: selectedDoc.description,
        filePath: selectedDoc.filePath,
        fileSize: selectedDoc.fileSize,
        project: selectedDoc.project,
        author: selectedDoc.author,
        versions: selectedDoc.versions,
        createdAt: selectedDoc.createdAt,
        updatedAt: selectedDoc.updatedAt,
      }
    : null

  // Loading skeleton rows
  const loadingSkeleton = (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "860px" }}>
        <thead>
          <tr>
            {["Nome documento", "Tipo", "Progetto", "Rev.", "Stato", "Responsabile", "Aggiornato", ""].map(
              (label) => (
                <th
                  key={label}
                  style={{
                    padding: "8px 12px",
                    fontSize: "10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--text-muted)",
                    borderBottom: "1px solid var(--border-default)",
                    textAlign: "left",
                    background: "var(--bg-surface)",
                  }}
                >
                  {label}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }, (_, i) => (
            <tr key={i}>
              {Array.from({ length: 8 }, (_, j) => (
                <td key={j} style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-subtle)" }}>
                  <div
                    style={{
                      height: "12px",
                      borderRadius: "4px",
                      background: "var(--bg-elevated)",
                      width: j === 0 ? "80%" : "60%",
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const errorState = error ? (
    <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
      <p>Errore nel caricamento dei documenti.</p>
    </div>
  ) : null

  return (
    <>
      <EntityList
        header={
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span
                  className="inline-flex items-center gap-1.5 font-semibold border"
                  style={{
                    padding: "3px 10px 3px 7px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    background: "rgba(234,179,8,0.1)",
                    color: "#facc15",
                    borderColor: "rgba(234,179,8,0.25)",
                  }}
                >
                  <FileText style={{ width: "12px", height: "12px" }} />
                  Documenti
                </span>
                <h1
                  className="font-bold"
                  style={{ fontSize: "22px", letterSpacing: "-0.3px", color: "var(--text-primary)" }}
                >
                  Gestione Documentale
                </h1>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                ISO 13485 § 4.2 · Controllo documenti e registrazioni
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 11px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  border: "1px solid var(--border-default)",
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  transition: "all 0.18s",
                  fontFamily: "var(--font-sans, 'DM Sans', sans-serif)",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(45,140,240,0.35)"
                  e.currentTarget.style.color = "#60a5fa"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default)"
                  e.currentTarget.style.color = "var(--text-primary)"
                }}
              >
                <Download style={{ width: "13px", height: "13px" }} />
                Esporta indice
              </button>
              <button
                type="button"
                onClick={() => navigate("/documents/new")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 11px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  border: "1px solid rgba(234,179,8,0.3)",
                  background: "rgba(234,179,8,0.1)",
                  color: "#facc15",
                  transition: "all 0.18s",
                  fontFamily: "var(--font-sans, 'DM Sans', sans-serif)",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(234,179,8,0.2)"
                  e.currentTarget.style.borderColor = "rgba(234,179,8,0.6)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(234,179,8,0.1)"
                  e.currentTarget.style.borderColor = "rgba(234,179,8,0.3)"
                }}
              >
                <Upload style={{ width: "13px", height: "13px" }} />
                Carica documento
              </button>
            </div>
          </div>
        }
        kpiStrip={<KpiStrip items={kpiCards} />}
        toolbar={
          <div className="flex items-center gap-2.5 flex-wrap">
            <SearchBox
              value={search}
              onChange={handleSearchChange}
              placeholder="Cerca per nome, file..."
            />
            <div
              style={{ width: "1px", height: "22px", background: "var(--border-default)", flexShrink: 0 }}
            />
            <ChipFilter
              label="Tipo"
              chips={TYPE_CHIPS.slice(0, 6)}
              value={typeFilter}
              onChange={setTypeFilter}
              activeBg={{
                all: "bg-accent/20 border-border text-foreground",
                IFU: "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400",
                DHF: "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-400",
                Rischio: "bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400",
                Audit: "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400",
                Spec: "bg-cyan-500/10 border-cyan-500/30 text-cyan-700 dark:text-cyan-400",
                Other: "bg-slate-500/10 border-slate-500/30 text-slate-700 dark:text-slate-400",
                design_input: "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400",
                design_output: "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-400",
                verification_report: "bg-cyan-500/10 border-cyan-500/30 text-cyan-700 dark:text-cyan-400",
                validation_report: "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400",
                change_control: "bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400",
              }}
            />
            <div
              style={{ width: "1px", height: "22px", background: "var(--border-default)", flexShrink: 0 }}
            />
            <ChipFilter
              label="Stato"
              chips={STATUS_CHIPS}
              value={statusFilter}
              onChange={setStatusFilter}
              activeBg={STATUS_ACTIVE_BG}
            />
            <div style={{ marginLeft: "auto" }}>
              <ViewToggle
                value={viewMode}
                onChange={handleViewModeChange}
                options={[
                  {
                    value: "list",
                    label: "Lista",
                    icon: <List style={{ width: "14px", height: "14px" }} />,
                  },
                  {
                    value: "proj",
                    label: "Per progetto",
                    icon: <BookOpen style={{ width: "14px", height: "14px" }} />,
                  },
                ]}
              />
            </div>
          </div>
        }
        isLoading={isLoading}
        loadingSkeleton={loadingSkeleton}
        isEmpty={!isLoading && !error && items.length === 0}
        emptyState={
          <EmptyState
            icon={FileText}
            title="Nessun documento"
            description="Non ci sono documenti corrispondenti ai filtri selezionati."
          />
        }
      >
        {error ? (
          errorState
        ) : (
          <>
            {viewMode === "list" && (
              <DocListView docs={items} onRowClick={handleRowClick} />
            )}
            {viewMode === "proj" && (
              <DocProjectView docs={items} onRowClick={handleRowClick} />
            )}
          </>
        )}
      </EntityList>

      <DocDrawer
        doc={drawerDoc}
        open={drawerOpen}
        onClose={handleDrawerClose}
      />
    </>
  )
}

export default DocumentListPage
