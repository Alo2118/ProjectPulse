/**
 * Weekly Trend Chart - Line chart showing weekly trends
 * @module components/reports/WeeklyTrendChart
 */

import { TrendingUp } from 'lucide-react'

interface TrendDataPoint {
  label: string
  value: number
}

interface WeeklyTrendChartProps {
  title: string
  data: TrendDataPoint[]
  color?: string
  unit?: string
}

export function WeeklyTrendChart({ 
  title, 
  data, 
  color = '#3b82f6',
  unit = ''
}: WeeklyTrendChartProps) {
  if (data.length === 0) return null

  const maxValue = Math.max(...data.map(d => d.value), 1)
  const minValue = Math.min(...data.map(d => d.value), 0)
  const range = maxValue - minValue || 1

  // Calculate SVG path for the trend line
  const width = 100
  const height = 100
  const padding = 5

  const points = data.map((point, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * (width - 2 * padding)
    const y = height - padding - ((point.value - minValue) / range) * (height - 2 * padding)
    return { x, y, value: point.value, label: point.label }
  })

  const pathData = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ')

  // Create area fill path
  const areaPath = `${pathData} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-gray-400" />
        {title}
      </h3>
      
      <div className="relative">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-32"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1={padding}
              y1={height - padding - ratio * (height - 2 * padding)}
              x2={width - padding}
              y2={height - padding - ratio * (height - 2 * padding)}
              stroke="currentColor"
              strokeWidth="0.3"
              className="text-gray-300 dark:text-gray-600"
              opacity="0.5"
            />
          ))}

          {/* Area fill */}
          <path
            d={areaPath}
            fill={color}
            opacity="0.1"
          />

          {/* Trend line */}
          <path
            d={pathData}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-draw-line"
          />

          {/* Data points */}
          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="2"
                fill={color}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              />
              <circle
                cx={point.x}
                cy={point.y}
                r="1"
                fill="white"
              />
            </g>
          ))}
        </svg>

        {/* X-axis labels */}
        <div className="flex justify-between mt-2 px-1">
          {data.map((point, index) => (
            <span 
              key={index}
              className="text-[10px] text-gray-500 dark:text-gray-400"
            >
              {point.label}
            </span>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Min</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            {minValue.toFixed(1)}{unit}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Media</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            {(data.reduce((sum, d) => sum + d.value, 0) / data.length).toFixed(1)}{unit}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Max</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            {maxValue.toFixed(1)}{unit}
          </p>
        </div>
      </div>
    </div>
  )
}
