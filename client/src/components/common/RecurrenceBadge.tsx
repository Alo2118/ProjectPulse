import { RefreshCw } from "lucide-react"
import { cn, formatRecurrencePattern } from "@/lib/utils"

interface RecurrenceBadgeProps {
  pattern: string | null | undefined
  lastExecuted?: string | null
  className?: string
}

// Number of days after which lastExecuted is considered "too old" (stale)
const STALE_THRESHOLD_DAYS = 14

function isLastExecutedStale(lastExecuted: string | null | undefined): boolean {
  if (!lastExecuted) return false
  const last = new Date(lastExecuted)
  const now = new Date()
  const diffDays = Math.ceil((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays > STALE_THRESHOLD_DAYS
}

export function RecurrenceBadge({ pattern, lastExecuted, className }: RecurrenceBadgeProps) {
  const label = formatRecurrencePattern(pattern)
  if (!label) return null

  const isStale = isLastExecutedStale(lastExecuted)

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs",
        isStale ? "text-warning" : "text-info",
        className
      )}
      title={isStale ? "Ultima esecuzione troppo vecchia" : `Ricorrenza: ${label}`}
    >
      <RefreshCw className="h-3 w-3 shrink-0" />
      <span>{label}</span>
    </span>
  )
}
