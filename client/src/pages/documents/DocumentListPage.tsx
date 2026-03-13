import { useMemo, useCallback, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  FileText,
  CheckCircle,
  Clock,
  FileEdit,
  ChevronDown,
  Download,
  Eye,
  Plus,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import { EntityList, type Column, type FilterConfig } from "@/components/common/EntityList"
import { EntityRow } from "@/components/common/EntityRow"
import { TagFilter } from "@/components/common/TagFilter"
import { StatusBadge } from "@/components/common/StatusBadge"
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  type ContextGradient,
} from "@/lib/constants"
import { cn, formatDate, formatFileSize, getUserInitials, getAvatarColor } from "@/lib/utils"
import { useDocumentListQuery } from "@/hooks/api/useDocuments"
import { useStatsQuery } from "@/hooks/api/useStats"
import type { KpiCard } from "@/components/common/KpiStrip"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// ── Types ────────────────────────────────────────────────────────────────────

interface DocumentVersion {
  id: string
  version: string
  createdAt: string
  notes?: string | null
  author?: { id: string; firstName: string; lastName: string } | null
}

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
  versions?: DocumentVersion[]
  createdAt: string
  updatedAt: string
}

// ── Type Pill ────────────────────────────────────────────────────────────────

const TYPE_PILL_CLASSES: Record<string, string> = {
  design_input:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30",
  design_output:
    "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/30",
  verification_report:
    "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/30",
  validation_report:
    "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30",
  change_control:
    "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800/30",
}
const TYPE_PILL_DEFAULT =
  "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800/30"

function TypePill({ type }: { type: string }) {
  const classes = TYPE_PILL_CLASSES[type] ?? TYPE_PILL_DEFAULT
  const label = DOCUMENT_TYPE_LABELS[type] ?? type
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
        classes
      )}
    >
      {label}
    </span>
  )
}

// ── Project color dots (deterministic from project id/name) ─────────────────

const PROJECT_DOT_COLORS = [
  "bg-blue-500",
  "bg-orange-500",
  "bg-purple-500",
  "bg-cyan-500",
  "bg-green-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-teal-500",
]

function getProjectDotColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return PROJECT_DOT_COLORS[Math.abs(hash) % PROJECT_DOT_COLORS.length]
}

// ── Rev Badge ────────────────────────────────────────────────────────────────

function RevBadge({ version }: { version: string }) {
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold bg-muted text-muted-foreground border border-border">
      v{version}
    </span>
  )
}

// ── Author Avatar ────────────────────────────────────────────────────────────

function AuthorAvatar({
  author,
}: {
  author: { firstName: string; lastName: string } | null | undefined
}) {
  if (!author) return <span className="text-xs text-muted-foreground">—</span>
  const initials = getUserInitials(author.firstName, author.lastName)
  const colorClass = getAvatarColor(`${author.firstName}${author.lastName}`)
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white shrink-0",
          colorClass
        )}
      >
        {initials}
      </span>
      <span className="text-xs text-muted-foreground truncate max-w-[80px]">
        {author.firstName[0]}. {author.lastName}
      </span>
    </div>
  )
}

// ── Grid Card (project grouping view) ────────────────────────────────────────

