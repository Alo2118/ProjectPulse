import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown, Loader2, Plus, Trash2, Zap } from "lucide-react"
import { toast } from "sonner"
import { DataTable, type Column } from "@/components/common/DataTable"
import { FormField } from "@/components/common/FormField"
import { EmptyState } from "@/components/common/EmptyState"
import { RecommendationsPanel } from "@/components/domain/automation/RecommendationsPanel"
import { AutomationLogsViewer } from "@/components/domain/automation/AutomationLogsViewer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  useAutomationListQuery,
  useCreateAutomation,
  useToggleAutomation,
  useDeleteAutomation,
  useAutomationTemplatesQuery,
  useCreateFromTemplate,
} from "@/hooks/api/useAutomations"
import { DOMAIN_LABELS, DOMAIN_COLORS_LEGACY } from "@/lib/constants"

interface AutomationRow {
  id: string
  name: string
  domain: string
  trigger: string
  isEnabled: boolean
}

interface AutomationTemplate {
  id: string
  name: string
  description: string
  domain: string
  trigger: string
}

interface AutomationForm {
  name: string
  domain: string
  trigger: string
  conditions: string
  actions: string
  cooldownMinutes: number
}

const DOMAIN_OPTIONS = Object.entries(DOMAIN_LABELS).map(([value, label]) => ({ value, label }))

const INITIAL_FORM: AutomationForm = {
  name: "",
  domain: "task",
  trigger: "",
  conditions: "[]",
  actions: "[]",
  cooldownMinutes: 0,
}

