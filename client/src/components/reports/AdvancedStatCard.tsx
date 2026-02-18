/**
 * Advanced Stat Card - Enhanced statistics card with trends and comparisons
 * @module components/reports/AdvancedStatCard
 */

import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface AdvancedStatCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  color: string
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
    label: string
  }
  subtitle?: string
  gradient?: string
}

export function AdvancedStatCard({
  label,
  value,
  icon: Icon,
  color,
  trend,
  subtitle,
  gradient,
}: AdvancedStatCardProps) {
  const getTrendIcon = () => {
    switch (trend?.direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4" />
      case 'down':
        return <TrendingDown className="w-4 h-4" />
      default:
        return <Minus className="w-4 h-4" />
    }
  }

  const getTrendColor = () => {
    switch (trend?.direction) {
      case 'up':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
      case 'down':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
    }
  }

  return (
    <div className={`card p-5 hover:shadow-lg transition-all duration-300 ${gradient ? `bg-gradient-to-br ${gradient}` : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className={`text-sm font-medium ${gradient ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'}`}>
              {label}
            </p>
            {trend && (
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getTrendColor()}`}>
                {getTrendIcon()}
                <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
              </div>
            )}
          </div>
          <p className={`text-3xl font-bold mb-1 ${gradient ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
            {value}
          </p>
          {subtitle && (
            <p className={`text-xs ${gradient ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
              {subtitle}
            </p>
          )}
          {trend && (
            <p className={`text-xs mt-1 ${gradient ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
              {trend.label}
            </p>
          )}
        </div>
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${gradient ? 'bg-white/20' : color}`}>
          <Icon className={`w-7 h-7 ${gradient ? 'text-white' : ''}`} />
        </div>
      </div>
    </div>
  )
}
