import { UseFormReturn } from "react-hook-form"
import { FormField } from "@/components/common/FormField"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TASK_PRIORITY_LABELS } from "@/lib/constants"
import { usePhaseTemplatesQuery } from "@/hooks/api/useProjects"

export interface ProjectFormValues {
  name: string
  description?: string
  priority: string
  startDate?: string
  targetEndDate?: string
  budgetHours?: number
  phaseTemplateId?: string | null
}

interface WizardStepDataProps {
  form: UseFormReturn<ProjectFormValues>
  onNext: () => void
}

export function WizardStepData({ form, onNext }: WizardStepDataProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
    trigger,
  } = form

  const priorityValue = watch("priority")
  const phaseTemplateIdValue = watch("phaseTemplateId")
  const { data: phaseTemplates } = usePhaseTemplatesQuery()

  const handleNext = async () => {
    const valid = await trigger(["name", "priority"])
    if (valid) onNext()
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField label="Nome Progetto" error={errors.name?.message} required>
          <Input {...register("name")} placeholder="Nome del progetto" />
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

      <FormField label="Descrizione" error={errors.description?.message}>
        <Textarea
          {...register("description")}
          placeholder="Descrizione del progetto..."
          rows={3}
        />
      </FormField>

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
            {...register("budgetHours", { valueAsNumber: true })}
            placeholder="es. 160"
            min={0}
          />
        </FormField>
      </div>

      {phaseTemplates && phaseTemplates.length > 0 && (
        <FormField label="Template fasi" error={undefined}>
          <Select
            value={phaseTemplateIdValue ?? ""}
            onValueChange={(v) => setValue("phaseTemplateId", v || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona template fasi (opzionale)" />
            </SelectTrigger>
            <SelectContent>
              {(phaseTemplates as Array<{ id: string; name: string }>).map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      )}

      <div className="flex justify-end">
        <Button onClick={handleNext}>Avanti &rarr;</Button>
      </div>
    </div>
  )
}
