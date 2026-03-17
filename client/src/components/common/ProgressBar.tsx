import { cn } from '@/lib/utils'
import { DOMAIN_COLORS } from '@/lib/constants'

// --- Types ---

export interface ProgressBarProps {
  value: number              // 0–100
  size?: 'thin' | 'standard' | 'full'  // 3px | 5px | 6px
  gradient?: string          // CSS gradient string (e.g. from DOMAIN_COLORS[x].gradient)
  color?: string             // fallback solid color if no gradient
  showLabel?: boolean        // show "72%" text
  className?: string
}

// --- Size map ---

const SIZE_HEIGHT: Record<NonNullable<ProgressBarProps['size']>, number> = {
  thin: 3,
  standard: 5,
  full: 6,
}

// --- Component ---

export function ProgressBar({
  value,
  size = 'standard',
  gradient,
  color,
  showLabel = false,
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  const height = SIZE_HEIGHT[size]

  const fillBackground = gradient ?? color ?? DOMAIN_COLORS.project.gradient

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Track */}
      <div
        className="relative w-full overflow-hidden rounded-full"
        style={{
          height: `${height}px`,
          background: 'var(--bg-elevated, hsl(var(--muted)))',
          borderRadius: '99px',
        }}
      >
        {/* Fill */}
        <div
          className="pp-progress-fill h-full"
          style={{
            width: `${clamped}%`,
            background: fillBackground,
            borderRadius: '99px',
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
          }}
        />
      </div>

      {/* Optional label */}
      {showLabel && (
        <span
          className="shrink-0 tabular-nums"
          style={{
            fontSize: '10px',
            fontWeight: 600,
            color: 'var(--text-secondary, hsl(var(--muted-foreground)))',
            marginLeft: '2px',
          }}
        >
          {clamped}%
        </span>
      )}
    </div>
  )
}

// --- Convenience helpers ---

/** Returns the gradient string for a named domain context */
export function getDomainGradient(
  domain: keyof typeof DOMAIN_COLORS
): string {
  return DOMAIN_COLORS[domain]?.gradient ?? DOMAIN_COLORS.project.gradient
}
