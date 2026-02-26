/**
 * CollapsibleSection - Expandable/collapsible content section
 * @module components/common/CollapsibleSection
 */

import { useState, ReactNode } from 'react'
import { ChevronDown, LucideIcon } from 'lucide-react'

interface CollapsibleSectionProps {
  title: string
  icon?: LucideIcon
  defaultExpanded?: boolean
  children: ReactNode
  emptyMessage?: string
  isEmpty?: boolean
  headerRight?: ReactNode
  className?: string
  borderTop?: boolean
}

export function CollapsibleSection({
  title,
  icon: Icon,
  defaultExpanded = false,
  children,
  emptyMessage = 'Nessun contenuto',
  isEmpty = false,
  headerRight,
  className = '',
  borderTop = true,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className={`${borderTop ? 'mt-4 pt-4 border-t border-cyan-500/10 dark:border-cyan-500/10' : ''} ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left hover:bg-cyan-500/5 dark:hover:bg-cyan-500/5 rounded-lg -mx-1 px-1 py-1 transition-colors duration-150"
      >
        <span className="text-sm font-medium text-slate-300 dark:text-slate-300 flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-cyan-500/60 dark:text-cyan-500/60" />}
          {title}
          {isEmpty && (
            <span className="text-xs text-slate-500 italic">- {emptyMessage}</span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {headerRight}
          <ChevronDown
            className={`w-4 h-4 text-slate-500 dark:text-slate-500 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`}
          />
        </div>
      </button>

      {isExpanded && (
        <div className="mt-2">
          {isEmpty ? (
            <p className="text-sm text-slate-500 italic">{emptyMessage}</p>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  )
}
