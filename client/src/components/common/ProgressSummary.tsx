import { cn } from '@/lib/utils'
import { ProgressBar } from './ProgressBar'
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
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">
            {completed} di {total} completati
          </p>
          <span className="text-sm font-semibold tabular-nums text-foreground">{progress}%</span>
        </div>
        <ProgressBar value={progress} size="full" showLabel={false} />
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
