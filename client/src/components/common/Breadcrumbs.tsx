import { Link } from "react-router-dom"
import { ChevronRight, Home } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { DOMAIN_COLORS } from "@/lib/constants"

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: LucideIcon
  domain?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

const HOME_ITEM: BreadcrumbItem = { label: "Home", href: "/", icon: Home }

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  // Auto-prepend Home if the first item is not already "Home" or "/"
  const normalizedItems: BreadcrumbItem[] =
    items.length > 0 && items[0].label !== "Home" && items[0].href !== "/"
      ? [HOME_ITEM, ...items]
      : items

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
      {normalizedItems.map((item, index) => {
        const isLast = index === normalizedItems.length - 1
        const Icon = item.icon
        const domainColorClasses = item.domain ? DOMAIN_COLORS[item.domain] : undefined
        // Extract just the text color class from domain colors (e.g. "text-blue-800 dark:text-blue-400")
        const iconColorClass = domainColorClasses
          ? domainColorClasses.split(' ').filter((c) => c.startsWith('text-') || c.startsWith('dark:text-')).join(' ')
          : ''

        return (
          <span key={index} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5" />}
            {isLast || !item.href ? (
              <span className={cn('flex items-center gap-1', isLast ? "text-foreground font-medium" : "")}>
                {Icon && (
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", iconColorClass || "text-muted-foreground")} />
                )}
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                {Icon && (
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", iconColorClass || "text-muted-foreground")} />
                )}
                {item.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
