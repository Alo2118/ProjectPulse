import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import { EntityForm } from "@/components/common/EntityForm"
import { FormField } from "@/components/common/FormField"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RISK_STATUS_LABELS, RISK_SCALE_LABELS } from "@/lib/constants"
import {
  useRiskQuery,
  useCreateRisk,
  useUpdateRisk,
  useDeleteRisk,
} from "@/hooks/api/useRisks"
import { useProjectListQuery } from "@/hooks/api/useProjects"
import { useUserListQuery } from "@/hooks/api/useUsers"

const CATEGORY_OPTIONS = [
  { value: "technical", label: "Tecnico" },
  { value: "regulatory", label: "Normativo" },
  { value: "resource", label: "Risorse" },
  { value: "schedule", label: "Tempistica" },
]

const PROBABILITY_OPTIONS = Object.entries(RISK_SCALE_LABELS).map(([value, label]) => ({
  value,
  label: `${value} - ${label}`,
}))

const IMPACT_OPTIONS = Object.entries(RISK_SCALE_LABELS).map(([value, label]) => ({
  value,
  label: `${value} - ${label}`,
}))

const STATUS_OPTIONS = Object.entries(RISK_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

interface FormState {
  code: string
  title: string
  description: string
  category: string
  probability: string
  impact: string
  status: string
  mitigationPlan: string
  projectId: string
  ownerId: string
}

const INITIAL_FORM: FormState = {
  code: "",
  title: "",
  description: "",
  category: "technical",
  probability: "3",
  impact: "3",
  status: "open",
  mitigationPlan: "",
  projectId: "",
  ownerId: "",
}

interface FormErrors {
  code?: string
  title?: string
}

function RiskFormPage() {
  const { id } = useParams<{ id: string }>()
  useSetPageContext({ domain: 'risk', entityId: id })
  const navigate = useNavigate()
  const isNew = !id || id === "new"

  const { data: risk, isLoading: loadingRisk } = useRiskQuery(isNew ? "" : id)
  const { data: projectsData } = useProjectListQuery({ limit: "100" })
  const { data: usersData } = useUserListQuery({ limit: "100" })

  const createMutation = useCreateRisk()
  const updateMutation = useUpdateRisk()
  const deleteMutation = useDeleteRisk()

  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors] = useState<FormErrors>({})

  const projects = projectsData?.data ?? []
  const users = usersData?.data ?? []

  useEffect(() => {
    if (!isNew && risk) {
      setForm({
        code: risk.code ?? "",
        title: risk.title ?? "",
        description: risk.description ?? "",
        category: risk.category ?? "technical",
        probability: String(risk.probability ?? 3),
        impact: String(risk.impact ?? 3),
        status: risk.status ?? "open",
        mitigationPlan: risk.mitigationPlan ?? "",
        projectId: risk.projectId ?? "",
        ownerId: risk.ownerId ?? "",
      })
    }
  }, [isNew, risk])

  const validate = (): boolean => {
    const errs: FormErrors = {}
    if (!form.code.trim()) errs.code = "Il codice e' obbligatorio"
    if (!form.title.trim()) errs.title = "Il titolo e' obbligatorio"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const payload = {
      ...form,
      probability: Number(form.probability),
      impact: Number(form.impact),
      projectId: form.projectId || undefined,
      ownerId: form.ownerId || undefined,
    }

    try {
      if (isNew) {
        const result = await createMutation.mutateAsync(payload)
        const newId = (result as { id?: string }).id
        toast.success("Rischio creato con successo", {
          action: newId
            ? { label: "Apri →", onClick: () => navigate(`/risks/${newId}`) }
            : undefined,
        })
        navigate(newId ? `/risks/${newId}` : "/risks")
      } else {
        await updateMutation.mutateAsync({ id, ...payload })
        toast.success("Rischio aggiornato con successo", {
          action: {
            label: "Apri →",
            onClick: () => navigate(`/risks/${id}`),
          },
        })
        navigate(`/risks/${id}`)
      }
    } catch {
      toast.error(isNew ? "Errore nella creazione" : "Errore nell'aggiornamento")
    }
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Rischio eliminato")
      navigate("/risks")
    } catch {
      toast.error("Errore nell'eliminazione")
    }
  }

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key as keyof FormErrors]) {
      setErrors((e) => ({ ...e, [key]: undefined }))
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <EntityForm
      breadcrumbs={[
        { label: "Rischi", href: "/risks" },
        { label: isNew ? "Nuovo rischio" : form.code || "..." },
      ]}
      title={isNew ? "Nuovo rischio" : `Modifica ${form.code}`}
      isNew={isNew}
      isLoading={!isNew && loadingRisk}
      onSubmit={handleSubmit}
      onCancel={() => navigate("/risks")}
      onDelete={isNew ? undefined : handleDelete}
      isSubmitting={isSubmitting}
      isDeleting={deleteMutation.isPending}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Codice" required error={errors.code}>
            <Input
              value={form.code}
              onChange={(e) => setField("code", e.target.value)}
              placeholder="RSK-001"
            />
          </FormField>
          <FormField label="Titolo" required error={errors.title}>
            <Input
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Titolo del rischio"
            />
          </FormField>
        </div>

        <FormField label="Descrizione">
          <Textarea
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder="Descrizione dettagliata del rischio..."
            rows={4}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Categoria">
            <Select value={form.category} onValueChange={(v) => setField("category", v)}>
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
          <FormField label="Probabilita'">
            <Select value={form.probability} onValueChange={(v) => setField("probability", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROBABILITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Impatto">
            <Select value={form.impact} onValueChange={(v) => setField("impact", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMPACT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Stato">
            <Select value={form.status} onValueChange={(v) => setField("status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Progetto">
            <Select
              value={form.projectId || "__none__"}
              onValueChange={(v) => setField("projectId", v === "__none__" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona progetto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nessun progetto</SelectItem>
                {projects.map((p: { id: string; name: string }) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <FormField label="Responsabile">
          <Select
            value={form.ownerId || "__none__"}
            onValueChange={(v) => setField("ownerId", v === "__none__" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona responsabile" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nessun responsabile</SelectItem>
              {users.map((u: { id: string; firstName: string; lastName: string }) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Piano di mitigazione">
          <Textarea
            value={form.mitigationPlan}
            onChange={(e) => setField("mitigationPlan", e.target.value)}
            placeholder="Descrivere le azioni di mitigazione previste..."
            rows={4}
          />
        </FormField>
      </div>
    </EntityForm>
  )
}

export default RiskFormPage
