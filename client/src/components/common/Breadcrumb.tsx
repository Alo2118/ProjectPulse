import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-1.5 text-sm ${className}`}>
      <Link
        to="/dashboard"
        className="text-themed-tertiary hover:text-themed-primary transition-colors"
        aria-label="Home"
      >
        <Home className="w-4 h-4" />
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={index} className="flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--border-default)' }} />
            {isLast || !item.href ? (
              <span className="text-themed-heading font-medium truncate max-w-48">
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className="text-themed-secondary hover:text-themed-primary transition-colors truncate max-w-48"
              >
                {item.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