function DocumentGridCard({
  doc,
  onClick,
}: {
  doc: DocumentRow
  onClick: () => void
}) {
  const dotColor = doc.project ? getProjectDotColor(doc.project.name) : "bg-slate-400"
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className="card-hover flex flex-col gap-2 rounded-md border border-border bg-card p-3 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold leading-snug line-clamp-2 flex-1 min-w-0">
          {doc.title}
        </span>
        <RevBadge version={doc.version} />
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <TypePill type={doc.type} />
        <StatusBadge status={doc.status} labels={DOCUMENT_STATUS_LABELS} />
      </div>
      <div className="flex items-center justify-between mt-0.5">
        <div className="flex items-center gap-1.5">
          {doc.author && (
            <span
              className={cn(
                "inline-flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white shrink-0",
                getAvatarColor(`${doc.author.firstName}${doc.author.lastName}`)
              )}
            >
              {getUserInitials(doc.author.firstName, doc.author.lastName)}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            {formatDate(doc.updatedAt)}
          </span>
        </div>
        {doc.fileSize && (
          <span className="text-[10px] text-muted-foreground">
            {formatFileSize(doc.fileSize)}
          </span>
        )}
      </div>
      {doc.project && (
        <div className="flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />
          <span className="text-[10px] text-muted-foreground truncate">{doc.project.name}</span>
        </div>
      )}
    </motion.div>
  )
}

// ── Project Grouping View ─────────────────────────────────────────────────────

function ProjectGroupingView({
  docs,
  onRowClick,
}: {
  docs: DocumentRow[]
  onRowClick: (doc: DocumentRow) => void
}) {
  // Build groups keyed by project id
  const groups = useMemo(() => {
    const map = new Map<string, { projectName: string; docs: DocumentRow[] }>()
    const noProject: DocumentRow[] = []
    for (const doc of docs) {
      if (doc.project) {
        const key = doc.project.id
        const existing = map.get(key)
        if (existing) {
          existing.docs.push(doc)
        } else {
          map.set(key, { projectName: doc.project.name, docs: [doc] })
        }
      } else {
        noProject.push(doc)
      }
    }
    const result: { key: string; projectName: string; docs: DocumentRow[] }[] = []
    map.forEach((v, k) => result.push({ key: k, projectName: v.projectName, docs: v.docs }))
    if (noProject.length > 0) {
      result.push({ key: "__none__", projectName: "Senza progetto", docs: noProject })
    }
    return result
  }, [docs])

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileText className="h-8 w-8 mb-3 opacity-30" />
        <p className="text-sm">Nessun documento corrisponde ai filtri.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {groups.map(({ key, projectName, docs: groupDocs }) => {
        const isCollapsed = collapsed.has(key)
        const dotColor = key !== "__none__" ? getProjectDotColor(projectName) : "bg-slate-400"
        return (
          <div key={key} className="rounded-md border border-border overflow-hidden">
            <button
              onClick={() => toggleGroup(key)}
              className="w-full flex items-center gap-2.5 px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
            >
              <span className={cn("h-2 w-2 rounded-full shrink-0", dotColor)} />
              <span className="text-sm font-semibold flex-1 min-w-0 truncate">{projectName}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-background border border-border text-muted-foreground shrink-0">
                {groupDocs.length} doc
              </span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200",
                  isCollapsed && "-rotate-90"
                )}
              />
            </button>
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 bg-background">
                    {groupDocs.map((doc) => (
                      <DocumentGridCard
                        key={doc.id}
                        doc={doc}
                        onClick={() => onRowClick(doc)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

// ── Drawer Detail ─────────────────────────────────────────────────────────────

function DocumentDrawer({
  doc,
  open,
  onClose,
}: {
  doc: DocumentRow | null
  open: boolean
  onClose: () => void
}) {
  if (!doc) return null

  const dotColor = doc.project ? getProjectDotColor(doc.project.name) : "bg-slate-400"
  const fileName = doc.filePath ? doc.filePath.split("/").pop() ?? doc.filePath : null

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[420px] p-0 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border px-5 pt-5 pb-4">
          <div className="flex flex-wrap gap-1.5 mb-2">
            <TypePill type={doc.type} />
            <StatusBadge status={doc.status} labels={DOCUMENT_STATUS_LABELS} />
          </div>
          <SheetTitle className="text-base font-semibold leading-snug pr-8">
            {doc.title}
          </SheetTitle>
          {fileName && (
            <SheetDescription className="mt-1 text-[10px] font-mono text-muted-foreground">
              {fileName}
              {doc.fileSize ? ` · ${formatFileSize(doc.fileSize)}` : ""}
            </SheetDescription>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Info grid */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5 pb-1.5 border-b border-border">
              Informazioni
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Progetto
                </p>
                {doc.project ? (
                  <div className="flex items-center gap-1.5">
                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />
                    <span className="text-xs font-medium truncate">{doc.project.name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Responsabile
                </p>
                <AuthorAvatar author={doc.author} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Ultimo aggiornamento
                </p>
                <span className="text-xs font-[var(--font-data)] tabular-nums">
                  {formatDate(doc.updatedAt)}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Dimensione
                </p>
                <span className="text-xs font-[var(--font-data)] tabular-nums">
                  {doc.fileSize ? formatFileSize(doc.fileSize) : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {doc.description && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5 pb-1.5 border-b border-border">
                Descrizione
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed bg-muted/40 rounded-md p-3 border border-border">
                {doc.description}
              </p>
            </div>
          )}

          {/* Version history */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5 pb-1.5 border-b border-border">
              Storico versioni
              {doc.versions && doc.versions.length > 0 && (
                <span className="ml-1.5 normal-case font-medium">· {doc.versions.length} revisioni</span>
              )}
            </p>
            {doc.versions && doc.versions.length > 0 ? (
              <div className="space-y-1.5">
                {doc.versions.map((ver, i) => {
                  const isCurrent = i === 0
                  return (
                    <div
                      key={ver.id}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 border text-xs",
                        isCurrent
                          ? "bg-primary/5 border-primary/20"
                          : "bg-muted/30 border-border"
                      )}
                    >
                      <span
                        className={cn(
                          "w-10 shrink-0 font-bold font-[var(--font-data)]",
                          isCurrent ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        v{ver.version}
                      </span>
                      <span className="w-20 shrink-0 text-[10px] text-muted-foreground tabular-nums font-[var(--font-data)]">
                        {formatDate(ver.createdAt)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {ver.author && (
                            <span className="text-muted-foreground truncate">
                              {ver.author.firstName[0]}. {ver.author.lastName}
                            </span>
                          )}
                          {isCurrent && (
                            <Badge
                              variant="secondary"
                              className="text-[8px] px-1 py-0 h-3.5 shrink-0"
                            >
                              Corrente
                            </Badge>
                          )}
                        </div>
                        {ver.notes && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {ver.notes}
                          </p>
                        )}
                      </div>
                      <button
                        title="Scarica"
                        className="shrink-0 h-6 w-6 flex items-center justify-center rounded border border-border bg-background text-muted-foreground hover:text-green-500 hover:border-green-500/40 transition-colors"
                      >
                        <Download className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nessuna versione registrata.</p>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex-shrink-0 border-t border-border px-5 py-3 flex gap-2">
          <Button variant="default" size="sm" className="flex-1 gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Scarica corrente
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Nuova rev.
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Columns ───────────────────────────────────────────────────────────────────

function buildColumns(
  onDetailClick: (doc: DocumentRow) => void
): Column<DocumentRow>[] {
  return [
    {
      key: "title",
      header: "Nome documento",
      sortable: true,
      cell: (item) => (
        <div className="min-w-0 py-0.5">
          <span className="font-semibold text-sm truncate block leading-tight">
            {item.title}
          </span>
          {item.filePath && (
            <span className="text-[10px] text-muted-foreground font-mono truncate block leading-tight mt-0.5">
              {item.filePath.split("/").pop()}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "type",
      header: "Tipo",
      className: "w-[120px]",
      cell: (item) => <TypePill type={item.type} />,
    },
    {
      key: "project",
      header: "Progetto",
      className: "w-[160px]",
      cell: (item) =>
        item.project ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full shrink-0",
                getProjectDotColor(item.project.name)
              )}
            />
            <span className="text-xs text-muted-foreground truncate">{item.project.name}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "version",
      header: "Rev.",
      className: "w-[60px]",
      cell: (item) => <RevBadge version={item.version} />,
    },
    {
      key: "status",
      header: "Stato",
      className: "w-[120px]",
      cell: (item) => (
        <StatusBadge status={item.status} labels={DOCUMENT_STATUS_LABELS} />
      ),
    },
    {
      key: "author",
      header: "Responsabile",
      className: "w-[130px]",
      cell: (item) => <AuthorAvatar author={item.author} />,
    },
    {
      key: "updatedAt",
      header: "Aggiornato",
      sortable: true,
      className: "w-[100px]",
      cell: (item) => (
        <span className="text-xs font-[var(--font-data)] tabular-nums text-muted-foreground">
          {formatDate(item.updatedAt)}
        </span>
      ),
    },
    {
      key: "id",
      header: "",
      className: "w-[70px]",
      cell: (item) => (
        <div className="row-actions flex items-center gap-1">
          <button
            title="Dettaglio"
            onClick={(e) => {
              e.stopPropagation()
              onDetailClick(item)
            }}
            className="h-6 w-6 flex items-center justify-center rounded border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
          >
            <Eye className="h-3 w-3" />
          </button>
          <button
            title="Scarica"
            onClick={(e) => e.stopPropagation()}
            className="h-6 w-6 flex items-center justify-center rounded border border-border bg-card text-muted-foreground hover:text-green-500 hover:border-green-500/40 transition-colors"
          >
            <Download className="h-3 w-3" />
          </button>
        </div>
      ),
    },
  ]
}

// ── Filter Config ─────────────────────────────────────────────────────────────

const STATUS_OPTIONS = Object.entries(DOCUMENT_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const TYPE_OPTIONS = Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const filterConfig: FilterConfig[] = [
  {
    key: "search",
    label: "Cerca",
    type: "search",
    placeholder: "Cerca per nome, file...",
  },
  { key: "type", label: "Tipo", type: "select", options: TYPE_OPTIONS },
  { key: "status", label: "Stato", type: "select", options: STATUS_OPTIONS },
]

// ── Page ──────────────────────────────────────────────────────────────────────

function DocumentListPage() {
  useSetPageContext({ domain: "document" })
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedDoc, setSelectedDoc] = useState<DocumentRow | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  const viewMode = (searchParams.get("view") as "list" | "grid" | null) ?? "list"

  const filters = useMemo(
    () => ({
      search: searchParams.get("search") ?? "",
      status: searchParams.get("status") ?? "",
      type: searchParams.get("type") ?? "",
      page: searchParams.get("page") ?? "1",
    }),
    [searchParams]
  )

  const { data, isLoading, error } = useDocumentListQuery(filters)
  const { data: serverKpiCards } = useStatsQuery('documents')

  const items: DocumentRow[] = data?.data ?? []
  const pagination = data?.pagination

  // Client-side KPI calculations as fallback
  const allItems: DocumentRow[] = data?.data ?? []
  const totalDocs = pagination?.total ?? allItems.length
  const approvedCount = allItems.filter((d) => d.status === "approved").length
  const reviewCount = allItems.filter((d) => d.status === "review").length
  const draftCount = allItems.filter((d) => d.status === "draft").length
  const approvedPct =
    allItems.length > 0 ? Math.round((approvedCount / allItems.length) * 100) : 0

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

  // Prefer server-computed KPIs, fall back to client-side
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
    setSelectedTagIds([])
  }, [setSearchParams])

  const handlePageChange = useCallback(
    (page: number) => handleFilterChange("page", String(page)),
    [handleFilterChange]
  )

  const handleViewModeChange = useCallback(
    (mode: "list" | "grid") => {
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

  // Render row for list view using EntityRow
  const renderRow = useCallback(
    (doc: DocumentRow) => (
      <EntityRow
        id={doc.id}
        name={doc.title}
        status={doc.status}
        entityType="document"
        onClick={() => handleRowClick(doc)}
        code={doc.code}
        subtitle={doc.project?.name}
        assignee={doc.author ?? undefined}
        extraBadges={
          <>
            <TypePill type={doc.type} />
            <RevBadge version={doc.version} />
          </>
        }
      />
    ),
    [handleRowClick]
  )

  const columns = useMemo(() => buildColumns(handleRowClick), [handleRowClick])

  return (
    <>
      <EntityList<DocumentRow>
        title="Documenti"
        icon={FileText}
        data={viewMode === "list" ? items : []}
        pagination={viewMode === "list" ? pagination : undefined}
        isLoading={isLoading}
        error={error as Error | null}
        columns={columns}
        getId={(item) => item.id}
        filterConfig={filterConfig}
        filters={filters}
        onFilterChange={handleFilterChange}
        onFilterClear={handleFilterClear}
        onPageChange={viewMode === "list" ? handlePageChange : undefined}
        onRowClick={viewMode === "list" ? handleRowClick : undefined}
        createHref="/documents/new"
        createLabel="Carica documento"
        emptyTitle="Nessun documento"
        emptyDescription="Non ci sono documenti registrati."
        kpiStrip={kpiCards}
        renderRow={viewMode === "list" ? renderRow : undefined}
        afterFilters={
          <TagFilter
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
          />
        }
        viewMode={viewMode === "grid" ? "grid" : "list"}
        onViewModeChange={handleViewModeChange}
        rowClassName={() => "group row-accent"}
      />

      {/* Project grouping view — collapsible per-project card groups */}
      {viewMode === "grid" && !isLoading && (
        <ProjectGroupingView docs={items} onRowClick={handleRowClick} />
      )}

      <DocumentDrawer
        doc={selectedDoc}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          // Keep selectedDoc for exit animation
          setTimeout(() => setSelectedDoc(null), 300)
        }}
      />
    </>
  )
}

export default DocumentListPage
