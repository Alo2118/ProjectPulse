/**
 * GanttZoomControls - Zoom level selector for Gantt chart
 */

import { GanttZoomLevel } from '@/types'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface GanttZoomControlsProps {
  zoomLevel: GanttZoomLevel
  viewStart: Date
  viewEnd: Date
  onZoomChange: (level: GanttZoomLevel) => void
  onNavigate: (direction: 'prev' | 'next') => void
  onToday: () => void
}

const ZOOM_OPTIONS: { value: GanttZoomLevel; label: string }[] = [
  { value: 'day', label: 'Giorno' },
  { value: 'week', label: 'Settimana' },
  { value: 'month', label: 'Mese' },
]

export default function GanttZoomControls({
  zoomLevel,
  viewStart,
  viewEnd,
  onZoomChange,
  onNavigate,
  onToday,
}: GanttZoomControlsProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onNavigate('prev')}
          className="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-surface-800 dark:hover:text-white"
          title="Precedente"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          onClick={onToday}
          className="flex items-center gap-1 rounded px-2 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-surface-800 dark:hover:text-white"
          title="Vai a oggi"
        >
          <Calendar className="h-4 w-4" />
          <span>Oggi</span>
        </button>

        <button
          onClick={() => onNavigate('next')}
          className="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-surface-800 dark:hover:text-white"
          title="Successivo"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Date range display */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {format(viewStart, 'd MMM', { locale: it })} - {format(viewEnd, 'd MMM yyyy', { locale: it })}
      </div>

      {/* Zoom selector */}
      <div className="flex rounded-lg border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-surface-800">
        {ZOOM_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onZoomChange(option.value)}
            className={`px-3 py-1.5 text-sm transition-colors first:rounded-l-lg last:rounded-r-lg ${
              zoomLevel === option.value
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-surface-800/80 dark:hover:text-white'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
