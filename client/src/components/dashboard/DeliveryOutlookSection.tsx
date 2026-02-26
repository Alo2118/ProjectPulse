/**
 * Delivery Outlook Section - Forward-looking project delivery forecast
 * Shows predicted delays and completion confidence for the direzione dashboard.
 */

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, CheckCircle, AlertTriangle, XCircle, ArrowRight } from 'lucide-react'
import type { DeliveryForecast } from '@/types'

interface DeliveryOutlookSectionProps {
  forecasts: DeliveryForecast[]
  isLoading?: boolean
}

// Italian month abbreviations (index 0 = January)
const IT_MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'] as const

function formatItalianDate(dateString: string): string {
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return ''
  const day = d.getDate()
  const month = IT_MONTHS[d.getMonth()]
  return `Scade il ${day} ${month}`
}

// Health indicator dot color
function getHealthDotClass(health: DeliveryForecast['healthStatus']): string {
  switch (health) {
    case 'healthy':
      return 'bg-emerald-500'
    case 'at_risk':
      return 'bg-amber-500'
    case 'critical':
      return 'bg-red-500'
  }
}

// Progress bar fill color keyed to health
function getProgressBarClass(health: DeliveryForecast['healthStatus']): string {
  switch (health) {
    case 'healthy':
      return 'bg-emerald-500'
    case 'at_risk':
      return 'bg-amber-500'
    case 'critical':
      return 'bg-red-500'
  }
}

interface DelayBadgeConfig {
  label: string
  icon: React.ReactNode
  className: string
}

