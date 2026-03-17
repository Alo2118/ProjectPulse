/**
 * EntityList — thin layout shell
 *
 * New slot-based API (preferred for new pages):
 *   <EntityList header={...} toolbar={...} kpiStrip={...} pagination={...}>
 *     <MyTable ... />
 *   </EntityList>
 *
 * Legacy data-driven API (backward-compat — existing pages continue to work):
 *   <EntityList title="..." data={rows} columns={...} ... />
 */

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AlertCircle, Inbox, Plus } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable, type Column } from "./DataTable"
import { EmptyState } from "./EmptyState"
import { ListFilters, type FilterConfig } from "./ListFilters"
import { PaginationControls } from "./PaginationControls"
import { GroupHeader } from "./GroupHeader"
import { KpiStrip, type KpiCard } from "./KpiStrip"
import { AlertStrip, type AlertItem } from "./AlertStrip"
import { ViewToggle } from "./ViewToggle"
import { RoleSwitcher } from "./RoleSwitcher"
import { Breadcrumbs, type BreadcrumbItem } from "./Breadcrumbs"
import { STATUS_VISUAL } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { ResolvedPermissions } from "@/lib/permissions"

// ---------------------------------------------------------------------------
// Slot-based (new) interface
// ---------------------------------------------------------------------------

export interface EntityListSlotProps {
  /** Main content — table, list, grid, board, etc. */
  children?: React.ReactNode
  /** Optional breadcrumb row above the header */
  breadcrumbs?: BreadcrumbItem[]
  /** PageHeader slot (title row, create button, view-toggle, etc.) */
  header?: React.ReactNode
  /** KpiStrip slot */
  kpiStrip?: React.ReactNode
  /** AlertStrip slot */
  alertStrip?: React.ReactNode
  /** SearchBox + filter row slot */
  toolbar?: React.ReactNode
  /** Chip-filter row shown below toolbar (e.g. TagFilter) */
  afterToolbar?: React.ReactNode
  /** PaginationControls */
  pagination?: React.ReactNode
  /** Shown in place of children when isEmpty is true */
  emptyState?: React.ReactNode
  /** When true, renders emptyState instead of children */
  isEmpty?: boolean
  /** When true, renders loadingSkeleton instead of children */
  isLoading?: boolean
  /** Custom skeleton — shown when isLoading is true */
  loadingSkeleton?: React.ReactNode
  className?: string
}

// ---------------------------------------------------------------------------
// Legacy (backward-compat) interface — kept to avoid breaking existing pages
// ---------------------------------------------------------------------------

interface GroupByConfig<T> {
  getGroup: (item: T) => string
  order: string[]
  labels: Record<string, string>
  collapsedByDefault?: string[]
}

