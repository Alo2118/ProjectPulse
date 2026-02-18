/**
 * Progress Bar - Enhanced progress bar with labels and animations
 * @module components/reports/ProgressBar
 */

interface ProgressBarProps {
  label: string
  value: number
  max: number
  color?: string
  showValue?: boolean
  showPercentage?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ProgressBar({
  label,
  value,
  max,
  color = 'bg-blue-500',
  showValue = true,
  showPercentage = true,
  size = 'md',
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0

  const heightClass = {
    sm: 'h-2',
    md: 'h-2.5',
    lg: 'h-3',
  }[size]

  return (
    <div>
      <div className="flex justify-between items-center text-sm mb-1.5">
        <span className="text-gray-700 dark:text-gray-300 font-medium truncate mr-2">
          {label}
        </span>
        <div className="flex items-center gap-2 whitespace-nowrap">
          {showValue && (
            <span className="text-gray-500 dark:text-gray-400">
              {value} / {max}
            </span>
          )}
          {showPercentage && (
            <span className="text-gray-600 dark:text-gray-300 font-semibold">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      </div>
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${heightClass} overflow-hidden`}>
        <div
          className={`${heightClass} rounded-full ${color} transition-all duration-1000 ease-out shadow-sm`}
          style={{ width: `${Math.max(percentage, 2)}%` }}
        />
      </div>
    </div>
  )
}