function getDelayBadge(
  predictedDelay: number | null,
  healthStatus: DeliveryForecast['healthStatus'],
): DelayBadgeConfig {
  // No velocity data — cannot forecast
  if (predictedDelay === null) {
    return {
      label: 'Dati insufficienti',
      icon: null,
      className:
        'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    }
  }

  // Ahead of schedule
  if (predictedDelay < 0) {
    return {
      label: `In anticipo di ${Math.abs(predictedDelay)}gg`,
      icon: <CheckCircle className="w-3 h-3 flex-shrink-0" />,
      className:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    }
  }

  // On time (delay === 0) or null with healthy project
  if (predictedDelay === 0 && healthStatus === 'healthy') {
    return {
      label: 'In tempo',
      icon: <CheckCircle className="w-3 h-3 flex-shrink-0" />,
      className:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    }
  }

  // On time (0) but not healthy — treat as minor risk
  if (predictedDelay === 0) {
    return {
      label: 'In tempo',
      icon: <CheckCircle className="w-3 h-3 flex-shrink-0" />,
      className:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    }
  }

  // Moderate delay (1–7 days)
  if (predictedDelay > 0 && predictedDelay <= 7) {
    return {
      label: `Possibile ritardo ~${predictedDelay}gg`,
      icon: <AlertTriangle className="w-3 h-3 flex-shrink-0" />,
      className:
        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    }
  }

  // Significant delay (> 7 days)
  return {
    label: `Ritardo stimato ${predictedDelay}gg`,
    icon: <XCircle className="w-3 h-3 flex-shrink-0" />,
    className:
      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
}

// Single forecast row
function ForecastRow({ forecast }: { forecast: DeliveryForecast }) {
  const deadlineLabel = useMemo(
    () =>
      forecast.targetEndDate ? formatItalianDate(forecast.targetEndDate) : null,
    [forecast.targetEndDate],
  )

  const badge = useMemo(
    () => getDelayBadge(forecast.predictedDelay, forecast.healthStatus),
    [forecast.predictedDelay, forecast.healthStatus],
  )

  const progressBarClass = getProgressBarClass(forecast.healthStatus)
  const healthDotClass = getHealthDotClass(forecast.healthStatus)
  const clampedProgress = Math.min(100, Math.max(0, forecast.progress))

  return (
    <div className="py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="hover:bg-gray-50 dark:hover:bg-gray-800/30 rounded-lg px-3 -mx-3 transition-colors">
        {/* Top row — name, progress, deadline */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {/* Health dot + project name */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${healthDotClass}`}
              aria-hidden="true"
            />
            <Link
              to={`/projects/${forecast.projectId}`}
              className="text-sm font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate"
              title={forecast.projectName}
            >
              {forecast.projectName}
            </Link>
          </div>

          {/* Progress bar + percentage — hidden on very small screens, shown from sm */}
          <div className="hidden sm:flex items-center gap-2 w-36 flex-shrink-0">
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressBarClass}`}
                style={{ width: `${clampedProgress}%` }}
                role="progressbar"
                aria-valuenow={clampedProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums w-8 text-right flex-shrink-0">
              {clampedProgress}%
            </span>
          </div>

          {/* Deadline */}
          <div className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {deadlineLabel ?? (
              <span className="text-gray-400 dark:text-gray-600">Nessuna deadline</span>
            )}
          </div>
        </div>

        {/* Bottom row — velocity + delay badge */}
        <div className="flex items-center gap-3 mt-1.5 pb-1.5">
          {/* Progress bar on mobile only */}
          <div className="flex sm:hidden items-center gap-2 flex-1 min-w-0">
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${progressBarClass}`}
                style={{ width: `${clampedProgress}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums w-8 text-right flex-shrink-0">
              {clampedProgress}%
            </span>
          </div>

          {/* Velocity */}
          <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block flex-shrink-0">
            {forecast.velocityTasksPerWeek > 0
              ? `${forecast.velocityTasksPerWeek} task/sett`
              : '— task/sett'}
          </span>

          {/* Spacer */}
          <span className="flex-1 hidden sm:block" />

          {/* Delay badge — the primary signal, always visible */}
          <span
            className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-medium flex-shrink-0 ${badge.className}`}
          >
            {badge.icon}
            {badge.label}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function DeliveryOutlookSection({
  forecasts,
  isLoading,
}: DeliveryOutlookSectionProps) {
  const MAX_SHOWN = 10

  const visibleForecasts = useMemo(
    () => forecasts.slice(0, MAX_SHOWN),
    [forecasts],
  )

  const hasMore = forecasts.length > MAX_SHOWN

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="card p-6" aria-busy="true" aria-label="Caricamento previsioni consegna">
        {/* Header skeleton */}
        <div className="flex items-center gap-2 mb-5">
          <div className="skeleton h-5 w-5 rounded" />
          <div className="skeleton h-5 w-40" />
        </div>
        {/* Row skeletons */}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-14 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-500 flex-shrink-0" aria-hidden="true" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Previsioni Consegna
          </h2>
        </div>

        {hasMore && (
          <Link
            to="/projects"
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1 group transition-colors"
          >
            Vedi tutti i {forecasts.length} progetti
            <ArrowRight
              className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
              aria-hidden="true"
            />
          </Link>
        )}
      </div>

      {/* Empty state */}
      {forecasts.length === 0 ? (
        <div className="py-10 text-center">
          <TrendingUp
            className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600"
            aria-hidden="true"
          />
          <p className="text-sm text-gray-400 dark:text-gray-500">Nessun progetto attivo</p>
        </div>
      ) : (
        <>
          {/* Column labels — desktop only */}
          <div className="hidden sm:flex items-center gap-3 px-3 mb-1">
            <span className="flex-1 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              Progetto
            </span>
            <span className="w-36 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide text-right">
              Avanzamento
            </span>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              Scadenza
            </span>
          </div>

          {/* Forecast rows */}
          <div role="list" aria-label="Previsioni di consegna per progetto">
            {visibleForecasts.map((forecast) => (
              <div key={forecast.projectId} role="listitem">
                <ForecastRow forecast={forecast} />
              </div>
            ))}
          </div>

          {/* "View all" footer link — shown only when list is truncated */}
          {hasMore && (
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-center">
              <Link
                to="/projects"
                className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 transition-colors"
              >
                Vedi tutti i {forecasts.length} progetti &rarr;
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
