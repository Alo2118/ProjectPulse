/**
 * MetaRow - Row of metadata items with icons
 * @module components/common/MetaRow
 */

import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LucideIcon } from 'lucide-react'

export interface MetaItem {
  icon: LucideIcon
  label?: string
  value: ReactNode
  to?: string
  className?: string
  iconClassName?: string
}

interface MetaRowProps {
  items: (MetaItem | null | undefined | false)[]
  className?: string
  borderTop?: boolean
}

export function MetaRow({ items, className = '', borderTop = false }: MetaRowProps) {
  const validItems = items.filter((item): item is MetaItem => Boolean(item))

  if (validItems.length === 0) return null

  return (
    <div
      className={`flex items-center gap-4 text-sm flex-wrap ${
        borderTop ? 'mt-4 pt-4 border-t border-slate-100 dark:border-slate-700' : ''
      } ${className}`}
    >
      {validItems.map((item, index) => {
        const Icon = item.icon
        const content = (
          <>
            <Icon className={`w-4 h-4 ${item.iconClassName || ''}`} />
            {item.label && <span className="text-slate-400">{item.label}:</span>}
            <span className={`font-medium ${item.className || ''}`}>{item.value}</span>
          </>
        )

        if (item.to) {
          return (
            <Link
              key={index}
              to={item.to}
              className={`flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 hover:underline ${item.className || ''}`}
            >
              {content}
            </Link>
          )
        }

        return (
          <span
            key={index}
            className={`flex items-center gap-1.5 text-slate-600 dark:text-slate-400 ${item.className || ''}`}
          >
            {content}
          </span>
        )
      })}
    </div>
  )
}
