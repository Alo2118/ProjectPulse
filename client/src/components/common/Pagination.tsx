/**
 * Pagination - Reusable pagination component
 * @module components/common/Pagination
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  pages: number
  total: number
  limit: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({
  page,
  pages,
  total,
  limit,
  onPageChange,
  className = '',
}: PaginationProps) {
  if (pages <= 1) return null

  const rangeStart = (page - 1) * limit + 1
  const rangeEnd = Math.min(page * limit, total)

  return (
    <div
      className={`flex items-center justify-between ${className}`}
      role="navigation"
      aria-label="Paginazione"
    >
      {/* Range summary */}
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {rangeStart}&nbsp;–&nbsp;{rangeEnd} di {total}
      </p>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Pagina precedente"
          className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" aria-hidden="true" />
        </button>

        <span className="text-sm text-slate-700 dark:text-slate-300 min-w-[5rem] text-center">
          Pagina {page} di {pages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page === pages}
          aria-label="Pagina successiva"
          className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          <ChevronRight className="w-5 h-5 text-slate-700 dark:text-slate-300" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
