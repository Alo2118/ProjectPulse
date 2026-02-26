interface ProgressBarProps {
  value: number
  size?: 'sm' | 'md' | 'lg'
  color?: 'auto' | 'green' | 'amber' | 'red' | 'blue'
  animated?: boolean
  showLabel?: boolean
  glow?: boolean
  className?: string
}

const HEIGHT = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' } as const
const LABEL_SIZE = { sm: 'text-[10px]', md: 'text-xs', lg: 'text-sm' } as const

function getColor(value: number, color: ProgressBarProps['color']) {
  if (color && color !== 'auto') {
    const map = {
      green: 'from-green-500 to-emerald-400',
      amber: 'from-amber-500 to-yellow-400',
      red: 'from-red-500 to-rose-400',
      blue: 'from-blue-500 to-cyan-400',
    }
    return map[color]
  }
  if (value >= 66) return 'from-green-500 to-emerald-400'
  if (value >= 33) return 'from-amber-500 to-yellow-400'
  return 'from-red-500 to-rose-400'
}

function getGlowColor(value: number) {
  if (value >= 66) return 'shadow-glow-green'
  if (value >= 33) return 'shadow-glow-amber'
  return 'shadow-glow-red'
}

export function ProgressBar({
  value,
  size = 'md',
  color = 'auto',
  animated = true,
  showLabel = false,
  glow = false,
  className = '',
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  const gradientColor = getColor(clamped, color)
  const height = HEIGHT[size]

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`flex-1 ${height} rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden ${
          glow && clamped < 20 ? getGlowColor(clamped) : ''
        }`}
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradientColor} ${
            animated ? 'transition-all duration-700 ease-out' : ''
          } ${glow && clamped < 20 ? 'animate-pulse' : ''}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className={`${LABEL_SIZE[size]} font-semibold text-slate-600 dark:text-slate-400 min-w-[2.5rem] text-right`}>
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  )
}