export function AutomationsTab() {
  const { data, isLoading } = useAutomationListQuery()
  const { data: templates } = useAutomationTemplatesQuery()
  const createMutation = useCreateAutomation()
  const toggleMutation = useToggleAutomation()
  const deleteMutation = useDeleteAutomation()
  const fromTemplateMutation = useCreateFromTemplate()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null)
  const [form, setForm] = useState<AutomationForm>(INITIAL_FORM)
  const [errors, setErrors] = useState<{ name?: string; conditions?: string; actions?: string }>({})

  const items: AutomationRow[] = data?.data ?? []
  const templateList: AutomationTemplate[] = templates ?? []

  const openCreate = () => {
    setForm(INITIAL_FORM)
    setErrors({})
    setDialogOpen(true)
  }

  const handleToggle = async (id: string) => {
    try {
      await toggleMutation.mutateAsync(id)
    } catch {
      toast.error("Errore nel cambio di stato")
    }
  }

  const handleActivateTemplate = async (template: AutomationTemplate) => {
    try {
      await fromTemplateMutation.mutateAsync({ templateId: template.id })
      toast.success(`Automazione "${template.name}" attivata`)
    } catch {
      toast.error("Errore nell'attivazione del template")
    }
  }

  const handleSave = async () => {
    const errs: { name?: string; conditions?: string; actions?: string } = {}
    if (!form.name.trim()) errs.name = "Il nome e' obbligatorio"
    try {
      const parsed = JSON.parse(form.conditions)
      if (!Array.isArray(parsed)) errs.conditions = "Deve essere un array JSON"
    } catch {
      errs.conditions = "JSON non valido"
    }
    try {
      const parsed = JSON.parse(form.actions)
      if (!Array.isArray(parsed)) errs.actions = "Deve essere un array JSON"
    } catch {
      errs.actions = "JSON non valido"
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    try {
      await createMutation.mutateAsync({
        name: form.name,
        domain: form.domain,
        trigger: form.trigger,
        conditions: JSON.parse(form.conditions),
        actions: JSON.parse(form.actions),
        cooldownMinutes: form.cooldownMinutes,
      })
      toast.success("Automazione creata")
      setDialogOpen(false)
    } catch {
      toast.error("Errore nella creazione")
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      await deleteMutation.mutateAsync(deletingId)
      toast.success("Automazione eliminata")
      setDeleteOpen(false)
      setDeletingId(null)
    } catch {
      toast.error("Errore nell'eliminazione")
    }
  }

  const columns: Column<AutomationRow>[] = [
    {
      key: "name",
      header: "Nome",
      cell: (item) => (
        <span className="font-medium text-foreground">{item.name}</span>
      ),
    },
    {
      key: "domain",
      header: "Dominio",
      cell: (item) => (
        <Badge variant="secondary" className={DOMAIN_COLORS_LEGACY[item.domain] ?? ""}>
          {DOMAIN_LABELS[item.domain] ?? item.domain}
        </Badge>
      ),
      className: "w-[100px]",
    },
    {
      key: "trigger",
      header: "Trigger",
      cell: (item) => (
        <span className="text-sm text-muted-foreground font-mono">{item.trigger}</span>
      ),
    },
    {
      key: "isEnabled",
      header: "Stato",
      cell: (item) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={item.isEnabled}
            onCheckedChange={() => handleToggle(item.id)}
            aria-label={item.isEnabled ? "Disattiva" : "Attiva"}
          />
        </div>
      ),
      className: "w-[80px]",
    },
    {
      key: "actions",
      header: "",
      cell: (item) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation()
              setExpandedRuleId((prev) => (prev === item.id ? null : item.id))
            }}
            title="Mostra log esecuzioni"
          >
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                expandedRuleId === item.id ? "rotate-180" : ""
              }`}
            />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              setDeletingId(item.id)
              setDeleteOpen(true)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      className: "w-[100px] text-right",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Recommendations */}
      <RecommendationsPanel />

      {/* Templates section */}
      {templateList.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Template predefiniti</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templateList.map((tpl) => (
              <Card key={tpl.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{tpl.name}</CardTitle>
                    <Badge variant="secondary" className={DOMAIN_COLORS_LEGACY[tpl.domain] ?? ""}>
                      {DOMAIN_LABELS[tpl.domain] ?? tpl.domain}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">{tpl.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleActivateTemplate(tpl)}
                    disabled={fromTemplateMutation.isPending}
                  >
                    <Zap className="h-3.5 w-3.5 mr-1" />
                    Attiva
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Automations list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Regole di automazione</h2>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Nuova regola
          </Button>
        </div>

        {items.length === 0 && !isLoading ? (
          <EmptyState
            icon={Zap}
            title="Nessuna automazione"
            description="Crea la prima regola di automazione o attiva un template."
            action={{ label: "Nuova regola", onClick: openCreate }}
          />
        ) : (
          <div className="space-y-0">
            <div className="rounded-md border">
              <DataTable columns={columns} data={items} getId={(item) => item.id} isLoading={isLoading} />
            </div>
            <AnimatePresence mode="wait">
              {expandedRuleId && (
                <motion.div
                  key={expandedRuleId}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="mt-3">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        Log esecuzioni &mdash;{" "}
                        <span className="text-muted-foreground font-normal">
                          {items.find((i) => i.id === expandedRuleId)?.name ?? expandedRuleId}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <AutomationLogsViewer ruleId={expandedRuleId} />
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuova regola di automazione</DialogTitle>
            <DialogDescription>
              Definisci trigger, condizioni e azioni per la regola.
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
                placeholder="Nome della regola"
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Dominio">
                <Select
                  value={form.domain}
                  onValueChange={(v) => setForm((f) => ({ ...f, domain: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOMAIN_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Trigger">
                <Input
                  value={form.trigger}
                  onChange={(e) => setForm((f) => ({ ...f, trigger: e.target.value }))}
                  placeholder="es. task_created"
                />
              </FormField>
            </div>
            <FormField label="Condizioni (JSON)" error={errors.conditions}>
              <Textarea
                value={form.conditions}
                onChange={(e) => {
                  setForm((f) => ({ ...f, conditions: e.target.value }))
                  if (errors.conditions) setErrors((prev) => ({ ...prev, conditions: undefined }))
                }}
                rows={4}
                className="font-mono text-xs"
              />
            </FormField>
            <FormField label="Azioni (JSON)" error={errors.actions}>
              <Textarea
                value={form.actions}
                onChange={(e) => {
                  setForm((f) => ({ ...f, actions: e.target.value }))
                  if (errors.actions) setErrors((prev) => ({ ...prev, actions: undefined }))
                }}
                rows={4}
                className="font-mono text-xs"
              />
            </FormField>
            <FormField label="Cooldown (minuti)" description="0 = nessun cooldown">
              <Input
                type="number"
                min={0}
                value={form.cooldownMinutes}
                onChange={(e) => setForm((f) => ({ ...f, cooldownMinutes: Number(e.target.value) }))}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={createMutation.isPending}>
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Crea
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
              Sei sicuro di voler eliminare questa regola di automazione?
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
