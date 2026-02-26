/**
 * GanttZoomControls - Zoom level selector for Gantt chart
 * Uses JARVIS design system: segmented-control, btn-icon, btn-secondary
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
    <div className="flex items-center gap-3">
      {/* Navigation controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onNavigate('prev')}
          className="btn-icon"
          title="Periodo precedente"
          aria-label="Periodo precedente"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          onClick={onToday}
          className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs"
          title="Vai a oggi"
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>Oggi</span>
        </button>

        <button
          onClick={() => onNavigate('next')}
          className="btn-icon"
          title="Periodo successivo"
          aria-label="Periodo successivo"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Date range label */}
      <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
        {format(viewStart, 'd MMM', { locale: it })} &ndash; {format(viewEnd, 'd MMM yyyy', { locale: it })}
      </span>

      {/* Zoom segmented control */}
      <div className="segmented-control">
        {ZOOM_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onZoomChange(option.value)}
            className={`segmented-control-item ${
              zoomLevel === option.value ? 'segmented-control-item-active' : ''
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
