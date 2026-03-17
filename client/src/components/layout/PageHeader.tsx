import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  /** Optional domain badge (e.g. <DomainBadge>) shown above the title */
  domainBadge?: ReactNode
  /** Page title — 22px 700 DM Sans */
  title: string
  /** Optional subtitle shown below the title */
  subtitle?: string
  /** Action buttons shown on the right */
  actions?: ReactNode
  className?: string
}

/**
 * PageHeader — matches mockup .page-header
 *
 * padding: 14px 28px 16px
 * title: DM Sans 700 22px letter-spacing -0.3px color var(--text-primary)
 * subtitle: 13px color var(--text-secondary) margin-top 2px
 * actions: flex gap 8px align-items center
 */
export function PageHeader({
  domainBadge,
  title,
  subtitle,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn('flex items-start justify-between gap-4', className)}
      style={{ padding: '14px 28px 16px' }}
    >
      {/* Left: badge + title + subtitle */}
      <div className="min-w-0">
        {domainBadge && <div className="mb-1">{domainBadge}</div>}
        <h1
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: '22px',
            letterSpacing: '-0.3px',
            color: 'var(--text-primary)',
            lineHeight: 1.2,
          }}
          className="truncate"
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginTop: '2px',
            }}
            className="truncate"
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Right: actions */}
      {actions && (
        <div
          className="flex shrink-0 items-center"
          style={{ gap: '8px' }}
        >
          {actions}
        </div>
      )}
    </div>
  )
}
