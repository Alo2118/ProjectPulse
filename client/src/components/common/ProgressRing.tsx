import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/stores/themeStore'

// --- Types ---

interface ProgressRingProps {
  value: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  showValue?: boolean
  total?: number
  completed?: number
  animated?: boolean
  colorMode?: 'auto' | 'primary' | 'success' | 'warning' | 'destructive'
  className?: string
}

// --- Constants ---

const SIZE_MAP = {
  sm: { px: 32, fontSize: 'text-[10px]' },
  md: { px: 48, fontSize: 'text-xs' },
  lg: { px: 72, fontSize: 'text-sm' },
} as const

const STROKE_WIDTH_MAP = {
  'office-classic': 3,
  'asana-like': 4,
  'tech-hud': 2,
} as const

// --- Helper ---

function getProgressColor(value: number, colorMode: ProgressRingProps['colorMode']): string {
  if (colorMode === 'primary') return 'hsl(var(--primary))'
  if (colorMode === 'success') return 'hsl(var(--success))'
  if (colorMode === 'warning') return 'hsl(var(--warning))'
  if (colorMode === 'destructive') return 'hsl(var(--destructive))'
  // auto
  if (value <= 33) return 'hsl(var(--destructive))'
  if (value <= 66) return 'hsl(var(--warning))'
  return 'hsl(var(--success))'
}

// --- Component ---

export function ProgressRing({
  value,
  size = 'md',
  showLabel = false,
  showValue = false,
  total,
  completed,
  animated = true,
  colorMode = 'auto',
  className,
}: ProgressRingProps) {
  const theme = useThemeStore((s) => s.theme)

  const clampedValue = Math.min(100, Math.max(0, value))
  const { px, fontSize } = SIZE_MAP[size]
  const strokeWidth = STROKE_WIDTH_MAP[theme]
  const radius = (px - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const targetOffset = circumference * (1 - clampedValue / 100)
  const center = px / 2

  const progressColor = useMemo(
    () => getProgressColor(clampedValue, colorMode),
    [clampedValue, colorMode]
  )

  // Theme-specific SVG attributes
  const strokeLinecap = theme === 'tech-hud' ? 'butt' : 'round'

  const glowFilter = useMemo(() => {
    if (theme === 'tech-hud') {
      return (
        <defs>
          <filter id="pp-ring-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )
    }
    if (theme === 'asana-like') {
      return (
        <defs>
          <filter id="pp-ring-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.15" />
          </filter>
        </defs>
      )
    }
    return null
  }, [theme])

  const filterAttr = theme === 'tech-hud'
    ? 'url(#pp-ring-glow)'
    : theme === 'asana-like'
    ? 'url(#pp-ring-shadow)'
    : undefined

  return (
    <div className={cn('inline-flex flex-col items-center gap-1', className)}>
      <svg
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
        role="img"
        aria-label={`Progress: ${clampedValue}%`}
      >
        {glowFilter}

        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />

        {/* Progress arc */}
        {animated ? (
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={progressColor}
            strokeWidth={strokeWidth}
            strokeLinecap={strokeLinecap as 'round' | 'butt'}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: targetOffset }}
            transition={{ type: 'spring', stiffness: 60, damping: 15, delay: 0.1 }}
            transform={`rotate(-90 ${center} ${center})`}
            filter={filterAttr}
          />
        ) : (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={progressColor}
            strokeWidth={strokeWidth}
            strokeLinecap={strokeLinecap as 'round' | 'butt'}
            strokeDasharray={circumference}
            strokeDashoffset={targetOffset}
            transform={`rotate(-90 ${center} ${center})`}
            filter={filterAttr}
          />
        )}

        {/* Center label */}
        {showLabel && (
          <text
            x={center}
            y={center}
            dominantBaseline="central"
            textAnchor="middle"
            className={cn(fontSize, 'fill-foreground font-semibold')}
            style={{ fill: 'hsl(var(--foreground))' }}
          >
            {clampedValue}%
          </text>
        )}
      </svg>

      {/* X/Y label below */}
      {showValue && typeof total === 'number' && typeof completed === 'number' && (
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {completed}/{total}
        </span>
      )}
    </div>
  )
}
