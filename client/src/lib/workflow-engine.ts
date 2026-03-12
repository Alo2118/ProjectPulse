// Pure workflow engine — no React dependency

export interface Prerequisite {
  id: string
  label: string
  description?: string
  blocking: boolean
  evaluate: (data: ValidationData) => boolean
}

export interface Suggestion {
  id: string
  label: string
  description: string
  priority: "high" | "medium" | "low"
  actionType: "navigate" | "dialog" | "info"
  actionTarget?: string
}

export interface WorkflowPhase {
  key: string
  label: string
  description: string
  prerequisites: Prerequisite[]
  suggestions: Suggestion[]
  nextPhases: string[]
  previousPhases: string[]
}

export interface WorkflowDefinition {
  id: string
  domain: string
  phases: WorkflowPhase[]
  blockedPhaseKey?: string
}

export interface ValidationData {
  taskCount?: number
  completedTaskCount?: number
  blockedTaskCount?: number
  milestoneCount?: number
  teamSize?: number
  completionPercent?: number
  hasDescription?: boolean
  hasDueDate?: boolean
  hasAssignee?: boolean
  hasChecklist?: boolean
  checklistProgress?: number
  hasApprover?: boolean
  attachmentCount?: number
  commentCount?: number
  hoursLogged?: number
  estimatedHours?: number
  [key: string]: unknown
}

export interface EvaluatedPrerequisite {
  id: string
  label: string
  description?: string
  blocking: boolean
  met: boolean
}

export interface PhaseEvaluation {
  phase: WorkflowPhase
  prerequisites: EvaluatedPrerequisite[]
  allBlockingMet: boolean
  allMet: boolean
  suggestions: Suggestion[]
}

export type PhaseStatus = "completed" | "current" | "available" | "locked" | "blocked"

export function evaluatePhase(
  workflow: WorkflowDefinition,
  currentPhaseKey: string,
  data: ValidationData
): PhaseEvaluation {
  const phase = workflow.phases.find((p) => p.key === currentPhaseKey)
  if (!phase) throw new Error(`Phase ${currentPhaseKey} not found in workflow ${workflow.id}`)

  const prerequisites: EvaluatedPrerequisite[] = phase.prerequisites.map((p) => ({
    id: p.id,
    label: p.label,
    description: p.description,
    blocking: p.blocking,
    met: p.evaluate(data),
  }))

  const allBlockingMet = prerequisites.filter((p) => p.blocking).every((p) => p.met)
  const allMet = prerequisites.every((p) => p.met)

  // Show suggestions only when not all prerequisites are met
  const suggestions = allMet ? [] : phase.suggestions

  return { phase, prerequisites, allBlockingMet, allMet, suggestions }
}

export function getAvailableTransitions(
  workflow: WorkflowDefinition,
  currentPhaseKey: string,
  data: ValidationData
): string[] {
  const phase = workflow.phases.find((p) => p.key === currentPhaseKey)
  if (!phase) return []

  const eval_ = evaluatePhase(workflow, currentPhaseKey, data)
  if (!eval_.allBlockingMet) return []

  return phase.nextPhases
}

export function getPhaseStatus(
  workflow: WorkflowDefinition,
  phaseKey: string,
  currentPhaseKey: string,
  data: ValidationData
): PhaseStatus {
  if (phaseKey === workflow.blockedPhaseKey && currentPhaseKey === workflow.blockedPhaseKey) {
    return "blocked"
  }

  const phases = workflow.phases
  const currentIndex = phases.findIndex((p) => p.key === currentPhaseKey)
  const phaseIndex = phases.findIndex((p) => p.key === phaseKey)

  if (phaseKey === currentPhaseKey) return "current"
  if (phaseIndex < currentIndex) return "completed"

  const transitions = getAvailableTransitions(workflow, currentPhaseKey, data)
  if (transitions.includes(phaseKey)) return "available"

  return "locked"
}
