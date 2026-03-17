import { useState, useMemo, useCallback } from "react"
import { Building2, ShieldAlert } from "lucide-react"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import { toast } from "sonner"
import { toError } from "@/lib/utils"
import { EntityList, type Column } from "@/components/common/EntityList"
import { EmptyState } from "@/components/common/EmptyState"
import { FormField } from "@/components/common/FormField"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
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
  useDepartmentListQuery,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from "@/hooks/api/useDepartments"
import { usePrivilegedRole } from "@/hooks/ui/usePrivilegedRole"
import { useSearchParams } from "react-router-dom"
import type { FilterConfig } from "@/components/common/EntityList"

interface DepartmentRow {
  id: string
  name: string
  description: string | null
  _count?: { users: number }
}

interface DepartmentForm {
  name: string
  description: string
}

const INITIAL_FORM: DepartmentForm = { name: "", description: "" }

const columns: Column<DepartmentRow>[] = [
  {
    key: "name",
    header: "Nome",
    sortable: true,
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
    key: "users",
    header: "N. Utenti",
    cell: (item) => (
      <span className="text-sm text-muted-foreground">
        {item._count?.users ?? 0}
      </span>
    ),
    className: "w-[100px]",
  },
]

const filterConfig: FilterConfig[] = [
  { key: "search", label: "Cerca", type: "search", placeholder: "Cerca dipartimenti..." },
]

function DepartmentListPage() {
  useSetPageContext({ domain: 'admin' })
  const { isAdmin } = usePrivilegedRole()
  const [searchParams, setSearchParams] = useSearchParams()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState<DepartmentForm>(INITIAL_FORM)
  const [nameError, setNameError] = useState("")

  const filters = useMemo(
    () => ({
      search: searchParams.get("search") ?? "",
      page: searchParams.get("page") ?? "1",
    }),
    [searchParams],
  )

  const { data, isLoading, error } = useDepartmentListQuery(filters)
  const createMutation = useCreateDepartment()
  const updateMutation = useUpdateDepartment()
  const deleteMutation = useDeleteDepartment()

  const items: DepartmentRow[] = data?.data ?? []
  const pagination = data?.pagination

  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (value) {
          next.set(key, value)
        } else {
          next.delete(key)
        }
        if (key !== "page") next.delete("page")
        return next
      })
    },
    [setSearchParams],
  )

  const handleFilterClear = useCallback(() => {
    setSearchParams(new URLSearchParams())
  }, [setSearchParams])

  const handlePageChange = useCallback(
    (page: number) => handleFilterChange("page", String(page)),
    [handleFilterChange],
  )

  const openCreate = () => {
    setEditingId(null)
    setForm(INITIAL_FORM)
    setNameError("")
    setDialogOpen(true)
  }

  const openEdit = (item: DepartmentRow) => {
    setEditingId(item.id)
    setForm({ name: item.name, description: item.description ?? "" })
    setNameError("")
    setDialogOpen(true)
  }

  const openDelete = (item: DepartmentRow) => {
    setDeletingId(item.id)
    setDeleteOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setNameError("Il nome e' obbligatorio")
      return
    }
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...form })
        toast.success("Dipartimento aggiornato")
      } else {
        await createMutation.mutateAsync({ ...form })
        toast.success("Dipartimento creato")
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
      toast.success("Dipartimento eliminato")
      setDeleteOpen(false)
      setDeletingId(null)
    } catch {
      toast.error("Errore nell'eliminazione")
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  if (!isAdmin) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Accesso non autorizzato"
        description="Solo gli amministratori possono gestire i dipartimenti."
      />
    )
  }

  const columnsWithActions: Column<DepartmentRow>[] = [
    ...columns,
    {
      key: "actions",
      header: "",
      cell: (item) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(item)}
          >
            Modifica
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => openDelete(item)}
          >
            Elimina
          </Button>
        </div>
      ),
      className: "w-[180px] text-right",
    },
  ]

  return (
    <>
      <EntityList<DepartmentRow>
        title="Dipartimenti"
        subtitle="Gestisci i dipartimenti aziendali"
        icon={Building2}
        data={items}
        pagination={pagination}
        isLoading={isLoading}
        error={toError(error)}
        columns={columnsWithActions}
        getId={(item) => item.id}
        filterConfig={filterConfig}
        filters={filters}
        onFilterChange={handleFilterChange}
        onFilterClear={handleFilterClear}
        onPageChange={handlePageChange}
        headerExtra={
          <Button onClick={openCreate}>Nuovo dipartimento</Button>
        }
        emptyTitle="Nessun dipartimento"
        emptyDescription="Non ci sono dipartimenti registrati."
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Modifica dipartimento" : "Nuovo dipartimento"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Modifica i dati del dipartimento."
                : "Inserisci i dati per creare un nuovo dipartimento."}
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
                placeholder="Nome del dipartimento"
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Salvataggio..." : "Salva"}
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
              Sei sicuro di voler eliminare questo dipartimento? Questa azione non puo' essere annullata.
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
    </>
  )
}

export default DepartmentListPage
