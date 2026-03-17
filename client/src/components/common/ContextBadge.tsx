import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { DOMAIN_COLORS, DOMAIN_LABELS } from "@/lib/constants"

interface ContextBadgeProps {
  domain: string
  label?: string
  icon?: ReactNode
  className?: string
}

/**
 * Badge for domain/context labels (project, milestone, task, risk, document, etc.)
 * Uses DOMAIN_COLORS[domain] for colors from mockup palette.
 */
export function ContextBadge({ domain, label, icon, className }: ContextBadgeProps) {
  const resolvedLabel = label ?? DOMAIN_LABELS[domain] ?? domain
  const colors = DOMAIN_COLORS[domain]

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
        "px-2 py-0.5 rounded border border-transparent",
        "text-[11px] font-medium leading-none",
        !colors && "bg-muted text-muted-foreground border-border",
        className
      )}
    >
      {icon && (
        <span className="shrink-0 leading-none">{icon}</span>
      )}
      {resolvedLabel}
    </span>
  )
}
