import { Link } from "react-router-dom"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { DOMAIN_COLORS } from "@/lib/constants"

// ---- Types ----

interface Breakdown {
  label: string
  count: number
  href: string
  variant?: "destructive" | "warning" | "default"
}

interface RelatedEntityItem {
  icon: LucideIcon
  label: string
  total: number
  domain: string
  breakdowns?: Breakdown[]
}

interface RelatedEntitiesSidebarProps {
  items: RelatedEntityItem[]
}

// ---- Helpers ----

function getBreakdownColor(variant: Breakdown["variant"]): string {
  if (variant === "destructive") return "text-destructive"
  if (variant === "warning") return "text-warning"
  return "text-muted-foreground"
}

// ---- Component ----

export function RelatedEntitiesSidebar({ items }: RelatedEntitiesSidebarProps) {
  if (items.length === 0) return null

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const Icon = item.icon
        const domainColorClasses = DOMAIN_COLORS[item.domain] ?? ""
        const iconColorClass = domainColorClasses
          .split(" ")
          .filter((c) => c.startsWith("text-") || c.startsWith("dark:text-"))
          .join(" ")

        const visibleBreakdowns = item.breakdowns?.filter((b) => b.count > 0) ?? []

        return (
          <div key={item.label}>
            {/* Header row */}
            <div className="flex items-center gap-2">
              <Icon
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  iconColorClass || "text-muted-foreground"
                )}
              />
              <span className="text-xs text-muted-foreground flex-1">
                {item.label}
              </span>
              <span className="text-xs font-bold text-foreground tabular-nums">
                {item.total}
              </span>
            </div>

            {/* Breakdown rows */}
            {visibleBreakdowns.length > 0 && (
              <div className="mt-1 space-y-0.5 pl-5">
                {visibleBreakdowns.map((bd, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground/60 shrink-0">
                      ├─
                    </span>
                    <Link
                      to={bd.href}
                      className={cn(
                        "flex-1 text-xs hover:underline transition-colors",
                        getBreakdownColor(bd.variant)
                      )}
                    >
                      <span className="font-medium tabular-nums">{bd.count}</span>
                      {" "}
                      {bd.label}
                    </Link>
                    <Link
                      to={bd.href}
                      className="text-[10px] text-muted-foreground/60 hover:text-foreground transition-colors shrink-0"
                      aria-label={`Vai a ${bd.label}`}
                    >
                      →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
