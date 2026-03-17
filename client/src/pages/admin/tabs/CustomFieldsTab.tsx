import { useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { DataTable, type Column } from "@/components/common/DataTable"
import { FormField } from "@/components/common/FormField"
import { EmptyState } from "@/components/common/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  useCustomFieldDefinitionsQuery,
  useCreateCustomFieldDefinition,
  useUpdateCustomFieldDefinition,
  useDeleteCustomFieldDefinition,
} from "@/hooks/api/useCustomFields"
import { CUSTOM_FIELD_TYPE_LABELS } from "@/lib/constants"

interface CustomFieldRow {
  id: string
  name: string
  type: string
  required: boolean
  options: string[] | null
  projectId: string | null
  project?: { name: string } | null
}

interface CustomFieldForm {
  name: string
  type: string
  required: boolean
  options: string
}

const TYPE_OPTIONS = Object.entries(CUSTOM_FIELD_TYPE_LABELS).map(([value, label]) => ({ value, label }))

const INITIAL_FORM: CustomFieldForm = {
  name: "",
  type: "text",
  required: false,
  options: "",
}

export function CustomFieldsTab() {
  const { data, isLoading } = useCustomFieldDefinitionsQuery()
  const createMutation = useCreateCustomFieldDefinition()
  const updateMutation = useUpdateCustomFieldDefinition()
  const deleteMutation = useDeleteCustomFieldDefinition()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState<CustomFieldForm>(INITIAL_FORM)
  const [nameError, setNameError] = useState("")

  const items: CustomFieldRow[] = data ?? []

  const openCreate = () => {
    setEditingId(null)
    setForm(INITIAL_FORM)
    setNameError("")
    setDialogOpen(true)
  }

  const openEdit = (item: CustomFieldRow) => {
    setEditingId(item.id)
    setForm({
      name: item.name,
      type: item.type,
      required: item.required,
      options: Array.isArray(item.options) ? item.options.join(", ") : "",
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
      const payload: Record<string, unknown> = {
        name: form.name,
        type: form.type,
        required: form.required,
      }
      if (form.type === "select" && form.options.trim()) {
        payload.options = form.options.split(",").map((s) => s.trim()).filter(Boolean)
      }
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload })
        toast.success("Campo personalizzato aggiornato")
      } else {
        await createMutation.mutateAsync(payload)
        toast.success("Campo personalizzato creato")
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
      toast.success("Campo personalizzato eliminato")
      setDeleteOpen(false)
      setDeletingId(null)
    } catch {
      toast.error("Errore nell'eliminazione")
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  const columns: Column<CustomFieldRow>[] = [
    {
      key: "name",
      header: "Nome",
      cell: (item) => (
        <span className="font-medium text-foreground">{item.name}</span>
      ),
    },
    {
      key: "type",
      header: "Tipo",
      cell: (item) => (
        <Badge variant="secondary">
          {CUSTOM_FIELD_TYPE_LABELS[item.type] ?? item.type}
        </Badge>
      ),
      className: "w-[100px]",
    },
    {
      key: "required",
      header: "Obbligatorio",
      cell: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.required ? "Si" : "No"}
        </span>
      ),
      className: "w-[110px]",
    },
    {
      key: "project",
      header: "Progetto",
      cell: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.project?.name ?? "Globale"}
        </span>
      ),
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
        <h2 className="text-lg font-semibold text-foreground">Campi personalizzati</h2>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Nuovo campo
        </Button>
      </div>

      {items.length === 0 && !isLoading ? (
        <EmptyState
          icon={Plus}
          title="Nessun campo personalizzato"
          description="Crea il primo campo personalizzato per i task."
          action={{ label: "Nuovo campo", onClick: openCreate }}
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
              {editingId ? "Modifica campo" : "Nuovo campo personalizzato"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Modifica le proprieta' del campo."
                : "Definisci un nuovo campo personalizzato."}
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
                placeholder="Nome del campo"
              />
            </FormField>
            <FormField label="Tipo">
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            {form.type === "select" && (
              <FormField
                label="Opzioni"
                description="Inserisci le opzioni separate da virgola."
              >
                <Input
                  value={form.options}
                  onChange={(e) => setForm((f) => ({ ...f, options: e.target.value }))}
                  placeholder="Opzione 1, Opzione 2, Opzione 3"
                />
              </FormField>
            )}
            <div className="flex items-center gap-3">
              <Checkbox
                id="cf-required"
                checked={form.required}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, required: checked === true }))
                }
              />
              <Label htmlFor="cf-required">Obbligatorio</Label>
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
              Sei sicuro di voler eliminare questo campo personalizzato? I valori associati verranno persi.
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
