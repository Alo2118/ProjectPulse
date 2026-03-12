import { cn } from "@/lib/utils"
import { STATUS_COLORS } from "@/lib/constants"
import { useThemeStore } from "@/stores/themeStore"

// Dot colors — mapped from STATUS_COLORS bg classes to solid dot colors
const DOT_COLORS: Record<string, string> = {
  // Project statuses
  planning: "bg-blue-500",
  design: "bg-purple-500",
  verification: "bg-indigo-500",
  validation: "bg-cyan-500",
  transfer: "bg-teal-500",
  maintenance: "bg-orange-500",
  completed: "bg-green-500",
  on_hold: "bg-yellow-500",
  cancelled: "bg-gray-400",
  // Task statuses
  todo: "bg-slate-400",
  in_progress: "bg-blue-500",
  review: "bg-amber-500",
  blocked: "bg-red-500",
  done: "bg-green-500",
  // Priorities
  low: "bg-slate-400",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
  // Risk
  open: "bg-red-500",
  mitigated: "bg-blue-500",
  accepted: "bg-amber-500",
  closed: "bg-gray-400",
  // Document
  draft: "bg-slate-400",
  approved: "bg-green-500",
  obsolete: "bg-gray-400",
  // Input
  pending: "bg-yellow-500",
  processing: "bg-blue-500",
  resolved: "bg-green-500",
  // Time entry
  rejected: "bg-red-500",
}

interface StatusBadgeProps {
  status: string
  labels: Record<string, string>
  className?: string
  /** Force a specific variant instead of auto-detecting from theme */
  variant?: "pill" | "dot"
}

export function StatusBadge({ status, labels, className, variant }: StatusBadgeProps) {
  const theme = useThemeStore((s) => s.theme)
  const label = labels[status] || status
  const useDot = variant === "dot" || (!variant && theme === "tech-hud")

  if (useDot) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs text-foreground", className)}>
        <span className={cn("h-2 w-2 rounded-full shrink-0", DOT_COLORS[status] ?? "bg-muted-foreground")} />
        {label}
      </span>
    )
  }

  // Pill variant (office-classic, asana-like)
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        STATUS_COLORS[status],
        className
      )}
    >
      {label}
    </span>
  )
}
