import { cn } from "@/lib/utils"
import { STATUS_VISUAL } from "@/lib/constants"

interface StatusDotProps {
  status: string
  size?: "sm" | "md" | "lg"
  className?: string
}

const SIZE_CLASSES = {
  sm: "h-2 w-2",
  md: "h-3 w-3",
  lg: "h-3.5 w-3.5",
} as const

export function StatusDot({ status, size = "md", className }: StatusDotProps) {
  const dotColor = STATUS_VISUAL[status]?.dot ?? "bg-muted-foreground"
  return (
    <span
      className={cn(
        "inline-block rounded-full shrink-0",
        SIZE_CLASSES[size],
        dotColor,
        className
      )}
      aria-hidden="true"
    />
  )
}
