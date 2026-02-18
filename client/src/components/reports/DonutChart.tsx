/**
 * Donut Chart - Animated donut chart for data visualization
 * @module components/reports/DonutChart
 */

interface DonutChartSegment {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  data: DonutChartSegment[]
  size?: number
  strokeWidth?: number
  showLegend?: boolean
}

export function DonutChart({
  data,
  size = 200,
  strokeWidth = 30,
  showLegend = true,
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI

  let accumulatedPercentage = 0

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          {data.map((segment, index) => {
            const percentage = total > 0 ? (segment.value / total) * 100 : 0
            const offset = circumference - (accumulatedPercentage / 100) * circumference
            const dashArray = `${(percentage / 100) * circumference} ${circumference}`
            
            const result = (
              <circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                strokeWidth={strokeWidth}
                strokeDasharray={dashArray}
                strokeDashoffset={-offset}
                className="fill-none transition-all duration-1000 ease-out"
                style={{ stroke: segment.color }}
              />
            )
            
            accumulatedPercentage += percentage
            return result
          })}
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">{total}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Totale</span>
        </div>
      </div>
      
      {showLegend && (
        <div className="grid grid-cols-2 gap-2 w-full">
          {data.map((segment, index) => {
            const percentage = total > 0 ? (segment.value / total) * 100 : 0
            return (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: segment.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {segment.label}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {segment.value} ({Math.round(percentage)}%)
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
