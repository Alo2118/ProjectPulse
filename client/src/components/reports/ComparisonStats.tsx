/**
 * Comparison Stats - Component for comparing weekly statistics
 * @module components/reports/ComparisonStats
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface ComparisonData {
  label: string
  current: number
  previous: number
  unit?: string
}

interface ComparisonStatsProps {
  data: ComparisonData[]
  title: string
}

export function ComparisonStats({ data, title }: ComparisonStatsProps) {
  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  const getTrendIcon = (change: number) => {
    if (Math.abs(change) < 1) return Minus
    return change > 0 ? TrendingUp : TrendingDown
  }

  const getTrendColor = (change: number, label: string) => {
    // For some metrics, increase is good, for others decrease is good
    const decreaseIsBetter = label.toLowerCase().includes('bloccati') || 
                            label.toLowerCase().includes('ritardo')
    
    if (Math.abs(change) < 1) {
      return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
    }

    const isPositive = decreaseIsBetter ? change < 0 : change > 0
    
    return isPositive
      ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
      : 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
  }

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h3>
      <div className="space-y-3">
        {data.map((item, index) => {
          const change = getPercentageChange(item.current, item.previous)
          const TrendIcon = getTrendIcon(change)
          const trendColor = getTrendColor(change, item.label)

          return (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.label}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Precedente: {item.previous}{item.unit}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-300 font-semibold">
                    Attuale: {item.current}{item.unit}
                  </span>
                </div>
              </div>
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${trendColor} flex-shrink-0`}>
                <TrendIcon className="w-3.5 h-3.5" />
                <span>{Math.abs(change).toFixed(1)}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
