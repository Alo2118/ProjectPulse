import { useState } from "react"
import { AlertCircle, FileQuestion, Trash2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { useThemeConfig } from "@/hooks/ui/useThemeConfig"
import { Breadcrumbs } from "./Breadcrumbs"
import { EmptyState } from "./EmptyState"
import { usePageContext } from "@/hooks/ui/usePageContext"
import type { ResolvedPermissions } from "@/lib/permissions"

interface TabConfig {
  key: string
  label: string
  content: React.ReactNode
  count?: number
}

interface EntityDetailProps {
  // Data
  isLoading?: boolean
  error?: Error | null
  notFound?: boolean
  // Navigation
  breadcrumbs: Array<{ label: string; href?: string; domain?: string }>
  // Header
  title?: string
  subtitle?: string
  badges?: React.ReactNode
  headerActions?: React.ReactNode
  // Slot between hero and content
  beforeContent?: React.ReactNode
  // Content
  tabs?: TabConfig[]
  children?: React.ReactNode
  // Sidebar
  sidebar?: React.ReactNode
  // Delete
  onDelete?: () => void
  deleteConfirmMessage?: string
  isDeleting?: boolean
  // Permissions (optional — if omitted, all actions are shown)
  permissions?: ResolvedPermissions
  /** Editable badges in header (replaces static badges when interactive editing is needed) */
  editableBadges?: React.ReactNode
  /** KPI mini-cards row below header */
  kpiRow?: React.ReactNode
  /** Color bar above title (gradient CSS value) */
  colorBar?: string
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-48" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  )
}

export function EntityDetail({
  isLoading = false,
  error,
  notFound = false,
  breadcrumbs,
  title,
  subtitle,
  badges,
  headerActions,
  beforeContent,
  tabs,
  children,
  sidebar,
  onDelete,
  deleteConfirmMessage,
  isDeleting = false,
  permissions,
  editableBadges,
  kpiRow,
  colorBar,
}: EntityDetailProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const ctx = usePageContext()
  const { effects } = useThemeConfig()

  // Permission guards (default to showing everything when not provided)
  const canDelete = permissions ? permissions.canDelete : true

  if (isLoading) {
    return <DetailSkeleton />
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Breadcrumbs items={breadcrumbs} />
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

  if (notFound) {
    return (
      <div className="space-y-4">
        <Breadcrumbs items={breadcrumbs} />
        <EmptyState
          icon={FileQuestion}
          title="Non trovato"
          description="L'elemento richiesto non esiste o e' stato eliminato."
        />
      </div>
    )
  }

  return (
    <div className={cn("space-y-6 rounded-lg p-4", effects.cardShadow, effects.cardBorder, ctx && `border-t-2 border-${ctx.color}-500`)}>
      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbs} />

      {/* Hero area */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {/* Color bar — 4px vertical gradient bar from mockup */}
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
              <h1 className="text-page-title text-foreground">{title}</h1>
            )}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
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

      {/* KPI row */}
      {kpiRow && (
        <div className={cn("rounded-lg", effects.kpiStyle)}>
          {kpiRow}
        </div>
      )}

      {/* Slot between hero and content (e.g., workflow stepper) */}
      {beforeContent}

      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: tabs or children */}
        <div className={sidebar ? "lg:col-span-2" : "lg:col-span-3"}>
          {tabs && tabs.length > 0 ? (
            <Tabs defaultValue={tabs[0].key}>
              <TabsList>
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.key} value={tab.key} className={cn(effects.cardHover)}>
                    {tab.label}
                    {tab.count != null && (
                      <span className="ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground tabular-nums">
                        {tab.count}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
              {tabs.map((tab) => (
                <TabsContent key={tab.key} value={tab.key}>
                  {tab.content}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            children
          )}
        </div>

        {/* Right: sidebar */}
        {sidebar && (
          <div className={cn("rounded-lg p-3", effects.kpiStyle)}>{sidebar}</div>
        )}
      </div>

      {/* Delete confirmation dialog */}
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
