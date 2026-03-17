import { cn } from "@/lib/utils"
import {
  STATUS_COLORS,
  TASK_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  RISK_STATUS_LABELS,
  DOCUMENT_STATUS_LABELS,
  INPUT_STATUS_LABELS,
  TIME_ENTRY_STATUS_LABELS,
} from "@/lib/constants"

// Auto-label lookup order: task → project → risk → document → input → time entry
const ALL_STATUS_LABELS: Record<string, string> = {
  ...TIME_ENTRY_STATUS_LABELS,
  ...INPUT_STATUS_LABELS,
  ...DOCUMENT_STATUS_LABELS,
  ...RISK_STATUS_LABELS,
  ...PROJECT_STATUS_LABELS,
  ...TASK_STATUS_LABELS,
}

interface StatusBadgeProps {
  status: string
  /** Override auto-lookup label */
  label?: string
  /** Explicit labels map (backward compat) */
  labels?: Record<string, string>
  /** Show 5px colored dot before text */
  showDot?: boolean
  /** sm = 10px font, md = 11px font (default) */
  size?: "sm" | "md"
  className?: string
}

export function StatusBadge({
  status,
  label,
  labels,
  showDot = false,
  size = "md",
  className,
}: StatusBadgeProps) {
  const resolvedLabel =
    label ?? labels?.[status] ?? ALL_STATUS_LABELS[status] ?? status

  const colors = STATUS_COLORS[status]

  const inlineStyle = colors
    ? {
        background: colors.bg,
        color: colors.text,
        borderColor: colors.border,
      }
    : undefined

  return (
    <span
      style={inlineStyle}
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap",
        "border border-transparent rounded",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
        "font-medium leading-none",
        !colors && "bg-muted text-muted-foreground border-border",
        className
      )}
    >
      {showDot && (
        <span
          style={{ background: "currentColor" }}
          className="inline-block w-[5px] h-[5px] rounded-full shrink-0"
        />
      )}
      {resolvedLabel}
    </span>
  )
}
