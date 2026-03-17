import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { Breadcrumbs } from "@/components/common/Breadcrumbs"
import { StepperBar, type StepperStep } from "@/components/common/StepperBar"
import { WizardStepData, type ProjectFormValues } from "./WizardStepData"
import { WizardStepTemplate } from "./WizardStepTemplate"
import { WizardStepPreview, type PlanTask } from "./WizardStepPreview"
import { WizardStepConfirm } from "./WizardStepConfirm"
import { useCreateProject } from "@/hooks/api/useProjects"
import { useGeneratePlan, useCommitPlan } from "@/hooks/api/usePlanning"

type WizardStep = "data" | "template" | "preview" | "confirm"

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "data", label: "Dati" },
  { key: "template", label: "Template" },
  { key: "preview", label: "Anteprima" },
  { key: "confirm", label: "Conferma" },
]

const formSchema = z.object({
  name: z.string().min(1, "Nome richiesto"),
  description: z.string().optional(),
  priority: z.string().default("medium"),
  startDate: z.string().optional(),
  targetEndDate: z.string().optional(),
  budgetHours: z.coerce.number().optional(),
  phaseTemplateId: z.string().nullable().optional(),
})

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
}

export function ProjectWizard() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState<WizardStep>("data")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [planTasks, setPlanTasks] = useState<PlanTask[] | null>(null)

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      priority: "medium",
      startDate: "",
      targetEndDate: "",
    },
  })

  const createProject = useCreateProject()
  const generatePlan = useGeneratePlan()
  const commitPlan = useCommitPlan()

  const isCreating = createProject.isPending || commitPlan.isPending

  const stepIndex = STEPS.findIndex((s) => s.key === currentStep)

  const stepperSteps: StepperStep[] = STEPS.map((s, i) => ({
    key: s.key,
    label: s.label,
    status: i < stepIndex ? "completed" : i === stepIndex ? "current" : "upcoming",
  }))

  const handleTemplateSelect = async (templateId: string) => {
    setSelectedTemplateId(templateId)
    try {
      const result = await generatePlan.mutateAsync({ templateId })
      const generated = (result as { tasks?: PlanTask[] })?.tasks ?? []
      setPlanTasks(generated)
      setCurrentStep("preview")
    } catch {
      toast.error("Errore nella generazione del piano")
    }
  }

  const handleSkipTemplate = () => {
    setSelectedTemplateId(null)
    setPlanTasks(null)
    setCurrentStep("confirm")
  }

  const handleConfirm = async () => {
    const values = form.getValues()

    // Clean payload
    const projectPayload: Record<string, unknown> = {
      name: values.name,
      description: values.description || undefined,
      priority: values.priority,
      startDate: values.startDate || undefined,
      targetEndDate: values.targetEndDate || undefined,
      budgetHours: values.budgetHours ?? undefined,
      ...(selectedTemplateId ? { templateId: selectedTemplateId } : {}),
      ...(values.phaseTemplateId ? { phaseTemplateId: values.phaseTemplateId } : {}),
    }

    try {
      // Step 1: Create project
      const project = await createProject.mutateAsync(projectPayload)
      const projectId = (project as { id: string }).id

      // Step 2: Commit plan if we have tasks
      if (planTasks && planTasks.length > 0) {
        await commitPlan.mutateAsync({
          projectId,
          tasks: planTasks,
        })
      }

      toast.success("Progetto creato con successo")
      navigate(`/projects/${projectId}`)
    } catch {
      toast.error("Errore nella creazione del progetto")
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Progetti", href: "/projects" },
          { label: "Nuovo Progetto" },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold text-foreground">Nuovo Progetto</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Crea un progetto e opzionalmente genera milestone e task da un template.
        </p>
      </div>

      <StepperBar steps={stepperSteps} size="sm" />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
        >
          {currentStep === "data" && (
            <WizardStepData
              form={form}
              onNext={() => setCurrentStep("template")}
            />
          )}

          {currentStep === "template" && (
            <WizardStepTemplate
              selectedId={selectedTemplateId}
              onSelect={handleTemplateSelect}
              onSkip={handleSkipTemplate}
              onBack={() => setCurrentStep("data")}
              isGenerating={generatePlan.isPending}
            />
          )}

          {currentStep === "preview" && planTasks && (
            <WizardStepPreview
              tasks={planTasks}
              onTasksChange={setPlanTasks}
              onNext={() => setCurrentStep("confirm")}
              onBack={() => setCurrentStep("template")}
            />
          )}

          {currentStep === "confirm" && (
            <WizardStepConfirm
              projectData={form.getValues()}
              planTasks={planTasks}
              onConfirm={handleConfirm}
              onBack={() =>
                planTasks ? setCurrentStep("preview") : setCurrentStep("template")
              }
              isCreating={isCreating}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
