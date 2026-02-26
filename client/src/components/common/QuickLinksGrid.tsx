/**
 * QuickLinksGrid - Grid of quick link cards
 * @module components/common/QuickLinksGrid
 */

import { Link } from 'react-router-dom'
import { LucideIcon } from 'lucide-react'

export interface QuickLink {
  to: string
  icon: LucideIcon
  iconBgClass: string
  iconColorClass: string
  title: string
  subtitle?: string
}

interface QuickLinksGridProps {
  links: (QuickLink | null | undefined | false)[]
  columns?: 2 | 3 | 4
  className?: string
}

const columnClasses = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
}

export function QuickLinksGrid({ links, columns = 3, className = '' }: QuickLinksGridProps) {
  const validLinks = links.filter((link): link is QuickLink => Boolean(link))

  if (validLinks.length === 0) return null

  return (
    <div className={`grid ${columnClasses[columns]} gap-3 ${className}`}>
      {validLinks.map((link, index) => {
        const Icon = link.icon
        return (
          <Link
            key={index}
            to={link.to}
            className="card p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className={`p-2 rounded-lg ${link.iconBgClass}`}>
              <Icon className={`w-5 h-5 ${link.iconColorClass}`} />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-slate-900 dark:text-white truncate">{link.title}</p>
              {link.subtitle && (
                <p className="text-xs text-slate-500 truncate">{link.subtitle}</p>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
