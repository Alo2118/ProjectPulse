/**
 * Circular Progress - Animated circular progress indicator
 * @module components/reports/CircularProgress
 */

interface CircularProgressProps {
  percentage: number
  size?: number
  strokeWidth?: number
  label?: string
  color?: string
  showPercentage?: boolean
}

export function CircularProgress({
  percentage,
  size = 120,
  strokeWidth = 8,
  label,
  color = '#3b82f6',
  showPercentage = true,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-gray-200 dark:stroke-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="fill-none transition-all duration-1000 ease-out"
          style={{ stroke: color }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        {showPercentage && (
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {Math.round(percentage)}%
          </span>
        )}
        {label && (
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {label}
          </span>
        )}
      </div>
    </div>
  )
}
