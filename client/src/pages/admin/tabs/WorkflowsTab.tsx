import { useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { DataTable, type Column } from "@/components/common/DataTable"
import { FormField } from "@/components/common/FormField"
import { EmptyState } from "@/components/common/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  useWorkflowListQuery,
  useCreateWorkflow,
  useUpdateWorkflow,
  useDeleteWorkflow,
} from "@/hooks/api/useWorkflows"

interface WorkflowRow {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  statuses: unknown[]
}

interface WorkflowForm {
  name: string
  description: string
  statuses: string
}

const INITIAL_FORM: WorkflowForm = {
  name: "",
  description: "",
  statuses: '[\n  { "key": "todo", "label": "Da fare", "color": "#64748b" },\n  { "key": "in_progress", "label": "In corso", "color": "#3b82f6" },\n  { "key": "done", "label": "Completato", "color": "#22c55e" }\n]',
}

export function WorkflowsTab() {
  const { data, isLoading } = useWorkflowListQuery()
  const createMutation = useCreateWorkflow()
  const updateMutation = useUpdateWorkflow()
  const deleteMutation = useDeleteWorkflow()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState<WorkflowForm>(INITIAL_FORM)
  const [errors, setErrors] = useState<{ name?: string; statuses?: string }>({})

  const items: WorkflowRow[] = data?.data ?? []

  const openCreate = () => {
    setEditingId(null)
    setForm(INITIAL_FORM)
    setErrors({})
    setDialogOpen(true)
  }

  const openEdit = (item: WorkflowRow) => {
    setEditingId(item.id)
    setForm({
      name: item.name,
      description: item.description ?? "",
      statuses: JSON.stringify(item.statuses, null, 2),
    })
    setErrors({})
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const errs: { name?: string; statuses?: string } = {}
    if (!form.name.trim()) errs.name = "Il nome e' obbligatorio"
    let parsedStatuses: unknown
    try {
      parsedStatuses = JSON.parse(form.statuses)
      if (!Array.isArray(parsedStatuses)) {
        errs.statuses = "Deve essere un array JSON"
      }
    } catch {
      errs.statuses = "JSON non valido"
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    try {
      const payload = {
        name: form.name,
        description: form.description,
        statuses: parsedStatuses,
      }
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload })
        toast.success("Workflow aggiornato")
      } else {
        await createMutation.mutateAsync(payload)
        toast.success("Workflow creato")
      }
      setDialogOpen(false)
    } catch {
      toast.error("Errore nel salvataggio")
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      await deleteMutation.mutateAsync(deletingId)
      toast.success("Workflow eliminato")
      setDeleteOpen(false)
      setDeletingId(null)
    } catch {
      toast.error("Errore nell'eliminazione")
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  const columns: Column<WorkflowRow>[] = [
    {
      key: "name",
      header: "Nome",
      cell: (item) => (
        <span className="font-medium text-foreground">{item.name}</span>
      ),
    },
    {
      key: "description",
      header: "Descrizione",
      cell: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.description || "-"}
        </span>
      ),
    },
    {
      key: "statuses",
      header: "N. Stati",
      cell: (item) => (
        <span className="text-sm text-muted-foreground">
          {Array.isArray(item.statuses) ? item.statuses.length : 0}
        </span>
      ),
      className: "w-[90px]",
    },
    {
      key: "isSystem",
      header: "Sistema",
      cell: (item) =>
        item.isSystem ? (
          <Badge
            variant="secondary"
            className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
          >
            Sistema
          </Badge>
        ) : null,
      className: "w-[90px]",
    },
    {
      key: "actions",
      header: "",
      cell: (item) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
            Modifica
          </Button>
          {!item.isSystem && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                setDeletingId(item.id)
                setDeleteOpen(true)
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
      className: "w-[150px] text-right",
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Workflow</h2>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Nuovo workflow
        </Button>
      </div>

      {items.length === 0 && !isLoading ? (
        <EmptyState
          icon={Plus}
          title="Nessun workflow"
          description="Crea il primo workflow personalizzato."
          action={{ label: "Nuovo workflow", onClick: openCreate }}
        />
      ) : (
        <div className="rounded-md border">
          <DataTable columns={columns} data={items} getId={(item) => item.id} isLoading={isLoading} />
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Modifica workflow" : "Nuovo workflow"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Modifica i dati del workflow."
                : "Definisci un nuovo workflow con gli stati desiderati."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <FormField label="Nome" required error={errors.name}>
              <Input
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }))
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
                }}
                placeholder="Nome del workflow"
              />
            </FormField>
            <FormField label="Descrizione">
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descrizione opzionale"
                rows={2}
              />
            </FormField>
            <FormField
              label="Stati (JSON)"
              error={errors.statuses}
              description="Array di oggetti con key, label e color."
            >
              <Textarea
                value={form.statuses}
                onChange={(e) => {
                  setForm((f) => ({ ...f, statuses: e.target.value }))
                  if (errors.statuses) setErrors((prev) => ({ ...prev, statuses: undefined }))
                }}
                rows={8}
                className="font-mono text-xs"
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questo workflow? I progetti associati torneranno al workflow predefinito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
