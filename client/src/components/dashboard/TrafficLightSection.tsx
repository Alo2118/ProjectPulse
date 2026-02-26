/**
 * TrafficLight Section - 4 large stat cards giving management a 3-second health overview.
 * Designed for the Direzione dashboard as the top-level status indicator.
 */

import { useMemo } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'

interface ProjectHealthEntry {
  projectId: string
  projectName: string
  healthStatus: 'healthy' | 'at_risk' | 'critical'
  progress: number
  tasksBlocked: number
  openRisks: number
}

interface TeamWorkloadEntry {
  utilizationPercent: number
}

interface TrafficLightSectionProps {
  projectHealth: ProjectHealthEntry[]
  teamWorkload: TeamWorkloadEntry[]
  isLoading?: boolean
}

// ---------------------------------------------------------------------------
// Card definition type — keeps the render loop clean and type-safe
// ---------------------------------------------------------------------------

interface CardConfig {
  id: string
  label: string
  icon: LucideIcon
  value: number | null
  suffix?: string
  wrapperClass: string
  borderClass: string
  numberClass: string
  iconClass: string
  iconBgClass: string
  emptyDisplay: string
}

// ---------------------------------------------------------------------------
// TrafficLightSection
// ---------------------------------------------------------------------------

export default function TrafficLightSection({
  projectHealth,
  teamWorkload,
  isLoading,
}: TrafficLightSectionProps) {
  const healthyCnt = useMemo(
    () => projectHealth.filter((p) => p.healthStatus === 'healthy').length,
    [projectHealth],
  )

  const atRiskCnt = useMemo(
    () => projectHealth.filter((p) => p.healthStatus === 'at_risk').length,
    [projectHealth],
  )

  const criticalCnt = useMemo(
    () => projectHealth.filter((p) => p.healthStatus === 'critical').length,
    [projectHealth],
  )

  const avgUtilization = useMemo<number | null>(() => {
    if (teamWorkload.length === 0) return null
    const sum = teamWorkload.reduce((acc, w) => acc + w.utilizationPercent, 0)
    return Math.round(sum / teamWorkload.length)
  }, [teamWorkload])

  // -------------------------------------------------------------------------
  // Skeleton loading state
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse h-24"
            aria-hidden="true"
          />
        ))}
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Card definitions — single source of truth for each traffic-light card
  // -------------------------------------------------------------------------

  const cards: CardConfig[] = [
    {
      id: 'healthy',
      label: 'Progetti in Salute',
      icon: CheckCircle,
      value: healthyCnt,
      wrapperClass: 'bg-emerald-50 dark:bg-emerald-900/20',
      borderClass: 'border-emerald-200 dark:border-emerald-800',
      numberClass: 'text-emerald-600 dark:text-emerald-400',
      iconClass: 'text-emerald-500 dark:text-emerald-400',
      iconBgClass: 'bg-emerald-100 dark:bg-emerald-800/40',
      emptyDisplay: '0',
    },
    {
      id: 'at_risk',
      label: 'A Rischio',
      icon: AlertTriangle,
      value: atRiskCnt,
      wrapperClass: 'bg-amber-50 dark:bg-amber-900/20',
      borderClass: 'border-amber-200 dark:border-amber-800',
      numberClass: 'text-amber-600 dark:text-amber-400',
      iconClass: 'text-amber-500 dark:text-amber-400',
      iconBgClass: 'bg-amber-100 dark:bg-amber-800/40',
      emptyDisplay: '0',
    },
    {
      id: 'critical',
      label: 'Critici',
      icon: XCircle,
      value: criticalCnt,
      wrapperClass: 'bg-red-50 dark:bg-red-900/20',
      borderClass: 'border-red-200 dark:border-red-800',
      numberClass: 'text-red-600 dark:text-red-400',
      iconClass: 'text-red-500 dark:text-red-400',
      iconBgClass: 'bg-red-100 dark:bg-red-800/40',
      emptyDisplay: '0',
    },
    {
      id: 'utilization',
      label: 'Utilizzo Team',
      icon: Users,
      value: avgUtilization,
      suffix: '%',
      wrapperClass: 'bg-blue-50 dark:bg-blue-900/20',
      borderClass: 'border-blue-200 dark:border-blue-800',
      numberClass: 'text-blue-600 dark:text-blue-400',
      iconClass: 'text-blue-500 dark:text-blue-400',
      iconBgClass: 'bg-blue-100 dark:bg-blue-800/40',
      emptyDisplay: '\u2014',
    },
  ]

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      role="region"
      aria-label="Riepilogo salute progetti"
    >
      {cards.map((card) => {
        const Icon = card.icon
        const hasValue = card.value !== null

        return (
          <div
            key={card.id}
            className={[
              'rounded-xl border p-5',
              'hover:shadow-md transition-shadow duration-200',
              card.wrapperClass,
              card.borderClass,
            ].join(' ')}
          >
            {/* Top row: icon (left) + number (right) */}
            <div className="flex items-start justify-between gap-3">
              {/* Icon badge */}
              <div
                className={[
                  'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
                  card.iconBgClass,
                ].join(' ')}
                aria-hidden="true"
              >
                <Icon className={['w-5 h-5', card.iconClass].join(' ')} />
              </div>

              {/* Dominant number */}
              <div
                className="flex items-baseline gap-0.5"
                aria-label={
                  hasValue
                    ? `${card.label}: ${card.value}${card.suffix ?? ''}`
                    : `${card.label}: dati non disponibili`
                }
              >
                {hasValue ? (
                  <>
                    <AnimatedCounter
                      value={card.value as number}
                      className={[
                        'text-3xl font-bold leading-none tabular-nums',
                        card.numberClass,
                      ].join(' ')}
                    />
                    {card.suffix && (
                      <span
                        className={[
                          'text-2xl font-semibold leading-none',
                          card.numberClass,
                        ].join(' ')}
                      >
                        {card.suffix}
                      </span>
                    )}
                  </>
                ) : (
                  <span
                    className={[
                      'text-3xl font-bold leading-none',
                      card.numberClass,
                    ].join(' ')}
                  >
                    {card.emptyDisplay}
                  </span>
                )}
              </div>
            </div>

            {/* Label row */}
            <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-400 leading-tight">
              {card.label}
            </p>
          </div>
        )
      })}
    </div>
  )
}
