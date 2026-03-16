import type React from 'react'
import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import type { ContextGradient } from '@/lib/constants'
import { motion } from 'framer-motion'

export interface KpiCard {
  label: string
  value: string | number
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' }
  subtitle?: string
  color: ContextGradient
  icon?: LucideIcon
}

interface KpiStripProps {
  cards: KpiCard[]
  className?: string
}

const trendIcons = { up: TrendingUp, down: TrendingDown, neutral: Minus }
const trendColors = {
  up: 'text-green-500',
  down: 'text-red-500',
  neutral: 'text-muted-foreground',
}

// Map ContextGradient keys to CSS variable names for --kpi-gradient
const kpiGradientVars: Record<string, string> = {
  project: 'var(--gradient-project)',
  milestone: 'var(--gradient-milestone)',
  task: 'var(--gradient-task)',
  success: 'var(--gradient-success)',
  warning: 'var(--gradient-warning)',
  danger: 'var(--gradient-danger)',
  indigo: 'var(--gradient-indigo)',
}

export function KpiStrip({ cards, className }: KpiStripProps) {
  return (
    <div
      className={cn(
        'grid gap-[10px]',
        cards.length <= 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
        className
      )}
    >
      {cards.map((card, i) => {
        const TrendIcon = card.trend ? trendIcons[card.trend.direction] : null
        const gradientVar = kpiGradientVars[card.color] ?? 'var(--gradient-project)'
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.22 }}
          >
            <Card
              className="kpi-accent card-hover p-4"
              style={{ '--kpi-gradient': gradientVar } as React.CSSProperties}
            >
              <div className="flex items-center justify-between">
                <span className="text-kpi-label">
                  {card.label}
                </span>
                {card.icon && <card.icon className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="text-kpi-value-lg mt-2">
                {card.value}
              </div>
              {(card.trend || card.subtitle) && (
                <div className="mt-1 flex items-center gap-1.5">
                  {card.trend && TrendIcon && (
                    <span className={cn('flex items-center gap-0.5 text-[11px] font-medium', trendColors[card.trend.direction])}>
                      <TrendIcon className="h-3 w-3" />
                      {card.trend.value}
                    </span>
                  )}
                  {card.subtitle && (
                    <span className="text-[11px] text-muted-foreground">{card.subtitle}</span>
                  )}
                </div>
              )}
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
