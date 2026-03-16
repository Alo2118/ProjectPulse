import { useState } from "react"
import { useNavigate, Navigate } from "react-router-dom"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import {
  LayoutTemplate,
  ListTodo,
  CalendarRange,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { usePrivilegedRole } from "@/hooks/ui/usePrivilegedRole"
import { cn } from "@/lib/utils"

const STEPS = [
  { key: "template", label: "Seleziona Template", icon: LayoutTemplate },
  { key: "tasks", label: "Configura Task", icon: ListTodo },
  { key: "timeline", label: "Timeline", icon: CalendarRange },
  { key: "summary", label: "Riepilogo", icon: ClipboardCheck },
] as const

export default function PlanningWizardPage() {
  useSetPageContext({ domain: 'planning' })
  const { isPrivileged } = usePrivilegedRole()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)

  if (isPrivileged === false) {
    return <Navigate to="/" replace />
  }

  const isFirst = currentStep === 0
  const isLast = currentStep === STEPS.length - 1

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/planning")}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Nuovo Piano</h1>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((step, idx) => {
          const Icon = step.icon
          const isActive = idx === currentStep
          const isDone = idx < currentStep
          return (
            <div key={step.key} className="flex items-center gap-2">
              {idx > 0 && (
                <Separator
                  orientation="horizontal"
                  className={cn("w-8", isDone ? "bg-primary" : "bg-border")}
                />
              )}
              <button
                type="button"
                onClick={() => idx <= currentStep && setCurrentStep(idx)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isDone
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {isDone ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            </div>
          )
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-8">
          {currentStep === 0 && (
            <div className="text-center py-12">
              <LayoutTemplate className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Seleziona Template
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Scegli un template di progetto esistente oppure inizia con un piano vuoto.
                Questa funzionalita sara disponibile a breve.
              </p>
            </div>
          )}

          {currentStep === 1 && (
            <div className="text-center py-12">
              <ListTodo className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Configura Task
              </h2>
              <p className="text-sm text-muted-foreground">
                Configurazione task in arrivo
              </p>
            </div>
          )}

          {currentStep === 2 && (
            <div className="text-center py-12">
              <CalendarRange className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Timeline
              </h2>
              <p className="text-sm text-muted-foreground">
                Anteprima timeline in arrivo
              </p>
            </div>
          )}

          {currentStep === 3 && (
            <div className="text-center py-12">
              <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Riepilogo
              </h2>
              <p className="text-sm text-muted-foreground">
                Riepilogo del piano in arrivo
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => s - 1)}
          disabled={isFirst}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Indietro
        </Button>

        {isLast ? (
          <Button disabled>
            <Check className="h-4 w-4 mr-1" />
            Crea Piano
          </Button>
        ) : (
          <Button onClick={() => setCurrentStep((s) => s + 1)}>
            Avanti
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}
