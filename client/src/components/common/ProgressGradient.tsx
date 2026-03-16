import { cn } from '@/lib/utils'
import { CONTEXT_GRADIENTS, type ContextGradient } from '@/lib/constants'

interface ProgressGradientProps {
  value: number
  context?: ContextGradient
  height?: 'sm' | 'md'
  showLabel?: boolean
  className?: string
}

export function ProgressGradient({
  value,
  context = 'project',
  height = 'sm',
  showLabel = false,
  className,
}: ProgressGradientProps) {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-muted',
          height === 'sm' ? 'h-[3px]' : 'h-1.5'
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500 ease-out progress-shine',
            CONTEXT_GRADIENTS[context]
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
          {clamped}%
        </span>
      )}
    </div>
  )
}
