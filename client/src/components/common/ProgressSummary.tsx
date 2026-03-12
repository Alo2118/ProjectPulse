import { cn } from '@/lib/utils'
import { ProgressRing } from './ProgressRing'
import { StatusDistribution, type StatusDistributionItem } from './StatusDistribution'
import { TrendSparkline } from './TrendSparkline'

// --- Types ---

interface ProgressSummaryProps {
  progress: number
  total: number
  completed: number
  statusBreakdown: StatusDistributionItem[]
  trend?: number[]
  className?: string
}

// --- Component ---

export function ProgressSummary({
  progress,
  total,
  completed,
  statusBreakdown,
  trend,
  className,
}: ProgressSummaryProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-4">
        <ProgressRing value={progress} size="lg" showLabel />
        <div>
          <p className="text-sm font-medium text-foreground">
            {completed} di {total} completati
          </p>
          <p className="text-xs text-muted-foreground">{progress}% completamento</p>
        </div>
      </div>

      <StatusDistribution
        items={statusBreakdown}
        total={total}
        variant="bar"
        size="sm"
        showLegend
      />

      {trend && trend.length > 1 && (
        <TrendSparkline data={trend} size="sm" showDelta showArea />
      )}
    </div>
  )
}
