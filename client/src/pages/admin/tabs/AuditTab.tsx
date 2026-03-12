import { useMemo, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { DataTable, type Column } from "@/components/common/DataTable"
import { EmptyState } from "@/components/common/EmptyState"
import { ListFilters, type FilterConfig } from "@/components/common/ListFilters"
import { PaginationControls } from "@/components/common/PaginationControls"
import { Badge } from "@/components/ui/badge"
import { ClipboardList } from "lucide-react"
import { useAuditListQuery } from "@/hooks/api/useAudit"
import { formatDateTime } from "@/lib/utils"
import { AUDIT_ACTION_LABELS, AUDIT_ACTION_COLORS } from "@/lib/constants"

interface AuditRow {
  id: string
  createdAt: string
  userId: string | null
  user?: { firstName: string; lastName: string } | null
  entityType: string
  entityId: string
  actionType: string
  details: string | null
}

const ENTITY_TYPE_OPTIONS = [
  { value: "project", label: "Progetto" },
  { value: "task", label: "Task" },
  { value: "risk", label: "Rischio" },
  { value: "document", label: "Documento" },
  { value: "user", label: "Utente" },
  { value: "time_entry", label: "Time Entry" },
]

const ACTION_TYPE_OPTIONS = [
  { value: "create", label: "Creazione" },
  { value: "update", label: "Modifica" },
  { value: "delete", label: "Eliminazione" },
  { value: "status_change", label: "Cambio stato" },
]

const columns: Column<AuditRow>[] = [
  {
    key: "createdAt",
    header: "Data",
    cell: (item) => (
      <span className="text-sm text-muted-foreground">
        {formatDateTime(item.createdAt)}
      </span>
    ),
    className: "w-[160px]",
  },
  {
    key: "user",
    header: "Utente",
    cell: (item) => (
      <span className="text-sm text-foreground">
        {item.user ? `${item.user.firstName} ${item.user.lastName}` : "-"}
      </span>
    ),
  },
  {
    key: "entityType",
    header: "Entita'",
    cell: (item) => (
      <span className="text-sm text-muted-foreground capitalize">
        {item.entityType}
      </span>
    ),
    className: "w-[100px]",
  },
  {
    key: "actionType",
    header: "Tipo Azione",
    cell: (item) => (
      <Badge variant="secondary" className={AUDIT_ACTION_COLORS[item.actionType] ?? ""}>
        {AUDIT_ACTION_LABELS[item.actionType] ?? item.actionType}
      </Badge>
    ),
    className: "w-[130px]",
  },
  {
    key: "details",
    header: "Dettagli",
    cell: (item) => (
      <span className="text-sm text-muted-foreground truncate max-w-[300px] block">
        {item.details || "-"}
      </span>
    ),
  },
]

const filterConfig: FilterConfig[] = [
  { key: "search", label: "Cerca", type: "search", placeholder: "Cerca nei log..." },
  { key: "entityType", label: "Entita'", type: "select", options: ENTITY_TYPE_OPTIONS },
  { key: "actionType", label: "Azione", type: "select", options: ACTION_TYPE_OPTIONS },
  { key: "startDate", label: "Data inizio", type: "date" },
  { key: "endDate", label: "Data fine", type: "date" },
]

export function AuditTab() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(
    () => ({
      search: searchParams.get("search") ?? "",
      entityType: searchParams.get("entityType") ?? "",
      actionType: searchParams.get("actionType") ?? "",
      startDate: searchParams.get("startDate") ?? "",
      endDate: searchParams.get("endDate") ?? "",
      page: searchParams.get("page") ?? "1",
    }),
    [searchParams],
  )

  const { data, isLoading } = useAuditListQuery(filters)

  const items: AuditRow[] = data?.data ?? []
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
    [setSearchParams],
  )

  const handleFilterClear = useCallback(() => {
    setSearchParams(new URLSearchParams())
  }, [setSearchParams])

  const handlePageChange = useCallback(
    (page: number) => handleFilterChange("page", String(page)),
    [handleFilterChange],
  )

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Log di audit</h2>

      <ListFilters
        filters={filterConfig}
        values={filters}
        onChange={handleFilterChange}
        onClear={handleFilterClear}
      />

      {items.length === 0 && !isLoading ? (
        <EmptyState
          icon={ClipboardList}
          title="Nessun log trovato"
          description="Non ci sono log di audit per i filtri selezionati."
        />
      ) : (
        <div className="rounded-md border">
          <DataTable columns={columns} data={items} getId={(item) => item.id} isLoading={isLoading} />
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.pages}
          onPageChange={handlePageChange}
          totalItems={pagination.total}
        />
      )}
    </div>
  )
}
