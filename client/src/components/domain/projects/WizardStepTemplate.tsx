import { Flag, LayoutTemplate } from "lucide-react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/common/EmptyState"
import { useTemplateListQuery } from "@/hooks/api/useTemplates"
import { cn } from "@/lib/utils"

interface TemplateData {
  id: string
  name: string
  description: string | null
  phases: string[]
  structure: Record<string, unknown>
  projectCount: number
}

interface WizardStepTemplateProps {
  selectedId: string | null
  onSelect: (templateId: string) => void
  onSkip: () => void
  onBack: () => void
  isGenerating: boolean
}

export function WizardStepTemplate({
  selectedId,
  onSelect,
  onSkip,
  onBack,
  isGenerating,
}: WizardStepTemplateProps) {
  const { data, isLoading } = useTemplateListQuery()
  const templates = ((data as Record<string, unknown>)?.data ?? []) as TemplateData[]

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={LayoutTemplate}
          title="Nessun template disponibile"
          description="Non ci sono template di progetto configurati. Puoi creare il progetto senza template."
        />
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            &larr; Indietro
          </Button>
          <Button onClick={onSkip}>Crea senza template</Button>
        </div>
      </div>
    )
  }

  const getMilestoneCount = (t: TemplateData): number => {
    const structure = t.structure as { milestones?: unknown[] }
    return structure?.milestones?.length ?? t.phases?.length ?? 0
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Seleziona un template per generare automaticamente milestone e task.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => (
          <motion.div
            key={t.id}
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.15 }}
          >
            <Card
              className={cn(
                "cursor-pointer transition-colors hover:border-primary/50",
                selectedId === t.id && "border-primary ring-2 ring-primary/20",
                isGenerating && "pointer-events-none opacity-60"
              )}
              onClick={() => onSelect(t.id)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold leading-tight">{t.name}</h3>
                  <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">
                    <Flag className="h-3 w-3 mr-0.5" />
                    {getMilestoneCount(t)}
                  </Badge>
                </div>
                {t.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {t.description}
                  </p>
                )}
                {t.phases.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {t.phases.slice(0, 4).map((phase) => (
                      <Badge
                        key={phase}
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {phase}
                      </Badge>
                    ))}
                    {t.phases.length > 4 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{t.phases.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} disabled={isGenerating}>
          &larr; Indietro
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onSkip} disabled={isGenerating}>
            Salta
          </Button>
        </div>
      </div>
    </div>
  )
}
