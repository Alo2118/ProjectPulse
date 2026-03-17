import { useState } from "react"
import { Loader2, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Breadcrumbs } from "./Breadcrumbs"
import { usePageContext } from "@/hooks/ui/usePageContext"
import type { ResolvedPermissions } from "@/lib/permissions"

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface EntityFormProps {
  // Navigation
  breadcrumbs: BreadcrumbItem[]
  title: string
  subtitle?: string
  // Mode
  isNew?: boolean
  isLoading?: boolean
  // Form
  children: React.ReactNode
  className?: string
  // Actions
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  onDelete?: () => void
  isSubmitting?: boolean
  isDeleting?: boolean
  deleteConfirmMessage?: string
  submitLabel?: string
  deleteLabel?: string
  // Permissions (optional — if omitted, all actions are shown)
  permissions?: ResolvedPermissions
}

const BORDER_COLOR_MAP: Record<string, string> = {
  blue: "border-blue-500",
  amber: "border-amber-500",
  red: "border-red-500",
  purple: "border-purple-500",
  emerald: "border-emerald-500",
  green: "border-green-500",
  indigo: "border-indigo-500",
  slate: "border-slate-500",
}

function FormSkeleton() {
  return (
    <div
      className="mx-7 rounded-[var(--radius)] border border-border bg-card p-6 space-y-6"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  )
}

export function EntityForm({
  breadcrumbs,
  title,
  subtitle,
  isNew = false,
  isLoading = false,
  children,
  className,
  onSubmit,
  onCancel,
  onDelete,
  isSubmitting = false,
  isDeleting = false,
  deleteConfirmMessage,
  submitLabel,
  deleteLabel,
  permissions,
}: EntityFormProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const ctx = usePageContext()

  // Permission guards (default to showing everything when not provided)
  const canDelete = permissions ? permissions.canDelete : true
  const canEdit = permissions ? permissions.canEdit : true
  // When editing (not new) and canEdit is false, disable submit
  const submitDisabled = isSubmitting || (!isNew && !canEdit)

  return (
    <div
      className={cn(
        "space-y-5",
        ctx && "border-t-2",
        ctx && BORDER_COLOR_MAP[ctx.color],
        className
      )}
    >
      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbs} />

      {/* Page title */}
      <div className="px-7">
        <h1 className="text-lg font-semibold text-foreground leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {/* Form content */}
      {isLoading ? (
        <FormSkeleton />
      ) : (
        <form onSubmit={onSubmit}>
          {/* Card shell — mockup styling */}
          <div
            className="mx-7 rounded-[var(--radius)] border border-border bg-card p-6"
          >
            {/* Fields slot */}
            <div className="flex flex-col gap-5">
              {children}
            </div>

            {/* Action bar */}
            <div
              className="flex items-center justify-between mt-6 pt-5 border-t border-border"
            >
              {/* Left: cancel + delete */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Annulla
                </Button>
                {!isNew && onDelete && canDelete && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDeleteOpen(true)}
                    disabled={isSubmitting || isDeleting}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {deleteLabel ?? "Elimina"}
                  </Button>
                )}
              </div>

              {/* Right: submit */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button type="submit" disabled={submitDisabled}>
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        {submitLabel ?? "Salva"}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!isNew && !canEdit && (
                    <TooltipContent>Permessi insufficienti</TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </form>
      )}

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
                {isDeleting ? "Eliminazione..." : (deleteLabel ?? "Elimina")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
