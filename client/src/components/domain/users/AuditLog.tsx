import { useMemo, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { LogIn, Edit, Upload, Plus, Trash2, Search } from "lucide-react"
import { EmptyState } from "@/components/common/EmptyState"
import { PaginationControls } from "@/components/common/PaginationControls"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDateTime } from "@/lib/utils"
import { getAvatarColor, getUserInitials } from "@/lib/utils"
import { useAuditListQuery } from "@/hooks/api/useAudit"
import { AUDIT_ACTION_LABELS } from "@/lib/constants"
import { ClipboardList } from "lucide-react"

const LOG_ICON_STYLES: Record<string, { bg: string; color: string }> = {
  create: { bg: "rgba(99,102,241,.08)",  color: "#a5b4fc" },
  update: { bg: "rgba(234,179,8,.08)",   color: "#facc15" },
  delete: { bg: "rgba(239,68,68,.08)",   color: "#f87171" },
  status_change: { bg: "rgba(34,211,238,.08)", color: "#22d3ee" },
  login:  { bg: "rgba(34,197,94,.1)",    color: "#4ade80" },
  upload: { bg: "rgba(34,211,238,.08)",  color: "#22d3ee" },
}

function ActionIcon({ actionType }: { actionType: string }) {
  const style = LOG_ICON_STYLES[actionType] ?? LOG_ICON_STYLES.update
  let Icon = Edit
  if (actionType === "create") Icon = Plus
  else if (actionType === "delete") Icon = Trash2
  else if (actionType === "login") Icon = LogIn
  else if (actionType === "upload") Icon = Upload

  return (
    <div
      className="w-[28px] h-[28px] rounded-[6px] flex items-center justify-center flex-shrink-0"
      style={{ background: style.bg, color: style.color }}
    >
      <Icon className="w-[13px] h-[13px]" />
    </div>
  )
}

const ACTION_TYPE_OPTIONS = [
  { value: "all", label: "Tutte le azioni" },
  { value: "create", label: "Creazione" },
  { value: "update", label: "Modifica" },
  { value: "delete", label: "Eliminazione" },
  { value: "status_change", label: "Cambio stato" },
]

const ENTITY_TYPE_OPTIONS = [
  { value: "all", label: "Tutte le entità" },
  { value: "project", label: "Progetto" },
  { value: "task", label: "Task" },
  { value: "risk", label: "Rischio" },
  { value: "document", label: "Documento" },
  { value: "user", label: "Utente" },
]

export function AuditLog() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(
    () => ({
      search:     searchParams.get("audit_search")  ?? "",
      entityType: searchParams.get("audit_entity")  ?? "",
      actionType: searchParams.get("audit_action")  ?? "",
      page:       searchParams.get("audit_page")    ?? "1",
    }),
    [searchParams]
  )

  const { data, isLoading } = useAuditListQuery(filters)
  const items = data?.data ?? []
  const pagination = data?.pagination

  const setFilter = useCallback(
    (key: string, value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (value && value !== "all") {
          next.set(`audit_${key}`, value)
        } else {
          next.delete(`audit_${key}`)
        }
        if (key !== "page") next.delete("audit_page")
        return next
      })
    },
    [setSearchParams]
  )

  return (
    <div>
      {/* Filters toolbar */}
      <div className="flex items-center gap-[10px] mb-4 flex-wrap">
        <div
          className="flex items-center gap-2 px-3 py-[6px] rounded-[var(--radius)] border border-[var(--border)] flex-1 max-w-[240px]"
          style={{ background: "var(--bg-elevated)" }}
        >
          <Search className="w-[13px] h-[13px] text-[var(--text-muted)] flex-shrink-0" />
          <input
            type="text"
            placeholder="Cerca azione..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="bg-transparent border-none outline-none text-[12px] text-[var(--text-primary)] w-full placeholder:text-[var(--text-muted)]"
          />
        </div>

        <select
          value={filters.entityType || "all"}
          onChange={(e) => setFilter("entity", e.target.value)}
          className="px-[10px] py-[5px] rounded-[var(--radius)] border border-[var(--border)] text-[12px] text-[var(--text-secondary)] outline-none cursor-pointer"
          style={{ background: "var(--bg-elevated)" }}
        >
          {ENTITY_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={filters.actionType || "all"}
          onChange={(e) => setFilter("action", e.target.value)}
          className="px-[10px] py-[5px] rounded-[var(--radius)] border border-[var(--border)] text-[12px] text-[var(--text-secondary)] outline-none cursor-pointer"
          style={{ background: "var(--bg-elevated)" }}
        >
          {ACTION_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Log list */}
      {isLoading ? (
        <div className="flex flex-col gap-[6px]">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[50px] w-full rounded-[6px]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nessun log trovato"
          description="Non ci sono log di audit per i filtri selezionati."
        />
      ) : (
        <div className="flex flex-col gap-[6px]">
          {items.map((entry: {
            id: string
            actionType: string
            entityType: string
            entityId: string
            details: string | null
            createdAt: string
            user?: { firstName: string; lastName: string } | null
          }) => {
            const userName = entry.user
              ? `${entry.user.firstName} ${entry.user.lastName}`
              : "Sistema"
            const initials = entry.user
              ? getUserInitials(entry.user.firstName, entry.user.lastName)
              : "SYS"
            const avatarColor = entry.user
              ? getAvatarColor(userName)
              : "#64748b"

            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 px-[14px] py-[9px] rounded-[6px] border border-[var(--border-subtle)] transition-all duration-[120ms] hover:border-[rgba(99,102,241,.2)]"
                style={{ background: "var(--bg-elevated)" }}
              >
                <ActionIcon actionType={entry.actionType} />

                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-[var(--text-primary)]">
                    {AUDIT_ACTION_LABELS[entry.actionType] ?? entry.actionType}
                    {" "}
                    <span className="text-[var(--text-muted)] capitalize">{entry.entityType}</span>
                  </div>
                  {entry.details && (
                    <div className="text-[10px] text-[var(--text-muted)] mt-[1px] truncate">
                      {entry.details}
                    </div>
                  )}
                </div>

                {/* User chip */}
                <div
                  className="inline-flex items-center gap-[5px] px-[7px] py-[1px] pl-[4px] rounded-[10px] border border-[var(--border)] text-[10px] font-semibold whitespace-nowrap flex-shrink-0"
                  style={{ background: "var(--bg-overlay)" }}
                >
                  <div
                    className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                    style={{ background: avatarColor + "20", color: avatarColor }}
                  >
                    {initials}
                  </div>
                  <span className="text-[var(--text-secondary)]">{userName}</span>
                </div>

                <div className="text-[11px] text-[var(--text-muted)] whitespace-nowrap flex-shrink-0 ml-1">
                  {formatDateTime(entry.createdAt)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="mt-4">
          <PaginationControls
            page={pagination.page}
            totalPages={pagination.pages}
            onPageChange={(p) => setFilter("page", String(p))}
            totalItems={pagination.total}
          />
        </div>
      )}
    </div>
  )
}
