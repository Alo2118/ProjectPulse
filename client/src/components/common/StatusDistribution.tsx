import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/stores/themeStore'

// --- Types ---

export interface StatusDistributionItem {
  key: string
  label: string
  count: number
  color: string  // HSL string like 'hsl(217, 91%, 60%)'
}

interface StatusDistributionProps {
  items: StatusDistributionItem[]
  total: number
  variant?: 'bar' | 'donut'
  size?: 'sm' | 'md'
  showLegend?: boolean
  showCounts?: boolean
  animated?: boolean
  className?: string
}

// --- Bar Variant ---

function BarChart({
  items,
  total,
  size,
  animated,
  theme,
}: {
  items: StatusDistributionItem[]
  total: number
  size: 'sm' | 'md'
  animated: boolean
  theme: string
}) {
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5'
  const gapClass =
    theme === 'asana-like' ? 'gap-0.5' : theme === 'office-classic' ? 'gap-px' : 'gap-0'

  const filteredItems = items.filter((item) => item.count > 0)

  return (
    <div
      className={cn('flex w-full overflow-hidden', height, gapClass)}
      role="img"
      aria-label="Status distribution bar"
    >
      {filteredItems.map((item) => {
        const pct = total > 0 ? (item.count / total) * 100 : 0
        const roundedClass =
          theme === 'asana-like' ? 'rounded-full' : ''

        if (animated) {
          return (
            <motion.div
              key={item.key}
              className={cn('h-full', roundedClass)}
              style={{ backgroundColor: item.color }}
              initial={{ flex: 0 }}
              animate={{ flex: pct }}
              transition={{ type: 'spring', stiffness: 80, damping: 18, delay: 0.05 }}
              title={`${item.label}: ${item.count}`}
            />
          )
        }

        return (
          <div
            key={item.key}
            className={cn('h-full', roundedClass)}
            style={{ flex: pct, backgroundColor: item.color }}
            title={`${item.label}: ${item.count}`}
          />
        )
      })}
    </div>
  )
}

// --- Donut Variant ---

function DonutChart({
  items,
  total,
  size,
  animated,
}: {
  items: StatusDistributionItem[]
  total: number
  size: 'sm' | 'md'
  animated: boolean
}) {
  const svgSize = size === 'sm' ? 60 : 100
  const center = svgSize / 2
  const strokeWidth = size === 'sm' ? 8 : 14
  const radius = (svgSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  // Build segments: each item is a slice of the circumference
  const segments = useMemo(() => {
    if (total === 0) return []
    let offset = 0
    return items
      .filter((item) => item.count > 0)
      .map((item) => {
        const proportion = item.count / total
        const dash = proportion * circumference
        const gap = circumference - dash
        const segment = { ...item, dash, gap, offset }
        offset += dash
        return segment
      })
  }, [items, total, circumference])

  if (total === 0) {
    return (
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        aria-label="Empty status distribution"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
      </svg>
    )
  }

  return (
    <svg
      width={svgSize}
      height={svgSize}
      viewBox={`0 0 ${svgSize} ${svgSize}`}
      role="img"
      aria-label="Status distribution donut"
    >
      {segments.map((seg) => {
        const commonProps = {
          cx: center,
          cy: center,
          r: radius,
          fill: 'none' as const,
          stroke: seg.color,
          strokeWidth,
          strokeLinecap: 'butt' as const,
          strokeDasharray: `${seg.dash} ${seg.gap}`,
          transform: `rotate(-90 ${center} ${center})`,
        }

        if (animated) {
          return (
            <motion.circle
              key={seg.key}
              {...commonProps}
              initial={{ strokeDashoffset: -seg.offset, opacity: 0 }}
              animate={{ strokeDashoffset: -seg.offset, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            />
          )
        }

        return (
          <circle
            key={seg.key}
            {...commonProps}
            strokeDashoffset={-seg.offset}
          />
        )
      })}
    </svg>
  )
}

// --- Legend ---

function Legend({
  items,
  showCounts,
}: {
  items: StatusDistributionItem[]
  showCounts: boolean
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5">
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-foreground">{item.label}</span>
          {showCounts && (
            <span className="text-xs text-muted-foreground">({item.count})</span>
          )}
        </div>
      ))}
    </div>
  )
}

// --- Main Component ---

export function StatusDistribution({
  items,
  total,
  variant = 'bar',
  size = 'sm',
  showLegend = true,
  showCounts = true,
  animated = true,
  className,
}: StatusDistributionProps) {
  const theme = useThemeStore((s) => s.theme)

  return (
    <div className={cn('space-y-2', className)}>
      {variant === 'bar' ? (
        <BarChart
          items={items}
          total={total}
          size={size}
          animated={animated}
          theme={theme}
        />
      ) : (
        <DonutChart
          items={items}
          total={total}
          size={size}
          animated={animated}
        />
      )}
      {showLegend && <Legend items={items} showCounts={showCounts} />}
    </div>
  )
}
