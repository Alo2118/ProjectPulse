import { useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import { ProjectWizard } from "@/components/domain/projects/ProjectWizard"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
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
import {
  useProjectQuery,
  useUpdateProject,
  useDeleteProject,
} from "@/hooks/api/useProjects"
import { PROJECT_STATUS_LABELS, TASK_PRIORITY_LABELS } from "@/lib/constants"

const schema = z.object({
  code: z.string().min(1, "Codice richiesto"),
  name: z.string().min(1, "Nome richiesto"),
  description: z.string().optional(),
  status: z.string().default("active"),
  priority: z.string().default("medium"),
  startDate: z.string().optional(),
  targetEndDate: z.string().optional(),
  budgetHours: z.coerce.number().optional(),
})

type FormValues = z.infer<typeof schema>

export default function ProjectFormPage() {
  const { id } = useParams<{ id: string }>()
  useSetPageContext({ domain: 'project', entityId: id })
  const isNew = !id

  // New project: render wizard (self-contained with its own hooks)
  if (isNew) {
    return <ProjectWizard />
  }

  // Edit project: render standard form
  return <ProjectEditForm id={id} />
}

function ProjectEditForm({ id }: { id: string }) {
  const navigate = useNavigate()

  const { data: project, isLoading } = useProjectQuery(id)
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
      name: "",
      description: undefined,
      status: "active",
      priority: "medium",
      startDate: undefined,
      targetEndDate: undefined,
    },
  })

  useEffect(() => {
    if (project) {
      const p = project as Record<string, unknown>
      reset({
        code: (p.code as string) ?? "",
        name: (p.name as string) ?? "",
        description: (p.description as string) ?? undefined,
        status: (p.status as string) ?? "active",
        priority: (p.priority as string) ?? "medium",
        startDate: p.startDate
          ? (p.startDate as string).slice(0, 10)
          : undefined,
        targetEndDate: p.targetEndDate
          ? (p.targetEndDate as string).slice(0, 10)
          : undefined,
        budgetHours: (p.budgetHours as number) ?? undefined,
      })
    }
  }, [project, reset])

  const onSubmit = (values: FormValues) => {
    const payload: Record<string, unknown> = {
      ...values,
      description: values.description || undefined,
      startDate: values.startDate || undefined,
      targetEndDate: values.targetEndDate || undefined,
      budgetHours: values.budgetHours ?? undefined,
    }

    updateProject.mutate(
      { id, ...payload },
      {
        onSuccess: () => {
          toast.success("Progetto aggiornato", {
            action: {
              label: "Apri →",
              onClick: () => navigate(`/projects/${id}`),
            },
          })
          navigate(`/projects/${id}`)
        },
        onError: () => toast.error("Errore nell'aggiornamento del progetto"),
      }
    )
  }

  const handleDelete = () => {
    deleteProject.mutate(id, {
      onSuccess: () => {
        toast.success("Progetto eliminato")
        navigate("/projects")
      },
      onError: () => toast.error("Errore nell'eliminazione del progetto"),
    })
  }

  const statusValue = watch("status")
  const priorityValue = watch("priority")

  return (
    <EntityForm
      breadcrumbs={[
        { label: "Progetti", href: "/projects" },
        { label: "Modifica Progetto" },
      ]}
      title="Modifica Progetto"
      isNew={false}
      isLoading={isLoading}
      onSubmit={handleSubmit(onSubmit)}
      onCancel={() => navigate("/projects")}
      onDelete={handleDelete}
      isSubmitting={updateProject.isPending}
      isDeleting={deleteProject.isPending}
      deleteConfirmMessage="Sei sicuro di voler eliminare questo progetto?"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Codice Progetto" error={errors.code?.message} required>
            <Input {...register("code")} placeholder="PRJ-001" />
          </FormField>

          <FormField label="Nome" error={errors.name?.message} required>
            <Input {...register("name")} placeholder="Nome del progetto" />
          </FormField>
        </div>

        <FormField label="Descrizione" error={errors.description?.message}>
          <Textarea
            {...register("description")}
            placeholder="Descrizione del progetto..."
            rows={4}
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Condizione" error={errors.status?.message}>
            <Select
              value={statusValue}
              onValueChange={(v) => setValue("status", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona condizione" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Priorita'" error={errors.priority?.message}>
            <Select
              value={priorityValue}
              onValueChange={(v) => setValue("priority", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona priorita'" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Data Inizio" error={errors.startDate?.message}>
            <Input type="date" {...register("startDate")} />
          </FormField>

          <FormField label="Data Scadenza" error={errors.targetEndDate?.message}>
            <Input type="date" {...register("targetEndDate")} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Budget Ore" error={errors.budgetHours?.message}>
            <Input
              type="number"
              {...register("budgetHours")}
              placeholder="es. 160"
              min={0}
            />
          </FormField>
        </div>
      </div>
    </EntityForm>
  )
}
