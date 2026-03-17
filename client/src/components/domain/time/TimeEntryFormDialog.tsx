import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCreateTimeEntry, useUpdateTimeEntry } from "@/hooks/api/useTimeEntries"
import { useTaskListQuery } from "@/hooks/api/useTasks"

interface TimeEntry {
  id: string
  description?: string | null
  startTime: string
  endTime?: string | null
  duration?: number | null
  taskId: string
  task?: { id: string; title: string; code?: string }
}

interface TimeEntryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: TimeEntry
}

const formSchema = z.object({
  taskId: z.string().min(1, "Seleziona un task"),
  description: z.string().optional(),
  date: z.string().min(1, "Inserisci la data"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  durationMinutes: z.coerce.number().min(1, "La durata deve essere almeno 1 minuto").optional(),
}).refine(
  (data) => data.durationMinutes || (data.startTime && data.endTime),
  { message: "Inserisci la durata oppure ora di inizio e fine", path: ["durationMinutes"] }
)

type FormValues = z.infer<typeof formSchema>

function parseEntryToForm(entry: TimeEntry): FormValues {
  const start = new Date(entry.startTime)
  const dateStr = start.toISOString().slice(0, 10)
  const startTimeStr = start.toTimeString().slice(0, 5)
  const endTimeStr = entry.endTime
    ? new Date(entry.endTime).toTimeString().slice(0, 5)
    : ""

  return {
    taskId: entry.taskId,
    description: entry.description ?? "",
    date: dateStr,
    startTime: startTimeStr,
    endTime: endTimeStr,
    durationMinutes: entry.duration ?? undefined,
  }
}

function computeDuration(date: string, startTime: string, endTime: string): number | undefined {
  if (!date || !startTime || !endTime) return undefined
  const start = new Date(`${date}T${startTime}:00`)
  const end = new Date(`${date}T${endTime}:00`)
  const diffMs = end.getTime() - start.getTime()
  if (diffMs <= 0) return undefined
  return Math.round(diffMs / 60000)
}

export function TimeEntryFormDialog({ open, onOpenChange, entry }: TimeEntryFormDialogProps) {
  const isEditing = !!entry
  const createMutation = useCreateTimeEntry()
  const updateMutation = useUpdateTimeEntry()
  const { data: tasksData } = useTaskListQuery({ limit: 200 })

  const tasks = useMemo(() => {
    const list = tasksData?.data
    return Array.isArray(list) ? list : []
  }, [tasksData])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      taskId: "",
      description: "",
      date: new Date().toISOString().slice(0, 10),
      startTime: "",
      endTime: "",
      durationMinutes: undefined,
    },
  })

  // Reset form when dialog opens or entry changes
  useEffect(() => {
    if (open) {
      if (entry) {
        reset(parseEntryToForm(entry))
      } else {
        reset({
          taskId: "",
          description: "",
          date: new Date().toISOString().slice(0, 10),
          startTime: "",
          endTime: "",
          durationMinutes: undefined,
        })
      }
    }
  }, [open, entry, reset])

  // Auto-calculate duration from start/end times
  const watchDate = watch("date")
  const watchStart = watch("startTime")
  const watchEnd = watch("endTime")

  useEffect(() => {
    if (watchDate && watchStart && watchEnd) {
      const computed = computeDuration(watchDate, watchStart, watchEnd)
      if (computed && computed > 0) {
        setValue("durationMinutes", computed)
      }
    }
  }, [watchDate, watchStart, watchEnd, setValue])

  const onSubmit = (values: FormValues) => {
    const startTime = values.startTime
      ? new Date(`${values.date}T${values.startTime}:00`).toISOString()
      : new Date(`${values.date}T09:00:00`).toISOString()

    const duration = values.durationMinutes
      ?? computeDuration(values.date, values.startTime ?? "", values.endTime ?? "")
      ?? 0

    const endTime = values.endTime
      ? new Date(`${values.date}T${values.endTime}:00`).toISOString()
      : new Date(new Date(startTime).getTime() + duration * 60000).toISOString()

    const payload = {
      taskId: values.taskId,
      description: values.description || undefined,
      startTime,
      endTime,
      duration,
    }

    if (isEditing && entry) {
      updateMutation.mutate(
        { id: entry.id, ...payload },
        {
          onSuccess: () => {
            toast.success("Registrazione aggiornata")
            onOpenChange(false)
          },
          onError: () => toast.error("Errore nell'aggiornamento"),
        }
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Tempo registrato")
          onOpenChange(false)
        },
        onError: () => toast.error("Errore nella registrazione"),
      })
    }
  }

  const selectedTaskId = watch("taskId")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifica Registrazione" : "Registra Tempo"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica i dettagli della registrazione tempo."
              : "Inserisci una nuova registrazione tempo manuale."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Task selector */}
          <div className="space-y-2">
            <Label htmlFor="taskId">Task</Label>
            <Select value={selectedTaskId} onValueChange={(v) => setValue("taskId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un task..." />
              </SelectTrigger>
              <SelectContent>
                {tasks.map((task: { id: string; title: string; code?: string }) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.code ? `${task.code} — ${task.title}` : task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.taskId && (
              <p className="text-sm text-destructive">{errors.taskId.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Input
              id="description"
              placeholder="Cosa hai fatto..."
              {...register("description")}
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input id="date" type="date" {...register("date")} />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date.message}</p>
            )}
          </div>

          {/* Start / End time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Ora Inizio</Label>
              <Input id="startTime" type="time" {...register("startTime")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Ora Fine</Label>
              <Input id="endTime" type="time" {...register("endTime")} />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="durationMinutes">Durata (minuti)</Label>
            <Input
              id="durationMinutes"
              type="number"
              min={1}
              placeholder="Es. 90"
              {...register("durationMinutes")}
            />
            {errors.durationMinutes && (
              <p className="text-sm text-destructive">{errors.durationMinutes.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
              {isEditing ? "Salva" : "Registra"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