interface LegacyEntityListProps<T> {
  title: string
  subtitle?: string
  icon?: LucideIcon
  data: T[]
  pagination?: { page: number; limit: number; total: number; pages: number }
  isLoading?: boolean
  error?: Error | null
  columns: Column<T>[]
  getId: (item: T) => string
  filterConfig?: FilterConfig[]
  filters: Record<string, string>
  onFilterChange: (key: string, value: string) => void
  onFilterClear: () => void
  sortBy?: string
  sortOrder?: "asc" | "desc"
  onSort?: (key: string) => void
  onPageChange?: (page: number) => void
  onRowClick?: (item: T) => void
  createHref?: string
  createLabel?: string
  permissions?: ResolvedPermissions
  selectedIds?: Set<string>
  onSelectToggle?: (id: string) => void
  onSelectAll?: () => void
  bulkActions?: React.ReactNode
  emptyIcon?: LucideIcon
  emptyTitle?: string
  emptyDescription?: string
  headerExtra?: React.ReactNode
  draggable?: boolean
  onReorder?: (activeId: string, overId: string) => void
  groupBy?: GroupByConfig<T>
  rowClassName?: (item: T) => string | undefined
  alertItems?: AlertItem[]
  renderRow?: (item: T) => React.ReactNode
  kpiStrip?: KpiCard[]
  viewMode?: "list" | "grid"
  onViewModeChange?: (mode: "list" | "grid") => void
  gridRenderItem?: (item: T) => React.ReactNode
  roleSwitcher?: {
    value: "direzione" | "dipendente"
    onChange: (role: "direzione" | "dipendente") => void
  }
  focusedIndex?: number
  afterFilters?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

// ---------------------------------------------------------------------------
// Combined union type — TypeScript picks the right branch at the call site
// ---------------------------------------------------------------------------

// A prop present only on the legacy API, used as discriminator
type EntityListProps<T = unknown> =
  | (EntityListSlotProps & { data?: undefined })
  | LegacyEntityListProps<T>

// ---------------------------------------------------------------------------
// Default skeleton for slot-based API
// ---------------------------------------------------------------------------

function DefaultSkeleton() {
  return (
    <div className="space-y-2 px-7">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Thin layout shell — slot-based rendering
// ---------------------------------------------------------------------------

function EntityListShell({
  breadcrumbs,
  header,
  kpiStrip,
  alertStrip,
  toolbar,
  afterToolbar,
  children,
  pagination,
  emptyState,
  isEmpty,
  isLoading,
  loadingSkeleton,
  className,
}: EntityListSlotProps) {
  return (
    <div className={cn("min-h-full", className)}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      {header}
      {kpiStrip}
      {alertStrip}
      {toolbar && (
        <div style={{ padding: "0 28px 12px" }}>{toolbar}</div>
      )}
      {afterToolbar && (
        <div style={{ padding: "0 28px 8px" }}>{afterToolbar}</div>
      )}
      {isLoading
        ? (loadingSkeleton ?? <DefaultSkeleton />)
        : isEmpty
          ? emptyState
          : children}
      {pagination && (
        <div style={{ padding: "16px 28px" }}>{pagination}</div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Legacy renderer — preserves existing behavior exactly
// ---------------------------------------------------------------------------

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

function LegacyEntityList<T>({
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
  alertItems,
  renderRow,
  kpiStrip,
  viewMode,
  onViewModeChange,
  gridRenderItem,
  roleSwitcher,
  focusedIndex,
  afterFilters,
  className,
}: LegacyEntityListProps<T>) {
  const nav = useNavigate()
  const canCreate = permissions ? permissions.canCreate : true

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() =>
    groupBy
      ? getInitialCollapsed(title, groupBy.collapsedByDefault ?? [])
      : new Set<string>()
  )

  useEffect(() => {
    if (!groupBy) return
    try {
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${title}`,
        JSON.stringify(Array.from(collapsedGroups))
      )
    } catch {
      // ignore
    }
  }, [collapsedGroups, title, groupBy])

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) next.delete(groupKey)
      else next.add(groupKey)
      return next
    })
  }

  const showEmpty = !isLoading && !error && data.length === 0
  const showTable = !showEmpty || isLoading
  const showBulk = selectedIds && selectedIds.size > 0 && bulkActions
  const totalCount = pagination?.total ?? data.length

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
    <div className={cn("space-y-3", className)}>
      {/* KPI Strip */}
      {kpiStrip && kpiStrip.length > 0 && <KpiStrip cards={kpiStrip} />}

      {/* Alert Strip */}
      {alertItems && alertItems.length > 0 && <AlertStrip alerts={alertItems} />}

      {/* Compact header */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="text-page-title text-foreground">{title}</h1>
          {!isLoading && (
            <span className="text-xs text-muted-foreground font-data tabular-nums">
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
            <ViewToggle
              options={[
                { value: "list", label: "Lista" },
                { value: "grid", label: "Griglia" },
              ]}
              value={viewMode}
              onChange={(v) => onViewModeChange(v as "list" | "grid")}
            />
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

      {/* After-filters slot */}
      {afterFilters}

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
                    onSelectAll={onSelectAll ? () => onSelectAll() : undefined}
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

      {/* Flat table, grid, or custom row list */}
      {!groupBy && showTable && (
        viewMode === "grid" && gridRenderItem ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((item) => (
              <div key={getId(item)}>{gridRenderItem(item)}</div>
            ))}
          </div>
        ) : renderRow ? (
          <div className="space-y-1">
            {data.map((item) => (
              <div key={getId(item)}>{renderRow(item)}</div>
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
              onSelectAll={onSelectAll ? () => onSelectAll() : undefined}
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

// ---------------------------------------------------------------------------
// Exported EntityList — routes to shell or legacy based on props
// ---------------------------------------------------------------------------

export function EntityList<T = unknown>(props: EntityListProps<T>) {
  // If `data` is present, the caller is using the legacy API
  if ("data" in props && props.data !== undefined) {
    return <LegacyEntityList<T> {...(props as LegacyEntityListProps<T>)} />
  }
  // Otherwise use the new slot-based shell
  return <EntityListShell {...(props as EntityListSlotProps)} />
}

// Re-export types consumed by existing pages
export type { Column } from "./DataTable"
export type { FilterConfig } from "./ListFilters"
export type { AlertItem } from "./AlertStrip"
export type { BreadcrumbItem } from "./Breadcrumbs"
