import { useState } from "react"
import { Plus, X } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useChecklistQuery,
  useAddChecklistItem,
  useToggleChecklistItem,
  useDeleteChecklistItem,
} from "@/hooks/api/useChecklist"

interface ChecklistItem {
  id: string
  title: string
  isChecked: boolean
  sortOrder: number
}

interface ChecklistSectionProps {
  taskId: string
}

function ChecklistSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-2.5 w-full rounded-full" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  )
}

export function ChecklistSection({ taskId }: ChecklistSectionProps) {
  const { data: items, isLoading } = useChecklistQuery(taskId)
  const addItem = useAddChecklistItem()
  const toggleItem = useToggleChecklistItem()
  const deleteItem = useDeleteChecklistItem()
  const [newTitle, setNewTitle] = useState("")

  const checklist = (items ?? []) as ChecklistItem[]
  const total = checklist.length
  const completed = checklist.filter((item) => item.isChecked).length
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newTitle.trim()
    if (!trimmed) return

    addItem.mutate(
      { taskId, title: trimmed },
      {
        onSuccess: () => {
          setNewTitle("")
        },
        onError: () => toast.error("Errore nell'aggiunta dell'elemento"),
      }
    )
  }

  const handleToggle = (itemId: string) => {
    toggleItem.mutate(
      { taskId, itemId },
      {
        onError: () => toast.error("Errore nell'aggiornamento"),
      }
    )
  }

  const handleDelete = (itemId: string) => {
    deleteItem.mutate(
      { taskId, itemId },
      {
        onError: () => toast.error("Errore nell'eliminazione"),
      }
    )
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        {isLoading ? (
          <ChecklistSkeleton />
        ) : (
          <>
            {/* Progress bar */}
            {total > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {completed}/{total} completati
                  </span>
                  <span>{percentage}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Items list */}
            {checklist.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nessun elemento nella checklist
              </p>
            ) : (
              <div className="space-y-1">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-3 py-2 px-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={item.isChecked}
                      onCheckedChange={() => handleToggle(item.id)}
                      aria-label={`Segna "${item.title}" come ${item.isChecked ? "non completato" : "completato"}`}
                    />
                    <span
                      className={`flex-1 text-sm ${
                        item.isChecked
                          ? "line-through text-muted-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {item.title}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      aria-label={`Elimina "${item.title}"`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add item form */}
            <form onSubmit={handleAdd} className="flex items-center gap-2 pt-2 border-t">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Nuovo elemento..."
                className="flex-1"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!newTitle.trim() || addItem.isPending}
              >
                <Plus className="h-4 w-4 mr-1" />
                Aggiungi
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  )
}
