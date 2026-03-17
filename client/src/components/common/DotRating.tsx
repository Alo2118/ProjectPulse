import { cn } from '@/lib/utils'

interface DotRatingProps {
  value: number
  max?: number
  color?: string
  size?: 'sm' | 'md'
  className?: string
}

export function DotRating({
  value,
  max = 3,
  color = 'bg-foreground',
  size = 'sm',
  className,
}: DotRatingProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-full',
            size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2',
            i < value ? color : 'border border-muted-foreground/30'
          )}
        />
      ))}
    </div>
  )
}
