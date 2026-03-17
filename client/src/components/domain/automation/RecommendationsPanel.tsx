import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, Lightbulb, Loader2, Sparkles, X } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useAutomationRecommendationsQuery,
  useGenerateRecommendations,
  useApplyRecommendation,
  useDismissRecommendation,
} from "@/hooks/api/useAutomations"
import { cn } from "@/lib/utils"
import { RISK_SCALE_LABELS } from "@/lib/constants"

interface Recommendation {
  id: string
  pattern: string
  impact: number
  evidence: Record<string, unknown>
  suggestedRule: {
    name: string
    description: string
    domain: string
  }
  status: string
  project?: { id: string; name: string } | null
  createdAt: string
}

function getImpactColor(impact: number): string {
  if (impact >= 4) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  if (impact >= 3) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
  return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
}

function getImpactLabel(impact: number): string {
  return RISK_SCALE_LABELS[impact] ?? `${impact}`
}

const PATTERN_LABELS: Record<string, string> = {
  overdue_tasks: "Task in ritardo",
  stuck_tasks: "Task bloccati",
  unassigned_tasks: "Task non assegnati",
  unowned_risks: "Rischi senza responsabile",
  expired_documents: "Documenti scaduti",
  recurring_patterns: "Pattern ricorrenti",
  workload_imbalance: "Squilibrio carico",
  milestone_risk: "Rischio milestone",
}

const EVIDENCE_FORMATTERS: Record<string, (v: unknown) => string> = {
  count: (v) => `${v} elementi trovati`,
  stuckCount: (v) => `${v} elementi trovati`,
  projectName: (v) => `Progetto: ${v}`,
  daysThreshold: (v) => `Soglia: ${v} giorni`,
}

function formatEvidence(evidence: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(evidence)) {
    const formatter = EVIDENCE_FORMATTERS[key]
    if (formatter) {
      parts.push(formatter(value))
    } else if (typeof value === "number") {
      parts.push(`${key}: ${value}`)
    } else if (typeof value === "string") {
      parts.push(value)
    }
  }
  return parts.join(" - ") || "Nessun dettaglio"
}

const itemVariants = {
  initial: { opacity: 0, height: 0, marginBottom: 0 },
  animate: { opacity: 1, height: "auto", marginBottom: 12 },
  exit: { opacity: 0, height: 0, marginBottom: 0 },
}

function RecommendationSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-12" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  )
}

interface RecommendationListProps {
  recommendations: Recommendation[]
  isLoading: boolean
  applyingId: string | null
  dismissingId: string | null
  onApply: (id: string) => void
  onDismiss: (id: string) => void
}

function RecommendationList({
  recommendations,
  isLoading,
  applyingId,
  dismissingId,
  onApply,
  onDismiss,
}: RecommendationListProps) {
  if (isLoading) {
    return <RecommendationSkeleton />
  }

  if (recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Lightbulb className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-foreground">
          Nessuna raccomandazione
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Premi &quot;Analizza&quot; per trovare opportunita di automazione.
        </p>
      </div>
    )
  }

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {recommendations.map((rec) => (
        <motion.div
          key={rec.id}
          variants={itemVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
          layout
        >
          <div className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-foreground truncate">
                  {PATTERN_LABELS[rec.pattern] ?? rec.pattern}
                </span>
                <Badge
                  variant="secondary"
                  className={cn("text-xs shrink-0", getImpactColor(rec.impact))}
                >
                  {getImpactLabel(rec.impact)}
                </Badge>
                {rec.project && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    {rec.project.name}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/20"
                  onClick={() => onApply(rec.id)}
                  disabled={applyingId === rec.id}
                  title="Applica raccomandazione"
                >
                  {applyingId === rec.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onDismiss(rec.id)}
                  disabled={dismissingId === rec.id}
                  title="Ignora raccomandazione"
                >
                  {dismissingId === rec.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-sm text-foreground">
              {rec.suggestedRule.description}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatEvidence(rec.evidence)}
            </p>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  )
}

export function RecommendationsPanel() {
  const { data, isLoading } = useAutomationRecommendationsQuery()
  const generateMutation = useGenerateRecommendations()
  const applyMutation = useApplyRecommendation()
  const dismissMutation = useDismissRecommendation()
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [dismissingId, setDismissingId] = useState<string | null>(null)

  const recommendations: Recommendation[] = data ?? []

  const handleGenerate = async () => {
    try {
      await generateMutation.mutateAsync()
      toast.success("Analisi completata")
    } catch {
      toast.error("Errore nell'analisi")
    }
  }

  const handleApply = async (id: string) => {
    setApplyingId(id)
    try {
      await applyMutation.mutateAsync(id)
      toast.success("Raccomandazione applicata")
    } catch {
      toast.error("Errore nell'applicazione")
    } finally {
      setApplyingId(null)
    }
  }

  const handleDismiss = async (id: string) => {
    setDismissingId(id)
    try {
      await dismissMutation.mutateAsync(id)
    } catch {
      toast.error("Errore nel rifiuto")
    } finally {
      setDismissingId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base">Raccomandazioni</CardTitle>
            {recommendations.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {recommendations.length}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1" />
            )}
            Analizza
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <RecommendationList
          recommendations={recommendations}
          isLoading={isLoading}
          applyingId={applyingId}
          dismissingId={dismissingId}
          onApply={handleApply}
          onDismiss={handleDismiss}
        />
      </CardContent>
    </Card>
  )
}
