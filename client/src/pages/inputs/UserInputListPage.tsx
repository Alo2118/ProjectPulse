import { useState, useMemo, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { MessageSquarePlus, Loader2, Calendar } from "lucide-react"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import { toast } from "sonner"
import { EntityList, type Column, type FilterConfig } from "@/components/common/EntityList"
import { EntityRow } from "@/components/common/EntityRow"
import { TagFilter } from "@/components/common/TagFilter"
import { StatusBadge } from "@/components/common/StatusBadge"
import { FormField } from "@/components/common/FormField"
import { INPUT_STATUS_LABELS, TASK_PRIORITY_LABELS, INPUT_CATEGORY_LABELS } from "@/lib/constants"
import { formatDate } from "@/lib/utils"
import { useInputListQuery, useCreateInput } from "@/hooks/api/useInputs"
import { useStatsQuery } from "@/hooks/api/useStats"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface UserInput {
  id: string
  code: string
  title: string
  description?: string
  category: string
  priority: string
  status: string
  createdAt: string
}

const CATEGORY_OPTIONS = Object.entries(INPUT_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const STATUS_OPTIONS = Object.entries(INPUT_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const PRIORITY_OPTIONS = Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const columns: Column<UserInput>[] = [
  {
    key: "title",
    header: "Segnalazione",
    sortable: true,
    cell: (item) => (
      <div className="min-w-0 py-0.5">
        <span className="font-medium text-sm truncate block leading-tight">{item.title}</span>
        <span className="text-[11px] text-muted-foreground font-[var(--font-data)] tabular-nums">{item.code}</span>
      </div>
    ),
  },
  {
    key: "category",
    header: "Categoria",
    className: "w-[100px]",
    cell: (item) => (
      <span className="text-xs text-muted-foreground">
        {INPUT_CATEGORY_LABELS[item.category] ?? item.category}
      </span>
    ),
  },
  {
    key: "status",
    header: "Stato",
    className: "w-[130px]",
    cell: (item) => (
      <div className="flex flex-col gap-0.5">
        <StatusBadge status={item.status} labels={INPUT_STATUS_LABELS} />
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-40" />
          {TASK_PRIORITY_LABELS[item.priority] ?? item.priority}
        </span>
      </div>
    ),
  },
  {
    key: "createdAt",
    header: "Data",
    sortable: true,
    className: "w-[100px]",
    cell: (item) => (
      <span className="text-xs font-[var(--font-data)] tabular-nums flex items-center gap-1">
        <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
        {formatDate(item.createdAt)}
      </span>
    ),
  },
]

const filterConfig: FilterConfig[] = [
  { key: "search", label: "Cerca", type: "search", placeholder: "Cerca segnalazioni..." },
  { key: "status", label: "Stato", type: "select", options: STATUS_OPTIONS },
  { key: "category", label: "Categoria", type: "select", options: CATEGORY_OPTIONS },
]

function UserInputListPage() {
  useSetPageContext({ domain: 'input' })
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ title: "", description: "", category: "bug", priority: "medium" })
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  const filters = useMemo(
    () => ({
      search: searchParams.get("search") ?? "",
      status: searchParams.get("status") ?? "",
      category: searchParams.get("category") ?? "",
      page: searchParams.get("page") ?? "1",
    }),
    [searchParams],
  )

  const { data, isLoading, error } = useInputListQuery(filters)
  const { data: kpiCards } = useStatsQuery('inputs')
  const createMutation = useCreateInput()

  const items: UserInput[] = data?.data ?? []
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

  // Render row for list view using EntityRow
  const renderRow = useCallback(
    (item: UserInput) => (
      <EntityRow
        id={item.id}
        name={item.title}
        status={item.status}
        entityType="userInput"
        onClick={() => navigate(`/inputs/${item.id}`)}
        code={item.code}
        subtitle={INPUT_CATEGORY_LABELS[item.category] ?? item.category}
        extraBadges={
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {TASK_PRIORITY_LABELS[item.priority] ?? item.priority}
          </Badge>
        }
      />
    ),
    [navigate]
  )

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    try {
      await createMutation.mutateAsync(form)
      toast.success("Segnalazione creata con successo")
      setCreateOpen(false)
      setForm({ title: "", description: "", category: "bug", priority: "medium" })
    } catch {
      toast.error("Errore nella creazione della segnalazione")
    }
  }

  return (
    <>
      <EntityList<UserInput>
        title="Segnalazioni"
        icon={MessageSquarePlus}
        data={items}
        pagination={pagination}
        isLoading={isLoading}
        error={error as Error | null}
        columns={columns}
        getId={(item) => item.id}
        filterConfig={filterConfig}
        filters={filters}
        onFilterChange={handleFilterChange}
        onFilterClear={handleFilterClear}
        onPageChange={handlePageChange}
        onRowClick={(item) => navigate(`/inputs/${item.id}`)}
        emptyTitle="Nessuna segnalazione"
        emptyDescription="Non ci sono segnalazioni da mostrare."
        kpiStrip={kpiCards}
        renderRow={renderRow}
        afterFilters={
          <TagFilter
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
          />
        }
        headerExtra={
          <Button onClick={() => setCreateOpen(true)}>
            <MessageSquarePlus className="h-4 w-4 mr-1" />
            Nuova segnalazione
          </Button>
        }
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuova segnalazione</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <FormField label="Titolo" required>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Titolo della segnalazione"
              />
            </FormField>
            <FormField label="Descrizione">
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descrizione dettagliata..."
                rows={4}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Categoria">
                <Select
                  value={form.category}
                  onValueChange={(val) => setForm((f) => ({ ...f, category: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Priorita'">
                <Select
                  value={form.priority}
                  onValueChange={(val) => setForm((f) => ({ ...f, priority: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={createMutation.isPending || !form.title.trim()}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Crea
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default UserInputListPage
