import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AlertCircle, Inbox, Plus } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "./DataTable"
import { EmptyState } from "./EmptyState"
import { ListFilters, type FilterConfig } from "./ListFilters"
import { PaginationControls } from "./PaginationControls"
import { GroupHeader } from "./GroupHeader"
import { KpiStrip, type KpiCard } from "./KpiStrip"
import { ViewToggle } from "./ViewToggle"
import { RoleSwitcher } from "./RoleSwitcher"
import { STATUS_VISUAL } from "@/lib/constants"
import type { ResolvedPermissions } from "@/lib/permissions"

interface GroupByConfig<T> {
  getGroup: (item: T) => string
  order: string[]
  labels: Record<string, string>
  collapsedByDefault?: string[]
}

interface EntityListProps<T> {
  title: string
  subtitle?: string
  icon?: LucideIcon
  // Data
  data: T[]
  pagination?: { page: number; limit: number; total: number; pages: number }
  isLoading?: boolean
  error?: Error | null
  // Columns
  columns: Column<T>[]
  getId: (item: T) => string
  // Filters
  filterConfig?: FilterConfig[]
  filters: Record<string, string>
  onFilterChange: (key: string, value: string) => void
  onFilterClear: () => void
  // Sorting
  sortBy?: string
  sortOrder?: "asc" | "desc"
  onSort?: (key: string) => void
  // Pagination
  onPageChange?: (page: number) => void
  // Actions
  onRowClick?: (item: T) => void
  createHref?: string
  createLabel?: string
  // Permissions (optional — if omitted, all actions are shown)
  permissions?: ResolvedPermissions
  // Bulk
  selectedIds?: Set<string>
  onSelectToggle?: (id: string) => void
  onSelectAll?: () => void
  bulkActions?: React.ReactNode
  // Empty
  emptyIcon?: LucideIcon
  emptyTitle?: string
  emptyDescription?: string
  // Extra
  headerExtra?: React.ReactNode
  // Drag & drop
  draggable?: boolean
  onReorder?: (activeId: string, overId: string) => void
  // Grouping
  groupBy?: GroupByConfig<T>
  // Row customization
  rowClassName?: (item: T) => string | undefined
  /** KPI cards displayed above filters */
  kpiStrip?: KpiCard[]
  /** Current view mode */
  viewMode?: 'list' | 'grid'
  /** Called when view mode changes */
  onViewModeChange?: (mode: 'list' | 'grid') => void
  /** Card renderer for grid view */
  gridRenderItem?: (item: T) => React.ReactNode
  /** Role switcher in toolbar */
  roleSwitcher?: {
    value: 'direzione' | 'dipendente'
    onChange: (role: 'direzione' | 'dipendente') => void
  }
  /** Keyboard-navigated focused row index */
  focusedIndex?: number
}

const STORAGE_KEY_PREFIX = "entitylist-collapsed-"

