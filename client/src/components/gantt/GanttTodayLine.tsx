/**
 * GanttTodayLine - Vertical line indicator for today's date
 */

interface GanttTodayLineProps {
  offset: number
  height: number
}

export default function GanttTodayLine({ offset, height }: GanttTodayLineProps) {
  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{ left: offset, height: Math.max(height, 200) }}
    >
      {/* Line */}
      <div className="h-full w-0.5 bg-red-500 dark:bg-red-400 opacity-80" />

      {/* Top marker - triangle pointing down */}
      <div
        className="absolute -left-1.5 top-0 h-0 w-0
                   border-l-[6px] border-l-transparent
                   border-r-[6px] border-r-transparent
                   border-t-[8px] border-t-red-500 dark:border-t-red-400"
      />

      {/* Label - positioned inside visible area */}
      <div className="absolute left-1 top-1 whitespace-nowrap rounded bg-red-500 dark:bg-red-400 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm">
        Oggi
      </div>
    </div>
  )
}
