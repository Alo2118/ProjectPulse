/**
 * BudgetCard - Shows budget and hours usage for a single project
 * @module components/projects/BudgetCard
 */

import { DollarSign, Clock, TrendingUp } from 'lucide-react'
import { ProgressBar } from '@/components/ui/ProgressBar'

interface BudgetCardProps {
  budget: number | null
  totalHoursLogged: number
  estimatedHours: number
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

type BudgetStatus = 'on_track' | 'at_risk' | 'over_budget'

function getBudgetStatus(usedPercent: number): BudgetStatus {
  if (usedPercent > 100) return 'over_budget'
  if (usedPercent > 80) return 'at_risk'
  return 'on_track'
}

const STATUS_CONFIG: Record<
  BudgetStatus,
  { label: string; barColor: 'green' | 'amber' | 'red'; badgeCls: string }
> = {
  on_track: {
    label: 'In linea',
    barColor: 'green',
    badgeCls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  at_risk: {
    label: 'A rischio',
    barColor: 'amber',
    badgeCls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  over_budget: {
    label: 'Sforato',
    barColor: 'red',
    badgeCls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
}

export function BudgetCard({ budget, totalHoursLogged, estimatedHours }: BudgetCardProps) {
  // Do not render if neither budget nor estimated hours are set
  if ((!budget || budget <= 0) && estimatedHours <= 0) {
    return null
  }

  const usedPercent =
    estimatedHours > 0 ? Math.round((totalHoursLogged / estimatedHours) * 100) : 0

  const status = getBudgetStatus(usedPercent)
  const config = STATUS_CONFIG[status]
  const remainingHours = Math.max(0, estimatedHours - totalHoursLogged)

  return (
    <div className="card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Budget &amp; Ore</h3>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.badgeCls}`}>
          {config.label}
        </span>
      </div>

      {/* Budget row */}
      {budget !== null && budget > 0 && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <DollarSign className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-gray-500 dark:text-gray-400">Budget:</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(budget)}
          </span>
        </div>
      )}

      {/* Hours usage */}
      {estimatedHours > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Ore lavorate</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">
              {totalHoursLogged}h / {estimatedHours}h
            </span>
          </div>

          <ProgressBar
            value={Math.min(usedPercent, 100)}
            size="md"
            color={config.barColor}
            showLabel
          />

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{usedPercent}% utilizzato</span>
            {remainingHours > 0 && <span>{remainingHours}h rimanenti</span>}
            {usedPercent > 100 && (
              <span className="text-red-500 dark:text-red-400 font-medium">
                +{Math.round(totalHoursLogged - estimatedHours)}h sforato
              </span>
            )}
          </div>
        </div>
      )}

      {/* No estimated hours message */}
      {estimatedHours <= 0 && budget !== null && budget > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Nessuna stima ore disponibile per calcolare l&apos;utilizzo budget
        </p>
      )}
    </div>
  )
}
