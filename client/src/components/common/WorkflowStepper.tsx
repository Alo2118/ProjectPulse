import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, Flag, CheckCircle2, AlertCircle } from "lucide-react"
import { StepperBar, type StepperStep } from "@/components/common/StepperBar"
import { StatusBadge } from "@/components/common/StatusBadge"
import { PhaseValidationPanel } from "@/components/common/PhaseValidationPanel"
import { NextActionSuggestion } from "@/components/common/NextActionSuggestion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { TASK_STATUS_LABELS } from "@/lib/constants"
import type { ProjectPhasesResponse, MilestonePhaseInfo } from "@/types"
import {
  evaluatePhase,
  getPhaseStatus,
  type WorkflowDefinition,
  type ValidationData,
  type Suggestion,
} from "@/lib/workflow-engine"

/* ------------------------------------------------------------------ */
/* ProjectPhasesStepper — server-driven project phase stepper         */
/* ------------------------------------------------------------------ */

interface ProjectPhasesStepperProps {
  phasesData: ProjectPhasesResponse
  onAdvance?: (targetPhaseKey: string) => void
  collapsed?: boolean
  className?: string
}

export function ProjectPhasesStepper({
  phasesData,
  onAdvance,
  collapsed = false,
  className,
}: ProjectPhasesStepperProps) {
  const transitionDuration = 0.2

  const { phases, currentPhaseKey, milestonesByPhase, canAdvance, nextPhaseKey } = phasesData

  // Find current phase order for comparison
  const currentPhaseOrder = useMemo(() => {
    const current = phases.find((p) => p.key === currentPhaseKey)
    return current?.order ?? -1
  }, [phases, currentPhaseKey])

  // Map server phases to StepperBar steps
  const steps: StepperStep[] = useMemo(
    () =>
      phases.map((phase) => {
        let status: StepperStep["status"] = "upcoming"
        if (phase.key === currentPhaseKey) {
          status = "current"
        } else if (phase.order < currentPhaseOrder) {
          status = "completed"
        }
        return {
          key: phase.key,
          label: phase.label,
          description: phase.description,
          status,
        }
      }),
    [phases, currentPhaseKey, currentPhaseOrder]
  )

  // Milestones for current phase
  const currentMilestones: MilestonePhaseInfo[] = currentPhaseKey
    ? milestonesByPhase[currentPhaseKey] ?? []
    : []
  const completedMilestones = currentMilestones.filter((m) => m.status === "done")

  // Unassigned milestones
  const unassignedMilestones: MilestonePhaseInfo[] = milestonesByPhase["__unassigned"] ?? []

  return (
    <div className={cn("space-y-3", className)}>
      {/* Stepper bar */}
      <StepperBar steps={steps} size="sm" />

      {/* Expanded details */}
      {!collapsed && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: transitionDuration }}
            className="space-y-2"
          >
            {/* Current phase milestones */}
            {currentPhaseKey && currentMilestones.length > 0 && (
              <Card>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">
                      Milestone fase corrente
                    </p>
                    <Badge variant="secondary" className="text-[10px] tabular-nums">
                      {completedMilestones.length}/{currentMilestones.length} completate
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {currentMilestones.map((m) => (
                      <MilestoneRow key={m.id} milestone={m} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Unassigned milestones hint */}
            {unassignedMilestones.length > 0 && (
              <div className="flex items-center gap-2 rounded-md border border-warning/50 bg-warning/10 px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0" />
                <span className="text-xs text-warning">
                  {unassignedMilestones.length} milestone senza fase assegnata
                </span>
              </div>
            )}

            {/* Advance button */}
            {canAdvance && nextPhaseKey && onAdvance && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => onAdvance(nextPhaseKey)}
                  className="h-8 text-xs"
                >
                  Avanza alla fase successiva
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}

function MilestoneRow({ milestone }: { milestone: MilestonePhaseInfo }) {
  const isDone = milestone.status === "done"
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="flex items-center gap-2 min-w-0">
        {isDone ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
        ) : (
          <Flag className="h-3.5 w-3.5 text-purple-500 shrink-0" />
        )}
        <span
          className={cn(
            "text-sm truncate",
            isDone && "text-muted-foreground line-through"
          )}
        >
          {milestone.title}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={milestone.status} labels={TASK_STATUS_LABELS} />
        {milestone._count.subtasks > 0 && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {milestone._count.subtasks} task
          </span>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* WorkflowStepper — generic workflow stepper (task/doc/input pages)  */
/* ------------------------------------------------------------------ */

interface WorkflowStepperProps {
  workflow: WorkflowDefinition
  currentPhase: string
  validationData: ValidationData
  onAdvance?: (nextPhase: string) => void
  onBlock?: (reason: string) => void
  canAdvancePhase?: boolean
  collapsed?: boolean
  className?: string
}

export function WorkflowStepper({
  workflow,
  currentPhase,
  validationData,
  onAdvance,
  onBlock,
  canAdvancePhase: _canAdvancePhase = true,
  collapsed = false,
  className,
}: WorkflowStepperProps) {
  const [blockDialogOpen, setBlockDialogOpen] = useState(false)
  const [blockReason, setBlockReason] = useState("")

  // Evaluate current phase
  const evaluation = evaluatePhase(workflow, currentPhase, validationData)

  // Map workflow phases (excluding the blocked phase) to StepperBar steps
  const mainPhases = workflow.phases.filter((p) => p.key !== workflow.blockedPhaseKey)
  const steps: StepperStep[] = mainPhases.map((phase) => {
    const status = getPhaseStatus(workflow, phase.key, currentPhase, validationData)
    // Map PhaseStatus to StepperStep status
    const stepStatus: StepperStep["status"] =
      status === "completed"
        ? "completed"
        : status === "current"
          ? "current"
          : status === "blocked"
            ? "blocked"
            : status === "available"
              ? "upcoming"
              : "upcoming"
    return {
      key: phase.key,
      label: phase.label,
      description: phase.description,
      status: stepStatus,
    }
  })

  // If currently blocked, mark stepper step accordingly
  if (currentPhase === workflow.blockedPhaseKey) {
    steps.forEach((s) => {
      s.status = s.status === "current" ? "blocked" : s.status
    })
  }

  const canBlock = workflow.blockedPhaseKey !== undefined && currentPhase !== workflow.blockedPhaseKey

  const handleAdvance = (nextPhase: string) => {
    onAdvance?.(nextPhase)
  }

  const handleBlockConfirm = () => {
    if (blockReason.trim()) {
      onBlock?.(blockReason.trim())
      setBlockReason("")
      setBlockDialogOpen(false)
    }
  }

  const handleSuggestionAction = (suggestion: Suggestion) => {
    if (suggestion.actionType === "navigate" && suggestion.actionTarget) {
      window.location.href = suggestion.actionTarget
    }
  }

  const transitionDuration = 0.2

  return (
    <div className={cn("space-y-3", className)}>
      {/* Stepper bar — click any step to navigate directly */}
      <div className="flex items-center justify-between gap-4">
        <StepperBar
          steps={steps}
          size="sm"
          className="flex-1"
          onStepClick={onAdvance ? (stepKey) => {
            if (stepKey !== currentPhase) {
              handleAdvance(stepKey)
            }
          } : undefined}
        />
        <div className="flex items-center gap-2 shrink-0">
          {/* Block button */}
          {onBlock && canBlock && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs text-destructive border-destructive/50 hover:bg-destructive/5"
              onClick={() => setBlockDialogOpen(true)}
            >
              Blocca
            </Button>
          )}
        </div>
      </div>

      {/* Expanded section: validation panel + suggestion */}
      {!collapsed && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: transitionDuration }}
            className="space-y-2"
          >
            {evaluation.prerequisites.length > 0 && (
              <PhaseValidationPanel
                prerequisites={evaluation.prerequisites}
                allMet={evaluation.allMet}
              />
            )}
            {evaluation.suggestions.length > 0 && (
              <NextActionSuggestion
                suggestions={evaluation.suggestions}
                onAction={handleSuggestionAction}
              />
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Block dialog */}
      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Motivo del blocco</AlertDialogTitle>
          </AlertDialogHeader>
          <Textarea
            placeholder="Descrivi il motivo per cui questo elemento è bloccato..."
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            className="min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBlockReason("")}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockConfirm}
              disabled={!blockReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Conferma blocco
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
