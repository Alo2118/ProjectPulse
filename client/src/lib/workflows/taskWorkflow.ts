import type { WorkflowDefinition } from "@/lib/workflow-engine"

export const taskWorkflow: WorkflowDefinition = {
  id: "task",
  domain: "task",
  blockedPhaseKey: "blocked",
  phases: [
    {
      key: "todo",
      label: "Da fare",
      description: "Task in attesa di essere avviato",
      prerequisites: [],
      suggestions: [],
      nextPhases: ["in_progress", "blocked"],
      previousPhases: [],
    },
    {
      key: "in_progress",
      label: "In corso",
      description: "Task attualmente in lavorazione",
      prerequisites: [
        {
          id: "in-progress-assignee",
          label: "Assegnatario definito",
          description: "Assegna il task a un membro del team",
          blocking: false,
          evaluate: (data) => data.hasAssignee === true,
        },
        {
          id: "in-progress-description",
          label: "Descrizione compilata",
          description: "Una descrizione chiara aiuta l'assegnatario",
          blocking: false,
          evaluate: (data) => data.hasDescription === true,
        },
      ],
      suggestions: [
        {
          id: "assign-task",
          label: "Assegna il task",
          description: "Assegna il task a un membro del team per procedere",
          priority: "medium",
          actionType: "dialog",
          actionTarget: "edit-task",
        },
      ],
      nextPhases: ["review", "blocked"],
      previousPhases: ["todo"],
    },
    {
      key: "review",
      label: "In revisione",
      description: "Task completato e in attesa di revisione",
      prerequisites: [
        {
          id: "review-checklist",
          label: "Checklist completata (se presente)",
          description: "Tutti gli elementi della checklist devono essere spuntati prima della revisione",
          blocking: true,
          evaluate: (data) => !data.hasChecklist || (data.checklistProgress ?? 0) === 100,
        },
      ],
      suggestions: [
        {
          id: "complete-checklist",
          label: "Completa la checklist",
          description: "Spunta tutti gli elementi della checklist prima di inviare in revisione",
          priority: "high",
          actionType: "navigate",
          actionTarget: "#checklist",
        },
      ],
      nextPhases: ["done", "blocked"],
      previousPhases: ["in_progress"],
    },
    {
      key: "done",
      label: "Completato",
      description: "Task completato e approvato",
      prerequisites: [
        {
          id: "done-hours",
          label: "Ore registrate",
          description: "Registra le ore di lavoro spese sul task",
          blocking: false,
          evaluate: (data) => (data.hoursLogged ?? 0) > 0,
        },
        {
          id: "done-approver",
          label: "Approvatore definito",
          description: "Un approvatore dovrebbe essere assegnato per la chiusura",
          blocking: false,
          evaluate: (data) => data.hasApprover === true,
        },
      ],
      suggestions: [
        {
          id: "log-hours",
          label: "Registra le ore",
          description: "Aggiungi le ore di lavoro impiegate per completare il task",
          priority: "low",
          actionType: "dialog",
          actionTarget: "log-time",
        },
      ],
      nextPhases: [],
      previousPhases: ["review"],
    },
    {
      key: "blocked",
      label: "Bloccato",
      description: "Task bloccato — richiede attenzione prima di procedere",
      prerequisites: [],
      suggestions: [
        {
          id: "unblock-task",
          label: "Risolvi il blocco",
          description: "Identifica e risolvi il motivo del blocco per riprendere i lavori",
          priority: "high",
          actionType: "info",
        },
      ],
      nextPhases: ["todo", "in_progress"],
      previousPhases: [],
    },
  ],
}
