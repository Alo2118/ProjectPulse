import { CheckCircle2, Circle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { EvaluatedPrerequisite } from "@/lib/workflow-engine"

interface PhaseValidationPanelProps {
  prerequisites: EvaluatedPrerequisite[]
  allMet: boolean
  className?: string
}

export function PhaseValidationPanel({
  prerequisites,
  allMet,
  className,
}: PhaseValidationPanelProps) {
  if (prerequisites.length === 0) return null

  return (
    <Card
      className={cn(
        "border transition-colors",
        allMet ? "border-success" : "border-warning",
        className
      )}
    >
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Prerequisiti fase corrente
        </p>
        <ul className="space-y-2">
          {prerequisites.map((prereq) => (
            <li key={prereq.id} className="flex items-start gap-2.5">
              {prereq.met ? (
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      "text-sm",
                      prereq.met ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {prereq.label}
                  </span>
                  {prereq.blocking && !prereq.met && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                      Bloccante
                    </Badge>
                  )}
                </div>
                {prereq.description && !prereq.met && (
                  <p className="text-xs text-muted-foreground mt-0.5">{prereq.description}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
