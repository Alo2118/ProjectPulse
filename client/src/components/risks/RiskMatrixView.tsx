/**
 * RiskMatrixView - Visual 3x3 risk matrix (probability x impact)
 * @module components/risks/RiskMatrixView
 */

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import type { RiskMatrix } from '@/types'
import { RISK_PROBABILITY_LABELS, RISK_IMPACT_LABELS } from '@/constants'

interface RiskMatrixViewProps {
  matrix: RiskMatrix
}

type Level = 'low' | 'medium' | 'high'

const CELL_BG: Record<string, string> = {
  // probability_impact -> color class
  'low_low': 'bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-900/30',
  'low_medium': 'bg-yellow-100 dark:bg-yellow-900/20 hover:bg-yellow-200 dark:hover:bg-yellow-900/30',
  'low_high': 'bg-orange-100 dark:bg-orange-900/20 hover:bg-orange-200 dark:hover:bg-orange-900/30',
  'medium_low': 'bg-yellow-100 dark:bg-yellow-900/20 hover:bg-yellow-200 dark:hover:bg-yellow-900/30',
  'medium_medium': 'bg-orange-100 dark:bg-orange-900/20 hover:bg-orange-200 dark:hover:bg-orange-900/30',
  'medium_high': 'bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30',
  'high_low': 'bg-orange-100 dark:bg-orange-900/20 hover:bg-orange-200 dark:hover:bg-orange-900/30',
  'high_medium': 'bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30',
  'high_high': 'bg-red-200 dark:bg-red-900/40 hover:bg-red-300 dark:hover:bg-red-900/50',
}

const CELL_TEXT: Record<string, string> = {
  'low_low': 'text-green-700 dark:text-green-400',
  'low_medium': 'text-yellow-700 dark:text-yellow-400',
  'low_high': 'text-orange-700 dark:text-orange-400',
  'medium_low': 'text-yellow-700 dark:text-yellow-400',
  'medium_medium': 'text-orange-700 dark:text-orange-400',
  'medium_high': 'text-red-700 dark:text-red-400',
  'high_low': 'text-orange-700 dark:text-orange-400',
  'high_medium': 'text-red-700 dark:text-red-400',
  'high_high': 'text-red-800 dark:text-red-300',
}

const PROBABILITIES: Level[] = ['low', 'medium', 'high']
const IMPACTS: Level[] = ['high', 'medium', 'low'] // top to bottom

export function RiskMatrixView({ matrix }: RiskMatrixViewProps) {
  const totalRisks = useMemo(() => {
    let count = 0
    for (const prob of PROBABILITIES) {
      for (const imp of PROBABILITIES) {
        count += matrix[prob][imp].length
      }
    }
    return count
  }, [matrix])

  if (totalRisks === 0) {
    return (
      <div className="text-center py-6 text-gray-500 dark:text-gray-400">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Nessun rischio da visualizzare nella matrice</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[400px]">
        {/* Header: Probabilità labels */}
        <div className="grid grid-cols-[80px_1fr_1fr_1fr] gap-1 mb-1">
          <div />
          {PROBABILITIES.map((prob) => (
            <div
              key={prob}
              className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider py-1"
            >
              {RISK_PROBABILITY_LABELS[prob]}
            </div>
          ))}
        </div>

        {/* Matrix rows (impact high → low from top to bottom) */}
        {IMPACTS.map((impact) => (
          <div key={impact} className="grid grid-cols-[80px_1fr_1fr_1fr] gap-1 mb-1">
            {/* Row label */}
            <div className="flex items-center justify-end pr-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {RISK_IMPACT_LABELS[impact]}
              </span>
            </div>

            {/* Cells */}
            {PROBABILITIES.map((prob) => {
              const risks = matrix[prob][impact]
              const key = `${prob}_${impact}`
              return (
                <div
                  key={key}
                  className={`rounded-lg p-2 min-h-[64px] transition-colors ${CELL_BG[key]} relative group`}
                >
                  {risks.length > 0 ? (
                    <div className="space-y-1">
                      <span className={`text-lg font-bold ${CELL_TEXT[key]}`}>
                        {risks.length}
                      </span>
                      <div className="space-y-0.5">
                        {risks.slice(0, 3).map((risk) => (
                          <Link
                            key={risk.id}
                            to={`/risks/${risk.id}`}
                            className={`block text-xs truncate hover:underline ${CELL_TEXT[key]}`}
                            title={risk.title}
                          >
                            {risk.code}
                          </Link>
                        ))}
                        {risks.length > 3 && (
                          <span className={`text-xs opacity-70 ${CELL_TEXT[key]}`}>
                            +{risks.length - 3} altri
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-600">—</span>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {/* Axis labels */}
        <div className="grid grid-cols-[80px_1fr] gap-1 mt-2">
          <div />
          <div className="text-center text-xs font-medium text-gray-400 dark:text-gray-500">
            Probabilit&agrave; &rarr;
          </div>
        </div>
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-medium text-gray-400 dark:text-gray-500 hidden">
          Impatto &rarr;
        </div>
      </div>
    </div>
  )
}
