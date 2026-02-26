/**
 * PeriodSelector - Toggle button group for selecting a time period
 * Options: 7 days (Settimana), 30 days (Mese), 90 days (3 Mesi)
 */

interface PeriodSelectorProps {
  value: number
  onChange: (days: number) => void
}

interface Period {
  label: string
  days: number
}

const PERIODS: Period[] = [
  { label: 'Settimana', days: 7 },
  { label: 'Mese', days: 30 },
  { label: '3 Mesi', days: 90 },
]

export default function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="inline-flex" role="group" aria-label="Seleziona periodo">
      {PERIODS.map((period, index) => {
        const isActive = value === period.days
        const isFirst = index === 0
        const isLast = index === PERIODS.length - 1

        const roundingClass = isFirst
          ? 'rounded-l-lg'
          : isLast
            ? 'rounded-r-lg'
            : ''

        const borderClass = isFirst
          ? 'border border-gray-200 dark:border-gray-700'
          : 'border-t border-b border-r border-slate-200 dark:border-slate-700'

        const activeClass = isActive
          ? 'bg-cyan-600 text-white dark:bg-cyan-500 shadow-sm'
          : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'

        return (
          <button
            key={period.days}
            type="button"
            onClick={() => onChange(period.days)}
            aria-pressed={isActive}
            className={[
              'text-xs px-3 py-1.5 font-medium',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset',
              roundingClass,
              borderClass,
              activeClass,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {period.label}
          </button>
        )
      })}
    </div>
  )
}
