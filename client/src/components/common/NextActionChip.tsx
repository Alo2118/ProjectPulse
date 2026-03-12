import { ArrowRight, Unlock, Check, BarChart3, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NEXT_ACTION_CONFIG, type NextAction } from '@/lib/constants'

const ACTION_ICONS = {
  advance: ArrowRight,
  unblock: Unlock,
  approve: Check,
  report: BarChart3,
  review: Eye,
} as const

interface NextActionChipProps {
  action: NextAction
  onClick: () => void
  size?: 'sm' | 'md'
  className?: string
}

export function NextActionChip({
  action,
  onClick,
  size = 'sm',
  className,
}: NextActionChipProps) {
  const config = NEXT_ACTION_CONFIG[action]
  const Icon = ACTION_ICONS[action]

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-medium transition-colors hover:opacity-80',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        config.color,
        className
      )}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {config.label}
    </button>
  )
}
