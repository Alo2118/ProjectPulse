import { Flag, CheckSquare, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TASK_PRIORITY_LABELS, TASK_TYPE_COLORS, TASK_TYPE_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { ProjectFormValues } from "./WizardStepData"
import type { PlanTask } from "./WizardStepPreview"

interface WizardStepConfirmProps {
  projectData: ProjectFormValues
  planTasks: PlanTask[] | null
  onConfirm: () => void
  onBack: () => void
  isCreating: boolean
}

export function WizardStepConfirm({
  projectData,
  planTasks,
  onConfirm,
  onBack,
  isCreating,
}: WizardStepConfirmProps) {
  const milestoneCount = planTasks?.filter((t) => t.taskType === "milestone").length ?? 0
  const taskCount = planTasks?.filter((t) => t.taskType === "task").length ?? 0
  const totalHours = planTasks?.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0) ?? 0

  return (
    <div className="space-y-4">
      {/* Project summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Riepilogo Progetto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nome</span>
            <span className="font-medium">{projectData.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Priorita'</span>
            <span>{TASK_PRIORITY_LABELS[projectData.priority] ?? projectData.priority}</span>
          </div>
          {projectData.startDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Inizio</span>
              <span>{projectData.startDate}</span>
            </div>
          )}
          {projectData.targetEndDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Scadenza</span>
              <span>{projectData.targetEndDate}</span>
            </div>
          )}
          {projectData.budgetHours != null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Budget</span>
              <span>{projectData.budgetHours}h</span>
            </div>
          )}
          {projectData.description && (
            <div className="pt-2 border-t border-border">
              <p className="text-muted-foreground text-xs whitespace-pre-wrap">
                {projectData.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan summary */}
      {planTasks && planTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Piano generato</CardTitle>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>{milestoneCount} milestone</span>
                <span>{taskCount} task</span>
                {totalHours > 0 && <span>{totalHours}h</span>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-64 overflow-y-auto">
              {planTasks
                .filter((t) => !t.parentTempId)
                .map((t) => {
                  const Icon = t.taskType === "milestone" ? Flag : CheckSquare
                  const children = planTasks.filter(
                    (c) => c.parentTempId === t.tempId
                  )
                  return (
                    <div key={t.tempId}>
                      <div className="flex items-center gap-2 px-4 py-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] px-1.5 py-0 shrink-0",
                            TASK_TYPE_COLORS[t.taskType]
                          )}
                        >
                          <Icon className="h-3 w-3 mr-0.5" />
                          {TASK_TYPE_LABELS[t.taskType]}
                        </Badge>
                        <span className="text-sm font-medium truncate">
                          {t.title}
                        </span>
                      </div>
                      {children.map((c) => (
                        <div
                          key={c.tempId}
                          className="flex items-center gap-2 px-4 py-1.5 pl-10"
                        >
                          <span className="text-muted-foreground/40 text-xs">
                            └
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {c.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {!planTasks && (
        <Card>
          <CardContent className="p-5 text-center text-sm text-muted-foreground">
            Nessun template selezionato — il progetto sara' creato senza milestone.
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} disabled={isCreating}>
          &larr; Indietro
        </Button>
        <Button onClick={onConfirm} disabled={isCreating}>
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creazione in corso...
            </>
          ) : (
            "Crea Progetto"
          )}
        </Button>
      </div>
    </div>
  )
}
