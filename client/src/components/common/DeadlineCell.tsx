import { cn, formatDate, getDeadlineUrgency, formatDaysRemaining } from "@/lib/utils"

interface DeadlineCellProps {
  dueDate: string | null | undefined
  status?: string
  className?: string
}

const TERMINAL_STATUSES = new Set(["done", "cancelled", "completed", "closed", "approved", "obsolete"])

export function DeadlineCell({ dueDate, status, className }: DeadlineCellProps) {
  if (!dueDate) return null

  const isTerminal = status ? TERMINAL_STATUSES.has(status) : false
  const urgency = isTerminal ? "normal" : getDeadlineUrgency(dueDate)
  const daysLabel = formatDaysRemaining(dueDate)
  const dateLabel = formatDate(dueDate)

  const urgencyClasses: Record<string, string> = {
    overdue: "text-destructive font-medium",
    urgent: "text-warning font-medium",
    soon: "text-amber-500",
    normal: "text-muted-foreground",
    none: "text-muted-foreground",
  }

  const badgeClasses: Record<string, string> = {
    overdue: "bg-destructive/10 text-destructive border-destructive/20 animate-pulse",
    urgent: "bg-warning/10 text-warning border-warning/20",
    soon: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
    normal: "",
    none: "",
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      <span className={cn(urgencyClasses[urgency])}>{dateLabel}</span>
      {daysLabel && !isTerminal && urgency !== "normal" && (
        <span
          className={cn(
            "inline-flex items-center rounded border px-1 py-0.5 text-[10px] leading-none",
            badgeClasses[urgency]
          )}
        >
          {daysLabel}
        </span>
      )}
    </span>
  )
}
