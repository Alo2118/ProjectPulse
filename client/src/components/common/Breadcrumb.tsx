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
        className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        aria-label="Home"
      >
        <Home className="w-4 h-4" />
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={index} className="flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
            {isLast || !item.href ? (
              <span className="text-slate-900 dark:text-white font-medium truncate max-w-48">
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors truncate max-w-48"
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
