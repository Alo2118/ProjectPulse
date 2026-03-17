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
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
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
  useTemplateListQuery,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
} from "@/hooks/api/useTemplates"

interface TemplateRow {
  id: string
  name: string
  description: string | null
  isActive: boolean
  phases: unknown[]
}

interface TemplateForm {
  name: string
  description: string
  isActive: boolean
}

const INITIAL_FORM: TemplateForm = { name: "", description: "", isActive: true }

export function TemplatesTab() {
  const { data, isLoading } = useTemplateListQuery()
  const createMutation = useCreateTemplate()
  const updateMutation = useUpdateTemplate()
  const deleteMutation = useDeleteTemplate()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState<TemplateForm>(INITIAL_FORM)
  const [nameError, setNameError] = useState("")

  const items: TemplateRow[] = data?.data ?? []

  const openCreate = () => {
    setEditingId(null)
    setForm(INITIAL_FORM)
    setNameError("")
    setDialogOpen(true)
  }

  const openEdit = (item: TemplateRow) => {
    setEditingId(item.id)
    setForm({
      name: item.name,
      description: item.description ?? "",
      isActive: item.isActive,
    })
    setNameError("")
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setNameError("Il nome e' obbligatorio")
      return
    }
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...form })
        toast.success("Template aggiornato")
      } else {
        await createMutation.mutateAsync({ ...form })
        toast.success("Template creato")
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
      toast.success("Template eliminato")
      setDeleteOpen(false)
      setDeletingId(null)
    } catch {
      toast.error("Errore nell'eliminazione")
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  const columns: Column<TemplateRow>[] = [
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
      key: "isActive",
      header: "Stato",
      cell: (item) => (
        <Badge
          variant="secondary"
          className={
            item.isActive
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : "bg-muted text-muted-foreground"
          }
        >
          {item.isActive ? "Attivo" : "Non attivo"}
        </Badge>
      ),
      className: "w-[100px]",
    },
    {
      key: "phases",
      header: "Fasi",
      cell: (item) => (
        <span className="text-sm text-muted-foreground">
          {Array.isArray(item.phases) ? item.phases.length : 0}
        </span>
      ),
      className: "w-[80px]",
    },
    {
      key: "actions",
      header: "",
      cell: (item) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
            Modifica
          </Button>
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
        </div>
      ),
      className: "w-[150px] text-right",
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Template di progetto</h2>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Nuovo template
        </Button>
      </div>

      {items.length === 0 && !isLoading ? (
        <EmptyState
          icon={Plus}
          title="Nessun template"
          description="Crea il primo template di progetto."
          action={{ label: "Nuovo template", onClick: openCreate }}
        />
      ) : (
        <div className="rounded-md border">
          <DataTable columns={columns} data={items} getId={(item) => item.id} isLoading={isLoading} />
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Modifica template" : "Nuovo template"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Modifica i dati del template."
                : "Inserisci i dati per creare un nuovo template."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <FormField label="Nome" required error={nameError}>
              <Input
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }))
                  if (nameError) setNameError("")
                }}
                placeholder="Nome del template"
              />
            </FormField>
            <FormField label="Descrizione">
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descrizione opzionale"
                rows={3}
              />
            </FormField>
            <div className="flex items-center gap-3">
              <Switch
                id="template-active"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
              />
              <Label htmlFor="template-active">Attivo</Label>
            </div>
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
              Sei sicuro di voler eliminare questo template? Questa azione non puo' essere annullata.
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
