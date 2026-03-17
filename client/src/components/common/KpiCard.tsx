import type React from 'react'
import { cn } from '@/lib/utils'

export interface KpiCardProps {
  label: string
  value: string | number
  valueColor?: string
  sub?: string
  delta?: { value: string; direction: 'up' | 'down' }
  accentGradient?: string
  variant?: 'compact' | 'full'
  onClick?: () => void
  className?: string
}

export function KpiCard({
  label,
  value,
  valueColor,
  sub,
  delta,
  accentGradient,
  variant = 'compact',
  onClick,
  className,
}: KpiCardProps) {
  const isCompact = variant === 'compact'

  return (
    <div
      className={cn(
        // Mockup: .kpi-card — bg, border, radius, padding, overflow
        'pp-card kpi-accent card-hover',
        'bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius)]',
        'relative overflow-hidden',
        isCompact ? 'p-[11px_14px]' : 'p-5',
        onClick && 'cursor-pointer',
        className
      )}
      // kpi-accent::after reads --kpi-gradient for the 2px bottom bar
      style={
        accentGradient
          ? ({ '--kpi-gradient': accentGradient } as React.CSSProperties)
          : undefined
      }
      onClick={onClick}
    >
      {/* .kc-label: 10px uppercase muted */}
      <div className="text-kpi-label mb-1">
        {label}
      </div>

      {/* .kc-value + .kc-delta row */}
      <div className="flex items-baseline gap-1">
        <div
          className="text-kpi-value"
          style={valueColor ? { color: valueColor } : undefined}
        >
          {value}
        </div>
        {delta && (
          <span
            className={cn(
              'inline-flex items-center gap-[3px] text-[10px] font-semibold',
              'px-[5px] py-[1px] rounded-[3px] ml-[2px]',
              delta.direction === 'up'
                ? 'bg-[rgba(34,197,94,0.1)] text-[#4ade80]'
                : 'bg-[rgba(239,68,68,0.08)] text-[#f87171]'
            )}
          >
            {delta.direction === 'up' ? '▲' : '▼'} {delta.value}
          </span>
        )}
      </div>

      {/* .kc-sub: 10px muted below value */}
      {sub && (
        <div className="text-[10px] text-[var(--text-muted)] mt-[2px]">
          {sub}
        </div>
      )}
    </div>
  )
}
