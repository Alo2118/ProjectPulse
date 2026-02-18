/**
 * Performance Summary - Visual summary of performance metrics
 * @module components/reports/PerformanceSummary
 */

import { Award, Star, Zap, Target, TrendingUp } from 'lucide-react'

interface PerformanceMetrics {
  efficiency: number // 0-100
  completion: number // 0-100
  velocity: number // tasks per day
  quality: number // 0-100 based on blocked tasks, revisions, etc.
  consistency: number // 0-100 based on daily hours variance
}

interface PerformanceSummaryProps {
  metrics: PerformanceMetrics
  userName?: string
}

export function PerformanceSummary({ metrics, userName }: PerformanceSummaryProps) {
  const getPerformanceLevel = (score: number): { label: string; color: string; emoji: string } => {
    if (score >= 90) return { label: 'Eccellente', color: 'from-green-500 to-emerald-600', emoji: '🌟' }
    if (score >= 75) return { label: 'Ottimo', color: 'from-blue-500 to-cyan-600', emoji: '⭐' }
    if (score >= 60) return { label: 'Buono', color: 'from-purple-500 to-indigo-600', emoji: '👍' }
    if (score >= 40) return { label: 'Sufficiente', color: 'from-amber-500 to-orange-600', emoji: '📊' }
    return { label: 'In Miglioramento', color: 'from-gray-500 to-gray-600', emoji: '💪' }
  }

  const overallScore = (
    metrics.efficiency * 0.25 +
    metrics.completion * 0.3 +
    (Math.min(metrics.velocity * 20, 100)) * 0.2 +
    metrics.quality * 0.15 +
    metrics.consistency * 0.1
  )

  const performance = getPerformanceLevel(overallScore)

  const metricItems = [
    { label: 'Efficienza', value: metrics.efficiency, icon: Zap, color: 'text-amber-500' },
    { label: 'Completamento', value: metrics.completion, icon: Target, color: 'text-green-500' },
    { label: 'Qualità', value: metrics.quality, icon: Star, color: 'text-purple-500' },
    { label: 'Consistenza', value: metrics.consistency, icon: TrendingUp, color: 'text-blue-500' },
  ]

  return (
    <div className="card p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-850">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-primary-500" />
            Performance {userName ? `- ${userName}` : ''}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Riepilogo settimanale
          </p>
        </div>
        <div className="text-right">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${performance.color} text-white font-bold shadow-lg`}>
            <span className="text-2xl">{performance.emoji}</span>
            <div>
              <p className="text-xs opacity-90">Score</p>
              <p className="text-lg leading-none">{overallScore.toFixed(0)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {performance.label}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metricItems.map((item, index) => {
          const Icon = item.icon
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${item.color}`} />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {item.label}
                </span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {item.value.toFixed(0)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 mb-0.5">
                  {item.label === 'Velocità' ? ' t/d' : '%'}
                </span>
              </div>
              <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full bg-gradient-to-r ${item.color === 'text-amber-500' ? 'from-amber-400 to-amber-600' :
                    item.color === 'text-green-500' ? 'from-green-400 to-green-600' :
                    item.color === 'text-purple-500' ? 'from-purple-400 to-purple-600' :
                    'from-blue-400 to-blue-600'
                  } transition-all duration-1000`}
                  style={{ width: `${Math.min(item.value, 100)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <span className="font-semibold text-primary-700 dark:text-primary-400">💡 Suggerimento:</span>{' '}
          {overallScore >= 90 ? 'Prestazioni eccezionali! Mantieni questo ritmo.' :
           overallScore >= 75 ? 'Ottimo lavoro! Piccoli aggiustamenti possono portarti all\'eccellenza.' :
           overallScore >= 60 ? 'Buon progresso. Concentrati sulla consistenza per migliorare.' :
           overallScore >= 40 ? 'C\'è spazio per migliorare. Prova a pianificare meglio le tue giornate.' :
           'Inizia con piccoli obiettivi quotidiani e costruisci da lì.'}
        </p>
      </div>
    </div>
  )
}
