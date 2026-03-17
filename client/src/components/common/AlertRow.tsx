import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AlertRowProps {
  severity: 'critical' | 'warning' | 'info'
  title: string
  subtitle?: string
  /** Project name shown as a compact tag on the right */
  projectName?: string
  time?: string
  onClick?: () => void
}

const severityConfig = {
  critical: {
    border: 'border-l-[3px] border-l-red-500/50',
    iconBg: 'bg-red-500/[0.12]',
    iconColor: 'text-[#f87171]',
    titleColor: 'text-[#f87171]',
    Icon: AlertTriangle,
  },
  warning: {
    border: 'border-l-[3px] border-l-orange-500/40',
    iconBg: 'bg-orange-500/[0.10]',
    iconColor: 'text-[#fb923c]',
    titleColor: 'text-[#fb923c]',
    Icon: AlertCircle,
  },
  info: {
    border: 'border-l-[3px] border-l-blue-500/30',
    iconBg: 'bg-blue-500/[0.10]',
    iconColor: 'text-[#60a5fa]',
    titleColor: 'text-foreground',
    Icon: Info,
  },
} as const

export function AlertRow({ severity, title, subtitle, projectName, time, onClick }: AlertRowProps) {
  const config = severityConfig[severity]
  const Icon = config.Icon

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
      className={cn(
        'flex items-center gap-3 px-4 py-[9px]',
        'border-b border-border/40 last:border-b-0',
        'transition-colors duration-[120ms]',
        onClick && 'cursor-pointer hover:bg-accent/5',
        config.border,
      )}
    >
      {/* Severity icon */}
      <div
        className={cn(
          'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[4px]',
          config.iconBg,
          config.iconColor,
        )}
      >
        <Icon className="h-[11px] w-[11px]" strokeWidth={2.5} />
      </div>

      {/* Text content */}
      <div className="min-w-0 flex-1">
        <div className={cn('truncate text-[12px] font-semibold leading-tight', config.titleColor)}>
          {title}
        </div>
        {subtitle && (
          <div className="mt-[1px] truncate text-[11px] text-muted-foreground leading-tight">
            {subtitle}
          </div>
        )}
      </div>

      {/* Project tag */}
      {projectName && (
        <div className="max-w-[110px] shrink-0 truncate text-[10px] text-muted-foreground">
          {projectName}
        </div>
      )}

      {/* Time */}
      {time && (
        <div className="w-[52px] shrink-0 text-right text-[10px] text-muted-foreground">
          {time}
        </div>
      )}
    </div>
  )
}
