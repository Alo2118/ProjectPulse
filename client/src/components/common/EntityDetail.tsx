import { useState } from "react"
import { AlertCircle, FileQuestion, Trash2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { Breadcrumbs } from "./Breadcrumbs"
import { EmptyState } from "./EmptyState"
import { usePageContext } from "@/hooks/ui/usePageContext"
import type { BreadcrumbItem } from "./Breadcrumbs"
import type { ResolvedPermissions } from "@/lib/permissions"

// ─── Tab config ─────────────────────────────────────────────────────────────

interface TabConfig {
  /** Unique tab identifier (used as both key and value) */
  id?: string
  /** Legacy alias for id — accepted for backward compat */
  key?: string
  label: string
  content: React.ReactNode
  count?: number
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface EntityDetailProps {
  // ── State ────────────────────────────────────────────────────────────────
  isLoading?: boolean
  loadingSkeleton?: React.ReactNode
  error?: Error | null
  notFound?: boolean

  // ── Navigation ───────────────────────────────────────────────────────────
  breadcrumbs?: BreadcrumbItem[]

  // ── Hero slot — accepts either a fully composed ReactNode or individual parts
  hero?: React.ReactNode

  // Hero sub-parts (used when hero is NOT provided as a ReactNode)
  title?: string
  subtitle?: string
  badges?: React.ReactNode
  editableBadges?: React.ReactNode
  headerActions?: React.ReactNode
  /** 4px vertical gradient bar left of title */
  colorBar?: string
  /** Tag editor rendered below title/badges */
  tagEditor?: React.ReactNode

  // ── KPI row (mini-cards strip below hero) ────────────────────────────────
  kpiRow?: React.ReactNode

  // ── Between hero and tabs (banners, steppers, alerts) ────────────────────
  beforeContent?: React.ReactNode
  /** Alias for beforeContent (new name) */
  beforeTabs?: React.ReactNode

  // ── Content ──────────────────────────────────────────────────────────────
  tabs?: TabConfig[]
  activeTab?: string
  onTabChange?: (tab: string) => void
  /** Direct content when no tabs are needed */
  children?: React.ReactNode

  // ── Sidebar ───────────────────────────────────────────────────────────────
  sidebar?: React.ReactNode

  // ── Delete action ────────────────────────────────────────────────────────
  onDelete?: () => void
  deleteConfirmMessage?: string
  isDeleting?: boolean

  // ── Permissions ──────────────────────────────────────────────────────────
  permissions?: ResolvedPermissions

  // ── Layout ────────────────────────────────────────────────────────────────
  className?: string
}

// ─── Default loading skeleton ────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-0">
      {/* Breadcrumb skeleton */}
      <div style={{ padding: "16px 28px 0" }}>
        <Skeleton className="h-3 w-48" />
      </div>

      {/* Hero skeleton */}
      <div style={{ padding: "20px 28px 16px" }} className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-7 w-80" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* KPI strip skeleton */}
      <div style={{ padding: "0 28px 16px" }} className="flex gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 flex-1 rounded-lg" />
        ))}
      </div>

      {/* Tab bar skeleton */}
      <div
        className="flex gap-0 border-b"
        style={{ borderColor: "var(--border-default)", padding: "0 28px" }}
      >
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-9 w-24 mr-4 mb-0.5" />
        ))}
      </div>

      {/* Content skeleton */}
      <div style={{ padding: "24px 28px" }} className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EntityDetail({
  isLoading = false,
  loadingSkeleton,
  error,
  notFound = false,
  breadcrumbs = [],
  hero,
  title,
  subtitle,
  badges,
  editableBadges,
  headerActions,
  colorBar,
  tagEditor,
  kpiRow,
  beforeContent,
  beforeTabs,
  tabs,
  activeTab,
  onTabChange,
  children,
  sidebar,
  onDelete,
  deleteConfirmMessage,
  isDeleting = false,
  permissions,
  className,
}: EntityDetailProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [internalTab, setInternalTab] = useState<string>(() => {
    if (activeTab) return activeTab
    const first = tabs?.[0]
    return first?.id ?? first?.key ?? ""
  })

  const ctx = usePageContext()
  const canDelete = permissions ? permissions.canDelete : true

  // Resolve active tab id — controlled or internal
  const resolvedTab = activeTab ?? internalTab

  function handleTabClick(tabId: string) {
    if (onTabChange) {
      onTabChange(tabId)
    } else {
      setInternalTab(tabId)
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return loadingSkeleton ? <>{loadingSkeleton}</> : <DetailSkeleton />
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-4" style={{ padding: "16px 28px" }}>
        {breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">Errore nel caricamento</p>
            <p className="text-xs text-muted-foreground">{error.message}</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Not found state ───────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div className="space-y-4" style={{ padding: "16px 28px" }}>
        {breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
        <EmptyState
          icon={FileQuestion}
          title="Non trovato"
          description="L'elemento richiesto non esiste o e' stato eliminato."
        />
      </div>
    )
  }

  // ── Derive slot content ───────────────────────────────────────────────────

  // Normalize tab key — support both `id` and `key` for backward compat
  const normalizedTabs = tabs?.map((t) => ({
    ...t,
    _id: t.id ?? t.key ?? "",
  }))

  // Build hero section if not provided as a slot
  const heroContent =
    hero ?? (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {colorBar && (
            <div
              className="w-1 min-h-[48px] rounded-sm shrink-0 mt-0.5"
              style={{ background: colorBar }}
            />
          )}
          <div className="space-y-1">
            {(badges || editableBadges) && (
              <div className="flex flex-wrap gap-2">{editableBadges ?? badges}</div>
            )}
            {title && (
              <h1
                className="font-semibold text-foreground"
                style={{ fontSize: "20px", lineHeight: "1.3", color: "var(--text-primary)" }}
              >
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {subtitle}
              </p>
            )}
            {tagEditor}
          </div>
        </div>
        {(headerActions || (onDelete && canDelete)) && (
          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            {onDelete && canDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Elimina
              </Button>
            )}
          </div>
        )}
      </div>
    )

  // Merge beforeContent + beforeTabs (both accepted)
  const beforeTabsContent = beforeTabs ?? beforeContent

  // Active tab content
  const activeTabContent = normalizedTabs?.find((t) => t._id === resolvedTab)?.content

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className={cn("flex flex-col min-h-0", className)}
      style={{ background: "var(--bg-base)" }}
    >
      {/* ── Breadcrumbs ──────────────────────────────────────────────────── */}
      {breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "border-b",
          ctx && `border-t-2`
        )}
        style={{
          padding: "20px 28px 16px",
          borderColor: "var(--border-default)",
          ...(ctx ? { borderTopColor: `var(--color-${ctx.color}, currentColor)` } : {}),
        }}
      >
        {heroContent}
      </div>

      {/* ── KPI row ──────────────────────────────────────────────────────── */}
      {kpiRow && (
        <div
          className="border-b"
          style={{
            padding: "12px 28px",
            borderColor: "var(--border-default)",
            background: "var(--bg-base)",
          }}
        >
          {kpiRow}
        </div>
      )}

      {/* ── Before tabs (steppers, banners) ──────────────────────────────── */}
      {beforeTabsContent && (
        <div style={{ padding: "12px 28px 0" }}>{beforeTabsContent}</div>
      )}

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      {normalizedTabs && normalizedTabs.length > 0 && (
        <div
          className="flex items-end border-b shrink-0"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "var(--bg-base)",
            borderColor: "var(--border-default)",
            padding: "0 28px",
          }}
        >
          {normalizedTabs.map((tab) => {
            const isActive = tab._id === resolvedTab
            return (
              <button
                key={tab._id}
                onClick={() => handleTabClick(tab._id)}
                className="flex items-center gap-1.5 transition-colors shrink-0 border-b-2 -mb-px"
                style={{
                  padding: "10px 16px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                  borderBottomColor: isActive ? "var(--accent-hex)" : "transparent",
                  background: "none",
                  border: "none",
                  borderBottom: `2px solid ${isActive ? "var(--accent-hex)" : "transparent"}`,
                  cursor: "pointer",
                  outline: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label}
                {tab.count != null && (
                  <span
                    className="rounded tabular-nums"
                    style={{
                      padding: "1px 6px",
                      fontSize: "10px",
                      fontWeight: 600,
                      background: "var(--bg-muted, var(--muted))",
                      color: "var(--text-muted)",
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div
        className="flex-1 min-h-0"
        style={
          sidebar
            ? {
                display: "grid",
                gridTemplateColumns: "1fr 300px",
                gap: 0,
                alignItems: "start",
              }
            : undefined
        }
      >
        {/* Left: tab content or direct children */}
        <div style={{ padding: "24px 28px", minWidth: 0 }}>
          {normalizedTabs && normalizedTabs.length > 0
            ? activeTabContent ?? null
            : children}
        </div>

        {/* Right: sidebar */}
        {sidebar && (
          <div
            className="h-full"
            style={{
              borderLeft: "1px solid var(--border-default)",
              padding: "20px",
            }}
          >
            {sidebar}
          </div>
        )}
      </div>

      {/* ── Delete confirmation dialog ────────────────────────────────────── */}
      {onDelete && canDelete && (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteConfirmMessage ??
                  "Sei sicuro di voler eliminare questo elemento? Questa azione non puo' essere annullata."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onDelete()
                  setDeleteOpen(false)
                }}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Eliminazione..." : "Elimina"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
