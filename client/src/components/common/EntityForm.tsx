import { useState } from "react"
import { Loader2, Save, Trash2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
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

interface EntityFormProps {
  // Navigation
  breadcrumbs: Array<{ label: string; href?: string }>
  title: string
  // Mode
  isNew: boolean
  isLoading?: boolean
  // Form
  children: React.ReactNode
  // Actions
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  onDelete?: () => void
  isSubmitting?: boolean
  isDeleting?: boolean
  deleteConfirmMessage?: string
  submitLabel?: string
  // Permissions (optional — if omitted, all actions are shown)
  permissions?: ResolvedPermissions
}

function FormSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function EntityForm({
  breadcrumbs,
  title,
  isNew,
  isLoading = false,
  children,
  onSubmit,
  onCancel,
  onDelete,
  isSubmitting = false,
  isDeleting = false,
  deleteConfirmMessage,
  submitLabel,
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
    <div className={cn("space-y-6", ctx && `border-t-2 border-${ctx.color}-500`)}>
      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbs} />

      {/* Title */}
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>

      {/* Form content */}
      {isLoading ? (
        <FormSkeleton />
      ) : (
        <form onSubmit={onSubmit}>
          <Card>
            <CardContent className="p-6">{children}</CardContent>
          </Card>

          <Separator className="my-6" />

          {/* Action bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
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
                  Elimina
                </Button>
              )}
            </div>
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
                {isDeleting ? "Eliminazione..." : "Elimina"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
