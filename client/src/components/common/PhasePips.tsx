import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type PipStatus = 'done' | 'current' | 'upcoming' | 'late'

export interface PhasePip {
  key: string
  label: string
  status: PipStatus
}

interface PhasePipsProps {
  phases: PhasePip[]
  currentLabel?: string
  compact?: boolean
  className?: string
}

const pipColors: Record<PipStatus, string> = {
  done: 'bg-green-500',
  current: 'bg-primary shadow-glow-sm',
  upcoming: 'border border-muted-foreground/30 bg-transparent',
  late: 'bg-orange-500',
}

const pillColors: Record<PipStatus, string> = {
  done: 'bg-green-500/10 text-green-500 border-green-500/25',
  current: 'bg-primary/10 text-primary border-primary/25',
  upcoming: 'bg-muted text-muted-foreground border-border',
  late: 'bg-orange-500/10 text-orange-500 border-orange-500/25',
}

const connectorColors: Record<string, string> = {
  done: 'bg-green-500',
  mid: 'bg-gradient-to-r from-green-500 to-border',
  off: 'bg-border',
}

export function PhasePips({ phases, currentLabel, compact = true, className }: PhasePipsProps) {
  if (compact) {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <div className="flex items-center gap-1">
          {phases.map((p) => (
            <div key={p.key} className={cn('h-1 w-3 rounded-full', pipColors[p.status])} />
          ))}
        </div>
        {currentLabel && (
          <span className="text-[10px] text-muted-foreground">{currentLabel}</span>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-0', className)}>
      {phases.map((p, i) => (
        <div key={p.key} className="flex items-center">
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-md border px-3 py-1 text-[11px] font-medium',
              pillColors[p.status]
            )}
          >
            {p.status === 'done' && <Check className="h-3 w-3" />}
            {p.status === 'current' && <div className="h-2 w-2 rounded-full bg-current" />}
            {p.label}
          </div>
          {i < phases.length - 1 && (
            <div
              className={cn(
                'h-px w-6',
                p.status === 'done' && phases[i + 1]?.status === 'done'
                  ? connectorColors.done
                  : p.status === 'done'
                    ? connectorColors.mid
                    : connectorColors.off
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}
