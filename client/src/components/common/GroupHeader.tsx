import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { StatusDot } from "./StatusDot"

interface GroupHeaderProps {
  status: string
  label: string
  count: number
  isCollapsed: boolean
  onToggle: () => void
}

export function GroupHeader({
  status,
  label,
  count,
  isCollapsed,
  onToggle,
}: GroupHeaderProps) {
  return (
    <button
      type="button"
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 border-b",
        "bg-muted/30 hover:bg-muted/50 transition-colors",
        "text-sm font-medium text-foreground cursor-pointer select-none"
      )}
      onClick={onToggle}
      aria-expanded={!isCollapsed}
    >
      <ChevronRight
        className={cn(
          "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-150",
          !isCollapsed && "rotate-90"
        )}
      />
      <StatusDot status={status} size="md" />
      <span>{label}</span>
      <span className="ml-1 text-xs text-muted-foreground tabular-nums font-data">
        ({count})
      </span>
    </button>
  )
}
