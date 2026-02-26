/**
 * PlanTimelinePreview - Mini horizontal Gantt-like visualization of the suggested timeline.
 * Uses pure CSS positioning — no chart library.
 * Critical path tasks are highlighted in red/orange; others in blue/indigo.
 * @module components/planning/PlanTimelinePreview
 */

import { useMemo } from 'react'
import { GitBranch, Clock } from 'lucide-react'
import type { PlanTask, ScheduledTask } from '@stores/planningStore'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlanTimelinePreviewProps {
  tasks: PlanTask[]
  scheduledTasks: ScheduledTask[]
  totalDurationDays: number
  criticalPathLength: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns day-offset markers spaced every ~5 days along the timeline. */
function buildDayMarkers(totalDays: number): number[] {
  if (totalDays <= 0) return []
  const step = totalDays <= 10 ? 2 : totalDays <= 30 ? 5 : totalDays <= 90 ? 10 : 20
  const markers: number[] = []
  for (let d = 0; d <= totalDays; d += step) {
    markers.push(d)
  }
  // Always include the last day if not already there
  if (markers[markers.length - 1] !== totalDays) {
    markers.push(totalDays)
  }
  return markers
}

/** Parse an ISO date string and return a Date at midnight UTC. */
function parseDate(iso: string): Date {
  return new Date(iso)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface TimelineBarProps {
  label: string
  leftPct: number
  widthPct: number
  isCritical: boolean
}

function TimelineBar({ label, leftPct, widthPct, isCritical }: TimelineBarProps) {
  const barColor = isCritical
    ? 'bg-red-400 dark:bg-red-500'
    : 'bg-indigo-400 dark:bg-indigo-500'

  const clampedWidth = Math.max(widthPct, 1) // always at least 1% wide for visibility

  return (
    <div className="flex items-center gap-2 py-0.5">
      {/* Label */}
      <div className="w-28 sm:w-36 flex-shrink-0 text-right">
        <span
          className="text-xs text-gray-600 dark:text-gray-400 truncate block"
          title={label}
        >
          {label}
        </span>
      </div>

      {/* Bar track */}
      <div className="flex-1 h-5 relative rounded overflow-hidden bg-gray-100 dark:bg-gray-800/60">
        <div
          className={`absolute top-0 bottom-0 rounded ${barColor} flex items-center justify-center transition-all duration-300`}
          style={{ left: `${leftPct}%`, width: `${clampedWidth}%` }}
          role="img"
          aria-label={`${label}: posizione ${Math.round(leftPct)}%, durata ${Math.round(clampedWidth)}%`}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PlanTimelinePreview({
  tasks,
  scheduledTasks,
  totalDurationDays,
  criticalPathLength,
}: PlanTimelinePreviewProps) {
  const dayMarkers = useMemo(() => buildDayMarkers(totalDurationDays), [totalDurationDays])

  // Build a lookup from tempId → task title
  const taskTitles = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of tasks) {
      map.set(t.tempId, t.title || 'Senza titolo')
    }
    return map
  }, [tasks])

  // Compute timeline base date (earliest start)
  const baseDate = useMemo(() => {
    if (scheduledTasks.length === 0) return null
    return scheduledTasks.reduce<Date | null>((earliest, st) => {
      const d = parseDate(st.startDate)
      return earliest === null || d < earliest ? d : earliest
    }, null)
  }, [scheduledTasks])

  // Compute bar positions as percentages
  const bars = useMemo(() => {
    if (!baseDate || totalDurationDays <= 0) return []

    return scheduledTasks.map((st) => {
      const start = parseDate(st.startDate)
      const end = parseDate(st.endDate)
      const startDay = Math.max(0, (start.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))
      const endDay = Math.max(startDay + 1, (end.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))

      const leftPct = (startDay / totalDurationDays) * 100
      const widthPct = ((endDay - startDay) / totalDurationDays) * 100

      return {
        tempId: st.tempId,
        leftPct,
        widthPct,
        isCritical: st.isCriticalPath,
        label: taskTitles.get(st.tempId) ?? st.tempId,
      }
    })
  }, [scheduledTasks, baseDate, totalDurationDays, taskTitles])

  // Empty state
  if (scheduledTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <GitBranch className="w-8 h-8 text-gray-300 dark:text-gray-600" aria-hidden="true" />
        <p className="text-sm text-gray-400 dark:text-gray-500">Nessuna timeline calcolata</p>
      </div>
    )
  }

  return (
    <div className="space-y-3" aria-label="Anteprima timeline del piano">
      {/* Summary stats */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <Clock size={12} className="text-gray-400" aria-hidden="true" />
          <span>Durata totale:</span>
          <span className="font-semibold text-gray-800 dark:text-gray-200">
            {totalDurationDays} giorni
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <span className="w-2 h-2 rounded-full bg-red-400 dark:bg-red-500 flex-shrink-0" aria-hidden="true" />
          <span>Percorso critico:</span>
          <span className="font-semibold text-red-600 dark:text-red-400">
            {criticalPathLength} giorni
          </span>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 ml-auto flex-wrap">
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="w-3 h-2 rounded bg-red-400 dark:bg-red-500 flex-shrink-0" aria-hidden="true" />
            Critico
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="w-3 h-2 rounded bg-indigo-400 dark:bg-indigo-500 flex-shrink-0" aria-hidden="true" />
            Normale
          </div>
        </div>
      </div>

      {/* Day axis */}
      <div className="flex items-end gap-2 pl-[calc(7rem+0.5rem)] sm:pl-[calc(9rem+0.5rem)]">
        <div className="flex-1 relative h-4">
          {dayMarkers.map((day) => (
            <span
              key={day}
              className="absolute text-[10px] text-gray-400 dark:text-gray-500 -translate-x-1/2"
              style={{ left: `${(day / totalDurationDays) * 100}%` }}
            >
              {day}g
            </span>
          ))}
        </div>
      </div>

      {/* Bars */}
      <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
        {bars.map((bar) => (
          <TimelineBar
            key={bar.tempId}
            label={bar.label}
            leftPct={bar.leftPct}
            widthPct={bar.widthPct}
            isCritical={bar.isCritical}
          />
        ))}
      </div>
    </div>
  )
}