function getInitialCollapsed(title: string, collapsedByDefault: string[]): Set<string> {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${title}`)
    if (stored) {
      const parsed = JSON.parse(stored) as string[]
      return new Set(parsed)
    }
  } catch {
    // ignore storage errors
  }
  return new Set(collapsedByDefault)
}

export function EntityList<T>({
  title,
  subtitle,
  icon: _Icon,
  data,
  pagination,
  isLoading = false,
  error,
  columns,
  getId,
  filterConfig,
  filters,
  onFilterChange,
  onFilterClear,
  sortBy,
  sortOrder,
  onSort,
  onPageChange,
  onRowClick,
  createHref,
  createLabel,
  permissions,
  selectedIds,
  onSelectToggle,
  onSelectAll,
  bulkActions,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  headerExtra,
  draggable,
  onReorder,
  groupBy,
  rowClassName,
  kpiStrip,
  viewMode,
  onViewModeChange,
  gridRenderItem,
  roleSwitcher,
  focusedIndex,
}: EntityListProps<T>) {
  const nav = useNavigate()
  const canCreate = permissions ? permissions.canCreate : true
  const handleSelectAll = () => {
    onSelectAll?.()
  }

  // Grouped collapsed state — initialized from localStorage or collapsedByDefault
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() =>
    groupBy
      ? getInitialCollapsed(title, groupBy.collapsedByDefault ?? [])
      : new Set<string>()
  )

  // Persist collapsed state to localStorage whenever it changes
  useEffect(() => {
    if (!groupBy) return
    try {
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${title}`,
        JSON.stringify(Array.from(collapsedGroups))
      )
    } catch {
      // ignore storage errors
    }
  }, [collapsedGroups, title, groupBy])

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }

  const showEmpty = !isLoading && !error && data.length === 0
  const showTable = !showEmpty || isLoading
  const showBulk = selectedIds && selectedIds.size > 0 && bulkActions

  const totalCount = pagination?.total ?? data.length

  // Build grouped structure when groupBy is provided
  const groupedData =
    groupBy && !isLoading
      ? groupBy.order
          .map((groupKey) => {
            const items = data.filter((item) => groupBy.getGroup(item) === groupKey)
            const label =
              groupBy.labels[groupKey] ??
              STATUS_VISUAL[groupKey]?.label ??
              groupKey
            return { groupKey, items, label }
          })
          .filter(({ items }) => items.length > 0)
      : null

  return (
    <div className="space-y-3">
      {/* KPI Strip */}
      {kpiStrip && kpiStrip.length > 0 && <KpiStrip cards={kpiStrip} />}

      {/* Compact header — no duplicate icon (Header already shows context) */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          {!isLoading && (
            <span className="text-xs text-muted-foreground font-[var(--font-data)] tabular-nums">
              {totalCount}
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              — {subtitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {roleSwitcher && (
            <RoleSwitcher value={roleSwitcher.value} onChange={roleSwitcher.onChange} />
          )}
          {onViewModeChange && viewMode && (
            <ViewToggle value={viewMode} onChange={onViewModeChange} />
          )}
          {headerExtra}
          {createHref && canCreate && (
            <Button size="sm" asChild>
              <Link to={createHref}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                {createLabel ?? "Crea nuovo"}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {filterConfig && filterConfig.length > 0 && (
        <ListFilters
          filters={filterConfig}
          values={filters}
          onChange={onFilterChange}
          onClear={onFilterClear}
        />
      )}

      {/* Bulk actions */}
      {showBulk && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-2">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} selezionati
          </span>
          {bulkActions}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive">
              Errore nel caricamento
            </p>
            <p className="text-xs text-muted-foreground truncate">{error.message}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFilterChange("_retry", Date.now().toString())}
          >
            Riprova
          </Button>
        </div>
      )}

      {/* Grouped tables */}
      {groupedData && showTable && (
        <div className="rounded-md border overflow-hidden">
          {groupedData.map(({ groupKey, items, label }) => {
            const isCollapsed = collapsedGroups.has(groupKey)
            return (
              <div key={groupKey}>
                <GroupHeader
                  status={groupKey}
                  label={label}
                  count={items.length}
                  isCollapsed={isCollapsed}
                  onToggle={() => toggleGroup(groupKey)}
                />
                {!isCollapsed && (
                  <DataTable
                    columns={columns}
                    data={items}
                    onRowClick={onRowClick}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={onSort}
                    selectedIds={selectedIds}
                    onSelectToggle={onSelectToggle}
                    onSelectAll={onSelectAll ? () => handleSelectAll() : undefined}
                    getId={getId}
                    isLoading={false}
                    draggable={draggable}
                    onReorder={onReorder}
                    rowClassName={rowClassName}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Flat table or grid (no groupBy) */}
      {!groupBy && showTable && (
        viewMode === 'grid' && gridRenderItem ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((item) => (
              <div key={getId(item)}>{gridRenderItem(item)}</div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border">
            <DataTable
              columns={columns}
              data={data}
              onRowClick={onRowClick}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
              selectedIds={selectedIds}
              onSelectToggle={onSelectToggle}
              onSelectAll={onSelectAll ? () => handleSelectAll() : undefined}
              getId={getId}
              isLoading={isLoading}
              draggable={draggable}
              onReorder={onReorder}
              rowClassName={rowClassName}
              focusedIndex={focusedIndex}
            />
          </div>
        )
      )}

      {/* Empty state */}
      {showEmpty && (
        <EmptyState
          icon={emptyIcon ?? Inbox}
          title={emptyTitle ?? "Nessun elemento trovato"}
          description={emptyDescription}
          action={
            createHref && canCreate
              ? {
                  label: createLabel ?? "Crea nuovo",
                  onClick: () => nav(createHref),
                }
              : undefined
          }
        />
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && onPageChange && (
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.pages}
          onPageChange={onPageChange}
          totalItems={pagination.total}
        />
      )}
    </div>
  )
}

// Re-export for convenience
export type { Column } from "./DataTable"
export type { FilterConfig } from "./ListFilters"
