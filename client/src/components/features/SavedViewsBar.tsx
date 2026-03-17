import { useCallback, useState } from "react"
import { Bookmark, ChevronDown, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  useSavedViewListQuery,
  useCreateSavedView,
  useDeleteSavedView,
} from "@/hooks/api/useSavedViews"

export interface SavedView {
  id: string
  name: string
  filters: Record<string, unknown>
}

interface SavedViewsBarProps {
  entityType: string
  activeViewId?: string
  currentFilters: Record<string, unknown>
  onSelect: (view: SavedView) => void
}

interface SavedViewData {
  id: string
  name: string
  entityType: string
  filters: string
}

function parseSavedView(raw: SavedViewData): SavedView {
  let filters: Record<string, unknown> = {}
  try {
    filters = JSON.parse(raw.filters) as Record<string, unknown>
  } catch {
    // leave empty
  }
  return { id: raw.id, name: raw.name, filters }
}

export function SavedViewsBar({
  entityType,
  activeViewId,
  currentFilters,
  onSelect,
}: SavedViewsBarProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [viewName, setViewName] = useState("")

  const { data, isLoading } = useSavedViewListQuery({ entityType })
  const createView = useCreateSavedView()
  const deleteView = useDeleteSavedView()

  const rawViews: SavedViewData[] = data?.data ?? []
  const views: SavedView[] = rawViews.map(parseSavedView)

  const handleSave = useCallback(() => {
    if (!viewName.trim()) return
    createView.mutate(
      {
        name: viewName.trim(),
        entityType,
        filters: JSON.stringify(currentFilters),
      },
      {
        onSuccess: () => {
          setViewName("")
          setSaveDialogOpen(false)
        },
      }
    )
  }, [viewName, entityType, currentFilters, createView])

  const handleOpenSaveDialog = useCallback(() => {
    setViewName("")
    setSaveDialogOpen(true)
  }, [])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Bookmark className="h-4 w-4 shrink-0 text-muted-foreground" />

      {isLoading && (
        <>
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </>
      )}

      {!isLoading &&
        views.map((view) => {
          const isActive = view.id === activeViewId
          return (
            <DropdownMenu key={view.id}>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => onSelect(view)}
                  className={[
                    "inline-flex h-7 items-center rounded-l-full border pl-3 pr-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
                  ].join(" ")}
                  aria-pressed={isActive}
                >
                  {view.name}
                </button>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={[
                      "inline-flex h-7 items-center rounded-r-full border-y border-r px-1 text-xs transition-colors",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground hover:bg-primary/80"
                        : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    ].join(" ")}
                    aria-label={`Opzioni per ${view.name}`}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
              </div>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onSelect={() => onSelect(view)}
                >
                  Applica vista
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={(e) => {
                    e.preventDefault()
                    deleteView.mutate(view.id)
                  }}
                  disabled={deleteView.isPending}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Elimina
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        })}

      {!isLoading && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 rounded-full px-3 text-xs"
          onClick={handleOpenSaveDialog}
        >
          <Plus className="h-3 w-3" />
          Salva vista
        </Button>
      )}

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Salva vista corrente</DialogTitle>
            <DialogDescription>
              Dai un nome alla vista con i filtri attualmente applicati.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="view-name">Nome vista</Label>
            <Input
              id="view-name"
              placeholder="Es. Task critici aperti"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave()
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
              disabled={createView.isPending}
            >
              Annulla
            </Button>
            <Button
              onClick={handleSave}
              disabled={!viewName.trim() || createView.isPending}
            >
              {createView.isPending ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
