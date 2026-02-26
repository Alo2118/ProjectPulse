import { useMemo } from 'react'
import { formatHoursFromDecimal } from '@utils/dateFormatters'

interface CapacityBarProps {
  label: string
  assignedHours: number
  loggedHours: number
  targetHours: number
  overloaded: boolean
  compact?: boolean
}

export function CapacityBar({ label, assignedHours, loggedHours, targetHours, overloaded, compact }: CapacityBarProps) {
  const utilizationPercent = useMemo(
    () => (targetHours > 0 ? Math.round((assignedHours / targetHours) * 100) : 0),
    [assignedHours, targetHours]
  )

  const loggedPercent = useMemo(
    () => (targetHours > 0 ? Math.min(Math.round((loggedHours / targetHours) * 100), 100) : 0),
    [loggedHours, targetHours]
  )

  const barColor = overloaded
    ? 'bg-red-500 dark:bg-red-400'
    : utilizationPercent >= 80
      ? 'bg-amber-500 dark:bg-amber-400'
      : 'bg-emerald-500 dark:bg-emerald-400'

  const loggedColor = 'bg-blue-400/50 dark:bg-blue-500/40'

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      <div className="flex items-center justify-between">
        <span className={`font-medium text-gray-700 dark:text-gray-300 ${compact ? 'text-xs' : 'text-sm'}`}>
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${compact ? 'text-xs' : 'text-sm'} ${
            overloaded ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
          }`}>
            {formatHoursFromDecimal(assignedHours)} / {formatHoursFromDecimal(targetHours)}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
            overloaded
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : utilizationPercent >= 80
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          }`}>
            {utilizationPercent}%
          </span>
        </div>
      </div>
      <div className="relative h-2.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
        {/* Logged hours (actual) */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${loggedColor}`}
          style={{ width: `${loggedPercent}%` }}
        />
        {/* Assigned hours (planned) */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(utilizationPercent, 100)}%`, opacity: 0.7 }}
        />
        {/* Overflow indicator */}
        {utilizationPercent > 100 && (
          <div className="absolute inset-y-0 right-0 w-1 bg-red-600 dark:bg-red-400 animate-pulse rounded-full" />
        )}
      </div>
    </div>
  )
}
