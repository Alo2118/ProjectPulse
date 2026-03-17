import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: LucideIcon
  domain?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

const HOME_ITEM: BreadcrumbItem = { label: 'Home', href: '/', icon: Home }

/**
 * Breadcrumbs — matches mockup .breadcrumb
 *
 * padding: 16px 28px 0
 * font-size: 12px
 * color: var(--text-muted)
 * links: color var(--text-muted), hover color var(--text-secondary)
 * active (last item): color var(--text-secondary)
 * separator: ChevronRight 11px
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  // Auto-prepend Home if the first item is not already "Home" or "/"
  const normalizedItems: BreadcrumbItem[] =
    items.length > 0 && items[0].label !== 'Home' && items[0].href !== '/'
      ? [HOME_ITEM, ...items]
      : items

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center gap-1.5', className)}
      style={{
        padding: '16px 28px 0',
        fontSize: '12px',
        color: 'var(--text-muted)',
      }}
    >
      {normalizedItems.map((item, index) => {
        const isLast = index === normalizedItems.length - 1
        const Icon = item.icon

        return (
          <span key={index} className="flex items-center gap-1.5">
            {/* Separator — ChevronRight 11px */}
            {index > 0 && (
              <ChevronRight
                style={{ width: '11px', height: '11px', flexShrink: 0, color: 'var(--text-muted)' }}
              />
            )}

            {isLast || !item.href ? (
              /* Active / non-linkable item */
              <span
                className="flex items-center gap-1"
                style={{ color: isLast ? 'var(--text-secondary)' : 'var(--text-muted)' }}
              >
                {Icon && (
                  <Icon style={{ width: '11px', height: '11px', flexShrink: 0 }} />
                )}
                {item.label}
              </span>
            ) : (
              /* Linkable ancestor */
              <Link
                to={item.href}
                className="flex items-center gap-1 transition-colors"
                style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)'
                }}
              >
                {Icon && (
                  <Icon style={{ width: '11px', height: '11px', flexShrink: 0 }} />
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
