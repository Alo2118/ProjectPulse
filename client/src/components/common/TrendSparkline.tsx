import { useMemo, useId } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/stores/themeStore'

// --- Types ---

interface TrendSparklineProps {
  data: number[]
  size?: 'sm' | 'md'
  color?: string
  showDelta?: boolean
  showArea?: boolean
  showPoints?: boolean
  animated?: boolean
  className?: string
}

// --- Constants ---

const SIZE_MAP = {
  sm: { w: 80, h: 24 },
  md: { w: 200, h: 60 },
} as const

const PADDING = 4

// --- Helpers ---

function normalizePoints(
  data: number[],
  width: number,
  height: number
): { x: number; y: number }[] {
  if (data.length < 2) return []
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const innerW = width - PADDING * 2
  const innerH = height - PADDING * 2

  return data.map((v, i) => ({
    x: PADDING + (i / (data.length - 1)) * innerW,
    y: PADDING + (1 - (v - min) / range) * innerH,
  }))
}

function pointsToPolyline(pts: { x: number; y: number }[]): string {
  return pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
}

function pointsToPolygon(pts: { x: number; y: number }[], height: number): string {
  if (pts.length < 2) return ''
  const first = pts[0]
  const last = pts[pts.length - 1]
  const bottomLeft = `${first.x.toFixed(2)},${(height - PADDING).toFixed(2)}`
  const bottomRight = `${last.x.toFixed(2)},${(height - PADDING).toFixed(2)}`
  return `${pointsToPolyline(pts)} ${bottomRight} ${bottomLeft}`
}

function calcDeltaPct(data: number[]): number | null {
  if (data.length < 2) return null
  const first = data[0]
  const last = data[data.length - 1]
  if (first === 0) return null
  return ((last - first) / Math.abs(first)) * 100
}

// --- Component ---

export function TrendSparkline({
  data,
  size = 'sm',
  color = 'hsl(var(--primary))',
  showDelta = false,
  showArea = false,
  showPoints = false,
  animated = true,
  className,
}: TrendSparklineProps) {
  const theme = useThemeStore((s) => s.theme)
  const gradientId = useId()
  const filterId = useId()

  const { w, h } = SIZE_MAP[size]

  const strokeWidth =
    theme === 'tech-hud' ? 1 : theme === 'asana-like' ? 2 : 1.5

  const pts = useMemo(() => normalizePoints(data, w, h), [data, w, h])
  const polylinePoints = useMemo(() => pointsToPolyline(pts), [pts])
  const polygonPoints = useMemo(() => pointsToPolygon(pts, h), [pts, h])

  const deltaPct = useMemo(() => calcDeltaPct(data), [data])

  // Polyline total length approximation for dash animation
  const totalLength = useMemo(() => {
    let len = 0
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x
      const dy = pts[i].y - pts[i - 1].y
      len += Math.sqrt(dx * dx + dy * dy)
    }
    return len
  }, [pts])

  const glowFilter = theme === 'tech-hud' ? (
    <filter id={filterId} x="-20%" y="-50%" width="140%" height="200%">
      <feGaussianBlur stdDeviation="1.5" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  ) : null

  const filterAttr = theme === 'tech-hud' ? `url(#${filterId})` : undefined

  if (pts.length < 2) return null

  return (
    <div className={cn('inline-flex flex-col gap-1', className)}>
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Trend sparkline"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          {glowFilter}
        </defs>

        {/* Area fill */}
        {showArea && (
          <polygon
            points={polygonPoints}
            fill={`url(#${gradientId})`}
          />
        )}

        {/* Line */}
        {animated ? (
          <motion.polyline
            points={polylinePoints}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={filterAttr}
            initial={{ strokeDashoffset: totalLength, strokeDasharray: totalLength }}
            animate={{ strokeDashoffset: 0, strokeDasharray: totalLength }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        ) : (
          <polyline
            points={polylinePoints}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={filterAttr}
          />
        )}

        {/* Data points (md only) */}
        {showPoints && size === 'md' &&
          pts.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={2.5}
              fill={color}
              stroke="hsl(var(--background))"
              strokeWidth={1}
            />
          ))}
      </svg>

      {/* Delta badge */}
      {showDelta && deltaPct !== null && (
        <DeltaBadge value={deltaPct} />
      )}
    </div>
  )
}

// --- Delta badge sub-component ---

function DeltaBadge({ value }: { value: number }) {
  const rounded = Math.abs(value).toFixed(1)

  if (value > 0) {
    return (
      <div className="flex items-center gap-0.5 text-[10px] font-medium text-success">
        <TrendingUp className="h-3 w-3" />
        <span>+{rounded}%</span>
      </div>
    )
  }
  if (value < 0) {
    return (
      <div className="flex items-center gap-0.5 text-[10px] font-medium text-destructive">
        <TrendingDown className="h-3 w-3" />
        <span>-{rounded}%</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
      <Minus className="h-3 w-3" />
      <span>{rounded}%</span>
    </div>
  )
}
