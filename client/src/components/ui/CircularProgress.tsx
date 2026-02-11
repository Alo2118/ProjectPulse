interface CircularProgressProps {
  value: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  strokeWidth?: number
  color?: 'auto' | 'green' | 'amber' | 'red' | 'blue' | 'primary'
  showLabel?: boolean
  animated?: boolean
  className?: string
}

const SIZE_MAP = { sm: 40, md: 60, lg: 80, xl: 100 } as const
const STROKE_MAP = { sm: 4, md: 5, lg: 6, xl: 8 } as const
const FONT_SIZE_MAP = { sm: 'text-xs', md: 'text-sm', lg: 'text-lg', xl: 'text-xl' } as const

function getColor(value: number, color: CircularProgressProps['color']) {
  if (color && color !== 'auto') {
    const map = {
      green: 'stroke-green-500',
      amber: 'stroke-amber-500',
      red: 'stroke-red-500',
      blue: 'stroke-blue-500',
      primary: 'stroke-primary-500',
    }
    return map[color]
  }
  if (value >= 66) return 'stroke-green-500'
  if (value >= 33) return 'stroke-amber-500'
  return 'stroke-red-500'
}

export function CircularProgress({
  value,
  size = 'md',
  strokeWidth,
  color = 'auto',
  showLabel = true,
  animated = true,
  className = '',
}: CircularProgressProps) {
  const clamped = Math.max(0, Math.min(100, value))
  const diameter = SIZE_MAP[size]
  const stroke = strokeWidth ?? STROKE_MAP[size]
  const radius = (diameter - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference
  const colorClass = getColor(clamped, color)

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={diameter} height={diameter} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-gray-200 dark:stroke-surface-700"
        />
        {/* Progress circle */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${colorClass} ${animated ? 'transition-all duration-700 ease-out' : ''}`}
        />
      </svg>
      {showLabel && (
        <span
          className={`absolute ${FONT_SIZE_MAP[size]} font-bold text-gray-900 dark:text-white`}
        >
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  )
}
