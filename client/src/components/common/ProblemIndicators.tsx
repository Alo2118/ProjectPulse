import { AlertTriangle, MessageSquare, CheckSquare, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProblemIndicatorsProps {
  blockedTasks?: number
  openRisks?: number
  comments?: number
  checklistDone?: number
  checklistTotal?: number
  className?: string
}

interface IndicatorBadgeProps {
  icon: React.ReactNode
  count: number
  colorClass: string
  label: string
}

function IndicatorBadge({ icon, count, colorClass, label }: IndicatorBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] leading-none font-medium",
        colorClass
      )}
      aria-label={label}
      title={label}
    >
      {icon}
      <span className="tabular-nums">{count}</span>
    </span>
  )
}

export function ProblemIndicators({
  blockedTasks,
  openRisks,
  comments,
  checklistDone,
  checklistTotal,
  className,
}: ProblemIndicatorsProps) {
  const hasChecklist =
    typeof checklistDone === "number" &&
    typeof checklistTotal === "number" &&
    checklistTotal > 0

  const anyVisible =
    (blockedTasks ?? 0) > 0 ||
    (openRisks ?? 0) > 0 ||
    (comments ?? 0) > 0 ||
    hasChecklist

  if (!anyVisible) return null

  return (
    <span className={cn("inline-flex items-center gap-1 flex-wrap", className)}>
      {(blockedTasks ?? 0) > 0 && (
        <IndicatorBadge
          icon={<ShieldAlert className="h-2.5 w-2.5" />}
          count={blockedTasks!}
          colorClass="bg-destructive/10 text-destructive"
          label={`${blockedTasks} task bloccati`}
        />
      )}
      {(openRisks ?? 0) > 0 && (
        <IndicatorBadge
          icon={<AlertTriangle className="h-2.5 w-2.5" />}
          count={openRisks!}
          colorClass="bg-warning/10 text-warning"
          label={`${openRisks} rischi aperti`}
        />
      )}
      {(comments ?? 0) > 0 && (
        <IndicatorBadge
          icon={<MessageSquare className="h-2.5 w-2.5" />}
          count={comments!}
          colorClass="bg-muted text-muted-foreground"
          label={`${comments} commenti`}
        />
      )}
      {hasChecklist && (
        <IndicatorBadge
          icon={<CheckSquare className="h-2.5 w-2.5" />}
          count={checklistDone!}
          colorClass={
            checklistDone === checklistTotal
              ? "bg-success/10 text-success"
              : "bg-muted text-muted-foreground"
          }
          label={`Checklist: ${checklistDone}/${checklistTotal}`}
        />
      )}
    </span>
  )
}
