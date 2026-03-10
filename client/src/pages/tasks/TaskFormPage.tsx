import { useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import { useForm, Controller } from "react-hook-form"
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
  useTaskQuery,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from "@/hooks/api/useTasks"
import { useProjectListQuery } from "@/hooks/api/useProjects"
import { useUserListQuery } from "@/hooks/api/useUsers"
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from "@/lib/constants"

const TASK_TYPE_OPTIONS = [
  { value: "milestone", label: "Milestone" },
  { value: "task", label: "Task" },
  { value: "subtask", label: "Sottotask" },
]

const schema = z.object({
  title: z.string().min(1, "Titolo richiesto"),
  description: z.string().optional(),
  taskType: z.enum(["milestone", "task", "subtask"]).default("task"),
  status: z.string().default("todo"),
  priority: z.string().default("medium"),
  projectId: z.string().optional(),
  assigneeId: z.string().optional(),
  parentTaskId: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.coerce.number().optional(),
})

type FormValues = z.infer<typeof schema>

interface TaskData {
  id: string
  title: string
  description?: string | null
  taskType: string
  status: string
  priority: string
  projectId?: string | null
  assigneeId?: string | null
  parentTaskId?: string | null
  startDate?: string | null
  dueDate?: string | null
  estimatedHours?: number | null
}

interface ProjectOption {
  id: string
  name: string
  code: string
}

interface UserOption {
  id: string
  firstName: string
  lastName: string
}

export default function TaskFormPage() {
  const { id } = useParams<{ id: string }>()
  useSetPageContext({ domain: 'task', entityId: id })
  const navigate = useNavigate()
  const isNew = !id || id === "new"

  const { data: taskData, isLoading: taskLoading } = useTaskQuery(
    isNew ? "" : (id ?? "")
  )
  const task = taskData as TaskData | undefined

  const { data: projectsData } = useProjectListQuery({ limit: "200" })
  const { data: usersData } = useUserListQuery({ limit: "200" })

  const projects = ((projectsData?.data ?? []) as ProjectOption[])
  const users = ((usersData?.data ?? []) as UserOption[])

  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      taskType: "task",
      status: "todo",
      priority: "medium",
      projectId: "",
      assigneeId: "",
      parentTaskId: "",
      startDate: "",
      dueDate: "",
      estimatedHours: undefined,
    },
  })

  // Populate form on edit
  useEffect(() => {
    if (task && !isNew) {
      reset({
        title: task.title,
        description: task.description ?? "",
        taskType: task.taskType as "milestone" | "task" | "subtask",
        status: task.status,
        priority: task.priority,
        projectId: task.projectId ?? "",
        assigneeId: task.assigneeId ?? "",
        parentTaskId: task.parentTaskId ?? "",
        startDate: task.startDate
          ? task.startDate.substring(0, 10)
          : "",
        dueDate: task.dueDate
          ? task.dueDate.substring(0, 10)
          : "",
        estimatedHours: task.estimatedHours ?? undefined,
      })
    }
  }, [task, isNew, reset])

  const onSubmit = (values: FormValues) => {
    // Clean up empty optional strings
    const payload: Record<string, unknown> = {
      title: values.title,
      taskType: values.taskType,
      status: values.status,
      priority: values.priority,
    }

    if (values.description) payload.description = values.description
    if (values.projectId) payload.projectId = values.projectId
    if (values.assigneeId) payload.assigneeId = values.assigneeId
    if (values.parentTaskId) payload.parentTaskId = values.parentTaskId
    if (values.startDate) payload.startDate = values.startDate
    if (values.dueDate) payload.dueDate = values.dueDate
    if (values.estimatedHours != null) payload.estimatedHours = values.estimatedHours

    if (isNew) {
      createTask.mutate(payload, {
        onSuccess: (data) => {
          toast.success("Task creato", {
            action: {
              label: "Apri →",
              onClick: () => navigate(`/tasks/${data.id}`),
            },
          })
          navigate(`/tasks/${data.id}`)
        },
        onError: () => toast.error("Errore nella creazione del task"),
      })
    } else {
      updateTask.mutate(
        { id: id!, ...payload },
        {
          onSuccess: () => {
            toast.success("Task aggiornato", {
              action: {
                label: "Apri →",
                onClick: () => navigate(`/tasks/${id}`),
              },
            })
            navigate(`/tasks/${id}`)
          },
          onError: () => toast.error("Errore nell'aggiornamento del task"),
        }
      )
    }
  }

  const handleDelete = () => {
    if (!id) return
    deleteTask.mutate(id, {
      onSuccess: () => {
        toast.success("Task eliminato")
        navigate("/tasks")
      },
      onError: () => toast.error("Errore nell'eliminazione"),
    })
  }

  const breadcrumbs = [
    { label: "Task", href: "/tasks" },
    { label: isNew ? "Nuovo Task" : "Modifica Task" },
  ]

  return (
    <EntityForm
      breadcrumbs={breadcrumbs}
      title={isNew ? "Nuovo Task" : "Modifica Task"}
      isNew={isNew}
      isLoading={!isNew && taskLoading}
      onSubmit={handleSubmit(onSubmit)}
      onCancel={() => navigate(isNew ? "/tasks" : `/tasks/${id}`)}
      onDelete={isNew ? undefined : handleDelete}
      isSubmitting={createTask.isPending || updateTask.isPending}
      isDeleting={deleteTask.isPending}
      deleteConfirmMessage="Sei sicuro di voler eliminare questo task?"
    >
      <div className="space-y-6">
        {/* Title */}
        <FormField label="Titolo" required error={errors.title?.message}>
          <Input {...register("title")} placeholder="Inserisci il titolo del task" />
        </FormField>

        {/* Description */}
        <FormField label="Descrizione" error={errors.description?.message}>
          <Textarea
            {...register("description")}
            placeholder="Descrizione del task..."
            rows={4}
            className="resize-none"
          />
        </FormField>

        {/* Type, Status, Priority row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Tipo" error={errors.taskType?.message}>
            <Controller
              name="taskType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField label="Stato" error={errors.status?.message}>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona stato" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField label="Priorita'" error={errors.priority?.message}>
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
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
              )}
            />
          </FormField>
        </div>

        {/* Project and Assignee */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Progetto" error={errors.projectId?.message}>
            <Controller
              name="projectId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || "__none__"}
                  onValueChange={(val) =>
                    field.onChange(val === "__none__" ? "" : val)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona progetto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nessuno</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField label="Assegnatario" error={errors.assigneeId?.message}>
            <Controller
              name="assigneeId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || "__none__"}
                  onValueChange={(val) =>
                    field.onChange(val === "__none__" ? "" : val)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona assegnatario" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Non assegnato</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName} {u.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </div>

        {/* Parent task */}
        <FormField label="Task Padre" error={errors.parentTaskId?.message}>
          <Input
            {...register("parentTaskId")}
            placeholder="ID del task padre (opzionale)"
          />
        </FormField>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Data Inizio" error={errors.startDate?.message}>
            <Input type="date" {...register("startDate")} />
          </FormField>

          <FormField label="Scadenza" error={errors.dueDate?.message}>
            <Input type="date" {...register("dueDate")} />
          </FormField>
        </div>

        {/* Estimated hours */}
        <FormField label="Ore Stimate" error={errors.estimatedHours?.message}>
          <Input
            type="number"
            step="0.5"
            min="0"
            {...register("estimatedHours")}
            placeholder="es. 8"
            className="w-[200px]"
          />
        </FormField>
      </div>
    </EntityForm>
  )
}
