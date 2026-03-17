import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KpiCard } from './KpiCard'
import type { ContextGradient } from '@/lib/constants'
import { motion } from 'framer-motion'

// Gradient CSS variable map — used by kpi-accent::after via --kpi-gradient
const kpiGradientVars: Record<string, string> = {
  project: 'var(--gradient-project)',
  milestone: 'var(--gradient-milestone)',
  task: 'var(--gradient-task)',
  success: 'var(--gradient-success)',
  warning: 'var(--gradient-warning)',
  danger: 'var(--gradient-danger)',
  indigo: 'var(--gradient-indigo)',
}

/** KpiCard data shape — used by all pages */
export interface KpiCard {
  label: string
  value: string | number
  /** Trend/delta — direction drives ▲/▼ arrow and colour */
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' }
  subtitle?: string
  /** Context gradient key — maps to --gradient-* CSS var for accent bar */
  color: ContextGradient
  /** Optional icon (not rendered in compact strip layout) */
  icon?: LucideIcon
}

interface KpiStripProps {
  items?: KpiCard[]
  /** Backward-compat alias for items */
  cards?: KpiCard[]
  columns?: 4 | 5
  className?: string
}

export function KpiStrip({ items, cards, columns, className }: KpiStripProps) {
  const data = items ?? cards ?? []

  // Determine column count: explicit prop → infer from data length
  const cols = columns ?? (data.length <= 4 ? 4 : 5)

  return (
    <div
      className={cn(
        'grid gap-[10px]',
        // Responsive: single col on xs, 2 on sm, then full count on md+
        cols === 5
          ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'
          : 'grid-cols-2 md:grid-cols-4',
        className
      )}
    >
      {data.map((card, i) => {
        const accentGradient = kpiGradientVars[card.color] ?? 'var(--gradient-project)'

        // Map trend → delta (drop 'neutral' direction since KpiCard only has up/down)
        const delta =
          card.trend && card.trend.direction !== 'neutral'
            ? { value: card.trend.value, direction: card.trend.direction as 'up' | 'down' }
            : undefined

        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.22 }}
          >
            <KpiCard
              label={card.label}
              value={card.value}
              sub={card.subtitle}
              delta={delta}
              accentGradient={accentGradient}
              variant="compact"
            />
          </motion.div>
        )
      })}
    </div>
  )
}
