import { useMemo } from 'react'
import { Users, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { CapacityBar } from './CapacityBar'

interface TeamCapacityEntry {
  userId: string
  firstName: string
  lastName: string
  weeklyHoursTarget: number
  assignedHours: number
  loggedHours: number
  availableHours: number
  utilizationPercent: number
  overloaded: boolean
  activeTaskCount: number
}

interface TeamCapacityChartProps {
  data: TeamCapacityEntry[]
  weekLabel: string
  onPrevWeek: () => void
  onNextWeek: () => void
  isLoading?: boolean
}

export function TeamCapacityChart({ data, weekLabel, onPrevWeek, onNextWeek, isLoading }: TeamCapacityChartProps) {
  const overloadedCount = useMemo(() => data.filter((u) => u.overloaded).length, [data])
  const avgUtilization = useMemo(() => {
    if (data.length === 0) return 0
    return Math.round(data.reduce((s, u) => s + u.utilizationPercent, 0) / data.length)
  }, [data])

  if (isLoading) {
    return (
      <div className="card p-5 space-y-4">
        <div className="skeleton h-6 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-2.5 w-full rounded-full" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-500" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Capacità Team
          </h3>
          {overloadedCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              {overloadedCount} sovraccarichi
            </span>
          )}
        </div>
        {/* Week navigator */}
        <div className="flex items-center gap-1">
          <button onClick={onPrevWeek} className="btn-icon p-1" aria-label="Settimana precedente">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 min-w-[100px] text-center">
            {weekLabel}
          </span>
          <button onClick={onNextWeek} className="btn-icon p-1" aria-label="Settimana successiva">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span>Utilizzo medio: <strong className="text-gray-900 dark:text-white">{avgUtilization}%</strong></span>
        <span>Membri: <strong className="text-gray-900 dark:text-white">{data.length}</strong></span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> &lt; 80%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> 80-100%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> &gt; 100%
        </span>
      </div>

      {/* Capacity bars */}
      <div className="space-y-3">
        {data.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
            Nessun dato disponibile
          </p>
        ) : (
          data.map((entry) => (
            <CapacityBar
              key={entry.userId}
              label={`${entry.firstName} ${entry.lastName}`}
              assignedHours={entry.assignedHours}
              loggedHours={entry.loggedHours}
              targetHours={entry.weeklyHoursTarget}
              overloaded={entry.overloaded}
            />
          ))
        )}
      </div>
    </div>
  )
}
