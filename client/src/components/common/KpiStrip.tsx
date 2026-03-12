import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { CONTEXT_GRADIENTS, type ContextGradient } from '@/lib/constants'
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

export function KpiStrip({ cards, className }: KpiStripProps) {
  return (
    <div
      className={cn(
        'grid gap-3',
        cards.length <= 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
        className
      )}
    >
      {cards.map((card, i) => {
        const TrendIcon = card.trend ? trendIcons[card.trend.direction] : null
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.22 }}
          >
            <Card className="relative overflow-hidden p-4 transition-all hover:-translate-y-px hover:border-primary/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </span>
                {card.icon && <card.icon className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="mt-2 font-heading text-2xl font-extrabold tracking-tight">
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
              {/* Bottom accent bar */}
              <div className={cn('absolute bottom-0 left-0 h-0.5 w-full', CONTEXT_GRADIENTS[card.color])} />
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
