import type { WorkflowDefinition } from "@/lib/workflow-engine"

export const documentWorkflow: WorkflowDefinition = {
  id: "document",
  domain: "document",
  phases: [
    {
      key: "draft",
      label: "Bozza",
      description: "Documento in fase di redazione",
      prerequisites: [
        {
          id: "draft-attachment",
          label: "File allegato",
          description: "Carica il file del documento per procedere alla revisione",
          blocking: true,
          evaluate: (data) => (data.attachmentCount ?? 0) > 0,
        },
      ],
      suggestions: [
        {
          id: "upload-file",
          label: "Carica il file",
          description: "Allega il file del documento per poterlo inviare in revisione",
          priority: "high",
          actionType: "navigate",
          actionTarget: "edit",
        },
      ],
      nextPhases: ["review"],
      previousPhases: [],
    },
    {
      key: "review",
      label: "In Revisione",
      description: "Documento in attesa di revisione e approvazione",
      prerequisites: [
        {
          id: "review-approver",
          label: "Approvatore assegnato",
          description: "È necessario un approvatore per procedere all'approvazione",
          blocking: true,
          evaluate: (data) => data.hasApprover === true,
        },
      ],
      suggestions: [
        {
          id: "assign-approver",
          label: "Assegna un approvatore",
          description: "Designa un approvatore per il documento",
          priority: "high",
          actionType: "dialog",
          actionTarget: "edit-document",
        },
      ],
      nextPhases: ["approved"],
      previousPhases: ["draft"],
    },
    {
      key: "approved",
      label: "Approvato",
      description: "Documento approvato e pubblicato",
      prerequisites: [],
      suggestions: [],
      nextPhases: [],
      previousPhases: ["review"],
    },
  ],
}
