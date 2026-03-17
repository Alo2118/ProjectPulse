import { cn } from "@/lib/utils"

interface RevBadgeProps {
  version: string
  className?: string
}

/**
 * Revision/version badge — shown in list rows and cards.
 * Styled exactly as the mockup's .rev-badge:
 *   background: var(--bg-overlay), color: var(--text-secondary), border: var(--border-default)
 */
export function RevBadge({ version, className }: RevBadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center shrink-0 font-bold tabular-nums", className)}
      style={{
        padding: "1px 6px",
        borderRadius: "3px",
        fontSize: "10px",
        background: "var(--bg-overlay)",
        color: "var(--text-secondary)",
        border: "1px solid var(--border-default)",
        fontFamily: "var(--font-data, 'DM Sans', sans-serif)",
      }}
    >
      {version}
    </span>
  )
}
