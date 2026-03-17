import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ReportCardProps {
  title: string
  titleIcon?: ReactNode
  subtitle?: string
  headerAction?: ReactNode
  children: ReactNode
  className?: string
  noPadding?: boolean
}

/**
 * Wrapper card for report chart sections.
 * Matches mockup: bg-surface, border-default, radius, 16px padding.
 */
export function ReportCard({
  title,
  titleIcon,
  subtitle,
  headerAction,
  children,
  className,
  noPadding,
}: ReportCardProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border overflow-hidden",
        !noPadding && "p-4",
        className
      )}
      style={{ borderRadius: "var(--radius)" }}
    >
      <div className={cn("flex items-center justify-between", !noPadding ? "mb-3" : "px-4 py-3 border-b border-border")}>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {titleIcon && <span className="w-3 h-3 flex-shrink-0">{titleIcon}</span>}
          {title}
        </div>
        {subtitle && !headerAction && (
          <span className="text-[10px] font-medium text-muted-foreground">{subtitle}</span>
        )}
        {headerAction}
      </div>
      {children}
    </div>
  )
}
