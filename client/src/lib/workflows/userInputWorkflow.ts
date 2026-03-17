import type { WorkflowDefinition } from "@/lib/workflow-engine"

export const userInputWorkflow: WorkflowDefinition = {
  id: "user-input",
  domain: "input",
  phases: [
    {
      key: "pending",
      label: "In Attesa",
      description: "Segnalazione ricevuta, in attesa di presa in carico",
      prerequisites: [],
      suggestions: [
        {
          id: "take-charge",
          label: "Prendi in carico",
          description: "Avvia la lavorazione della segnalazione",
          priority: "medium",
          actionType: "dialog",
          actionTarget: "process-input",
        },
      ],
      nextPhases: ["processing"],
      previousPhases: [],
    },
    {
      key: "processing",
      label: "In Lavorazione",
      description: "Segnalazione presa in carico e in lavorazione",
      prerequisites: [],
      suggestions: [
        {
          id: "add-resolution-notes",
          label: "Aggiungi note di risoluzione",
          description: "Documenta la risoluzione prima di chiudere la segnalazione",
          priority: "medium",
          actionType: "dialog",
          actionTarget: "edit-input",
        },
      ],
      nextPhases: ["resolved"],
      previousPhases: ["pending"],
    },
    {
      key: "resolved",
      label: "Risolto",
      description: "Segnalazione risolta e chiusa",
      prerequisites: [
        {
          id: "resolved-notes",
          label: "Note di risoluzione compilate",
          description: "Documenta come la segnalazione è stata risolta",
          blocking: true,
          evaluate: (data) => data.hasDescription === true,
        },
      ],
      suggestions: [
        {
          id: "add-resolution",
          label: "Aggiungi la descrizione di risoluzione",
          description: "Compila la descrizione prima di chiudere la segnalazione",
          priority: "high",
          actionType: "navigate",
          actionTarget: "edit",
        },
      ],
      nextPhases: [],
      previousPhases: ["processing"],
    },
  ],
}
